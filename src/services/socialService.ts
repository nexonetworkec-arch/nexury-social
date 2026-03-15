import { supabase } from '../lib/supabase';
import { Post, Comment } from '../types';
import { BaseService } from './baseService';

export class SocialService extends BaseService {
  static async getPosts(currentUserId?: string, feedType: 'recent' | 'smart' = 'smart', limit = 50): Promise<Post[]> {
    let query = supabase
      .from('posts')
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          is_verified,
          is_super_admin,
          is_live
        )
      `);

    if (feedType === 'smart') {
      // Smart feed logic could go here (e.g. based on interests or following)
      // For now, we just use recent but could be expanded
      query = query.order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query.limit(limit);

    if (error) throw error;

    const posts = (data || []).map((post: any) => this.mapPostData(post));
    return this.enrichPostsWithLikes(posts, currentUserId);
  }

  static async getUserPosts(userId: string, currentUserId?: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          is_verified,
          is_super_admin,
          is_live
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const posts = (data || []).map((post: any) => this.mapPostData(post));
    return this.enrichPostsWithLikes(posts, currentUserId);
  }

  static async createPost(userId: string, content: string, imageUrl?: string, mediaType: 'image' | 'video' = 'image', showAppointmentButton: boolean = false): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert([{ 
        user_id: userId, 
        content, 
        image_url: imageUrl, 
        media_type: mediaType, 
        show_appointment_button: showAppointmentButton 
      }])
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();

    if (error) throw error;
    return this.mapPostData(data);
  }

  static async likePost(postId: string, userId: string, hasLiked: boolean): Promise<{ success: boolean; action: string }> {
    if (hasLiked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);
      if (error) throw error;
      return { success: true, action: 'unliked' };
    } else {
      const { error } = await supabase
        .from('likes')
        .insert([{ user_id: userId, post_id: postId }]);
      if (error && error.code !== '23505') throw error;
      return { success: true, action: 'liked' };
    }
  }

  private static mapPostData(post: any): Post {
    return {
      ...post,
      media_url: post.image_url,
      has_appointments: post.show_appointment_button,
      username: post.profiles?.username,
      display_name: post.profiles?.display_name,
      avatar_url: post.profiles?.avatar_url,
      is_verified: !!post.profiles?.is_verified
    };
  }

  static async deletePost(postId: string, userId: string, isAdmin = false): Promise<void> {
    const query = supabase.from('posts').delete().eq('id', postId);
    if (!isAdmin) {
      query.eq('user_id', userId);
    }
    const { error } = await query;
    if (error) throw error;
  }

  static async updatePost(postId: string, updates: Partial<Post>): Promise<Post> {
    // Map frontend fields to database fields
    const dbUpdates: any = {};
    if (updates.content !== undefined) dbUpdates.content = updates.content;
    if (updates.media_url !== undefined) dbUpdates.image_url = updates.media_url;
    if (updates.media_type !== undefined) dbUpdates.media_type = updates.media_type;
    if (updates.has_appointments !== undefined) dbUpdates.show_appointment_button = updates.has_appointments;
    if (updates.likes_count !== undefined) dbUpdates.likes_count = updates.likes_count;
    if (updates.comments_count !== undefined) dbUpdates.comments_count = updates.comments_count;
    if (updates.views_count !== undefined) dbUpdates.views_count = updates.views_count;

    const { data, error } = await supabase
      .from('posts')
      .update(dbUpdates)
      .eq('id', postId)
      .select(`
        *,
        profiles!user_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .single();
    
    if (error) throw error;
    return this.mapPostData(data);
  }

  static async toggleBookmark(postId: string, userId: string): Promise<{ success: boolean; action: 'added' | 'removed' }> {
    const { data: existing } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();

    if (existing) {
      await supabase.from('bookmarks').delete().eq('user_id', userId).eq('post_id', postId);
      return { success: true, action: 'removed' };
    } else {
      await supabase.from('bookmarks').insert([{ user_id: userId, post_id: postId }]);
      return { success: true, action: 'added' };
    }
  }

  static async checkIfBookmarked(userId: string, postId: string): Promise<boolean> {
    const { data } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    return !!data;
  }

  static async getComments(postId: string): Promise<Comment[]> {
    return this.handleResponse<Comment[]>(
      supabase
        .from('comments')
        .select(`
          *,
          profiles!user_id (username, display_name, avatar_url, is_verified)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })
    );
  }

  static async createComment(postId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, user_id: userId, content }])
      .select(`
        *,
        profiles!user_id (username, display_name, avatar_url, is_verified)
      `)
      .single();

    if (error) throw error;
    return {
      ...data,
      username: data.profiles?.username,
      display_name: data.profiles?.display_name,
      avatar_url: data.profiles?.avatar_url,
      is_verified: !!data.profiles?.is_verified
    };
  }

  static async getTrends(): Promise<{ tag: string; count: number }[]> {
    return [
      { tag: 'Nexus', count: 120 },
      { tag: 'Social', count: 85 },
      { tag: 'Tech', count: 64 }
    ];
  }

  static async checkIfFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return !!data;
  }

  static async followUser(followerId: string, followingId: string): Promise<boolean> {
    const isFollowing = await this.checkIfFollowing(followerId, followingId);
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', followerId).eq('following_id', followingId);
      return false;
    } else {
      await supabase.from('follows').insert([{ follower_id: followerId, following_id: followingId }]);
      return true;
    }
  }

  static async recordProfileView(profileId: string, viewerId: string): Promise<void> {
    await supabase.rpc('record_profile_view_atomic', { p_profile_id: profileId, p_viewer_id: viewerId });
  }

  static async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('user_blocks')
      .insert([{ blocker_id: blockerId, blocked_id: blockedId }]);
    if (error) throw error;
  }

  static async getSuggestedUsers(userId: string): Promise<any[]> {
    return this.handleResponse<any[]>(
      supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(5)
    );
  }

  static async getNexuarios(): Promise<any[]> {
    return this.handleResponse<any[]>(
      supabase
        .from('profiles')
        .select('*')
        .order('followers_count', { ascending: false })
        .limit(10)
    );
  }

  static async incrementPostViews(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('record_view_atomic', { p_post_id: postId, p_user_id: userId });
    if (error) throw error;
    return true; // Simplificado: asumimos que siempre es una vista válida por ahora
  }

  static async recordUniqueView(postId: string, userId: string): Promise<void> {
    await this.incrementPostViews(postId, userId);
  }

  static async isBenefitActive(benefitSlug: string): Promise<boolean> {
    const { data } = await supabase
      .from('verified_benefits')
      .select('is_active')
      .eq('slug', benefitSlug)
      .maybeSingle();
    return data?.is_active ?? false;
  }

  static async reportPost(postId: string, reporterId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('user_reports')
      .insert([{
        reporter_id: reporterId,
        target_id: postId,
        reason: `Post Report: ${reason}`,
        status: 'pending'
      }]);
    if (error) throw error;
  }

  static async getBookmarks(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post_id,
        posts!post_id (
          *,
          profiles!user_id (username, display_name, avatar_url, is_verified)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data || []).map((b: any) => this.mapPostData(b.posts));
    return this.enrichPostsWithLikes(posts, userId);
  }

  private static async enrichPostsWithLikes(posts: Post[], currentUserId?: string): Promise<Post[]> {
    if (!currentUserId || posts.length === 0) {
      return posts.map(p => ({ ...p, user_has_liked: false }));
    }

    const postIds = posts.map(p => p.id);
    const { data: likes } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', currentUserId)
      .in('post_id', postIds);
    
    const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
    return posts.map(p => ({
      ...p,
      user_has_liked: likedPostIds.has(p.id)
    }));
  }
}
