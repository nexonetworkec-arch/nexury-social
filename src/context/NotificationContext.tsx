import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { dataService } from '../services/dataService';

interface NotificationContextType {
  unreadNotificationsCount: number;
  unreadMessagesCount: number;
  refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const fetchCounts = async () => {
    if (!user) return;
    try {
      const [notifCount, msgCount] = await Promise.all([
        dataService.getUnreadNotificationsCount(user.id),
        dataService.getUnreadMessagesCount(user.id)
      ]);
      setUnreadNotificationsCount(notifCount);
      setUnreadMessagesCount(msgCount);
    } catch (err) {
      console.error('Error fetching unread counts:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      const userId = user.id;
      fetchCounts();

      // Listen for new notifications
      const notifChannel = supabase
        .channel(`notifications_count:${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, () => {
          fetchCounts();
        })
        .subscribe();

      // Listen for new messages
      const msgChannel = supabase
        .channel(`messages_count:${userId}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${userId}`
        }, () => {
          fetchCounts();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(msgChannel);
      };
    } else {
      setUnreadNotificationsCount(0);
      setUnreadMessagesCount(0);
    }
  }, [user?.id]);

  return (
    <NotificationContext.Provider value={{
      unreadNotificationsCount,
      unreadMessagesCount,
      refreshCounts: fetchCounts
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
