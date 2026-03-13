import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';

interface ChatConversation {
  id: string;
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_online?: boolean;
}

interface ChatContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  activeChats: string[]; // IDs of users we are chatting with in small windows
  openChat: (userId: string) => void;
  closeChat: (userId: string) => void;
  conversations: ChatConversation[];
  loading: boolean;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [activeChats, setActiveChats] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getConversations(user.id);
      
      const formattedConvs: ChatConversation[] = data.map((conv: any) => {
        const otherUser = conv.participants[0];
        return {
          id: conv.id,
          user_id: otherUser?.id || '',
          display_name: otherUser?.display_name || 'Usuario',
          username: otherUser?.username || '',
          avatar_url: otherUser?.avatar_url || '',
          last_message: conv.last_message,
          last_message_time: conv.last_message_at,
          unread_count: 0, // Logic for unread would go here
        };
      });

      setConversations(formattedConvs);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to new messages to refresh conversations
      // We listen to the conversations table since it's updated on every new message
      const channel = supabase
        .channel('chat_updates')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'conversations'
        }, () => {
          fetchConversations();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      setConversations([]);
      setActiveChats([]);
    }
  }, [user]);

  const openChat = (userId: string) => {
    if (!user || userId === user.id) return; // Prevent self-messaging
    
    if (!activeChats.includes(userId)) {
      // Limit to 3 active windows on desktop, 1 on mobile (handled by UI)
      setActiveChats(prev => [userId, ...prev].slice(0, 3));
    }
    setIsOpen(false); // Close the history panel when opening a specific chat
  };

  const closeChat = (userId: string) => {
    setActiveChats(prev => prev.filter(id => id !== userId));
  };

  return (
    <ChatContext.Provider value={{
      isOpen,
      setIsOpen,
      activeChats,
      openChat,
      closeChat,
      conversations,
      loading,
      refreshConversations: fetchConversations
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
