import { supabase } from '../lib/supabase';
import { User } from '../types';
import { BaseService } from './baseService';

export class AuthService extends BaseService {
  static async getProfile(userId: string): Promise<User> {
    return this.getUserProfile(userId);
  }

  static async getUserProfile(userId: string): Promise<User> {
    return this.handleResponse<User>(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );
  }

  static async getUserProfileByUsername(username: string): Promise<User> {
    return this.handleResponse<User>(
      supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single()
    );
  }

  static async updateUserStatus(userId: string, isOnline: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating status:', error);
    }
  }

  static async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    return this.handleResponse<User>(
      supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()
    );
  }

  static async searchProfiles(query: string): Promise<User[]> {
    return this.handleResponse<User[]>(
      supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20)
    );
  }

  static async uploadMedia(file: File, bucket: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      if ((uploadError as any).message === 'Bucket not found') {
        throw new Error(`El bucket "${bucket}" no existe en Supabase Storage. Por favor, créalo en el panel de Supabase.`);
      }
      throw uploadError;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data.publicUrl;
  }

  static async verifyUser(userId: string, isVerified: boolean): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: isVerified })
      .eq('id', userId);
    if (error) throw error;
  }

  static async requestVerification(userId: string): Promise<void> {
    const { error } = await supabase
      .from('user_reports')
      .insert([{
        reporter_id: userId,
        target_id: userId,
        reason: 'Verification Request',
        status: 'pending'
      }]);
    if (error) throw error;
  }

  static async savePushToken(userId: string, token: string, deviceType: string): Promise<void> {
    const { error } = await supabase
      .from('push_tokens')
      .upsert([{ user_id: userId, token, device_type: deviceType }]);
    if (error) throw error;
  }

  static async blockUserPersonal(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .insert([{ blocker_id: blockerId, blocked_id: blockedId }]);
    if (error) throw error;
  }

  static async getUserCounts(userId: string) {
    const [followers, following, likes] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      supabase.from('likes').select('*, posts!inner(user_id)', { count: 'exact', head: true }).eq('posts.user_id', userId)
    ]);
    return {
      followers: followers.count || 0,
      following: following.count || 0,
      total_likes: likes.count || 0
    };
  }
}
