import React from 'react';
import { Conversation } from '../../types';
import { formatTime, cn } from '../../lib/utils';
import { Search } from 'lucide-react';
import { VerifiedBadge } from '../ui/VerifiedBadge';

interface ChatListProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  searchQuery,
  onSearchChange
}) => {
  return (
    <div className="flex flex-col h-full border-r border-slate-100 w-full sm:w-80 lg:w-96 bg-white">
      <div className="p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-4">Mensajes</h2>
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar chats..." 
            className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-2.5 pl-12 pr-4 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <p className="text-sm">No tienes conversaciones aún.</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const otherUser = conv.participants[0];
            if (!otherUser) return null;

            return (
              <div 
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-all border-l-4",
                  activeConversationId === conv.id 
                    ? "bg-indigo-50/50 border-indigo-500" 
                    : "border-transparent hover:bg-slate-50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <img src={otherUser.avatar_url} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt={otherUser.username} />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate text-sm sm:text-base">{otherUser.display_name}</p>
                      {otherUser.is_verified && (
                        <VerifiedBadge size={14} />
                      )}
                    </div>
                    {conv.last_message_at && (
                      <span className="text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                        {formatTime(conv.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs sm:text-sm truncate",
                    conv.unread_count && conv.unread_count > 0 ? "font-bold text-slate-900" : "text-slate-500"
                  )}>
                    {conv.last_message || "Inicia una conversación"}
                  </p>
                </div>
                {conv.unread_count && conv.unread_count > 0 && (
                  <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                    {conv.unread_count}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
