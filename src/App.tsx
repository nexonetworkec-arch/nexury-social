import React, { useState, useEffect } from 'react';
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
import { AdminPanel } from './components/admin/AdminPanel';
import { SuperAdminPanel } from './components/admin/SuperAdminPanel';
import { AccessDenied } from './components/common/AccessDenied';
import { AppointmentsList } from './components/appointments/AppointmentsList';
import { MessagesView } from './components/messages/MessagesView';
import { ProfileView } from './components/profile/ProfileView';
import { NexuariosList } from './components/nexuarios/NexuariosList';
import { NotificationsList } from './components/notifications/NotificationsList';
import { BookmarksList } from './components/bookmarks/BookmarksList';
import { SuggestedUsers } from './components/layout/SuggestedUsers';
import { ChatFloatingSystem } from './components/chat/ChatFloatingSystem';
import { CreatePostModal } from './components/feed/CreatePostModal';
import { InstallPWA } from './components/ui/InstallPWA';
import { AdCard } from './components/feed/AdCard';
import { Post as PostType } from './types';
import { supabase } from './lib/supabase';
import { Feather, CheckCircle, Calendar, Settings, Shield, ShieldAlert, Search as SearchIcon } from 'lucide-react';
import { SEO } from './components/common/SEO';
import { dataService } from './services/dataService';
import { Button } from './components/ui/Button';

import { VerifiedBadge } from './components/ui/VerifiedBadge';

const Feed = ({ searchQuery, onSearchChange }: { searchQuery: string, onSearchChange: (query: string) => void }) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostType[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userResults, setUserResults] = useState<any[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      setError(null);
      try {
        const postsPromise = dataService.getPosts(user?.id);
        const adsPromise = dataService.getAds().catch(err => {
          console.warn('Ads table might be missing or inaccessible:', err);
          return [];
        });

        const [postsData, adsData] = await Promise.all([
          postsPromise,
          adsPromise
        ]);
        
        setPosts(postsData);
        setAds((adsData || []).filter((ad: any) => ad.is_active));
      } catch (error: any) {
        console.error('Failed to fetch feed content', error);
        setError(error.message || 'Error al cargar las publicaciones');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();

    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 8000);

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: newPost } = await supabase
          .from('posts_with_profiles')
          .select('*')
          .eq('id', payload.new.id)
          .single();
        
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
            return [{ ...newPost, user_has_liked: userHasLiked } as PostType, ...prev];
          });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, async (payload) => {
        const { data: updatedPost } = await supabase
          .from('posts_with_profiles')
          .select('*')
          .eq('id', payload.new.id)
          .single();

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
      supabase.removeChannel(channel);
      supabase.removeChannel(profileChannel);
      clearTimeout(timeout);
    };
  }, [user]);

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
      <header className="sticky top-0 z-40 glass p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient">
            {searchQuery ? `Resultados para "${searchQuery}"` : 'Inicio'}
          </h1>
          {searchQuery && (
            <Button variant="ghost" size="sm" onClick={() => onSearchChange('')} className="text-slate-400">
              Limpiar
            </Button>
          )}
        </div>

        {/* Mobile Search Bar */}
        <div className="xl:hidden relative group">
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
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <Feather size={32} />
          </div>
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
        <div className="flex flex-col items-center justify-center p-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-slate-400 font-medium animate-pulse">Cargando tu mundo...</p>
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

const AppContent = () => {
  const { user, loading, logout } = useAuth();
  const [currentView, setCurrentView] = useState('Inicio');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('Current User State:', {
        id: user.id,
        email: (user as any).email,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin
      });
    }
  }, [user]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <SEO title="Cargando..." />
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Iniciando Nexury...</p>
        </div>
      </div>
    );
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
    switch (currentView) {
      case 'Inicio':
        const homeSchema = {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Nexury",
          "url": "https://nexury-social.app/",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://nexury-social.app/?q={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        };
        return (
          <>
            <SEO title="Inicio" schema={homeSchema} />
            <Feed searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          </>
        );
      case 'Admin':
        return (
          <>
            <SEO title="Panel de Administración" />
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
            <SEO title="Super Admin" />
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
            <SEO title="Explorar" />
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
          <>
            <SEO title={selectedUserId ? "Perfil de Usuario" : user.display_name} />
            <ProfileView userId={selectedUserId} />
          </>
        );
      case 'Mensajes':
        return (
          <>
            <SEO title="Mensajes" />
            <MessagesView targetUserId={selectedUserId || undefined} />
          </>
        );
      case 'Notificaciones':
        return (
          <>
            <SEO title="Notificaciones" />
            <NotificationsList />
          </>
        );
      case 'Guardados':
        return (
          <>
            <SEO title="Guardados" />
            <BookmarksList />
          </>
        );
      case 'Citas':
        return (
          <>
            <SEO title="Mis Citas" />
            <AppointmentsList />
          </>
        );
      case 'Nexuarios':
        return (
          <>
            <SEO title="Nexuarios" />
            <NexuariosList initialSearchQuery={searchQuery} />
          </>
        );
      default:
        return (
          <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
              <Feather size={40} />
            </div>
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
  };

  return (
    <div className="max-w-7xl mx-auto flex justify-center min-h-screen bg-[#fafafa] relative">
      <Sidebar currentView={currentView} onViewChange={navigateTo} />
      <main className="flex-1 flex justify-center w-full">
        {renderView()}
      </main>
      <RightPanel searchQuery={searchQuery} onSearchChange={setSearchQuery} />
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
