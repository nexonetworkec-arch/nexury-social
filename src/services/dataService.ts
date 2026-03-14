import { Post, Comment } from '../types';
import { supabase } from '../lib/supabase';

// Este servicio actúa como una capa de abstracción. 
// Ahora consume Supabase directamente para una arquitectura de producción.

export const dataService = {
  // POSTS
  async getPosts(currentUserId?: string, type: 'recent' | 'smart' = 'recent'): Promise<Post[]> {
    if (type === 'smart') {
      return this.getSmartPosts(currentUserId);
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            is_super_admin,
            is_live
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const posts = (data || []).map((post: any) => ({
        ...post,
        username: post.profiles?.username,
        display_name: post.profiles?.display_name,
        avatar_url: post.profiles?.avatar_url,
        is_verified: !!post.profiles?.is_verified
      }));

      return this.enrichPostsWithLikes(posts, currentUserId);
    } catch (err: any) {
      console.error('Error in getPosts:', err);
      // Fallback simple query if join fails (e.g. missing columns)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return this.enrichPostsWithLikes(data || [], currentUserId);
    }
  },

  async getUserPosts(userId: string, currentUserId?: string): Promise<Post[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
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

      const posts = (data || []).map((post: any) => ({
        ...post,
        username: post.profiles?.username,
        display_name: post.profiles?.display_name,
        avatar_url: post.profiles?.avatar_url,
        is_verified: !!post.profiles?.is_verified
      }));

      return this.enrichPostsWithLikes(posts, currentUserId);
    } catch (err) {
      console.error('Error in getUserPosts:', err);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return this.enrichPostsWithLikes(data || [], currentUserId);
    }
  },

  async getSmartPosts(currentUserId?: string): Promise<Post[]> {
    try {
      // Obtener configuración global para los multiplicadores
      const settings = await this.getGlobalSettings();
      const isSmartEnabled = settings.smart_feed_enabled ?? true;
      const verifiedBoostMultiplier = settings.verified_boost ?? 1.5;
      const adminBoostMultiplier = settings.admin_boost ?? 3.0;

      if (!isSmartEnabled) {
        return this.getPosts(currentUserId, 'recent');
      }

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            is_verified,
            is_super_admin,
            is_live
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      const now = new Date();
      const posts = (data || []).map((post: any) => {
        const createdAt = new Date(post.created_at);
        const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        
        const interactionScore = 
          (post.likes_count * 50) + 
          (post.comments_count * 30) + 
          (post.views_count * 2);
        
        const mediaBonus = post.image_url ? 1.2 : 1.0;
        const verifiedBonus = post.profiles?.is_verified ? verifiedBoostMultiplier : 1.0;
        const superAdminBonus = post.profiles?.is_super_admin ? adminBoostMultiplier : 1.0;
        
        const gravity = 1.8;
        const timeDecay = Math.pow(hoursOld + 2, gravity);
        
        const finalScore = (interactionScore * mediaBonus * verifiedBonus * superAdminBonus) / timeDecay;

        return {
          ...post,
          username: post.profiles?.username,
          display_name: post.profiles?.display_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: !!post.profiles?.is_verified,
          _score: finalScore
        };
      });

      const sortedPosts = posts
        .sort((a, b) => b._score - a._score)
        .slice(0, 50);

      return this.enrichPostsWithLikes(sortedPosts, currentUserId);
    } catch (err) {
      console.error('Error in getSmartPosts:', err);
      return this.getPosts(currentUserId, 'recent');
    }
  },

  async enrichPostsWithLikes(posts: Post[], currentUserId?: string): Promise<Post[]> {
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
  },

  async createPost(userId: string, content: string, imageUrl?: string, mediaType: 'image' | 'video' = 'image', showAppointmentButton: boolean = false): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert([{ user_id: userId, content, image_url: imageUrl, media_type: mediaType, show_appointment_button: showAppointmentButton }])
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
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
  },

  async deletePost(postId: string, userId: string, isAdmin: boolean = false) {
    try {
      // 1. Eliminar likes asociados (si no hay cascade delete)
      await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId);

      // 2. Eliminar comentarios asociados (si no hay cascade delete)
      await supabase
        .from('comments')
        .delete()
        .eq('post_id', postId);

      // 3. Eliminar el post
      let query = supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      // Si no es admin, solo puede borrar sus propios posts
      if (!isAdmin) {
        query = query.eq('user_id', userId);
      }

      const { error } = await query;

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error in deletePost service:', error);
      throw error;
    }
  },

  async reportPost(postId: string, userId: string, reason: string) {
    // En una app real, crearíamos una tabla 'reports'
    console.log(`Post ${postId} reportado por ${userId}: ${reason}`);
    return { success: true };
  },

  async likePost(postId: string, userId: string, hasLiked: boolean = false) {
    try {
      if (hasLiked) {
        // Quitar like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('post_id', postId);
        
        if (deleteError) throw deleteError;
        return { success: true, action: 'unliked' };
      } else {
        // Dar like
        const { error } = await supabase
          .from('likes')
          .insert([{ user_id: userId, post_id: postId }]);

        if (error) {
          if (error.code === '23505') return { success: true, action: 'already_liked' };
          throw error;
        }

        // Crear notificación para el autor del post
        try {
          const { data: post } = await supabase
            .from('posts')
            .select('user_id')
            .eq('id', postId)
            .single();
          
          if (post && post.user_id !== userId) {
            await this.createNotification({
              user_id: post.user_id,
              from_user_id: userId,
              type: 'like',
              post_id: postId
            });
          }
        } catch (nErr) {
          console.error('Error creating like notification:', nErr);
        }

        return { success: true, action: 'liked' };
      }
    } catch (error) {
      console.error('Error in likePost service:', error);
      throw error;
    }
  },

  // COMMENTS
  async getComments(postId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((comment: any) => ({
      ...comment,
      username: comment.profiles?.username,
      display_name: comment.profiles?.display_name,
      avatar_url: comment.profiles?.avatar_url
    }));
  },

  async createComment(postId: string, userId: string, content: string): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert([{ post_id: postId, user_id: userId, content }])
      .select(`
        *,
        profiles:user_id (
          username,
          avatar_url,
          display_name
        )
      `)
      .single();

    if (error) throw error;

    // Crear notificación para el autor del post
    try {
      const { data: post } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      
      if (post && post.user_id !== userId) {
        await this.createNotification({
          user_id: post.user_id,
          from_user_id: userId,
          type: 'comment',
          post_id: postId,
          content: content.length > 50 ? content.substring(0, 47) + '...' : content
        });
      }
    } catch (nErr) {
      console.error('Error creating comment notification:', nErr);
    }

    return {
      ...data,
      username: data.profiles?.username,
      display_name: data.profiles?.display_name,
      avatar_url: data.profiles?.avatar_url
    };
  },

  // USERS
  async registerUser(userData: { email: string, password: string }): Promise<any> {
    // El registro ahora se maneja vía Supabase Auth en AuthContext
    throw new Error('Usa Supabase Auth para registrar usuarios');
  },

  async syncUser(email: string, supabaseId: string): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseId)
      .single();

    if (error) throw error;
    return data;
  },

  async login(credentials: { email: string, password: string }): Promise<any> {
    // El login ahora se maneja vía Supabase Auth en AuthContext
    throw new Error('Usa Supabase Auth para iniciar sesión');
  },

  async updateUser(userId: string, userData: { displayName: string, bio: string, avatarUrl: string, username?: string }): Promise<any> {
    const updateData: any = {
      display_name: userData.displayName,
      bio: userData.bio,
      avatar_url: userData.avatarUrl
    };
    
    if (userData.username) {
      updateData.username = userData.username;
    }

    // Usamos update en lugar de upsert para evitar sobrescribir columnas no deseadas
    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
    return data;
  },

  async uploadMedia(userId: string, file: File, bucket: 'avatars' | 'posts'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    try {
      // Intentar subir el archivo
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) {
        // Si el error es que el bucket no existe, intentamos crearlo (esto puede fallar por permisos)
        if (uploadError.message.includes('Bucket not found') || (uploadError as any).status === 404) {
          try {
            console.log(`Intentando crear el bucket '${bucket}' automáticamente...`);
            const { error: createError } = await supabase.storage.createBucket(bucket, {
              public: true,
              allowedMimeTypes: ['image/*', 'video/*'],
              fileSizeLimit: 5242880 // 5MB
            });

            if (!createError) {
              // Si se creó con éxito, reintentamos la subida
              const { error: retryError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file);
              
              if (!retryError) {
                const { data: { publicUrl } } = supabase.storage
                  .from(bucket)
                  .getPublicUrl(filePath);
                return publicUrl;
              }
            }
          } catch (e) {
            console.error('No se pudo crear el bucket automáticamente:', e);
          }
          
          throw new Error(`El bucket de almacenamiento '${bucket}' no existe en Supabase. Por favor, ve al panel de Supabase -> Storage y crea un bucket llamado '${bucket}' con acceso público.`);
        }
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error(`Error uploading to bucket ${bucket}:`, error);
      throw error;
    }
  },

  async updatePost(postId: string, userId: string, content: string, imageUrl?: string, mediaType?: 'image' | 'video', showAppointmentButton?: boolean): Promise<Post> {
    const updateData: any = { content };
    if (imageUrl !== undefined) updateData.image_url = imageUrl;
    if (mediaType !== undefined) updateData.media_type = mediaType;
    if (showAppointmentButton !== undefined) updateData.show_appointment_button = showAppointmentButton;

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', postId)
      .eq('user_id', userId)
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
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
  },

  async getUserCounts(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('followers_count, following_count, total_likes_received')
      .eq('id', userId)
      .single();

    if (error) {
      // Fallback a conteo manual si las columnas no existen o hay error
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      return {
        followers: followers || 0,
        following: following || 0,
        total_likes: 0
      };
    }

    return {
      followers: data.followers_count || 0,
      following: data.following_count || 0,
      total_likes: data.total_likes_received || 0
    };
  },

  async checkIfFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    
    return !!data;
  },

  async getPostLikesCount(postId: string): Promise<number> {
    const { count, error } = await supabase
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);
    
    if (error) throw error;
    return count || 0;
  },

  async getTrends(): Promise<{ category: string, title: string, posts: string }[]> {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('content')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;

      const hashtags: { [key: string]: number } = {};
      data.forEach(post => {
        const matches = post.content?.match(/#\w+/g);
        if (matches) {
          matches.forEach(tag => {
            hashtags[tag] = (hashtags[tag] || 0) + 1;
          });
        }
      });

      const dynamicTrends = Object.entries(hashtags)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({
          category: "Tendencia",
          title: tag,
          posts: count > 1000 ? `${(count / 1000).toFixed(1)}k` : `${count}`
        }));

      return dynamicTrends;
    } catch (err) {
      console.error('Error fetching trends:', err);
      return [];
    }
  },

  // LIVE STREAMS
  async getActiveLiveStreams(): Promise<any[]> {
    const { data, error } = await supabase
      .from('live_streams')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name,
          avatar_url,
          is_verified
        )
      `)
      .eq('is_active', true)
      .order('started_at', { ascending: false });

    if (error) {
      console.warn('live_streams table might be missing:', error);
      return [];
    }

    return (data || []).map((stream: any) => ({
      ...stream,
      username: stream.profiles?.username,
      display_name: stream.profiles?.display_name,
      avatar_url: stream.profiles?.avatar_url,
      is_verified: !!stream.profiles?.is_verified
    }));
  },

  async startLiveStream(userId: string, title: string): Promise<any> {
    const { data, error } = await supabase
      .from('live_streams')
      .insert([{ 
        user_id: userId, 
        title, 
        is_active: true, 
        viewer_count: 0,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar perfil para indicar que está en vivo
    await supabase
      .from('profiles')
      .update({ is_live: true })
      .eq('id', userId);

    return data;
  },

  async endLiveStream(streamId: string, userId: string) {
    const { error } = await supabase
      .from('live_streams')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', streamId)
      .eq('user_id', userId);

    if (error) throw error;

    // Actualizar perfil
    await supabase
      .from('profiles')
      .update({ is_live: false })
      .eq('id', userId);
  },

  async updateLiveViewers(streamId: string, count: number) {
    await supabase
      .from('live_streams')
      .update({ viewer_count: count })
      .eq('id', streamId);
  },

  async recordUniqueView(viewerId: string, targetId: string, targetType: 'post' | 'profile'): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('record_unique_view', {
        p_viewer_id: viewerId,
        p_target_id: targetId,
        p_target_type: targetType
      });
      
      if (error) {
        // Si el RPC falla (ej. no existe aún), intentamos inserción directa
        if (targetType === 'post') {
          const { error: insertError } = await supabase
            .from('post_views')
            .insert({ post_id: targetId, user_id: viewerId });
          
          if (insertError) {
            if (insertError.code === '23505') return false; // Ya existe
            throw insertError;
          }
          return true;
        }
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error('Error recording unique view:', error);
      return false;
    }
  },

  async incrementPostViews(postId: string, viewerId?: string) {
    if (viewerId) {
      return this.recordUniqueView(viewerId, postId, 'post');
    }

    try {
      // Fallback para usuarios no logueados (incremento simple)
      await supabase.rpc('increment_views', { post_id: postId });
    } catch (err) {
      // Fallback si RPC no existe: update directo (menos atómico pero funcional)
      try {
        const { data } = await supabase
          .from('posts')
          .select('views_count')
          .eq('id', postId)
          .single();
        
        if (data) {
          await supabase
            .from('posts')
            .update({ views_count: (data.views_count || 0) + 1 })
            .eq('id', postId);
        }
      } catch (fallbackErr) {
        console.error('Error incrementing views:', fallbackErr);
      }
    }
  },

  async followUser(followerId: string, followingId: string, isFollowing: boolean = false) {
    try {
      if (isFollowing) {
        // Dejar de seguir
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', followerId)
          .eq('following_id', followingId);
        
        if (error) throw error;
        return { success: true, unfollowed: true };
      } else {
        // Seguir
        const { error } = await supabase
          .from('follows')
          .insert([{ follower_id: followerId, following_id: followingId }]);

        if (error) {
          if (error.code === '23505') return { success: true, alreadyFollowing: true };
          throw error;
        }

        // Crear notificación para el usuario seguido
        try {
          await this.createNotification({
            user_id: followingId,
            from_user_id: followerId,
            type: 'follow'
          });
        } catch (nErr) {
          console.error('Error creating follow notification:', nErr);
        }

        return { success: true };
      }
    } catch (error) {
      console.error('Error in followUser service:', error);
      throw error;
    }
  },

  // ADMIN
  async getAdminStats() {
    const safeCount = async (table: string) => {
      try {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count || 0;
      } catch (err) {
        console.warn(`Error counting ${table}:`, err);
        return 0;
      }
    };

    const [
      users,
      posts,
      comments,
      likes,
      appointments,
      ads
    ] = await Promise.all([
      safeCount('profiles'),
      safeCount('posts'),
      safeCount('comments'),
      safeCount('likes'),
      safeCount('appointments'),
      safeCount('ads')
    ]);
    
    return {
      users,
      posts,
      comments,
      likes,
      appointments,
      ads
    };
  },

  async getAdminUsers() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async searchUsers(query: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(20);

    if (error) throw error;
    return data;
  },

  async getAdministrators() {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async setAdminStatus(userId: string, isAdmin: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId)
      .eq('is_super_admin', false) // No se puede quitar el admin a un super admin por aquí
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAdminPermissions(userId: string, permissions: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ permissions })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async verifyUser(userId: string, isVerified: boolean) {
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_verified: isVerified })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async requestVerification(userId: string) {
    // En una app real, esto crearía una entrada en una tabla de solicitudes.
    // Por ahora, enviamos una notificación a los administradores.
    try {
      const admins = await this.getAdministrators();
      
      for (const admin of admins) {
        await this.createNotification({
          user_id: admin.id,
          from_user_id: userId,
          type: 'system',
          content: `Un usuario ha solicitado la verificación de su perfil.`
        });
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error in requestVerification:', error);
      throw error;
    }
  },

  async blockUser(userId: string, isBlocked: boolean) {
    // No permitir bloquear a un Super Admin
    const { data, error } = await supabase
      .from('profiles')
      .update({ is_blocked: isBlocked })
      .eq('id', userId)
      .eq('is_super_admin', false) // Solo si no es super admin
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') throw new Error('No se puede bloquear a un Super Administrador');
      throw error;
    }
    return data;
  },

  async deleteUser(userId: string) {
    // No permitir eliminar a un Super Admin
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)
      .eq('is_super_admin', false); // Solo si no es super admin

    if (profileError) throw profileError;

    return { success: true };
  },

  async reportUser(targetId: string, reporterId: string, reason: string) {
    try {
      const { data, error } = await supabase
        .from('user_reports')
        .insert([{ 
          target_id: targetId, 
          reporter_id: reporterId, 
          reason,
          status: 'pending',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reporting user:', error);
      throw error;
    }
  },

  async blockUserPersonal(blockerId: string, blockedId: string) {
    try {
      const { data, error } = await supabase
        .from('user_blocks')
        .insert([{ 
          blocker_id: blockerId, 
          blocked_id: blockedId,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error blocking user personally:', error);
      throw error;
    }
  },

  async getAdminPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          username,
          display_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((post: any) => ({
      ...post,
      username: post.profiles?.username,
      display_name: post.profiles?.display_name
    }));
  },

  async getSuggestedUsers(currentUserId?: string): Promise<any[]> {
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, is_live, bio, created_at')
      .order('created_at', { ascending: false }); // Mostrar los más recientes primero, pero sin límite

    if (currentUserId) {
      query = query.neq('id', currentUserId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    // Normalización: Asegurar que todos los usuarios tengan valores por defecto si faltan
    return (data || []).map(profile => ({
      ...profile,
      display_name: profile.display_name || profile.username || 'Usuario',
      avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
      is_verified: !!profile.is_verified
    }));
  },

  async getNexuarios(currentUserId?: string): Promise<any[]> {
    let query = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, is_verified, is_live, bio, created_at')
      .order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(profile => ({
      ...profile,
      display_name: profile.display_name || profile.username || 'Nexuario',
      avatar_url: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`,
      is_verified: !!profile.is_verified
    }));
  },

  async getUserProfile(userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserStatus(userId: string, isOnline: boolean) {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        is_online: isOnline,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) console.error('Error updating status:', error);
  },

  async getUserProfileByUsername(username: string): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  },

  // NOTIFICATIONS
  async getNotifications(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:from_user_id (username, display_name, avatar_url, is_verified)
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
  },

  async createNotification(notif: { user_id: string, from_user_id: string, type: string, post_id?: string, content?: string }) {
    const { data, error } = await supabase
      .from('notifications')
      .insert([notif])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: 1 })
      .eq('id', notificationId);
    
    if (error) throw error;
    return { success: true };
  },

  async getUnreadNotificationsCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', 0);
    
    if (error) throw error;
    return count || 0;
  },

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .neq('sender_id', userId)
      .eq('is_read', false)
      .in('conversation_id', (
        await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId)
      ).data?.map(c => c.conversation_id) || []);
    
    if (error) throw error;
    return count || 0;
  },

  async markMessagesAsRead(conversationId: string, userId: string) {
    // 1. Marcar mensajes como leídos
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId);
    
    if (error) throw error;

    // 2. Marcar notificaciones de tipo 'message' como leídas para este usuario
    try {
      await supabase
        .from('notifications')
        .update({ read: 1 })
        .eq('user_id', userId)
        .eq('type', 'message');
    } catch (nErr) {
      console.error('Error clearing message notifications:', nErr);
    }

    return { success: true };
  },

  async savePushToken(userId: string, token: string, deviceType: string = 'web') {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({ 
        user_id: userId, 
        token: token, 
        device_type: deviceType,
        last_used_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id,token' 
      });
    
    if (error) throw error;
    return { success: true };
  },

  // BOOKMARKS
  async getBookmarks(userId: string): Promise<Post[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        post_id,
        posts:post_id (
          *,
          profiles:user_id (
            username,
            display_name,
            avatar_url,
            is_verified
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const posts = (data || [])
      .filter((b: any) => b.posts)
      .map((b: any) => {
        const post = b.posts;
        return {
          ...post,
          username: post.profiles?.username,
          display_name: post.profiles?.display_name,
          avatar_url: post.profiles?.avatar_url,
          is_verified: !!post.profiles?.is_verified,
          user_has_bookmarked: true
        };
      });

    return posts;
  },

  async toggleBookmark(postId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .insert([{ user_id: userId, post_id: postId }]);

      if (error) {
        if (error.code === '23505') {
          const { error: deleteError } = await supabase
            .from('bookmarks')
            .delete()
            .eq('user_id', userId)
            .eq('post_id', postId);
          
          if (deleteError) throw deleteError;
          return { success: true, action: 'removed' };
        }
        throw error;
      }
      return { success: true, action: 'added' };
    } catch (error) {
      console.error('Error in toggleBookmark service:', error);
      throw error;
    }
  },

  async checkIfBookmarked(postId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('post_id')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    
    return !!data;
  },
  async getAppointments(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        requester:requester_id (username, display_name, avatar_url),
        receiver:receiver_id (username, display_name, avatar_url)
      `)
      .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('appointment_date', { ascending: true });

    if (error) throw error;

    return (data || []).map((app: any) => ({
      ...app,
      requester_username: app.requester?.username,
      requester_display_name: app.requester?.display_name,
      requester_avatar: app.requester?.avatar_url,
      receiver_username: app.receiver?.username,
      receiver_display_name: app.receiver?.display_name,
      receiver_avatar: app.receiver?.avatar_url
    }));
  },

  async createAppointment(appointmentData: { requesterId: string, receiverId: string, title: string, description: string, appointmentDate: string }): Promise<any> {
    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        requester_id: appointmentData.requesterId,
        receiver_id: appointmentData.receiverId,
        title: appointmentData.title,
        description: appointmentData.description,
        appointment_date: appointmentData.appointmentDate
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAppointmentStatus(appointmentId: string, status: string): Promise<any> {
    const { data, error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // CHAT
  async getConversations(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations:conversation_id (
            id,
            created_at,
            last_message,
            last_message_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      const conversations = await Promise.all((data || [])
        .filter((item: any) => item.conversations) // Asegurar que la conversación existe y es legible
        .map(async (item: any) => {
          const conv = item.conversations;
          
          // Obtener todos los participantes de esta conversación
          const { data: participants, error: pError } = await supabase
            .from('conversation_participants')
            .select(`
              user:user_id (id, username, display_name, avatar_url, is_verified)
            `)
            .eq('conversation_id', conv.id);

          if (pError) console.error('Error fetching participants:', pError);

          // Obtener mensajes no leídos
          const { count: unreadCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .eq('is_read', false)
            .neq('sender_id', userId);

          return {
            ...conv,
            unread_count: unreadCount || 0,
            participants: participants?.map((p: any) => p.user).filter(u => u.id !== userId) || []
          };
        })
      );

      return conversations.sort((a, b) => 
        new Date(b.last_message_at || b.created_at).getTime() - 
        new Date(a.last_message_at || a.created_at).getTime()
      );
    } catch (error) {
      console.error('Error in getConversations:', error);
      return [];
    }
  },

  async getMessages(conversationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async sendMessage(conversationId: string, senderId: string, content: string): Promise<any> {
    const { data, error } = await supabase
      .from('messages')
      .insert([{ conversation_id: conversationId, sender_id: senderId, content }])
      .select()
      .single();

    if (error) throw error;

    // Actualizar el último mensaje de la conversación
    await supabase
      .from('conversations')
      .update({ 
        last_message: content, 
        last_message_at: new Date().toISOString() 
      })
      .eq('id', conversationId);

    // Crear notificación para el destinatario
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId)
        .neq('user_id', senderId);
      
      if (participants && participants.length > 0) {
        for (const p of participants) {
          await this.createNotification({
            user_id: p.user_id,
            from_user_id: senderId,
            type: 'message',
            content: content.length > 50 ? content.substring(0, 47) + '...' : content
          });
        }
      }
    } catch (nErr) {
      console.error('Error creating message notification:', nErr);
    }

    return data;
  },

  async getOrCreateConversation(user1Id: string, user2Id: string): Promise<string> {
    try {
      // 1. Buscar si ya existe una conversación entre ambos
      const { data: user1Convs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user1Id);

      const { data: user2Convs } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user2Id);

      const commonConv = user1Convs?.find(c1 => 
        user2Convs?.some(c2 => c2.conversation_id === c1.conversation_id)
      );

      if (commonConv) return commonConv.conversation_id;

      // 2. Si no existe, crearla
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert([{}])
        .select()
        .single();

      if (convError) throw convError;

      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: newConv.id, user_id: user1Id },
          { conversation_id: newConv.id, user_id: user2Id }
        ]);

      if (partError) throw partError;

      return newConv.id;
    } catch (error) {
      console.error('Error in getOrCreateConversation:', error);
      throw error;
    }
  },

  // VERIFIED BENEFITS
  async getVerifiedBenefits(): Promise<any[]> {
    const { data, error } = await supabase
      .from('verified_benefits')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async isBenefitActive(slug: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('verified_benefits')
      .select('is_active')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error) return false;
    return !!data?.is_active;
  },

  async createVerifiedBenefit(benefit: { slug: string, name: string, description: string, icon_name: string }) {
    const { data, error } = await supabase
      .from('verified_benefits')
      .insert([{ ...benefit, is_active: false }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateVerifiedBenefit(id: string, updates: any) {
    const { data, error } = await supabase
      .from('verified_benefits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteVerifiedBenefit(id: string) {
    const { error } = await supabase
      .from('verified_benefits')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  // ADS
  async getAds(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createAd(ad: any) {
    const { data, error } = await supabase
      .from('ads')
      .insert([{ ...ad, is_active: false, impressions: 0, clicks: 0 }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAd(id: string, updates: any) {
    const { data, error } = await supabase
      .from('ads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAd(id: string) {
    const { error } = await supabase
      .from('ads')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  async recordAdImpression(id: string) {
    try {
      await supabase.rpc('increment_ad_impressions', { ad_id: id });
    } catch (err) {
      // Fallback
      const { data } = await supabase.from('ads').select('impressions').eq('id', id).single();
      if (data) {
        await supabase.from('ads').update({ impressions: (data.impressions || 0) + 1 }).eq('id', id);
      }
    }
  },

  async recordAdClick(id: string) {
    try {
      await supabase.rpc('increment_ad_clicks', { ad_id: id });
    } catch (err) {
      // Fallback
      const { data } = await supabase.from('ads').select('clicks').eq('id', id).single();
      if (data) {
        await supabase.from('ads').update({ clicks: (data.clicks || 0) + 1 }).eq('id', id);
      }
    }
  },

  async getAdStats() {
    const { data, error } = await supabase
      .from('ads')
      .select('id, title, impressions, clicks');
    
    if (error) throw error;
    return data || [];
  },

  // GLOBAL SETTINGS
  async getGlobalSettings() {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Si no existe, devolvemos valores por defecto
          return {
            maintenance_mode: false,
            registrations_open: true,
            email_notifications: true,
            ai_moderation: true
          };
        }
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching global settings:', error);
      return {
        maintenance_mode: false,
        registrations_open: true,
        email_notifications: true,
        ai_moderation: true
      };
    }
  },

  async updateGlobalSettings(settings: any) {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .upsert([{ id: 1, ...settings, updated_at: new Date().toISOString() }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating global settings:', error);
      throw error;
    }
  },

  // ADMIN UTILITIES
  async optimizeTable(tableName: string) {
    // Simulamos una operación de base de datos
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, message: `Tabla ${tableName} optimizada e índices reconstruidos.` };
  },

  async getServerLogs() {
    // Simulamos logs del sistema
    return [
      { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'Sistema iniciado correctamente.' },
      { id: 2, timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), level: 'INFO', message: 'Backup automático completado.' },
      { id: 3, timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), level: 'WARN', message: 'Latencia inusual detectada en región us-west-2.' },
      { id: 4, timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), level: 'INFO', message: 'Nuevo administrador promovido: @admin_test.' },
      { id: 5, timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), level: 'ERROR', message: 'Fallo en intento de conexión SSH desde IP no autorizada.' }
    ];
  }
};
