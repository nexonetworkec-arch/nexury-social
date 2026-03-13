import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, Star, Ghost } from 'lucide-react';
import { motion } from 'motion/react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { formatTime } from '../../lib/utils';

const NotificationItem = ({ type, from_user_id, from_username, from_display_name, from_avatar, content, created_at }: any) => {
  const getIcon = () => {
    switch (type) {
      case 'like': return <Heart size={16} className="text-rose-500 fill-rose-500" />;
      case 'comment': return <MessageCircle size={16} className="text-indigo-500 fill-indigo-500" />;
      case 'follow': return <UserPlus size={16} className="text-emerald-500" />;
      default: return <Star size={16} className="text-amber-500 fill-amber-500" />;
    }
  };

  const getActionText = () => {
    switch (type) {
      case 'like': return 'le dio me gusta a tu publicación';
      case 'comment': return 'comentó tu publicación';
      case 'follow': return 'comenzó a seguirte';
      default: return 'interactuó contigo';
    }
  };

  const handleUserClick = () => {
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId: from_user_id } 
    });
    window.dispatchEvent(event);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleUserClick}
      className="p-4 sm:p-6 border-b border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer flex gap-4 items-start"
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
    </motion.div>
  );
};

export const NotificationsList = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await dataService.getNotifications(user.id);
        setNotifications(data);
        
        // Mark all as read
        const unreadIds = data.filter((n: any) => n.read === 0).map((n: any) => n.id);
        if (unreadIds.length > 0) {
          await Promise.all(unreadIds.map(id => dataService.markNotificationAsRead(id)));
        }
      } catch (error) {
        console.error('Error fetching notifications', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

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
      <header className="sticky top-0 z-40 glass p-4 sm:p-5">
        <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient flex items-center gap-2">
          <Bell className="text-indigo-600" />
          Notificaciones
        </h1>
      </header>
      <div className="flex flex-col">
        {notifications.length > 0 ? (
          <>
            {notifications.map(n => (
              <NotificationItem key={n.id} {...n} />
            ))}
            <div className="p-12 text-center">
              <p className="text-slate-400 text-sm">No tienes más notificaciones por ahora.</p>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 sm:p-20 text-center gap-6">
            <div className="w-24 h-24 bg-slate-50 text-slate-300 rounded-[2.5rem] flex items-center justify-center">
              <Bell size={48} />
            </div>
            <div className="max-w-xs">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Todo tranquilo por aquí</h2>
              <p className="text-slate-500">Cuando alguien interactúe contigo, te avisaremos aquí.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
