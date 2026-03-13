import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Conversation } from '../../types';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { MessageSquare } from 'lucide-react';

export const MessagesView: React.FC<{ targetUserId?: string }> = ({ targetUserId }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      setLoading(true);
      try {
        const data = await dataService.getConversations(user.id);
        setConversations(data);
        
        // Si hay un targetUserId, intentar encontrar o crear la conversación
        if (targetUserId && targetUserId !== user.id) {
          const existingConv = data.find(c => 
            c.participants.some(p => p.id === targetUserId)
          );
          
          if (existingConv) {
            setActiveConversationId(existingConv.id);
          } else {
            // Crear o recuperar conversación
            const conversationId = await dataService.getOrCreateConversation(user.id, targetUserId);
            
            // Recargar conversaciones para incluir la nueva
            const updatedData = await dataService.getConversations(user.id);
            setConversations(updatedData);
            setActiveConversationId(conversationId);
          }
        }
      } catch (error) {
        console.error('Error fetching conversations', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, targetUserId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  const filteredConversations = conversations.filter(conv => {
    const otherUser = conv.participants[0];
    if (!otherUser) return false;
    return (
      otherUser.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      otherUser.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  if (!user) return null;

  // Si estamos cargando y NO tenemos un targetUserId, o si tenemos un targetUserId pero aún no tenemos la conversación activa
  const isInitialLoading = loading && conversations.length === 0;
  const isWaitingForTarget = targetUserId && !activeConversationId;

  if (isInitialLoading || isWaitingForTarget) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Conectando con el Nexuario...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-screen bg-white overflow-hidden">
      {/* Mobile view logic: show list or window */}
      <div className={`flex-1 flex h-full ${activeConversationId ? 'hidden sm:flex' : 'flex'}`}>
        <ChatList 
          conversations={filteredConversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>

      <div className={`flex-1 flex h-full ${activeConversationId ? 'flex' : 'hidden sm:flex'}`}>
        {activeConversation ? (
          <ChatWindow 
            conversation={activeConversation}
            currentUser={user}
            onBack={() => setActiveConversationId(undefined)}
          />
        ) : activeConversationId ? (
          <div className="flex-1 flex items-center justify-center bg-slate-50/30">
            <div className="w-10 h-10 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
            <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-6 text-indigo-500 shadow-xl shadow-indigo-100/50">
              <MessageSquare size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Tus Mensajes</h3>
            <p className="text-slate-500 max-w-xs">Selecciona una conversación de la lista para empezar a chatear con tus amigos.</p>
          </div>
        )}
      </div>
    </div>
  );
};
