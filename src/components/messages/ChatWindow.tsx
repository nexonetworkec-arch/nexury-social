import React, { useState, useEffect, useRef } from 'react';
import { User, Message, Conversation } from '../../types';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';
import { Send, Phone, Video, Info, ArrowLeft, Smile, Paperclip } from 'lucide-react';
import { formatTime, cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { useNotifications } from '../../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';

interface ChatWindowProps {
  conversation: Conversation;
  currentUser: User;
  onBack?: () => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ conversation, currentUser, onBack }) => {
  const { refreshCounts } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const otherUser = conversation.participants[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const data = await dataService.getMessages(conversation.id);
        setMessages(data);
        setTimeout(scrollToBottom, 100);
        
        // Mark as read
        await dataService.markMessagesAsRead(conversation.id, currentUser.id);
        refreshCounts();
      } catch (error) {
        console.error('Error fetching messages', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Suscribirse a nuevos mensajes en tiempo real
    const channel = supabase
      .channel(`messages:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            // Evitar duplicados si el mensaje fue enviado por nosotros y ya está en el estado
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);

          // Mark as read if it's from the other user
          if (newMsg.sender_id !== currentUser.id) {
            await dataService.markMessagesAsRead(conversation.id, currentUser.id);
            refreshCounts();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversation.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    setNewMessage('');

    try {
      await dataService.sendMessage(conversation.id, currentUser.id, content);
      // El mensaje se añadirá vía Realtime
    } catch (error) {
      console.error('Error sending message', error);
    }
  };

  if (!otherUser) return null;

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="sm:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600">
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="relative">
            <img src={otherUser.avatar_url} className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover shadow-sm" alt={otherUser.username} />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">{otherUser.display_name}</h3>
              {otherUser.is_verified && (
                <VerifiedBadge size={14} />
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-emerald-500 font-medium">En línea</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50"><Phone size={20} /></Button>
          <Button variant="ghost" size="icon" className="text-indigo-600 hover:bg-indigo-50"><Video size={20} /></Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:bg-slate-50"><Info size={20} /></Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 no-scrollbar bg-slate-50/30">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <img src={otherUser.avatar_url} className="w-20 h-20 rounded-3xl object-cover shadow-xl" alt={otherUser.username} />
            <div>
              <h4 className="font-bold text-slate-900">{otherUser.display_name}</h4>
              <p className="text-sm text-slate-500">Dile hola a @{otherUser.username}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setNewMessage('¡Hola! 👋')}>Enviar saludo</Button>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUser.id;
            const showAvatar = index === 0 || messages[index - 1].sender_id !== msg.sender_id;

            return (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                  isMe ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                {!isMe && (
                  <div className="w-8 h-8 flex-shrink-0">
                    {showAvatar && (
                      <img src={otherUser.avatar_url} className="w-8 h-8 rounded-lg object-cover shadow-sm" alt="Avatar" />
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <div className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm sm:text-[0.95rem] shadow-sm",
                    isMe 
                      ? "bg-indigo-600 text-white rounded-br-none" 
                      : "bg-white text-slate-700 border border-slate-100 rounded-bl-none"
                  )}>
                    {msg.content}
                  </div>
                  <span className={cn(
                    "text-[10px] text-slate-400 px-1",
                    isMe ? "text-right" : "text-left"
                  )}>
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 sm:p-5 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600"><Paperclip size={20} /></Button>
            <Button type="button" variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hidden sm:flex"><Smile size={20} /></Button>
          </div>
          <div className="flex-1 relative">
            <input 
              type="text" 
              placeholder="Escribe un mensaje..." 
              className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-2.5 px-5 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm sm:text-base"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
          </div>
          <Button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="rounded-2xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center p-0 flex-shrink-0 shadow-lg shadow-indigo-100"
          >
            <Send size={20} className="sm:size-24" />
          </Button>
        </form>
      </div>
    </div>
  );
};
