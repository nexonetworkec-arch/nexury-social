import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, Database, Server, Settings, Activity, Users, ShieldCheck, UserMinus, UserPlus, Search, ArrowLeft, ChevronDown, ChevronUp, FileText, Calendar, BarChart3, Star, Plus, Trash2, Award, Headphones, Video, ShieldOff, Palette, Check, Shield, RefreshCw, HardDrive, Cpu, Globe, Zap, AlertCircle, Megaphone, ExternalLink, Eye, MousePointer2, Image, Upload } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { AccessDenied } from '../common/AccessDenied';
import { ConfirmPasswordModal } from '../common/ConfirmPasswordModal';
import { AuthService } from '../../services/authService';
import { AdminService } from '../../services/adminService';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { cn } from '../../lib/utils';
import { VerifiedBenefit } from '../../types';

const ICON_MAP: Record<string, any> = {
  Star, Award, Headphones, Video, ShieldOff, Palette, Settings, Activity, Users, ShieldCheck, FileText, Calendar, BarChart3
};

export const SuperAdminPanel = () => {
  const { user, reauthenticate } = useAuth();
  const [currentSubView, setCurrentSubView] = useState<'main' | 'admins' | 'add-admin' | 'benefits' | 'users' | 'database' | 'server' | 'metrics' | 'settings' | 'ads'>('main');
  const [admins, setAdmins] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [benefits, setBenefits] = useState<VerifiedBenefit[]>([]);
  const [ads, setAds] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null);
  const [isAddingBenefit, setIsAddingBenefit] = useState(false);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const adFileInputRef = useRef<HTMLInputElement>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);
  const [metricsData, setMetricsData] = useState<any[]>([]);
  const [serverLogs, setServerLogs] = useState<any[]>([]);
  const [optimizing, setOptimizing] = useState<string | null>(null);
  
  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    targetId: string;
    action: 'delete-user' | 'block-user' | 'unblock-user' | 'delete-benefit' | 'reset-platform' | 'toggle-maintenance' | 'delete-ad';
    data?: any;
  }>({
    isOpen: false,
    targetId: '',
    action: 'delete-user'
  });

  const [globalSettings, setGlobalSettings] = useState({
    maintenanceMode: false,
    registrationsOpen: true,
    emailNotifications: true,
    aiModeration: true,
    smartFeedEnabled: true,
    verifiedBoost: 1.5,
    adminBoost: 3.0
  });
  const [newBenefit, setNewBenefit] = useState({
    slug: '',
    name: '',
    description: '',
    icon_name: 'Star'
  });

  const [newAd, setNewAd] = useState({
    title: '',
    description: '',
    image_url: '',
    target_url: ''
  });

  useEffect(() => {
    if (currentSubView === 'admins') {
      fetchAdmins();
    } else if (currentSubView === 'benefits') {
      fetchBenefits();
    } else if (currentSubView === 'users') {
      fetchUsers();
    } else if (currentSubView === 'database') {
      fetchDbStats();
    } else if (currentSubView === 'server') {
      fetchSystemStats();
    } else if (currentSubView === 'metrics') {
      fetchMetrics();
    } else if (currentSubView === 'settings') {
      fetchSettings();
    } else if (currentSubView === 'ads') {
      fetchAds();
    }
  }, [currentSubView]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await AdminService.getGlobalSettings();
      setGlobalSettings({
        maintenanceMode: settings.maintenance_mode,
        registrationsOpen: settings.registrations_open,
        emailNotifications: settings.email_notifications,
        aiModeration: settings.ai_moderation,
        smartFeedEnabled: settings.smart_feed_enabled ?? true,
        verifiedBoost: settings.verified_boost ?? 1.5,
        adminBoost: settings.admin_boost ?? 3.0
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await AdminService.updateGlobalSettings({
        maintenance_mode: globalSettings.maintenanceMode,
        registrations_open: globalSettings.registrationsOpen,
        email_notifications: globalSettings.emailNotifications,
        ai_moderation: globalSettings.aiModeration,
        smart_feed_enabled: globalSettings.smartFeedEnabled,
        verified_boost: globalSettings.verifiedBoost,
        admin_boost: globalSettings.adminBoost
      });
      alert('Configuración global actualizada correctamente.');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error al guardar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeTable = async (tableName: string) => {
    setOptimizing(tableName);
    try {
      const result = await AdminService.optimizeTable(tableName);
      alert(result.message);
      fetchDbStats();
    } catch (error) {
      console.error('Error optimizing table:', error);
    } finally {
      setOptimizing(null);
    }
  };

  const fetchDbStats = async () => {
    setLoading(true);
    try {
      // En una app real, esto vendría de una función RPC o API
      const stats = await AdminService.getAdminStats();
      setDbStats({
        tables: [
          { name: 'profiles', count: stats.users, size: '1.2 MB' },
          { name: 'posts', count: stats.posts, size: '4.5 MB' },
          { name: 'comments', count: stats.comments, size: '0.8 MB' },
          { name: 'likes', count: stats.likes, size: '0.3 MB' },
          { name: 'appointments', count: stats.appointments, size: '0.5 MB' },
          { name: 'ads', count: stats.ads || 0, size: '0.2 MB' },
          { name: 'notifications', count: 1240, size: '2.1 MB' }
        ],
        totalSize: '9.6 MB',
        lastBackup: 'Hace 4 horas'
      });
    } catch (error) {
      console.error('Error fetching DB stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      // Mocking system health
      const logs = await AdminService.getServerLogs();
      setServerLogs(logs);
      
      setTimeout(() => {
        setSystemStats({
          uptime: '14 días, 6 horas, 22 min',
          region: 'us-west-2 (Oregon)',
          latency: '42ms',
          cpuUsage: 12,
          memoryUsage: 45,
          activeConnections: 128,
          services: [
            { name: 'Auth Service', status: 'online', latency: '12ms' },
            { name: 'Database Engine', status: 'online', latency: '5ms' },
            { name: 'Storage API', status: 'online', latency: '28ms' },
            { name: 'Edge Functions', status: 'online', latency: '15ms' }
          ]
        });
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    // Mocking metrics data for charts
    setTimeout(() => {
      const data = [
        { name: 'Lun', users: 400, posts: 240, activity: 2400, ads: 120 },
        { name: 'Mar', users: 300, posts: 139, activity: 2210, ads: 150 },
        { name: 'Mie', users: 200, posts: 980, activity: 2290, ads: 180 },
        { name: 'Jue', users: 278, posts: 390, activity: 2000, ads: 140 },
        { name: 'Vie', users: 189, posts: 480, activity: 2181, ads: 210 },
        { name: 'Sab', users: 239, posts: 380, activity: 2500, ads: 250 },
        { name: 'Dom', users: 349, posts: 430, activity: 2100, ads: 190 },
      ];
      setMetricsData(data);
      setLoading(false);
    }, 800);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getAdminUsers();
      setUsers(data as any[]);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSubView === 'add-admin' && searchQuery.length > 2) {
      const delayDebounceFn = setTimeout(() => {
        handleSearchUsers();
      }, 500);

      return () => clearTimeout(delayDebounceFn);
    } else if (currentSubView === 'add-admin' && searchQuery.length <= 2) {
      setSearchResults([]);
    }
  }, [searchQuery, currentSubView]);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getAdministrators();
      setAdmins(data as any[]);
    } catch (error) {
      console.error('Error fetching admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBenefits = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getVerifiedBenefits();
      setBenefits(data as VerifiedBenefit[]);
    } catch (error) {
      console.error('Error fetching benefits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAds = async () => {
    setLoading(true);
    try {
      const data = await AdminService.getAds();
      setAds(data as any[]);
    } catch (error) {
      console.error('Error fetching ads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AdminService.createAd(newAd);
      setIsAddingAd(false);
      setNewAd({ title: '', description: '', image_url: '', target_url: '' });
      fetchAds();
    } catch (error) {
      console.error('Error creating ad:', error);
      alert('Error al crear el anuncio.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAdImage(true);
    try {
      const url = await AuthService.uploadMedia(file, 'posts'); // Usamos el bucket de posts o creamos uno de ads
      setNewAd(prev => ({ ...prev, image_url: url }));
    } catch (error: any) {
      console.error('Error uploading ad image:', error);
      alert(error.message || 'Error al subir la imagen.');
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleToggleAd = async (id: string, currentStatus: boolean) => {
    try {
      await AdminService.updateAd(id, { is_active: !currentStatus });
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

  const handleCreateBenefit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AdminService.createVerifiedBenefit(newBenefit);
      setIsAddingBenefit(false);
      setNewBenefit({ slug: '', name: '', description: '', icon_name: 'Star' });
      fetchBenefits();
    } catch (error) {
      console.error('Error creating benefit:', error);
      alert('Error al crear el beneficio. Asegúrate de que el slug sea único.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBenefit = async (id: string, currentStatus: boolean) => {
    try {
      await AdminService.updateVerifiedBenefit(id, { is_active: !currentStatus });
      setBenefits(prev => prev.map(b => b.id === id ? { ...b, is_active: !currentStatus } : b));
    } catch (error) {
      console.error('Error toggling benefit:', error);
    }
  };

  const handleDeleteBenefit = (id: string) => {
    setConfirmModal({
      isOpen: true,
      targetId: id,
      action: 'delete-benefit'
    });
  };

  const handleSearchUsers = async () => {
    setLoading(true);
    try {
      const data = await AuthService.searchProfiles(searchQuery);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: string, currentStatus: boolean) => {
    try {
      await AdminService.setAdminStatus(userId, !currentStatus);
      if (currentSubView === 'admins') {
        fetchAdmins();
      } else if (currentSubView === 'users') {
        fetchUsers();
      } else {
        handleSearchUsers();
      }
    } catch (error) {
      console.error('Error toggling admin status:', error);
    }
  };

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    try {
      await AdminService.verifyUser(userId, !currentStatus);
      if (currentSubView === 'users') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling verification:', error);
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    try {
      await AdminService.blockUser(userId, !currentStatus);
      if (currentSubView === 'users') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling block status:', error);
    }
  };

  const handleDeleteUser = (userId: string) => {
    setConfirmModal({
      isOpen: true,
      targetId: userId,
      action: 'delete-user'
    });
  };

  const handleUpdatePermissions = async (userId: string, permissionKey: string, currentValue: boolean) => {
    const admin = admins.find(a => a.id === userId);
    if (!admin) return;

    const currentPermissions = admin.permissions || {
      can_manage_users: true,
      can_manage_posts: true,
      can_manage_appointments: true,
      can_view_stats: true,
      can_manage_settings: false,
      can_manage_ads: false
    };

    const newPermissions = {
      ...currentPermissions,
      [permissionKey]: !currentValue
    };

    try {
      await AdminService.updateAdminPermissions(userId, newPermissions);
      setAdmins(prev => prev.map(a => a.id === userId ? { ...a, permissions: newPermissions } : a));
    } catch (error) {
      console.error('Error updating permissions:', error);
    }
  };

  const handleActionConfirm = async (password: string) => {
    try {
      // 1. Reautenticar al super administrador
      await reauthenticate(password);

      // 2. Ejecutar la acción solicitada
      if (confirmModal.action === 'delete-user') {
        await AdminService.deleteUser(confirmModal.targetId);
        if (currentSubView === 'users') fetchUsers();
        alert('Usuario eliminado correctamente');
      } else if (confirmModal.action === 'delete-benefit') {
        await AdminService.deleteVerifiedBenefit(confirmModal.targetId);
        setBenefits(prev => prev.filter(b => b.id !== confirmModal.targetId));
        alert('Beneficio eliminado correctamente');
      } else if (confirmModal.action === 'delete-ad') {
        await AdminService.deleteAd(confirmModal.targetId);
        setAds(prev => prev.filter(a => a.id !== confirmModal.targetId));
        alert('Anuncio eliminado correctamente');
      } else if (confirmModal.action === 'block-user' || confirmModal.action === 'unblock-user') {
        const isBlocked = confirmModal.action === 'block-user';
        await AdminService.blockUser(confirmModal.targetId, isBlocked);
        if (currentSubView === 'users') fetchUsers();
        alert(isBlocked ? 'Usuario bloqueado' : 'Usuario desbloqueado');
      } else if (confirmModal.action === 'reset-platform') {
        setLoading(true);
        // Simulamos reinicio
        await new Promise(resolve => setTimeout(resolve, 3000));
        setLoading(false);
        alert('Plataforma reiniciada correctamente.');
        window.location.reload();
      } else if (confirmModal.action === 'toggle-maintenance') {
        const newMode = confirmModal.data.newMode;
        setLoading(true);
        try {
          await AdminService.updateGlobalSettings({
            ...globalSettings,
            maintenance_mode: newMode
          });
          setGlobalSettings(prev => ({...prev, maintenanceMode: newMode}));
          alert(`Modo mantenimiento ${newMode ? 'activado' : 'desactivado'}`);
        } catch (error) {
          console.error('Error toggling maintenance mode:', error);
          alert('Error al cambiar el modo mantenimiento');
        } finally {
          setLoading(false);
        }
      }
    } catch (error: any) {
      throw error; // El modal manejará el error (contraseña incorrecta)
    }
  };

  if (!user?.is_super_admin) {
    return <AccessDenied requiredRole="Super Admin" />;
  }

  if (currentSubView === 'admins' || currentSubView === 'add-admin' || currentSubView === 'benefits' || currentSubView === 'users' || currentSubView === 'database' || currentSubView === 'server' || currentSubView === 'metrics' || currentSubView === 'settings' || currentSubView === 'ads') {
    return (
      <div className="flex-1 w-full max-w-[800px] border-x border-slate-100 min-h-screen bg-white pb-24 sm:pb-0">
        <header className="sticky top-0 z-20 glass p-4 sm:p-6 border-b border-slate-100">
          <button 
            onClick={() => setCurrentSubView('main')}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors mb-4 text-sm font-medium"
          >
            <ArrowLeft size={16} />
            Volver al Panel
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                {currentSubView === 'admins' ? <ShieldCheck size={24} /> : 
                 currentSubView === 'add-admin' ? <UserPlus size={24} /> :
                 currentSubView === 'users' ? <Users size={24} /> :
                 currentSubView === 'database' ? <Database size={24} /> :
                 currentSubView === 'server' ? <Server size={24} /> :
                 currentSubView === 'metrics' ? <Activity size={24} /> :
                 currentSubView === 'settings' ? <Settings size={24} /> :
                 currentSubView === 'ads' ? <Megaphone size={24} /> :
                 <Star size={24} />}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {currentSubView === 'admins' ? 'Administradores' : 
                 currentSubView === 'add-admin' ? 'Promover Administrador' :
                 currentSubView === 'users' ? 'Gestión Global de Usuarios' :
                 currentSubView === 'database' ? 'Infraestructura de Datos' :
                 currentSubView === 'server' ? 'Estado del Servidor' :
                 currentSubView === 'metrics' ? 'Métricas de Crecimiento' :
                 currentSubView === 'settings' ? 'Configuración Global' :
                 currentSubView === 'ads' ? 'Publicidad Ads' :
                 'Beneficios para Verificados'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              {currentSubView === 'admins' && (
                <Button 
                  size="sm" 
                  onClick={() => {
                    setCurrentSubView('add-admin');
                    setSearchQuery('');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  <UserPlus size={16} className="mr-2" />
                  Nuevo
                </Button>
              )}
              {currentSubView === 'benefits' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsAddingBenefit(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  <Plus size={16} className="mr-2" />
                  Añadir Beneficio
                </Button>
              )}
              {currentSubView === 'ads' && (
                <Button 
                  size="sm" 
                  onClick={() => setIsAddingAd(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  <Plus size={16} className="mr-2" />
                  Crear Anuncio
                </Button>
              )}
            </div>
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
              confirmModal.action === 'delete-benefit' ? 'Eliminar Beneficio' :
              confirmModal.action === 'delete-ad' ? 'Eliminar Anuncio' :
              confirmModal.action === 'block-user' ? 'Bloquear Usuario' : 
              confirmModal.action === 'unblock-user' ? 'Desbloquear Usuario' :
              confirmModal.action === 'reset-platform' ? 'Reiniciar Plataforma' : 'Modo Mantenimiento'
            }
            description={
              confirmModal.action === 'delete-user' 
                ? 'Esta acción es irreversible. El perfil del usuario será eliminado permanentemente de la base de datos.' 
                : confirmModal.action === 'delete-benefit'
                ? '¿Estás seguro de que deseas eliminar este beneficio? Las cuentas verificadas dejarán de tener acceso a esta ventaja.'
                : confirmModal.action === 'delete-ad'
                ? '¿Estás seguro de que deseas eliminar este anuncio? Todas las métricas asociadas se perderán.'
                : confirmModal.action === 'reset-platform'
                ? '¿Estás seguro de que quieres reiniciar la plataforma? Esto limpiará cachés y sesiones activas.'
                : confirmModal.action === 'toggle-maintenance'
                ? `¿Estás seguro de que quieres ${confirmModal.data.newMode ? 'activar' : 'desactivar'} el modo mantenimiento?`
                : `¿Estás seguro de que deseas ${confirmModal.action === 'block-user' ? 'bloquear' : 'desbloquear'} el acceso de este usuario?`
            }
            confirmText={
              confirmModal.action === 'delete-user' ? 'Eliminar Permanentemente' : 
              confirmModal.action === 'delete-benefit' ? 'Eliminar Beneficio' :
              confirmModal.action === 'delete-ad' ? 'Eliminar Anuncio' :
              confirmModal.action === 'reset-platform' ? 'Reiniciar Ahora' :
              confirmModal.action === 'toggle-maintenance' ? (confirmModal.data.newMode ? 'Activar Mantenimiento' : 'Desactivar Mantenimiento') :
              confirmModal.action === 'block-user' ? 'Bloquear Acceso' : 'Restaurar Acceso'
            }
          />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
              <p className="text-slate-400 font-medium">Sincronizando con el núcleo...</p>
            </div>
          ) : (
            <>
              {currentSubView === 'database' && dbStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <HardDrive size={18} className="text-indigo-600" />
                        <span className="text-sm font-bold text-slate-900">Espacio Total</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{dbStats.totalSize}</p>
                      <p className="text-xs text-slate-500 mt-1">Uso de almacenamiento en Supabase</p>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <RefreshCw size={18} className="text-emerald-600" />
                        <span className="text-sm font-bold text-slate-900">Último Backup</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{dbStats.lastBackup}</p>
                      <p className="text-xs text-slate-500 mt-1">Copia de seguridad incremental</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                      <h3 className="text-sm font-bold text-slate-900">Tablas del Sistema</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {dbStats.tables.map((table: any) => (
                        <div key={table.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <p className="font-bold text-sm text-slate-900">{table.name}</p>
                            <p className="text-xs text-slate-500">{table.count} registros</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700">{table.size}</p>
                            <button 
                              onClick={() => handleOptimizeTable(table.name)}
                              disabled={optimizing === table.name}
                              className={cn(
                                "text-[10px] font-bold uppercase tracking-wider hover:underline transition-colors",
                                optimizing === table.name ? "text-slate-400" : "text-indigo-600"
                              )}
                            >
                              {optimizing === table.name ? 'Optimizando...' : 'Optimizar'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentSubView === 'server' && systemStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <Cpu size={20} className="text-indigo-600 mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">CPU</p>
                      <p className="text-xl font-bold text-slate-900">{systemStats.cpuUsage}%</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <Zap size={20} className="text-amber-600 mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">RAM</p>
                      <p className="text-xl font-bold text-slate-900">{systemStats.memoryUsage}%</p>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                      <Globe size={20} className="text-emerald-600 mb-3" />
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Latencia</p>
                      <p className="text-xl font-bold text-slate-900">{systemStats.latency}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-3xl text-white">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold">Estado de Microservicios</h3>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-widest">Todos los sistemas operativos</span>
                    </div>
                    <div className="space-y-4">
                      {systemStats.services.map((service: any) => (
                        <div key={service.name} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/10">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium">{service.name}</span>
                          </div>
                          <span className="text-xs text-white/40 font-mono">{service.latency}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Logs del Sistema</h3>
                      <button 
                        onClick={fetchSystemStats}
                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        Actualizar
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                      {serverLogs.map((log) => (
                        <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded uppercase",
                              log.level === 'ERROR' ? "bg-rose-100 text-rose-600" :
                              log.level === 'WARN' ? "bg-amber-100 text-amber-600" :
                              "bg-indigo-100 text-indigo-600"
                            )}>
                              {log.level}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium">{log.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {currentSubView === 'metrics' && (
                <div className="space-y-6">
                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Crecimiento de Usuarios (7d)</h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metricsData}>
                          <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          />
                          <Area type="monotone" dataKey="users" stroke="#4f46e5" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Actividad de Publicaciones</h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={metricsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          />
                          <Line type="monotone" dataKey="posts" stroke="#10b981" strokeWidth={3} dot={{r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-slate-900 mb-6">Rendimiento de Publicidad (Impresiones)</h3>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={metricsData}>
                          <defs>
                            <linearGradient id="colorAds" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          />
                          <Area type="monotone" dataKey="ads" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAds)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {currentSubView === 'settings' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
                    <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Settings size={18} className="text-indigo-600" />
                      Configuración del Núcleo
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">Modo Mantenimiento</p>
                          <p className="text-xs text-slate-500">Solo administradores podrán acceder a la plataforma.</p>
                        </div>
                        <button 
                          onClick={() => setGlobalSettings(prev => ({...prev, maintenanceMode: !prev.maintenanceMode}))}
                          className={cn(
                            "w-14 h-7 rounded-full transition-all relative",
                            globalSettings.maintenanceMode ? "bg-rose-500" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                            globalSettings.maintenanceMode ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">Registros Abiertos</p>
                          <p className="text-xs text-slate-500">Permitir que nuevos usuarios creen cuentas.</p>
                        </div>
                        <button 
                          onClick={() => setGlobalSettings(prev => ({...prev, registrationsOpen: !prev.registrationsOpen}))}
                          className={cn(
                            "w-14 h-7 rounded-full transition-all relative",
                            globalSettings.registrationsOpen ? "bg-indigo-600" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                            globalSettings.registrationsOpen ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div>
                          <p className="font-bold text-slate-900">Moderación por IA</p>
                          <p className="text-xs text-slate-500">Usar Gemini para filtrar contenido sensible automáticamente.</p>
                        </div>
                        <button 
                          onClick={() => setGlobalSettings(prev => ({...prev, aiModeration: !prev.aiModeration}))}
                          className={cn(
                            "w-14 h-7 rounded-full transition-all relative",
                            globalSettings.aiModeration ? "bg-emerald-500" : "bg-slate-200"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                            globalSettings.aiModeration ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 ml-1">Optimización del Algoritmo</h4>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 shadow-sm">
                          <div>
                            <p className="font-bold text-slate-900">Smart Feed (Para ti)</p>
                            <p className="text-xs text-slate-500">Activar el algoritmo de recomendación inteligente.</p>
                          </div>
                          <button 
                            onClick={() => setGlobalSettings(prev => ({...prev, smartFeedEnabled: !prev.smartFeedEnabled}))}
                            className={cn(
                              "w-14 h-7 rounded-full transition-all relative",
                              globalSettings.smartFeedEnabled ? "bg-indigo-600" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-sm",
                              globalSettings.smartFeedEnabled ? "right-1" : "left-1"
                            )} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Boost Verificados (x)</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="range" 
                                min="1" 
                                max="5" 
                                step="0.1"
                                value={globalSettings.verifiedBoost}
                                onChange={e => setGlobalSettings(prev => ({...prev, verifiedBoost: parseFloat(e.target.value)}))}
                                className="flex-1 accent-indigo-600"
                              />
                              <span className="text-sm font-bold text-indigo-600 w-8">{globalSettings.verifiedBoost}x</span>
                            </div>
                          </div>
                          <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Boost Super Admin (x)</label>
                            <div className="flex items-center gap-3">
                              <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="0.5"
                                value={globalSettings.adminBoost}
                                onChange={e => setGlobalSettings(prev => ({...prev, adminBoost: parseFloat(e.target.value)}))}
                                className="flex-1 accent-rose-600"
                              />
                              <span className="text-sm font-bold text-rose-600 w-8">{globalSettings.adminBoost}x</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <Button 
                        onClick={handleSaveSettings}
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100"
                      >
                        {loading ? 'Guardando...' : 'Guardar Cambios Globales'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Buscador para vistas de usuarios/admins */}
              {(currentSubView === 'admins' || currentSubView === 'users' || currentSubView === 'add-admin') && (
                <div className="relative mb-6">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder={
                      currentSubView === 'admins' ? "Filtrar administradores..." : 
                      currentSubView === 'users' ? "Buscar en toda la base de datos..." :
                      "Buscar usuario por nombre o @username..."
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              )}

              {currentSubView === 'benefits' && isAddingBenefit && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-8 p-6 bg-slate-50 rounded-[2rem] border border-indigo-100"
                >
                  <h3 className="font-bold text-slate-900 mb-4">Nuevo Beneficio Modular</h3>
                  <form onSubmit={handleCreateBenefit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Nombre</label>
                        <input 
                          type="text" 
                          required
                          value={newBenefit.name}
                          onChange={e => setNewBenefit({...newBenefit, name: e.target.value})}
                          placeholder="Ej: Soporte VIP"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Slug (Identificador único)</label>
                        <input 
                          type="text" 
                          required
                          value={newBenefit.slug}
                          onChange={e => setNewBenefit({...newBenefit, slug: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                          placeholder="ej: soporte_vip"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Descripción</label>
                      <textarea 
                        required
                        value={newBenefit.description}
                        onChange={e => setNewBenefit({...newBenefit, description: e.target.value})}
                        placeholder="Describe en qué consiste este beneficio..."
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Icono (Nombre de Lucide)</label>
                      <select 
                        value={newBenefit.icon_name}
                        onChange={e => setNewBenefit({...newBenefit, icon_name: e.target.value})}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        {Object.keys(ICON_MAP).map(icon => (
                          <option key={icon} value={icon}>{icon}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="ghost" onClick={() => setIsAddingBenefit(false)}>Cancelar</Button>
                      <Button type="submit" disabled={loading}>Crear Beneficio</Button>
                    </div>
                  </form>
                </motion.div>
              )}

              <div className="space-y-3">
                {currentSubView === 'benefits' ? (
                  benefits.map((benefit) => {
                    const Icon = ICON_MAP[benefit.icon_name] || Star;
                    return (
                      <div key={benefit.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                            benefit.is_active ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400"
                          )}>
                            <Icon size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 text-sm">{benefit.name}</p>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-mono">{benefit.slug}</span>
                            </div>
                            <p className="text-slate-500 text-xs max-w-md">{benefit.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleBenefit(benefit.id, benefit.is_active)}
                            className={cn(
                              "w-12 h-6 rounded-full transition-all relative",
                              benefit.is_active ? "bg-indigo-600" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                              benefit.is_active ? "right-1" : "left-1"
                            )} />
                          </button>
                          <button 
                            onClick={() => handleDeleteBenefit(benefit.id)}
                            className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : currentSubView === 'users' ? (
                  users.filter(u => 
                    u.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.display_name.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map((u) => (
                    <div key={u.id} className="flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-indigo-100 transition-all">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <img src={u.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-slate-900 text-sm">{u.display_name}</p>
                              {u.is_verified && <VerifiedBadge size={14} />}
                              {u.is_super_admin ? (
                                <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Super Admin</span>
                              ) : u.is_admin ? (
                                <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>
                              ) : null}
                            </div>
                            <p className="text-slate-500 text-xs">@{u.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleToggleVerify(u.id, u.is_verified)}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              u.is_verified ? "text-rose-600 bg-rose-50" : "text-indigo-600 bg-indigo-50"
                            )}
                            title={u.is_verified ? "Quitar Verificación" : "Verificar Cuenta"}
                          >
                            {u.is_verified ? <ShieldOff size={18} /> : <ShieldCheck size={18} />}
                          </button>
                          <button 
                            onClick={() => setConfirmModal({ isOpen: true, targetId: u.id, action: u.is_blocked ? 'unblock-user' : 'block-user' })}
                            className={cn(
                              "p-2 rounded-xl transition-all",
                              u.is_blocked ? "text-amber-600 bg-amber-50" : "text-slate-400 hover:bg-slate-50"
                            )}
                            disabled={u.is_super_admin}
                            title={u.is_blocked ? "Desbloquear" : "Bloquear"}
                          >
                            {u.is_blocked ? <ShieldOff size={18} /> : <ShieldAlert size={18} />}
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            disabled={u.is_super_admin}
                            title="Eliminar Permanentemente"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  (currentSubView === 'admins' ? admins.filter(a => 
                    a.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    a.display_name.toLowerCase().includes(searchQuery.toLowerCase())
                  ) : searchResults).map((item) => (
                    <div key={item.id} className="flex flex-col bg-white border border-slate-100 rounded-2xl overflow-hidden hover:border-indigo-100 transition-all">
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <img src={item.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}`} className="w-10 h-10 rounded-xl object-cover" alt="" referrerPolicy="no-referrer" />
                          <div>
                            <div className="flex items-center gap-1">
                              <p className="font-bold text-slate-900 text-sm">{item.display_name}</p>
                              {item.is_verified && <VerifiedBadge size={14} />}
                              {item.is_admin && <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">Admin</span>}
                            </div>
                            <p className="text-slate-500 text-xs">@{item.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentSubView === 'admins' && !item.is_super_admin && (
                            <button 
                              onClick={() => setEditingPermissions(editingPermissions === item.id ? null : item.id)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Gestionar Permisos"
                            >
                              {editingPermissions === item.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleAdmin(item.id, item.is_admin)}
                            className={cn(
                              "rounded-xl",
                              item.is_admin ? "text-rose-600 hover:bg-rose-50" : "text-indigo-600 hover:bg-indigo-50"
                            )}
                            disabled={item.is_super_admin}
                          >
                            {item.is_admin ? (
                              <><UserMinus size={16} className="mr-2" /> Revocar</>
                            ) : (
                              <><UserPlus size={16} className="mr-2" /> Promover</>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Panel de Permisos */}
                      {editingPermissions === item.id && (
                        <div className="px-4 pb-4 pt-2 border-t border-slate-50 bg-slate-50/50">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">Permisos de Administrador</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[
                              { key: 'can_manage_users', label: 'Gestionar Usuarios', icon: Users },
                              { key: 'can_manage_posts', label: 'Gestionar Posts', icon: FileText },
                              { key: 'can_manage_appointments', label: 'Gestionar Citas', icon: Calendar },
                              { key: 'can_view_stats', label: 'Ver Estadísticas', icon: BarChart3 },
                              { key: 'can_manage_ads', label: 'Publicidad Ads', icon: Megaphone },
                              { key: 'can_manage_settings', label: 'Configuración Global', icon: Settings },
                            ].map((perm) => {
                              const isEnabled = item.permissions?.[perm.key] ?? (perm.key !== 'can_manage_settings' && perm.key !== 'can_manage_ads');
                              return (
                                <div key={perm.key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <perm.icon size={14} className="text-slate-400" />
                                    <span className="text-xs font-medium text-slate-700">{perm.label}</span>
                                  </div>
                                  <button
                                    onClick={() => handleUpdatePermissions(item.id, perm.key, isEnabled)}
                                    className={cn(
                                      "w-10 h-5 rounded-full transition-all relative",
                                      isEnabled ? "bg-indigo-600" : "bg-slate-200"
                                    )}
                                  >
                                    <div className={cn(
                                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                                      isEnabled ? "right-1" : "left-1"
                                    )} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {currentSubView === 'admins' && admins.length === 0 && (
                  <div className="text-center p-12 bg-slate-50 rounded-3xl">
                    <p className="text-slate-500 text-sm">No hay administradores secundarios asignados.</p>
                  </div>
                )}
                {currentSubView === 'benefits' && benefits.length === 0 && !loading && (
                  <div className="text-center p-12 bg-slate-50 rounded-3xl">
                    <p className="text-slate-500 text-sm">No hay beneficios configurados aún.</p>
                  </div>
                )}
                {currentSubView === 'ads' && isAddingAd && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-8 p-6 bg-slate-50 rounded-[2rem] border border-indigo-100"
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
                {currentSubView === 'ads' && (
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
                                <Activity size={14} className="text-slate-400" />
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
                  </div>
                )}
                {currentSubView === 'ads' && ads.length === 0 && !loading && (
                  <div className="text-center p-12 bg-slate-50 rounded-3xl">
                    <p className="text-slate-500 text-sm">No hay campañas publicitarias configuradas.</p>
                  </div>
                )}
                {currentSubView === 'add-admin' && searchQuery.length > 2 && searchResults.length === 0 && !loading && (
                  <div className="text-center p-12 bg-slate-50 rounded-3xl">
                    <p className="text-slate-500 text-sm">No se encontraron usuarios que coincidan con "{searchQuery}".</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-[800px] border-x border-slate-100 min-h-screen bg-white pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 glass p-4 sm:p-6 border-b border-slate-100">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
            <ShieldAlert size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Super Admin</h1>
        </div>
        <p className="text-slate-500 text-sm">Panel de control de infraestructura y configuración global.</p>
      </header>

      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            onClick={() => setCurrentSubView('users')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Users size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Gestión Global de Usuarios</h3>
            <p className="text-sm text-slate-500">Verificar cuentas, gestionar roles y moderar perfiles en toda la plataforma.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('admins')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <ShieldCheck size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Equipo de Administradores</h3>
            <p className="text-sm text-slate-500">Gestionar el equipo de moderación y sus permisos específicos.</p>
          </div>
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'Admin' }))}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Shield size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Panel de Administrador</h3>
            <p className="text-sm text-slate-500">Acceder a las funciones operativas del equipo de administración.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('benefits')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Star size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Beneficios Verificados</h3>
            <p className="text-sm text-slate-500">Motor modular de ventajas para cuentas verificadas.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('ads')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Megaphone size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Publicidad Ads</h3>
            <p className="text-sm text-slate-500">Gestionar campañas publicitarias y monetización de la plataforma.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('database')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Database size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Base de Datos</h3>
            <p className="text-sm text-slate-500">Gestionar migraciones y copias de seguridad.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('server')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Server size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Servidor</h3>
            <p className="text-sm text-slate-500">Estado de los servicios y logs en tiempo real.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('metrics')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Activity size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Métricas</h3>
            <p className="text-sm text-slate-500">Rendimiento global y uso de recursos.</p>
          </div>
          <div 
            onClick={() => setCurrentSubView('settings')}
            className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 bg-slate-200 text-slate-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-600 group-hover:text-white transition-colors">
              <Settings size={20} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Configuración</h3>
            <p className="text-sm text-slate-500">Variables de entorno y llaves de API.</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
          <h3 className="text-rose-900 font-bold mb-2 flex items-center gap-2">
            <AlertCircle size={18} />
            Zona de Peligro
          </h3>
          <p className="text-rose-700 text-sm mb-4">Estas acciones afectan a toda la plataforma y no se pueden deshacer.</p>
          <div className="flex gap-3">
            <button 
              onClick={() => setConfirmModal({ isOpen: true, targetId: 'platform', action: 'reset-platform' })}
              className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-700 transition-colors"
            >
              Reiniciar Plataforma
            </button>
            <button 
              onClick={() => {
                const newMode = !globalSettings.maintenanceMode;
                setConfirmModal({ 
                  isOpen: true, 
                  targetId: 'settings', 
                  action: 'toggle-maintenance',
                  data: { newMode }
                });
              }}
              className="px-4 py-2 bg-white text-rose-600 border border-rose-200 text-sm font-bold rounded-xl hover:bg-rose-50 transition-colors"
            >
              {globalSettings.maintenanceMode ? 'Desactivar Mantenimiento' : 'Activar Mantenimiento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
