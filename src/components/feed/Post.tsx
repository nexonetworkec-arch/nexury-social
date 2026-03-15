import React, { useState } from 'react';
import { MessageCircle, Heart, Share2, BarChart2, MoreHorizontal, Send, Calendar, Edit2, Trash2, AlertCircle, MessageSquare, Bookmark } from 'lucide-react';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { LiveIndicator } from '../live/LiveIndicator';
import { UserStatus } from '../ui/UserStatus';
import { Post as PostType, Comment as CommentType } from '../../types';
import { formatTime, cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { SocialService } from '../../services/socialService';
import { AdminService } from '../../services/adminService';
import { Button } from '../ui/Button';
import { RequestAppointmentModal } from '../appointments/RequestAppointmentModal';
import { EditPostModal } from './EditPostModal';
import { supabase } from '../../lib/supabase';

export const Post: React.FC<{ post: PostType }> = React.memo(({ post: initialPost }) => {
  const { user } = useAuth();
  const [post, setPost] = useState(initialPost);
  const [liked, setLiked] = useState((initialPost as any).user_has_liked || false);
  const [bookmarked, setBookmarked] = useState((initialPost as any).user_has_bookmarked || false);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [viewsCount, setViewsCount] = useState(post.views_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAppointmentsEnabled, setIsAppointmentsEnabled] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Sincronizar estado local con props cuando hay cambios en tiempo real desde el Feed
  React.useEffect(() => {
    setPost(initialPost);
    setLikesCount(initialPost.likes_count);
    // Solo actualizamos viewsCount si el nuevo valor es mayor al actual
    // Esto evita que el contador "baje" por errores de sincronización
    setViewsCount(prev => Math.max(prev, initialPost.views_count || 0));
    setLiked((initialPost as any).user_has_liked || false);
    setBookmarked((initialPost as any).user_has_bookmarked || false);
  }, [initialPost]);

  // Check if bookmarked if not provided
  React.useEffect(() => {
    const checkBookmark = async () => {
      if (user && (initialPost as any).user_has_bookmarked === undefined) {
        const isBookmarked = await SocialService.checkIfBookmarked(post.id, user.id);
        setBookmarked(isBookmarked);
      }
    };
    checkBookmark();
  }, [user, post.id]);

  // Check if appointments benefit is active
  React.useEffect(() => {
    const checkBenefit = async () => {
      const active = await AdminService.isBenefitActive('appointments');
      setIsAppointmentsEnabled(active);
    };
    checkBenefit();
  }, []);

  // Incrementar vistas al montar el componente (Estadística automática de vista única)
  React.useEffect(() => {
    if (!user || !post.id) return;

    const timer = setTimeout(async () => {
      await SocialService.incrementPostViews(post.id, user.id);
      setViewsCount(prev => prev + 1);
    }, 2000); // 2 segundos para contar como interacción real y única

    return () => clearTimeout(timer);
  }, [post.id, user?.id]);

  // Listen for new comments in real-time when the comments section is open
  React.useEffect(() => {
    if (!showComments || !post.id) return;

    const channel = supabase
      .channel(`post_comments:${post.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments', 
        filter: `post_id=eq.${post.id}` 
      }, async (payload) => {
        // Fetch full comment with profile
        const { data: newComment } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (
              username,
              avatar_url,
              display_name,
              is_verified
            )
          `)
          .eq('id', payload.new.id)
          .single();
        
        if (newComment) {
          const formattedComment = {
            ...newComment,
            username: newComment.profiles?.username,
            avatar_url: newComment.profiles?.avatar_url,
            display_name: newComment.profiles?.display_name,
            is_verified: !!newComment.profiles?.is_verified
          };
          
          setComments(prev => {
            if (prev.some(c => c.id === formattedComment.id)) return prev;
            return [...prev, formattedComment];
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showComments, post.id]);

  const handleDeletePost = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user || isDeleting) return;
    
    setIsDeleting(true);
    try {
      const isAdmin = !!(user.is_admin || user.is_super_admin);
      await SocialService.deletePost(post.id, user.id, isAdmin);
      setIsHidden(true);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting post', error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleReportPost = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const reason = prompt('¿Por qué quieres reportar esta publicación?');
    if (!reason) return;

    try {
      await SocialService.reportPost(post.id, user.id, reason);
      alert('Gracias por tu reporte. Lo revisaremos pronto.');
    } catch (error) {
      console.error('Error reporting post', error);
    }
  };

  const handleNotInterested = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHidden(true);
    alert('Entendido. Te mostraremos menos contenido como este.');
  };

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    alert('¡Enlace copiado al portapapeles!');
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const previousLiked = liked;
    const previousLikesCount = likesCount;
    
    setLiked(!liked);
    setLikesCount(prev => liked ? prev - 1 : prev + 1);
    
    try {
      const result = await SocialService.likePost(post.id, user.id, liked);
      // Sincronizar con la respuesta real si es necesario
      if (result.action === 'unliked') {
        setLiked(false);
      } else if (result.action === 'liked') {
        setLiked(true);
      }
    } catch (error) {
      console.error('Error liking post', error);
      // Rollback on error
      setLiked(previousLiked);
      setLikesCount(previousLikesCount);
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    const previousBookmarked = bookmarked;
    setBookmarked(!bookmarked);

    try {
      const result = await SocialService.toggleBookmark(post.id, user.id);
      if (result.action === 'removed') {
        setBookmarked(false);
      } else if (result.action === 'added') {
        setBookmarked(true);
      }
    } catch (error) {
      console.error('Error bookmarking post', error);
      setBookmarked(previousBookmarked);
    }
  };

  const toggleComments = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showComments) {
      try {
        const data = await SocialService.getComments(post.id);
        setComments(data);
      } catch (error) {
        console.error('Error fetching comments', error);
      }
    }
    setShowComments(!showComments);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting || !user) return;
    
    const commentText = newComment;
    setNewComment('');
    
    // Optimistic comment
    const tempId = Math.random().toString(36).substring(7);
    const optimisticComment: CommentType = {
      id: tempId,
      post_id: post.id,
      user_id: user.id,
      content: commentText,
      created_at: new Date().toISOString(),
      username: user.username,
      avatar_url: user.avatar_url,
      display_name: user.display_name,
      is_verified: !!user.is_verified
    };
    
    setComments(prev => [...prev, optimisticComment]);
    
    setIsSubmitting(true);
    try {
      const comment = await SocialService.createComment(post.id, user.id, commentText);
      // Replace optimistic comment with real one
      setComments(prev => prev.map(c => c.id === tempId ? comment : c));
    } catch (error) {
      console.error('Error posting comment', error);
      // Remove optimistic comment on error
      setComments(prev => prev.filter(c => c.id !== tempId));
      setNewComment(commentText); // Restore text
    } finally {
      setIsSubmitting(false);
    }
  };

  const { openChat } = useChat();

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    openChat(post.user_id);
  };

  const handleProfileClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId: post.user_id } 
    });
    window.dispatchEvent(event);
  };

  if (isHidden) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-b border-slate-50 hover:bg-slate-50/50 transition-all duration-300 group/post"
    >
      <div className="p-4 sm:p-6 flex gap-3 sm:gap-4">
        <div className="relative h-fit cursor-pointer" onClick={handleProfileClick}>
          <LiveIndicator isLive={(post as any).is_live}>
            <img src={post.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_id}`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover shadow-sm group-hover/post:shadow-md transition-shadow" alt={post.username} referrerPolicy="no-referrer" />
          </LiveIndicator>
          <div className="absolute -bottom-1 -right-1">
            <UserStatus userId={post.user_id} size="sm" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex flex-col min-w-0 cursor-pointer" onClick={handleProfileClick}>
              <div className="flex items-center gap-1">
                <span className="font-bold text-slate-900 hover:text-indigo-600 transition-colors text-sm sm:text-base truncate">{post.display_name}</span>
                {post.is_verified && (
                  <VerifiedBadge size={14} />
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs sm:text-sm truncate">@{post.username}</span>
                <span className="text-slate-300">·</span>
                <span className="text-slate-400 text-[10px] sm:text-xs font-medium whitespace-nowrap">{formatTime(post.created_at)}</span>
              </div>
            </div>
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("text-slate-400 hover:text-slate-600", showOptionsMenu && "text-indigo-600 bg-indigo-50")}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsMenu(!showOptionsMenu);
                }}
              >
                <MoreHorizontal size={18} />
              </Button>
              <AnimatePresence>
                {showOptionsMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setShowOptionsMenu(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-30 overflow-hidden"
                    >
                      {(user?.id === post.user_id || user?.is_admin || user?.is_super_admin) ? (
                        <>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsEditModalOpen(true);
                              setShowOptionsMenu(false);
                            }}
                            className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                          >
                            <Edit2 size={16} className="text-indigo-500" />
                            Editar publicación
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(true);
                              setShowOptionsMenu(false);
                            }}
                            disabled={isDeleting}
                            className="w-full text-left px-5 py-3 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
                          >
                            <Trash2 size={16} />
                            Eliminar publicación
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={(e) => {
                            handleReportPost(e);
                            setShowOptionsMenu(false);
                          }}
                          className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium flex items-center gap-2"
                        >
                          <AlertCircle size={16} className="text-rose-500" />
                          Reportar publicación
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          handleNotInterested(e);
                          setShowOptionsMenu(false);
                        }}
                        className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                      >
                        No me interesa
                      </button>
                      <button 
                        onClick={(e) => {
                          handleCopyLink(e);
                          setShowOptionsMenu(false);
                        }}
                        className="w-full text-left px-5 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors font-medium"
                      >
                        Copiar enlace
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <p className="mt-2 text-slate-700 leading-relaxed text-sm sm:text-[1.05rem] whitespace-pre-wrap">
            {post.content}
          </p>

          {post.media_url && (
            <div className="mt-3 sm:mt-4 rounded-2xl sm:rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm group-hover/post:shadow-md transition-all duration-500">
              {post.media_type === 'video' ? (
                <video 
                  src={post.media_url || undefined} 
                  className="w-full h-auto max-h-[400px] sm:max-h-[550px] object-cover" 
                  controls
                />
              ) : (
                <img 
                  src={post.media_url || undefined} 
                  className="w-full h-auto max-h-[400px] sm:max-h-[550px] object-cover hover:scale-105 transition-transform duration-700" 
                  alt="Post content" 
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 sm:mt-6 max-w-md">
            <Button 
              variant="ghost"
              onClick={toggleComments}
              className={cn(
                "flex items-center gap-2.5 px-3", 
                showComments ? "text-indigo-600 bg-indigo-50" : "text-slate-400"
              )}
              leftIcon={<MessageCircle size={19} />}
            >
              <span className="text-sm font-medium">{(post.comments_count || 0) + (showComments ? comments.length - (post.comments_count || 0) : 0)}</span>
            </Button>
            
            <Button 
              variant="ghost"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-2.5 px-3", 
                liked ? "text-rose-600 bg-rose-50" : "text-slate-400"
              )}
              leftIcon={<Heart size={19} fill={liked ? "currentColor" : "none"} />}
            >
              <span className="text-sm font-medium">{likesCount || 0}</span>
            </Button>

            <Button 
              variant="ghost" 
              className="flex items-center gap-2.5 px-3 text-slate-400" 
              leftIcon={<BarChart2 size={19} />}
              onClick={(e) => {
                e.stopPropagation();
                alert(`Esta publicación tiene ${viewsCount || 0} visualizaciones totales.`);
              }}
            >
              <span className="text-sm font-medium">
                {(viewsCount || 0) >= 1000 ? `${((viewsCount || 0) / 1000).toFixed(1)}k` : (viewsCount || 0)}
              </span>
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={handleMessage}
              disabled={user?.id === post.user_id}
              className={cn(
                "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
                user?.id === post.user_id && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              title={user?.id === post.user_id ? "No puedes enviarte mensajes a ti mismo" : "Enviar Mensaje"}
            >
              <MessageSquare size={19} />
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={handleBookmark}
              className={cn(
                "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
                bookmarked && "text-indigo-600 bg-indigo-50"
              )}
              title={bookmarked ? "Quitar de guardados" : "Guardar publicación"}
            >
              <Bookmark size={19} fill={bookmarked ? "currentColor" : "none"} />
            </Button>

            <Button 
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                alert('¡Enlace copiado al portapapeles!');
              }}
              className="text-slate-400"
            >
              <Share2 size={19} />
            </Button>

            {isAppointmentsEnabled && post.is_verified && post.has_appointments === true && (
              <Button 
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (user?.id === post.user_id) {
                    return;
                  }
                  setIsAppointmentModalOpen(true);
                }}
                className={cn(
                  "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50",
                  user?.id === post.user_id && "opacity-50 cursor-default hover:bg-transparent hover:text-slate-400"
                )}
                title={user?.id === post.user_id ? "Tu botón de citas está activo para otros usuarios" : "Solicitar Cita"}
              >
                <Calendar size={19} />
              </Button>
            )}
          </div>
        </div>
      </div>

      <RequestAppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        targetUser={{ 
          id: post.user_id, 
          display_name: post.display_name, 
          username: post.username, 
          avatar_url: post.avatar_url, 
          email: '', // Email not available in post object
          bio: '', 
          is_admin: false, 
          created_at: '' 
        }}
      />

      <EditPostModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        post={post}
        onPostUpdated={(updatedPost) => setPost(updatedPost)}
      />

      {/* Modal de confirmación de eliminación personalizado */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl border border-slate-100"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Trash2 size={32} className="text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 text-center mb-2">¿Eliminar publicación?</h3>
              <p className="text-slate-500 text-center mb-8">Esta acción no se puede deshacer y la publicación desaparecerá de tu perfil y del feed.</p>
              <div className="flex flex-col gap-3">
                <Button 
                  variant="primary" 
                  className="w-full bg-rose-600 hover:bg-rose-700 border-none h-12 text-base"
                  onClick={() => handleDeletePost()}
                  isLoading={isDeleting}
                >
                  Eliminar definitivamente
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-12 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-slate-50/30 backdrop-blur-sm border-t border-slate-100"
          >
            <div className="p-6">
              <form onSubmit={handleCommentSubmit} className="flex gap-4 mb-6">
                <img src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} className="w-9 h-9 rounded-xl shadow-sm" alt="Avatar" referrerPolicy="no-referrer" />
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder="Escribe tu respuesta con respeto..." 
                    className="w-full bg-white border border-slate-200 rounded-2xl py-2.5 px-5 pr-12 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button 
                    type="submit"
                    variant="ghost"
                    size="icon"
                    disabled={!newComment.trim()}
                    isLoading={isSubmitting}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-600"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </form>

              <div className="space-y-6">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4 group/comment">
                    <img src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} className="w-9 h-9 rounded-xl object-cover shadow-sm" alt={comment.username} referrerPolicy="no-referrer" />
                    <div className="flex-1">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{comment.display_name}</span>
                          {comment.is_verified && (
                            <VerifiedBadge size={12} />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 text-xs">@{comment.username}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-slate-400 text-xs">{formatTime(comment.created_at)}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

