import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Camera, User, FileText, Save, Upload } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Validaciones básicas
      if (username.length < 3) {
        throw new Error('El nombre de usuario debe tener al menos 3 caracteres');
      }

      if (!/^[a-z0-9._]+$/.test(username)) {
        throw new Error('El nombre de usuario solo puede contener letras, números, puntos y guiones bajos');
      }

      let finalAvatarUrl = avatarUrl;

      // Si hay un archivo nuevo, subirlo primero
      if (avatarFile) {
        try {
          finalAvatarUrl = await dataService.uploadMedia(user.id, avatarFile, 'avatars');
        } catch (uploadErr) {
          console.error('Error uploading avatar:', uploadErr);
          throw new Error('Error al subir la imagen. Intenta con un archivo más pequeño.');
        }
      }

      await dataService.updateUser(user.id, {
        displayName,
        username,
        bio,
        avatarUrl: finalAvatarUrl
      });

      // Forzar una actualización completa del estado global
      await refreshUser();
      
      // Pequeña pausa para asegurar que el usuario vea el éxito (opcional pero ayuda a la percepción)
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (err: any) {
      console.error('Submit error:', err);
      if (err.code === '23505') {
        setError('Este nombre de usuario ya está en uso. Elige otro.');
      } else {
        setError(err.message || 'Error al actualizar perfil. Verifica tu conexión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] sm:w-[calc(100%-2rem)] max-w-lg bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-[60] overflow-hidden border border-slate-100 h-auto max-h-[98vh] flex flex-col"
          >
            {/* Header Fijo - Altura mínima necesaria */}
            <div className="p-3 sm:p-5 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Editar Perfil</h2>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Adaptable Absoluto */}
            <div className="flex-1 overflow-hidden p-3 sm:p-5 flex flex-col min-h-0">
              <form id="edit-profile-form" onSubmit={handleSubmit} className="flex flex-col h-full gap-2 sm:gap-3 min-h-0">
                {/* Avatar Section - Altura dinámica */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img 
                      src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                      className="w-[15vh] h-[15vh] max-w-[80px] max-h-[80px] sm:max-w-[100px] sm:max-h-[100px] rounded-[1.2rem] sm:rounded-[1.5rem] object-cover border-2 border-white shadow-lg transition-transform group-hover:scale-105" 
                      alt="Avatar Preview" 
                    />
                    <div className="absolute inset-0 bg-black/30 rounded-[1.2rem] sm:rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white" size={20} />
                    </div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    capture="user"
                    onChange={handleFileChange} 
                  />
                  <div className="w-full grid grid-cols-2 gap-2 max-w-[280px]">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-[9px] sm:text-[10px] h-8"
                      leftIcon={<Upload size={12} />}
                    >
                      Galería
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 text-[9px] sm:text-[10px] h-8"
                      leftIcon={<Camera size={12} />}
                    >
                      Cámara
                    </Button>
                  </div>
                </div>

                {/* Inputs - Altura compacta */}
                <div className="grid grid-cols-1 gap-2 shrink-0">
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Nombre</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input
                        type="text"
                        required
                        placeholder="Tu nombre público"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-transparent rounded-xl focus:ring-0 focus:border-indigo-500 transition-all text-slate-900 font-medium text-xs sm:text-sm"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[10px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Usuario</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">@</span>
                      <input
                        type="text"
                        required
                        placeholder="usuario_unico"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-transparent rounded-xl focus:ring-0 focus:border-indigo-500 transition-all text-slate-900 font-medium text-xs sm:text-sm"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                      />
                    </div>
                  </div>
                </div>

                {/* Biografía - Altura elástica absoluta */}
                <div className="flex-1 flex flex-col min-h-0 gap-0.5">
                  <label className="text-[10px] font-bold text-slate-700 ml-1 uppercase tracking-wider shrink-0">Biografía</label>
                  <div className="relative flex-1 min-h-0">
                    <FileText className="absolute left-3 top-2.5 text-slate-400" size={14} />
                    <textarea
                      placeholder="Cuéntanos algo sobre ti..."
                      className="w-full h-full pl-9 pr-3 py-2 bg-slate-50 border-2 border-transparent rounded-xl focus:ring-0 focus:border-indigo-500 transition-all resize-none text-slate-900 text-xs sm:text-sm leading-relaxed"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 text-[9px] sm:text-[10px] font-bold text-center bg-rose-50 py-1.5 rounded-lg border border-rose-100 shrink-0"
                  >
                    {error}
                  </motion.p>
                )}
              </form>
            </div>

            {/* Footer Fijo - Altura mínima */}
            <div className="p-3 sm:p-5 border-t border-slate-50 bg-white shrink-0">
              <div className="flex gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 text-xs sm:text-sm"
                >
                  Cancelar
                </Button>
                <Button
                  form="edit-profile-form"
                  type="submit"
                  isLoading={loading}
                  className="flex-1 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-100 text-xs sm:text-sm"
                  leftIcon={<Save size={16} />}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
