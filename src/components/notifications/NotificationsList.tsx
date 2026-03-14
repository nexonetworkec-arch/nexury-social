import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Star, Ghost, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatTime } from '../../lib/utils';
import { Button } from '../ui/Button';

const NotificationItem = ({ id, type, from_user_id, from_username, from_display_name, from_avatar, content, created_at, onDelete }: any) => {
  const getIcon = () => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-rose-500 fill-rose-500" />;
      case 'comment': return <MessageCircle size={16} className="text-indigo-500 fill-indigo-500" />;
      case 'follow': return <UserPlus size={16} className="text-emerald-500" />;
      case 'message': return <MessageCircle size={16} className="text-blue-500 fill-blue-500" />;
      default: return <Star size={16} className="text-amber-500 fill-amber-500" />;
    }
  };

  const getActionText = () => {
    switch (type) {
      case 'like': return 'le dio me gusta a tu publicación';
      case 'comment': return 'comentó tu publicación';
      case 'follow': return 'comenzó a seguirte';
      case 'message': return 'te envió un mensaje';
      default: return 'interactuó contigo';
    }
  };

  const handleUserClick = () => {
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId: from_user_id } 
    });
    window.dispatchEvent(event);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(id);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      onClick={handleUserClick}
      className="p-4 sm:p-6 border-b border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer flex gap-4 items-start group relative"
    >
      <div className="relative">
        <img src={from_avatar || `https://picsum.photos/seed/${from_user_id}/200`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover" alt="" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
          {getIcon()}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm sm:text-base text-slate-900">
          <span className="font-bold">{from_display_name || from_username}</span> {getActionText()}
        </p>
        {content && (
          <p className="text-slate-500 text-sm mt-1 line-clamp-2 italic">"{content}"</p>
        )}
        <p className="text-slate-400 text-xs mt-2">{formatTime(created_at)}</p>
      </div>
      
      <button 
        onClick={handleDelete}
        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
        title="Eliminar notificación"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
};

export const NotificationsList = () => {
  const { user } = useAuth();
  const { refreshCounts } = useNotifications();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getNotifications(user.id);
      setNotifications(data);
      
      // Mark all as read
      const hasUnread = data.some((n: any) => !n.is_read);
      if (hasUnread) {
        await dataService.markAllNotificationsAsRead(user.id);
        refreshCounts();
      }
    } catch (error) {
      console.error('Error fetching notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user]);

  const handleDeleteNotification = async (id: string) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== id));
      await dataService.deleteNotification(id);
      refreshCounts();
    } catch (error) {
      console.error('Error deleting notification', error);
      // Re-fetch if error to sync state
      fetchNotifications();
    }
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    if (!confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) return;

    setIsClearing(true);
    try {
      setNotifications([]);
      await dataService.clearAllNotifications(user.id);
      refreshCounts();
    } catch (error) {
      console.error('Error clearing notifications', error);
      fetchNotifications();
    } finally {
      setIsClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-slate-400 font-medium">Cargando notificaciones...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white">
      <header className="sticky top-0 z-40 glass p-4 sm:p-5 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient flex items-center gap-2">
          <Bell className="text-indigo-600" />
          Notificaciones
        </h1>
        
        {notifications.length > 0 && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleClearAll}
            disabled={isClearing}
            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 gap-2"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Limpiar todo</span>
          </Button>
        )}
      </header>
      <div className="flex flex-col">
        <AnimatePresence mode="popLayout">
          {notifications.length > 0 ? (
            <React.Fragment key="list">
              {notifications.map(n => (
                <NotificationItem 
                  key={n.id} 
                  {...n} 
                  onDelete={handleDeleteNotification} 
                />
              ))}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-12 text-center"
              >
                <p className="text-slate-400 text-sm">No tienes más notificaciones por ahora.</p>
              </motion.div>
            </React.Fragment>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center p-12 sm:p-20 text-center gap-6"
            >
              <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center">
                <Bell size={48} />
              </div>
              <div className="max-w-xs">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Todo tranquilo por aquí</h2>
                <p className="text-slate-500">Cuando alguien interactúe contigo, te avisaremos aquí.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
