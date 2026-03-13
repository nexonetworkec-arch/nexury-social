import React, { useState, useEffect } from 'react';
import { Settings, Calendar, LogOut, Shield, ShieldAlert, Heart, BarChart2, MessageSquare, Star, Award, Headphones, Video, ShieldOff, Palette, CheckCircle2, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { dataService } from '../../services/dataService';
import { pushNotificationService } from '../../services/pushNotificationService';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { UserStatus } from '../ui/UserStatus';
import { SEO } from '../common/SEO';
import { Post as PostType, VerifiedBenefit } from '../../types';
import { Post as FeedPost } from '../feed/Post';
import { EditProfileModal } from './EditProfileModal';
import { RequestAppointmentModal } from '../appointments/RequestAppointmentModal';
import { supabase } from '../../lib/supabase';

const ICON_MAP: Record<string, any> = {
  Star, Award, Headphones, Video, ShieldOff, Palette, Settings, BarChart2, MessageSquare, Shield, ShieldAlert, Heart, Calendar, Bell
};

export const ProfileView = ({ userId }: { userId?: string | null }) => {
  const { user: currentUser, logout, refreshUser } = useAuth();
  const [profileUser, setProfileUser] = useState<any>(null);
  const [posts, setPosts] = useState<PostType[]>([]);
  const [benefits, setBenefits] = useState<VerifiedBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [following, setFollowing] = useState(false);
  const [stats, setStats] = useState({ followers: 0, following: 0, total_likes: 0 });
  const [isAppointmentsEnabled, setIsAppointmentsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const isOwnProfile = !userId || userId === currentUser?.id;
  const targetId = userId || currentUser?.id;

  const handleRequestNotifications = async () => {
    if (!currentUser) return;
    const granted = await pushNotificationService.requestPermission(currentUser.id);
    if (granted) {
      setNotificationStatus('granted');
    } else {
      setNotificationStatus(Notification.permission);
    }
  };

  useEffect(() => {
    const checkBenefit = async () => {
      const active = await dataService.isBenefitActive('appointments');
      setIsAppointmentsEnabled(active);
    };
    checkBenefit();
  }, []);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!targetId) return;
      setLoading(true);
      try {
        const [userData, userStats] = await Promise.all([
          dataService.getUserProfile(targetId),
          dataService.getUserCounts(targetId)
        ]);
        
        setProfileUser(userData);
        setStats(userStats);

        // Registrar vista única si no es su propio perfil
        if (!isOwnProfile && currentUser && targetId) {
          dataService.recordUniqueView(currentUser.id, targetId, 'profile');
        }

        if (!isOwnProfile && currentUser) {
          const isFollowing = await dataService.checkIfFollowing(currentUser.id, targetId);
          setFollowing(isFollowing);
        }

        // Fetch user posts
        const allPosts = await dataService.getPosts(currentUser?.id);
        setPosts(allPosts.filter(p => p.user_id === targetId));

        // Fetch benefits if verified
        if (userData.is_verified) {
          const allBenefits = await dataService.getVerifiedBenefits();
          setBenefits(allBenefits.filter(b => b.is_active));
        }

      } catch (error) {
        console.error('Error fetching profile data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();

    // --- REAL-TIME LISTENERS ---
    if (!targetId) return;

    // 1. Listen for profile changes
    const profileChannel = supabase
      .channel(`profile_view:${targetId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${targetId}` 
      }, (payload) => {
        setProfileUser((prev: any) => ({ ...prev, ...payload.new }));
        setStats((prev: any) => ({
          ...prev,
          followers: payload.new.followers_count ?? prev.followers,
          following: payload.new.following_count ?? prev.following,
          total_likes: payload.new.total_likes_received ?? prev.total_likes
        }));
      })
      .subscribe();

    // 2. Listen for post changes for this user
    const postsChannel = supabase
      .channel(`profile_posts:${targetId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'posts', 
        filter: `user_id=eq.${targetId}` 
      }, async (payload) => {
        const { data: newPost } = await supabase
          .from('posts_with_profiles')
          .select('*')
          .eq('id', payload.new.id)
          .single();
        
        if (newPost) {
          setPosts(prev => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            return [{ ...newPost, user_has_liked: false } as PostType, ...prev];
          });
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'posts', 
        filter: `user_id=eq.${targetId}` 
      }, async (payload) => {
        const { data: updatedPost } = await supabase
          .from('posts_with_profiles')
          .select('*')
          .eq('id', payload.new.id)
          .single();
        
        if (updatedPost) {
          setPosts(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...updatedPost } : p));
        }
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'posts', 
        filter: `user_id=eq.${targetId}` 
      }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [targetId, currentUser?.id]);

  const handleFollow = async () => {
    if (!currentUser || !targetId || isOwnProfile) return;
    const newFollowingState = !following;
    setFollowing(newFollowingState);
    try {
      await dataService.followUser(currentUser.id, targetId);
      // Actualizar contadores localmente
      setStats(prev => ({
        ...prev,
        followers: newFollowingState ? prev.followers + 1 : prev.followers - 1
      }));
      await refreshUser();
    } catch (error) {
      console.error('Error following user', error);
      setFollowing(!newFollowingState);
    }
  };

  const { openChat } = useChat();

  const handleMessage = async () => {
    if (!currentUser || !targetId) return;
    openChat(targetId);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="text-slate-400 font-medium">Cargando perfil...</p>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <p className="text-slate-500 font-bold">Usuario no encontrado</p>
      </div>
    );
  }

  const profileSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profileUser.display_name,
    "alternateName": profileUser.username,
    "description": profileUser.bio,
    "image": profileUser.avatar_url,
    "url": `${window.location.origin}/profile/${profileUser.username}`,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": `${window.location.origin}/profile/${profileUser.username}`
    }
  };

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white p-4 sm:p-8 pb-24 sm:pb-8">
      <SEO 
        title={profileUser.display_name} 
        description={profileUser.bio || `Perfil de ${profileUser.display_name} en Nexury`} 
        image={profileUser.avatar_url}
        type="profile"
        schema={profileSchema}
      />
      
      <div className="flex flex-col items-center gap-4 sm:gap-6 mt-4">
        <div className="relative group">
          <img src={profileUser.avatar_url} className="w-24 h-24 sm:w-32 sm:h-32 rounded-[2rem] sm:rounded-[2.5rem] object-cover shadow-xl border-4 border-white" alt={profileUser.username} />
          {isOwnProfile && (
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="absolute inset-0 bg-black/20 rounded-[2rem] sm:rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-sm"
            >
              Editar
            </button>
          )}
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{profileUser.display_name}</h2>
            {profileUser.is_verified && (
              <VerifiedBadge size={20} showTooltip />
            )}
            <div className="flex gap-1">
              {profileUser.is_super_admin ? (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Super Admin</span>
              ) : profileUser.is_admin ? (
                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Admin</span>
              ) : null}
            </div>
          </div>
          <p className="text-slate-500 text-sm sm:text-base">@{profileUser.username}</p>
          <div className="flex justify-center mt-1">
            <UserStatus userId={profileUser.id} lastSeen={profileUser.last_seen} showText size="sm" />
          </div>
        </div>
        <p className="text-slate-700 text-center max-w-md text-sm sm:text-base px-4">{profileUser.bio || 'Sin biografía aún.'}</p>
        
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 w-full max-w-sm px-4">
          {isOwnProfile ? (
            <>
              <div className="flex w-full gap-2">
                <button 
                  onClick={() => setIsEditProfileOpen(true)}
                  className="flex-1 px-4 sm:px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm sm:text-base"
                >
                  Editar Perfil
                </button>
                {notificationStatus !== 'granted' && (
                  <button 
                    onClick={handleRequestNotifications}
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl transition-colors flex items-center justify-center"
                    title="Activar Notificaciones"
                  >
                    <Bell size={20} />
                  </button>
                )}
                {currentUser?.is_super_admin && (
                  <button 
                    onClick={() => {
                      const event = new CustomEvent('changeView', { detail: 'SuperAdmin' });
                      window.dispatchEvent(event);
                    }}
                    className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl transition-colors flex items-center justify-center"
                    title="Configuración de Super Admin"
                  >
                    <Settings size={20} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => logout()}
                className="w-full sm:w-auto px-6 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold rounded-xl transition-colors text-sm sm:text-base"
              >
                Cerrar Sesión
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleFollow}
                className={`flex-1 min-w-[120px] px-4 sm:px-6 py-2.5 font-semibold rounded-xl transition-colors text-sm sm:text-base ${
                  following 
                    ? 'bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100'
                }`}
              >
                {following ? 'Siguiendo' : 'Seguir'}
              </button>
              <button 
                onClick={handleMessage}
                className="flex-1 min-w-[120px] px-4 sm:px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl transition-colors text-sm sm:text-base flex items-center justify-center gap-2"
              >
                <MessageSquare size={18} /> Mensaje
              </button>
            </>
          )}
        </div>

        {profileUser.is_verified && benefits.length > 0 && (
          <div className="w-full max-w-md mt-6 px-4">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-[2rem] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Award size={18} />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Beneficios de Verificado</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {benefits.map((benefit) => {
                  const Icon = ICON_MAP[benefit.icon_name] || Star;
                  return (
                    <div key={benefit.id} className="flex items-start gap-3 bg-white/60 p-3 rounded-2xl border border-white">
                      <div className="mt-0.5 text-emerald-600">
                        <Icon size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{benefit.name}</p>
                        <p className="text-[10px] text-slate-500 leading-tight">{benefit.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-8 mt-4">
          <div className="text-center">
            <p className="font-bold text-lg sm:text-xl">{stats.following}</p>
            <p className="text-slate-500 text-xs sm:text-sm">Siguiendo</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg sm:text-xl">{stats.followers}</p>
            <p className="text-slate-500 text-xs sm:text-sm">Seguidores</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg sm:text-xl">{stats.total_likes}</p>
            <p className="text-slate-500 text-xs sm:text-sm">Me gusta</p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mt-12 border-t border-slate-100 pt-8">
        <h3 className="font-bold text-lg sm:text-xl mb-6">Publicaciones</h3>
        {posts.length > 0 ? (
          <div className="flex flex-col">
            {posts.map(post => (
              <FeedPost key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-3xl">
            <p className="text-sm sm:text-base">Aún no hay publicaciones.</p>
          </div>
        )}
      </div>

      {isOwnProfile && (
        <EditProfileModal 
          isOpen={isEditProfileOpen} 
          onClose={() => {
            setIsEditProfileOpen(false);
            refreshUser();
          }} 
        />
      )}

      <RequestAppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        targetUser={{ 
          id: profileUser.id, 
          display_name: profileUser.display_name, 
          username: profileUser.username, 
          avatar_url: profileUser.avatar_url, 
          bio: profileUser.bio || '', 
          is_admin: profileUser.is_admin ? 1 : 0, 
          created_at: profileUser.created_at 
        }}
      />
    </div>
  );
};
