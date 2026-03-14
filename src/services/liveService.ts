import { supabase } from '../lib/supabase';
import { LiveStream } from '../types';
import { BaseService } from './baseService';

export class LiveService extends BaseService {
  static async getActiveLiveStreams(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url, is_verified)
      `)
      .eq('is_active', true)
      .order('started_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((s: any) => ({
      ...s,
      username: s.profiles?.username,
      display_name: s.profiles?.display_name,
      avatar_url: s.profiles?.avatar_url,
      is_verified: !!s.profiles?.is_verified
    }));
  }

  static async getPastLiveStreams(): Promise<LiveStream[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url, is_verified)
      `)
      .eq('is_active', false)
      .order('ended_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((s: any) => ({
      ...s,
      username: s.profiles?.username,
      display_name: s.profiles?.display_name,
      avatar_url: s.profiles?.avatar_url,
      is_verified: !!s.profiles?.is_verified
    }));
  }

  static async startLiveStream(userId: string, title: string): Promise<LiveStream> {
    const { data, error } = await supabase
      .from('live_streams')
      .insert([{ user_id: userId, title, is_active: true }])
      .select()
      .single();

    if (error) throw error;

    // Update profile live status
    await supabase.from('profiles').update({ is_live: true }).eq('id', userId);

    return data;
  }

  static async endLiveStream(streamId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('live_streams')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', streamId);

    if (error) throw error;

    // Update profile live status
    await supabase.from('profiles').update({ is_live: false }).eq('id', userId);
  }

  static async getLiveMessages(streamId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('live_messages')
      .select(`
        *,
        profiles:user_id (username, display_name, avatar_url, is_verified)
      `)
      .eq('stream_id', streamId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((m: any) => ({
      ...m,
      username: m.profiles?.username,
      display_name: m.profiles?.display_name,
      avatar_url: m.profiles?.avatar_url,
      is_verified: !!m.profiles?.is_verified
    }));
  }

  static async sendLiveMessage(streamId: string, userId: string, content: string): Promise<void> {
    const { error } = await supabase
      .from('live_messages')
      .insert([{ stream_id: streamId, user_id: userId, content }]);
    if (error) throw error;
  }

  static async deleteLiveStream(streamId: string): Promise<void> {
    const { error } = await supabase
      .from('live_streams')
      .delete()
      .eq('id', streamId);
    if (error) throw error;
  }
}
