import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Users, FileText, BarChart3, Shield, Trash2, UserX, AlertTriangle, Lock, Unlock, Heart, Calendar, MessageCircle, Settings, Megaphone, Zap, ShieldOff, Eye, MousePointer2, ExternalLink, Plus, RefreshCw, Image, Upload } from 'lucide-react';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { formatTime, cn } from '../../lib/utils';
import { AccessDenied } from '../common/AccessDenied';
import { ConfirmPasswordModal } from '../common/ConfirmPasswordModal';

export const AdminPanel = () => {
  const { user: currentUser, reauthenticate } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'posts' | 'settings' | 'ads'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    image_url: '',
    target_url: ''
  });
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetId: string;
    action: 'delete-user' | 'block-user' | 'unblock-user' | 'delete-post' | 'delete-ad';
  }>({
    isOpen: false,
    targetId: '',
    action: 'delete-user'
  });

  useEffect(() => {
    if (!currentUser?.is_admin && !currentUser?.is_super_admin) return;
    
    // Si el usuario no tiene permiso para la pestaña actual, cambiar a una que sí tenga
    if (activeTab === 'stats' && !currentUser.is_super_admin && currentUser.permissions?.can_view_stats === false) {
      if (currentUser.permissions?.can_manage_users) setActiveTab('users');
      else if (currentUser.permissions?.can_manage_posts) setActiveTab('posts');
      else if (currentUser.permissions?.can_manage_ads) setActiveTab('ads');
    }
    if (activeTab === 'users' && !currentUser.is_super_admin && currentUser.permissions?.can_manage_users === false) {
      if (currentUser.permissions?.can_view_stats !== false) setActiveTab('stats');
      else if (currentUser.permissions?.can_manage_posts) setActiveTab('posts');
      else if (currentUser.permissions?.can_manage_ads) setActiveTab('ads');
    }
    if (activeTab === 'posts' && !currentUser.is_super_admin && currentUser.permissions?.can_manage_posts === false) {
      if (currentUser.permissions?.can_view_stats !== false) setActiveTab('stats');
      else if (currentUser.permissions?.can_manage_users) setActiveTab('users');
      else if (currentUser.permissions?.can_manage_ads) setActiveTab('ads');
      else if (currentUser.permissions?.can_manage_settings) setActiveTab('settings');
    }
    if (activeTab === 'ads' && !currentUser.is_super_admin && currentUser.permissions?.can_manage_ads === false) {
      if (currentUser.permissions?.can_view_stats !== false) setActiveTab('stats');
      else if (currentUser.permissions?.can_manage_users) setActiveTab('users');
      else if (currentUser.permissions?.can_manage_posts) setActiveTab('posts');
    }
    if (activeTab === 'settings' && !currentUser.is_super_admin && currentUser.permissions?.can_manage_settings === false) {
      if (currentUser.permissions?.can_view_stats !== false) setActiveTab('stats');
      else if (currentUser.permissions?.can_manage_users) setActiveTab('users');
      else if (currentUser.permissions?.can_manage_posts) setActiveTab('posts');
      else if (currentUser.permissions?.can_manage_ads) setActiveTab('ads');
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (activeTab === 'stats') {
          const data = await dataService.getAdminStats();
          setStats(data);
        } else if (activeTab === 'users') {
          const data = await dataService.getAdminUsers();
          setUsers(data);
        } else if (activeTab === 'posts') {
          const data = await dataService.getAdminPosts();
          setPosts(data);
        } else if (activeTab === 'ads') {
          const data = await dataService.getAds();
          setAds(data);
        }
      } catch (error) {
        console.error('Error fetching admin data', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab]);

  const handleDeletePost = (postId: string) => {
    setConfirmModal({
      isOpen: true,
      targetId: postId,
      action: 'delete-post'
    });
  };

  const handleToggleAd = async (id: string, currentStatus: boolean) => {
    try {
      await dataService.updateAd(id, { is_active: !currentStatus });
      setAds(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a));
    } catch (error) {
      console.error('Error toggling ad:', error);
    }
  };

  const handleDeleteAd = (id: string) => {
    setConfirmModal({
      isOpen: true,
      targetId: id,
      action: 'delete-ad'
    });
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dataService.createAd(newAd);
      setIsAddingAd(false);
      setNewAd({ title: '', description: '', image_url: '', target_url: '' });
      const data = await dataService.getAds();
      setAds(data);
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Error al crear el anuncio.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setIsUploadingAdImage(true);
    try {
      const url = await dataService.uploadMedia(currentUser.id, file, 'posts');
      setNewAd(prev => ({ ...prev, image_url: url }));
    } catch (error: any) {
      console.error('Error uploading ad image:', error);
      alert(error.message || 'Error al subir la imagen.');
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      const updatedUser = await dataService.verifyUser(userId, !currentStatus);
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: updatedUser.is_verified } : u));
    } catch (error) {
      console.error('Error toggling verification', error);
      alert('Error al cambiar el estado de verificación');
    }
  };

  const handleActionConfirm = async (password: string) => {
    try {
      // 1. Reautenticar al administrador
      await reauthenticate(password);

      // 2. Ejecutar la acción solicitada
      if (confirmModal.action === 'delete-user') {
        await dataService.deleteUser(confirmModal.targetId);
        setUsers(users.filter(u => u.id !== confirmModal.targetId));
        alert('Usuario eliminado correctamente');
      } else if (confirmModal.action === 'block-user' || confirmModal.action === 'unblock-user') {
        const isBlocked = confirmModal.action === 'block-user';
        const updatedUser = await dataService.blockUser(confirmModal.targetId, isBlocked);
        setUsers(users.map(u => u.id === confirmModal.targetId ? { ...u, is_blocked: updatedUser.is_blocked } : u));
        alert(isBlocked ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      } else if (confirmModal.action === 'delete-post') {
        if (!currentUser) return;
        await dataService.deletePost(confirmModal.targetId, currentUser.id, true);
        setPosts(posts.filter(p => p.id !== confirmModal.targetId));
        alert('Publicación eliminada correctamente');
      } else if (confirmModal.action === 'delete-ad') {
        await dataService.deleteAd(confirmModal.targetId);
        setAds(prev => prev.filter(a => a.id !== confirmModal.targetId));
        alert('Anuncio eliminado correctamente');
      }
    } catch (error: any) {
      throw error; // El modal manejará el error (contraseña incorrecta)
    }
  };

  if (!currentUser?.is_admin && !currentUser?.is_super_admin) {
    return <AccessDenied requiredRole="Admin" />;
  }

  return (
    <div className="flex-1 w-full max-w-[800px] border-x border-slate-100 min-h-screen bg-white pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 glass p-4 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Shield size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Panel Admin</h1>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          {(currentUser?.is_super_admin || currentUser?.permissions?.can_view_stats !== false) && (
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <BarChart3 size={18} />
              Estadísticas
            </button>
          )}
          {(currentUser?.is_super_admin || currentUser?.permissions?.can_manage_users !== false) && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={18} />
              Usuarios
            </button>
          )}
          {(currentUser?.is_super_admin || currentUser?.permissions?.can_manage_posts !== false) && (
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'posts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={18} />
              Publicaciones
            </button>
          )}
          {(currentUser?.is_super_admin || currentUser?.permissions?.can_manage_ads) && (
            <button
              onClick={() => setActiveTab('ads')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ads' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Megaphone size={18} />
              Publicidad
            </button>
          )}
          {(currentUser?.is_super_admin || currentUser?.permissions?.can_manage_settings) && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Settings size={18} />
              Configuración
            </button>
          )}
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {/* Modal de Confirmación */}
        <ConfirmPasswordModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          onConfirm={handleActionConfirm}
          title={
            confirmModal.action === 'delete-user' ? 'Eliminar Usuario' : 
            confirmModal.action === 'delete-post' ? 'Eliminar Publicación' :
            confirmModal.action === 'delete-ad' ? 'Eliminar Anuncio' :
            confirmModal.action === 'block-user' ? 'Bloquear Usuario' : 'Desbloquear Usuario'
          }
          description={
            confirmModal.action === 'delete-user' 
              ? 'Esta acción es irreversible. El perfil del usuario será eliminado permanentemente de la base de datos.' 
              : confirmModal.action === 'delete-post'
              ? '¿Estás seguro de que deseas eliminar esta publicación? Esta acción no se puede deshacer.'
              : confirmModal.action === 'delete-ad'
              ? '¿Estás seguro de que deseas eliminar este anuncio? Todas las métricas asociadas se perderán.'
              : `¿Estás seguro de que deseas ${confirmModal.action === 'block-user' ? 'bloquear' : 'desbloquear'} el acceso de este usuario a la plataforma?`
          }
          confirmText={
            confirmModal.action === 'delete-user' ? 'Eliminar Permanentemente' : 
            confirmModal.action === 'delete-post' ? 'Eliminar Publicación' :
            confirmModal.action === 'delete-ad' ? 'Eliminar Anuncio' :
            confirmModal.action === 'block-user' ? 'Bloquear Acceso' : 'Restaurar Acceso'
          }
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-slate-400 font-medium">Cargando datos...</p>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'stats' && stats && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                    <Users size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Usuarios Totales</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.users}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                    <FileText size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Publicaciones</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.posts}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
                    <Megaphone size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Anuncios</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.ads || 0}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                    <Heart size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Me Gusta</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.likes}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                    <Calendar size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Citas Totales</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.appointments}</p>
                </div>
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle size={24} />
                  </div>
                  <p className="text-slate-500 text-sm font-medium mb-1">Comentarios</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.comments}</p>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-shadow gap-4">
                    <div className="flex items-center gap-4">
                      <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-12 h-12 rounded-xl object-cover" alt={user.username} referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">{user.display_name}</p>
                          {user.is_verified && (
                            <VerifiedBadge size={14} />
                          )}
                          <div className="flex gap-1">
                            {user.is_super_admin ? (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Super Admin</span>
                            ) : user.is_admin ? (
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Admin</span>
                            ) : null}
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 truncate">@{user.username}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end sm:justify-start">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("transition-colors", user.is_verified ? "text-indigo-600 hover:text-indigo-700 bg-indigo-50" : "text-slate-400 hover:text-indigo-600")}
                        onClick={() => handleToggleVerify(user.id, user.is_verified || false)}
                        title={user.is_verified ? "Quitar verificación" : "Verificar usuario"}
                      >
                        <VerifiedBadge size={18} />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("transition-colors", user.is_blocked ? "text-amber-600 bg-amber-50" : "text-slate-400 hover:text-amber-600")}
                        onClick={() => setConfirmModal({ isOpen: true, targetId: user.id, action: user.is_blocked ? 'unblock-user' : 'block-user' })}
                        title={user.is_blocked ? "Desbloquear usuario" : "Bloquear usuario"}
                        disabled={user.is_super_admin || (user.is_admin && !currentUser?.is_super_admin)}
                      >
                        {user.is_blocked ? <Unlock size={18} /> : <Lock size={18} />}
                      </Button>

                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-rose-600"
                        onClick={() => setConfirmModal({ isOpen: true, targetId: user.id, action: 'delete-user' })}
                        title="Eliminar usuario"
                        disabled={user.is_super_admin || (user.is_admin && !currentUser?.is_super_admin)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'posts' && (
              <div className="space-y-4">
                {posts.map((post) => (
                  <div key={post.id} className="p-5 bg-white border border-slate-100 rounded-2xl hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 text-xs font-bold">
                          {(post.username || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{post.display_name}</p>
                          <p className="text-xs text-slate-500">{formatTime(post.created_at)}</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-slate-400 hover:text-rose-600"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 size={18} />
                      </Button>
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2 mb-3">{post.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1"><BarChart3 size={14} /> {post.likes_count} likes</span>
                      <span className="flex items-center gap-1"><FileText size={14} /> {post.comments_count} comentarios</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ads' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-slate-900">Gestión de Publicidad</h2>
                  <Button 
                    onClick={() => setIsAddingAd(!isAddingAd)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 rounded-xl"
                  >
                    <Plus size={18} />
                    {isAddingAd ? 'Cerrar' : 'Nuevo Anuncio'}
                  </Button>
                </div>

                {isAddingAd && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-6 bg-slate-50 rounded-[2rem] border border-indigo-100"
                  >
                    <h3 className="font-bold text-slate-900 mb-4">Nuevo Anuncio Publicitario</h3>
                    <form onSubmit={handleCreateAd} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Título</label>
                          <input 
                            type="text" 
                            required
                            value={newAd.title}
                            onChange={e => setNewAd({...newAd, title: e.target.value})}
                            placeholder="Ej: Promo Verano 2024"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">URL de Destino</label>
                          <input 
                            type="url" 
                            required
                            value={newAd.target_url}
                            onChange={e => setNewAd({...newAd, target_url: e.target.value})}
                            placeholder="https://ejemplo.com"
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Imagen del Anuncio</label>
                        <div className="flex flex-col sm:flex-row gap-4">
                          <div 
                            onClick={() => adFileInputRef.current?.click()}
                            className="flex-1 h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group relative overflow-hidden"
                          >
                            {newAd.image_url ? (
                              <>
                                <img src={newAd.image_url} className="w-full h-full object-cover" alt="Preview" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Upload className="text-white" size={24} />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mb-2 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                  {isUploadingAdImage ? <RefreshCw className="animate-spin" size={20} /> : <Image size={20} />}
                                </div>
                                <p className="text-xs font-bold text-slate-500">
                                  {isUploadingAdImage ? 'Subiendo...' : 'Subir imagen desde dispositivo'}
                                </p>
                              </>
                            )}
                            <input 
                              type="file" 
                              ref={adFileInputRef}
                              onChange={handleAdImageUpload}
                              accept="image/*"
                              className="hidden"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">O usar URL externa</label>
                            <input 
                              type="url" 
                              value={newAd.image_url}
                              onChange={e => setNewAd({...newAd, image_url: e.target.value})}
                              placeholder="https://ejemplo.com/imagen.jpg"
                              className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <p className="text-[10px] text-slate-400 mt-2 px-1">
                              Recomendado: 1200x630px para mejor visualización.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Descripción</label>
                        <textarea 
                          required
                          value={newAd.description}
                          onChange={e => setNewAd({...newAd, description: e.target.value})}
                          placeholder="Breve descripción del anuncio..."
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                        />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button 
                          type="submit" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl"
                        >
                          Crear Anuncio
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          onClick={() => setIsAddingAd(false)}
                          className="text-slate-500 hover:bg-slate-100 rounded-xl"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 gap-4">
                {ads.map((ad) => (
                  <div key={ad.id} className="bg-white border border-slate-100 rounded-3xl overflow-hidden hover:shadow-md transition-all group">
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-48 h-32 bg-slate-100 relative overflow-hidden">
                        <img src={ad.image_url || undefined} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                        <div className={cn(
                          "absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                          ad.is_active ? "bg-emerald-500 text-white" : "bg-slate-500 text-white"
                        )}>
                          {ad.is_active ? 'Activo' : 'Pausado'}
                        </div>
                      </div>
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-bold text-slate-900">{ad.title}</h3>
                            <p className="text-xs text-slate-500 line-clamp-1">{ad.description}</p>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleToggleAd(ad.id, ad.is_active)}
                              className={cn(
                                "p-2 rounded-xl transition-all",
                                ad.is_active ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50"
                              )}
                              title={ad.is_active ? "Pausar" : "Activar"}
                            >
                              {ad.is_active ? <ShieldOff size={16} /> : <Zap size={16} />}
                            </button>
                            <button 
                              onClick={() => handleDeleteAd(ad.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div className="flex items-center gap-2">
                            <Eye size={14} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Vistas</p>
                              <p className="text-sm font-bold text-slate-700">{ad.impressions || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MousePointer2 size={14} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">Clicks</p>
                              <p className="text-sm font-bold text-slate-700">{ad.clicks || 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <BarChart3 size={14} className="text-slate-400" />
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase">CTR</p>
                              <p className="text-sm font-bold text-slate-700">
                                {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : 0}%
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <a 
                            href={ad.target_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink size={10} />
                            Ver Destino
                          </a>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {ad.id.substring(0, 8)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {ads.length === 0 && !loading && (
                  <div className="text-center p-12 bg-slate-50 rounded-3xl">
                    <p className="text-slate-500 text-sm">No hay campañas publicitarias configuradas.</p>
                  </div>
                )}
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Settings size={18} className="text-indigo-600" />
                    Configuración de la Plataforma
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-900">Modo Mantenimiento</p>
                        <p className="text-xs text-slate-500">Desactiva el acceso a usuarios no administradores.</p>
                      </div>
                      <button className="w-12 h-6 bg-slate-200 rounded-full relative">
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100">
                      <div>
                        <p className="font-bold text-sm text-slate-900">Registros Abiertos</p>
                        <p className="text-xs text-slate-500">Permitir que nuevos usuarios se registren.</p>
                      </div>
                      <button className="w-12 h-6 bg-indigo-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};
