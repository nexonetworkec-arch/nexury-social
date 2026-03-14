import React, { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sidebar } from './components/layout/Sidebar';
import { RightPanel } from './components/layout/RightPanel';
import { CreatePost } from './components/feed/CreatePost';
import { Post as FeedPost } from './components/feed/Post';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { NotificationProvider } from './context/NotificationContext';
import { PresenceProvider } from './context/PresenceContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { EditProfileModal } from './components/profile/EditProfileModal';

// Lazy load heavy components
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const SuperAdminPanel = lazy(() => import('./components/admin/SuperAdminPanel').then(m => ({ default: m.SuperAdminPanel })));
const AppointmentsList = lazy(() => import('./components/appointments/AppointmentsList').then(m => ({ default: m.AppointmentsList })));
const NexuariosList = lazy(() => import('./components/nexuarios/NexuariosList').then(m => ({ default: m.NexuariosList })));
const NotificationsList = lazy(() => import('./components/notifications/NotificationsList').then(m => ({ default: m.NotificationsList })));
const BookmarksList = lazy(() => import('./components/bookmarks/BookmarksList').then(m => ({ default: m.BookmarksList })));
const LiveView = lazy(() => import('./components/live/LiveView').then(m => ({ default: m.LiveView })));

import { AccessDenied } from './components/common/AccessDenied';
import { ProfileView } from './components/profile/ProfileView';
import { SuggestedUsers } from './components/layout/SuggestedUsers';
import { ChatFloatingSystem } from './components/chat/ChatFloatingSystem';
import { CreatePostModal } from './components/feed/CreatePostModal';
import { InstallPWA } from './components/ui/InstallPWA';
import { AdCard } from './components/feed/AdCard';
import { Post as PostType } from './types';
import { supabase } from './lib/supabase';
import { Feather, CheckCircle, Calendar, Settings, Shield, ShieldAlert, Search as SearchIcon, LogOut } from 'lucide-react';
import { SEO } from './components/common/SEO';
import { SocialService } from './services/socialService';
import { AdminService } from './services/adminService';
import { Button } from './components/ui/Button';
import { PostSkeleton } from './components/ui/Skeleton';

import { VerifiedBadge } from './components/ui/VerifiedBadge';

import { Logo } from './components/ui/Logo';

const Feed = ({ searchQuery, onSearchChange }: { searchQuery: string, onSearchChange: (query: string) => void }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [feedType, setFeedType] = useState<'recent' | 'smart'>('smart');

  useEffect(() => {
    let mounted = true;
    const fetchContent = async () => {
      if (!mounted) return;
      setLoading(true);
      setError(null);
      try {
        const postsPromise = SocialService.getPosts(user?.id, feedType);
        const adsPromise = AdminService.getAds().catch(err => {
          console.warn('Ads table might be missing or inaccessible:', err);
          return [];
        });

        const [postsData, adsData] = await Promise.all([
          postsPromise,
          adsPromise
        ]);
        
        if (mounted) {
          setPosts(postsData);
          setAds((adsData || []).filter((ad: any) => ad.is_active));
        }
      } catch (error: any) {
        console.error('Failed to fetch feed content', error);
        if (mounted) {
          setError(error.message || 'Error al cargar las publicaciones');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchContent();

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 8000);

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        let newPost;
        try {
          const { data } = await supabase
            .from('posts_with_profiles')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          newPost = data;
        } catch (err) {
          console.warn('posts_with_profiles view failed, falling back to manual join:', err);
          const { data } = await supabase
            .from('posts')
            .select('*, profiles:user_id(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            newPost = {
              ...data,
              username: data.profiles?.username,
              display_name: data.profiles?.display_name,
              avatar_url: data.profiles?.avatar_url,
              is_verified: data.profiles?.is_verified
            };
          }
        }
        
        if (newPost) {
          let userHasLiked = false;
          if (user) {
            const { data: like } = await supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', user.id)
              .eq('post_id', newPost.id)
              .single();
            userHasLiked = !!like;
          }

          setPosts((prev) => {
            if (prev.some(p => p.id === newPost.id)) return prev;
            // Si es feed reciente, lo ponemos arriba. Si es smart, lo ponemos arriba también por ahora
            return [{ ...newPost, user_has_liked: userHasLiked } as PostType, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (payload) => {
        let updatedPost;
        try {
          const { data } = await supabase
            .from('posts_with_profiles')
            .select('*')
            .eq('id', payload.new.id)
            .single();
          updatedPost = data;
        } catch (err) {
          console.warn('posts_with_profiles view failed on update, falling back:', err);
          const { data } = await supabase
            .from('posts')
            .select('*, profiles:user_id(*)')
            .eq('id', payload.new.id)
            .single();
          
          if (data) {
            updatedPost = {
              ...data,
              username: data.profiles?.username,
              display_name: data.profiles?.display_name,
              avatar_url: data.profiles?.avatar_url,
              is_verified: data.profiles?.is_verified
            };
          }
        }

        if (updatedPost) {
          setPosts((prev) => prev.map(p => {
            if (p.id === payload.new.id) {
              return { ...p, ...updatedPost };
            }
            return p;
          }));
        }
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts((prev) => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    const profileChannel = supabase
      .channel('public:profiles_feed')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
        setPosts((prev) => prev.map(p => {
          if (p.user_id === payload.new.id) {
            return {
              ...p,
              avatar_url: payload.new.avatar_url,
              display_name: payload.new.display_name,
              username: payload.new.username,
              is_verified: payload.new.is_verified ? 1 : 0
            };
          }
          return p;
        }));
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
      clearTimeout(timeout);
    };
  }, [user?.id, feedType]);

  const handlePostCreated = (newPost: PostType) => {
    setPosts((prev) => {
      if (prev.some(p => p.id === newPost.id)) return prev;
      return [newPost, ...prev];
    });
  };

  // Global user search when searchQuery changes
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setUserResults([]);
        return;
      }

      setIsSearchingUsers(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .or(`display_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`)
          .limit(5);
        setUserResults(data || []);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const timer = setTimeout(searchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredPosts = posts.filter(post => 
    (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.display_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUserClick = (userId: string) => {
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId } 
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen pb-20 sm:pb-0 bg-white">
      <header className="sticky top-0 z-40 glass flex flex-col">
        <div className="p-4 sm:p-5 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient">
            {searchQuery ? `Resultados para "${searchQuery}"` : 'Inicio'}
          </h1>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => onSearchChange('')} className="text-slate-400">
              Limpiar
            </Button>
          )}
        </div>

        {!searchQuery && (
          <div className="flex border-b border-slate-100">
            <button 
              onClick={() => setFeedType('smart')}
              className={`flex-1 py-4 text-sm font-bold transition-colors relative ${feedType === 'smart' ? 'text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Para ti
              {feedType === 'smart' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-indigo-600 rounded-full" />
              )}
            </button>
            <button 
              onClick={() => setFeedType('recent')}
              className={`flex-1 py-4 text-sm font-bold transition-colors relative ${feedType === 'recent' ? 'text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              Recientes
              {feedType === 'recent' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-indigo-600 rounded-full" />
              )}
            </button>
          </div>
        )}

        {/* Mobile Search Bar */}
        <div className="xl:hidden p-4 pt-0 relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar en Nexury..." 
            className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-2.5 pl-12 pr-4 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </header>
      
      {!searchQuery && <CreatePost onPostCreated={handlePostCreated} />}
      
      {error ? (
        <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
          <Logo size="lg" withGlint={false} className="bg-rose-50/50 shadow-none" />
          <p className="text-slate-900 font-bold">Error al cargar el feed</p>
          <p className="text-slate-500 text-sm max-w-xs">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="flex flex-col">
          {[...Array(5)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {/* User Search Results */}
          {searchQuery && userResults.length > 0 && (
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Personas</h3>
              <div className="space-y-2">
                {userResults.map(u => (
                  <div 
                    key={u.id} 
                    onClick={() => handleUserClick(u.id)}
                    className="flex items-center gap-3 p-2 hover:bg-white rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 shadow-sm"
                  >
                    <img src={u.avatar_url} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-sm text-slate-900 truncate">{u.display_name}</p>
                        {u.is_verified && <VerifiedBadge size={12} />}
                      </div>
                      <p className="text-slate-500 text-xs truncate">@{u.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post Search Results */}
          {filteredPosts.length > 0 ? (
            <>
              {searchQuery && <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-6">Publicaciones</h3>}
              {filteredPosts.map((post, index) => {
                const elements = [<FeedPost key={post.id} post={post} />];
                
                // Inyectar anuncio cada 5 posts si no estamos buscando
                if (!searchQuery && ads.length > 0 && (index + 1) % 5 === 0) {
                  const adIndex = Math.floor(((index + 1) / 5) - 1) % ads.length;
                  const ad = ads[adIndex];
                  elements.push(<AdCard key={`ad-${ad.id}-${index}`} ad={ad} />);
                }
                
                return elements;
              })}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mb-4">
                <SearchIcon size={32} />
              </div>
              <p className="text-slate-900 font-bold">No se encontraron resultados</p>
              <p className="text-slate-400 text-sm mt-1">Intenta con otras palabras clave o busca personas.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import { SplashScreen } from './components/ui/SplashScreen';

const AppContent = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const [appLoading, setAppLoading] = useState(true);
  const [currentView, setCurrentView] = useState('Inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  useEffect(() => {
    // Show splash screen for at least 2 seconds
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      console.log('Current User State:', {
        id: user.id,
        email: (user as any).email,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin
      });
    }
  }, [user?.id]);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // One-time cleanup for duplicate benefits
  useEffect(() => {
    const cleanupDuplicates = async () => {
      try {
        const { data: benefits } = await supabase
          .from('verified_benefits')
          .select('id, slug')
          .eq('slug', 'prioritized_support');
        
        if (benefits && benefits.length > 1) {
          // Keep the first one, delete the rest
          const idsToDelete = benefits.slice(1).map(b => b.id);
          await supabase
            .from('verified_benefits')
            .delete()
            .in('id', idsToDelete);
          console.log('Cleaned up duplicate prioritized_support benefits');
        }
      } catch (err) {
        console.error('Error cleaning up duplicates:', err);
      }
    };
    cleanupDuplicates();
  }, []);

  const navigateTo = (view: string) => {
    setCurrentView(view);
    setSelectedUserId(null);
  };

  useEffect(() => {
    const handleChangeView = (e: any) => {
      if (typeof e.detail === 'string') {
        navigateTo(e.detail);
      } else if (e.detail && e.detail.view) {
        setCurrentView(e.detail.view);
        setSelectedUserId(e.detail.userId || null);
      }
    };
    const handleOpenCreatePost = () => setIsCreatePostOpen(true);

    window.addEventListener('changeView', handleChangeView);
    window.addEventListener('openCreatePost', handleOpenCreatePost);
    return () => {
      window.removeEventListener('changeView', handleChangeView);
      window.removeEventListener('openCreatePost', handleOpenCreatePost);
    };
  }, []);

  if (appLoading || authLoading) {
    return <SplashScreen />;
  }

  if (!user) {
    return (
      <>
        <SEO title="Iniciar Sesión" />
        <AuthScreen />
      </>
    );
  }

  const renderView = () => {
    return (
      <Suspense fallback={
        <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white flex flex-col items-center justify-center p-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      }>
        {(() => {
          switch (currentView) {
            case 'Inicio':
              return (
                <Feed searchQuery={searchQuery} onSearchChange={setSearchQuery} />
              );
            case 'Admin':
              return (
                <>
                  {(user?.is_admin || user?.is_super_admin) ? (
                    <AdminPanel />
                  ) : (
                    <AccessDenied requiredRole="Admin" />
                  )}
                </>
              );
            case 'SuperAdmin':
              return (
                <>
                  {user?.is_super_admin ? (
                    <SuperAdminPanel />
                  ) : (
                    <AccessDenied requiredRole="Super Admin" />
                  )}
                </>
              );
            case 'Explorar':
              return (
                <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white p-4 sm:p-8">
                  <h2 className="text-2xl font-bold mb-6">Explorar</h2>
                  <div className="space-y-8">
                    <section>
                      <div className="relative group mb-6">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input 
                          type="text" 
                          placeholder="Buscar personas o publicaciones..." 
                          className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </section>
                    <section>
                      <h3 className="text-lg font-bold mb-4">Comunidad</h3>
                      <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                        <SuggestedUsers />
                      </div>
                    </section>
                    <section>
                      <h3 className="text-lg font-bold mb-4">Descubre contenido</h3>
                      <Feed searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                    </section>
                  </div>
                </div>
              );
            case 'Perfil':
              return (
                <ProfileView userId={selectedUserId} />
              );
            case 'Notificaciones':
              return (
                <NotificationsList />
              );
            case 'Guardados':
              return (
                <BookmarksList />
              );
            case 'Live':
              return (
                <LiveView />
              );
            case 'Citas':
              return (
                <AppointmentsList />
              );
            case 'Nexuarios':
              return (
                <NexuariosList initialSearchQuery={searchQuery} />
              );
            default:
              return (
                <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
                  <Logo size="lg" animate={true} className="mb-6" />
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">{currentView}</h2>
                  <p className="text-slate-500">Esta sección está en construcción. ¡Vuelve pronto!</p>
                  <button 
                    onClick={() => navigateTo('Inicio')}
                    className="mt-6 text-indigo-600 font-semibold hover:underline"
                  >
                    Volver al Inicio
                  </button>
                </div>
              );
          }
        })()}
      </Suspense>
    );
  };

  return (
    <div className="max-w-7xl mx-auto flex justify-center min-h-screen bg-[#fafafa] relative overflow-x-hidden">
      <SEO title={currentView} />
      
      {/* Global Logout Button - Top Right */}
      <button 
        onClick={() => logout()}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all z-[60] bg-white/80 backdrop-blur-md border border-slate-100 shadow-sm"
        title="Cerrar sesión"
      >
        <LogOut size={20} />
      </button>

      <Sidebar currentView={currentView} onViewChange={navigateTo} />
      <main className="flex-1 flex justify-center w-full min-h-screen">
        {renderView()}
      </main>
      <RightPanel 
        searchQuery={searchQuery} 
        onSearchChange={setSearchQuery} 
        onTrendClick={(query) => {
          setSearchQuery(query);
          navigateTo('Explorar');
        }}
      />
      <EditProfileModal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} />
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setIsCreatePostOpen(false)} />
      <ChatFloatingSystem />
      <InstallPWA />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <PresenceProvider>
        <NotificationProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </NotificationProvider>
      </PresenceProvider>
    </AuthProvider>
  );
}
