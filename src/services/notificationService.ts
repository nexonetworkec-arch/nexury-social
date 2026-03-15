import { supabase } from '../lib/supabase';
import { Notification } from '../types';
import { BaseService } from './baseService';

export class NotificationService extends BaseService {
  static async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:profiles!from_user_id (username, display_name, avatar_url, is_verified)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []).map((n: any) => ({
      ...n,
      from_username: n.from_profile?.username,
      from_display_name: n.from_profile?.display_name,
      from_avatar: n.from_profile?.avatar_url,
      from_is_verified: !!n.from_profile?.is_verified
    }));
  }

  static async createNotification(notif: Partial<Notification>): Promise<Notification> {
    return this.handleResponse<Notification>(
      supabase
        .from('notifications')
        .insert([notif])
        .select()
        .single()
    );
  }

  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    if (error) throw error;
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
    return count || 0;
  }

  static async clearAll(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
    if (error) throw error;
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
    if (error) throw error;
  }
}
