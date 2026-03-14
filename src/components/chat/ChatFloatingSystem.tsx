import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Minus, Maximize2, Send, Search, MoreVertical, Phone, Video, Trash2, ShieldAlert, CheckCircle2, Eraser } from 'lucide-react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { UserStatus } from '../ui/UserStatus';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';
import { useNotifications } from '../../context/NotificationContext';

// --- Sub-component: ChatWindow ---
const ChatWindow: React.FC<{ userId: string, onClose: () => void }> = ({ userId, onClose }) => {
  const { user: currentUser } = useAuth();
  const { refreshCounts } = useNotifications();
  const { refreshConversations } = useChat();
  const [targetUser, setTargetUser] = useState<any>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [viewportHeight, setViewportHeight] = useState('100dvh');
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      }
    };

    window.visualViewport?.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('scroll', handleResize);
    
    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  useEffect(() => {
    const initChat = async () => {
      if (!currentUser || !userId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // 1. Fetch target user profile
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
        setTargetUser(profile);

        // 2. Get or create conversation
        const convId = await dataService.getOrCreateConversation(currentUser.id, userId);
        setConversationId(convId);

        // 3. Fetch initial messages
        const data = await dataService.getMessages(convId);
        setMessages(data);

        // 4. Mark messages as read
        await dataService.markMessagesAsRead(convId, currentUser.id);
        refreshCounts();
      } catch (error) {
        console.error('Error initializing chat window:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initChat();
  }, [userId, currentUser]);

  const handleDeleteMessage = async (messageId: string, everyone: boolean = false) => {
    if (!currentUser) return;
    try {
      if (everyone) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: '🚫 Este mensaje fue eliminado' } : m));
        await dataService.deleteMessageForEveryone(messageId);
      } else {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        await dataService.deleteMessageForMe(messageId, currentUser.id);
      }
      setSelectedMessageId(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      if (conversationId) {
        const data = await dataService.getMessages(conversationId);
        setMessages(data);
      }
    }
  };

  const handleClearChat = async () => {
    if (!currentUser || !conversationId) return;
    if (!confirm('¿Estás seguro de que quieres vaciar este chat? Los mensajes desaparecerán solo para ti, pero la otra persona conservará su copia.')) return;
    
    try {
      setMessages([]);
      await dataService.clearChatForMe(conversationId, currentUser.id);
      setShowOptions(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  const handleDeleteChat = async () => {
    if (!currentUser || !conversationId) return;
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Desaparecerá de tu lista y los mensajes se ocultarán solo para ti.')) return;

    try {
      await dataService.deleteConversation(conversationId, currentUser.id);
      await refreshConversations();
      onClose();
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat_window:${conversationId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => {
            if (prev.some(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });

          // Mark as read if it's from the other user
          if (payload.new.sender_id !== currentUser?.id) {
            await dataService.markMessagesAsRead(conversationId, currentUser?.id || '');
            refreshCounts();
          }
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        } else if (payload.eventType === 'DELETE') {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isMinimized]);

  const handleSendMessage = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      let currentConvId = conversationId;
      
      // If conversationId is missing, try to get/create it now
      if (!currentConvId) {
        setLoading(true);
        currentConvId = await dataService.getOrCreateConversation(currentUser.id, userId);
        setConversationId(currentConvId);
        setLoading(false);
      }

      if (currentConvId) {
        await dataService.sendMessage(currentConvId, currentUser.id, content);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setNewMessage(content); 
      setLoading(false);
    }
  };

  if (!targetUser) return null;

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 20, opacity: 0, scale: 0.9 }}
      style={{ 
        height: isMinimized ? '56px' : (window.innerWidth < 640 ? `calc(${viewportHeight} - 4rem)` : '450px'),
        maxHeight: window.innerWidth < 640 ? `calc(${viewportHeight} - 4rem)` : '450px'
      }}
      className={cn(
        "fixed bottom-16 sm:bottom-0 right-0 sm:right-auto sm:relative w-full sm:w-80 bg-white shadow-2xl rounded-t-3xl sm:rounded-2xl border border-slate-100 flex flex-col z-[100] transition-all duration-300 pointer-events-auto",
        isMinimized ? "h-14" : ""
      )}
    >
      {/* Header */}
      <div 
        className="p-3 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl cursor-pointer shrink-0"
        onClick={() => setIsMinimized(!isMinimized)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <img src={targetUser.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
            <div className="absolute -bottom-0.5 -right-0.5">
              <UserStatus userId={targetUser.id} size="sm" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{targetUser.display_name}</span>
              {targetUser.is_verified && (
                <VerifiedBadge size={12} />
              )}
            </div>
            <UserStatus userId={targetUser.id} lastSeen={targetUser.last_seen} showText size="sm" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"><Phone size={16} /></button>
          <button className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"><Video size={16} /></button>
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            <AnimatePresence>
              {showOptions && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white shadow-xl rounded-2xl border border-slate-100 py-2 z-50"
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleClearChat(); }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Eraser size={14} />
                    Vaciar chat
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(); }}
                    className="w-full px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Eliminar chat
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 border-t border-slate-100 mt-1 pt-2"
                  >
                    <X size={14} />
                    Cerrar chat
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <Minus size={16} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      {!isMinimized && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30 custom-scrollbar">
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-xs text-slate-400">No hay mensajes aún. ¡Di hola!</p>
              </div>
            ) : messages
                .filter(msg => !msg.content.includes(`[HIDDEN_FOR:${currentUser?.id}]`))
                .map((msg) => {
              const isMine = msg.sender_id === currentUser?.id;
              const isDeleted = msg.content === '🚫 Este mensaje fue eliminado';
              
              // Limpiar prefijos de ocultación de otros usuarios si existen
              let displayContent = msg.content;
              if (displayContent.includes('[HIDDEN_FOR:')) {
                displayContent = displayContent.replace(/\[HIDDEN_FOR:[^\]]+\]/g, '');
              }

              return (
                <div key={msg.id} className={cn("flex group", isMine ? "justify-end" : "justify-start")}>
                  <div className="relative">
                    <div 
                      onClick={() => !isDeleted && setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                      className={cn(
                        "max-w-[240px] sm:max-w-[280px] p-3 rounded-2xl text-sm shadow-sm relative cursor-pointer transition-all",
                        isMine 
                          ? "bg-indigo-600 text-white rounded-tr-none" 
                          : "bg-white text-slate-700 border border-slate-100 rounded-tl-none",
                        isDeleted && "italic opacity-60 bg-slate-100 text-slate-400 border-none"
                      )}
                    >
                      <p>{displayContent}</p>
                      <p className={cn("text-[10px] mt-1 opacity-70", isMine ? "text-right" : "text-left")}>
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                      </p>
                    </div>

                    {/* Message Options Menu */}
                    <AnimatePresence>
                      {selectedMessageId === msg.id && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 10 }}
                          className={cn(
                            "absolute bottom-full mb-2 bg-white shadow-xl rounded-2xl border border-slate-100 py-2 z-50 min-w-[160px]",
                            isMine ? "right-0" : "left-0"
                          )}
                        >
                          <button 
                            onClick={() => handleDeleteMessage(msg.id, false)}
                            className="w-full px-4 py-2 text-left text-xs text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} />
                            Eliminar para mí
                          </button>
                          {isMine && (
                            <button 
                              onClick={() => handleDeleteMessage(msg.id, true)}
                              className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                            >
                              <ShieldAlert size={14} />
                              Eliminar para todos
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white rounded-b-2xl shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-100 focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-100 transition-all">
              <input 
                type="text"
                placeholder="Escribe un mensaje..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={() => {
                  setTimeout(() => {
                    if (scrollRef.current) {
                      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                  }, 300);
                }}
              />
              <button 
                type="submit"
                disabled={!newMessage.trim()}
                className="text-indigo-600 disabled:text-slate-300 p-1 hover:scale-110 transition-transform"
              >
                <Send size={18} />
              </button>
            </div>
          </form>
        </>
      )}
    </motion.div>

  );
};

// --- Sub-component: ChatHistoryPanel ---
const ChatHistoryPanel: React.FC = () => {
  const { conversations, openChat, loading, setIsOpen, refreshConversations } = useChat();
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);
  const [viewportHeight, setViewportHeight] = useState('100dvh');

  const handleDeleteConversation = async (e: React.MouseEvent, conversationId: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    if (!confirm('¿Estás seguro de que quieres eliminar esta conversación? Los mensajes desaparecerán solo para ti, pero la otra persona conservará su copia.')) return;

    try {
      await dataService.deleteConversation(conversationId, currentUser.id);
      await refreshConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
      }
    };
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const searchGlobal = async () => {
      if (search.trim().length < 2) {
        setGlobalResults([]);
        return;
      }

      setIsSearchingGlobal(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or(`display_name.ilike.%${search}%,username.ilike.%${search}%`)
          .neq('id', currentUser?.id)
          .limit(5);
        
        if (error) throw error;
        setGlobalResults(data || []);
      } catch (err) {
        console.error('Error searching global users:', err);
      } finally {
        setIsSearchingGlobal(false);
      }
    };

    const timer = setTimeout(searchGlobal, 300);
    return () => clearTimeout(timer);
  }, [search, currentUser?.id]);

  const filtered = conversations.filter(c => 
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20, x: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0, x: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: 20, x: 20 }}
      style={{ 
        maxHeight: window.innerWidth < 640 ? `calc(${viewportHeight} - 6rem)` : '600px'
      }}
      className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] sm:w-96 bg-white shadow-2xl rounded-3xl border border-slate-100 flex flex-col z-[100] overflow-hidden"
    >
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
        <h3 className="text-xl font-bold text-slate-900">Mensajes</h3>
        <div className="flex items-center gap-2">
          <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"><MoreVertical size={20} /></button>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar chats o personas..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="px-2 pb-4">
            {/* Existing Conversations */}
            {filtered.length > 0 && (
              <div className="mb-4">
                {search && <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tus conversaciones</p>}
                {filtered.map((conv) => (
                  <div 
                    key={conv.id}
                    onClick={() => openChat(conv.user_id)}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group"
                  >
                    <div className="relative shrink-0">
                      <img src={conv.avatar_url} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt="" />
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="font-bold text-slate-900 truncate text-sm">{conv.display_name}</span>
                          {conv.is_verified && (
                            <VerifiedBadge size={12} />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { locale: es }) : ''}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate group-hover:text-slate-700 transition-colors">
                        {conv.last_message || 'Inicia una conversación'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {conv.unread_count > 0 && (
                        <div className="w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {conv.unread_count}
                        </div>
                      )}
                      <button 
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        title="Eliminar conversación"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Global Search Results */}
            {search.trim().length >= 2 && (
              <div>
                <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Explorar comunidad</span>
                  {isSearchingGlobal && <span className="animate-pulse">Buscando...</span>}
                </p>
                {globalResults.length > 0 ? (
                  globalResults
                    .filter(u => !filtered.some(c => c.user_id === u.id)) // Don't show if already in conversations
                    .map((u) => (
                      <div 
                        key={u.id}
                        onClick={() => openChat(u.id)}
                        className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all group"
                      >
                        <div className="relative shrink-0">
                          <img src={u.avatar_url} className="w-12 h-12 rounded-2xl object-cover shadow-sm" alt="" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-bold text-slate-900 truncate text-sm">{u.display_name}</span>
                            {u.is_verified && (
                              <VerifiedBadge size={12} />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">@{u.username}</p>
                        </div>
                        <Button size="sm" variant="ghost" className="text-indigo-600 opacity-0 group-hover:opacity-100">Mensaje</Button>
                      </div>
                    ))
                ) : !isSearchingGlobal && (
                  <p className="px-3 py-4 text-xs text-slate-400 text-center italic">No se encontraron más personas</p>
                )}
              </div>
            )}

            {filtered.length === 0 && search.trim().length < 2 && (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                  <MessageSquare size={32} />
                </div>
                <p className="text-slate-500 text-sm">No hay mensajes aún</p>
                <p className="text-[10px] text-slate-400 mt-1">Busca a alguien para empezar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- Main Component: ChatFloatingSystem ---
export const ChatFloatingSystem = () => {
  const { isOpen, setIsOpen, activeChats, closeChat, conversations } = useChat();
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    const total = conversations.reduce((acc, curr) => acc + curr.unread_count, 0);
    setUnreadTotal(total);
  }, [conversations]);

  if (!user) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-none">
      {/* Active Chat Windows (Horizontal stack on desktop) */}
      <div className="flex flex-col sm:flex-row-reverse items-end gap-4 pointer-events-auto">
        <AnimatePresence>
          {activeChats.map((userId) => (
            <ChatWindow 
              key={userId} 
              userId={userId} 
              onClose={() => closeChat(userId)} 
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Trigger Button & History Panel */}
      <div className="relative pointer-events-auto">
        <AnimatePresence>
          {isOpen && <ChatHistoryPanel />}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 relative overflow-hidden group",
            isOpen ? "bg-slate-900 text-white rotate-90" : "brand-gradient text-white shadow-indigo-200"
          )}
        >
          {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
          
          {!isOpen && unreadTotal > 0 && (
            <div className="absolute top-2 right-2 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-bounce">
              {unreadTotal}
            </div>
          )}
          
          {/* Subtle glow effect */}
          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </div>
    </div>
  );
};
