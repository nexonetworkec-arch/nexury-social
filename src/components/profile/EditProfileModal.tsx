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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-[60] overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col"
          >
            {/* Header Fijo */}
            <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Editar Perfil</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
              >
                <X size={24} />
              </button>
            </div>

            {/* Body Scrolleable */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
              <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 pb-4">
                <div className="flex flex-col items-center gap-4 mb-6 sm:mb-8">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <img 
                      src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} 
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-[2rem] sm:rounded-[2.5rem] object-cover border-4 border-white shadow-xl transition-transform group-hover:scale-105" 
                      alt="Avatar Preview" 
                    />
                    <div className="absolute inset-0 bg-black/30 rounded-[2rem] sm:rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="text-white" size={28} />
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
                  <div className="w-full grid grid-cols-2 gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm h-11"
                      leftIcon={<Upload size={16} />}
                    >
                      Galería
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-2xl border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm h-11"
                      leftIcon={<Camera size={16} />}
                    >
                      Cámara
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nombre para mostrar</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      placeholder="Tu nombre público"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Nombre de usuario</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">@</span>
                    <input
                      type="text"
                      required
                      placeholder="usuario_unico"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all text-slate-900 font-medium"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">Biografía</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-4 text-slate-400" size={18} />
                    <textarea
                      placeholder="Cuéntanos algo sobre ti..."
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent rounded-2xl focus:ring-0 focus:border-indigo-500 transition-all resize-none text-slate-900 min-h-[120px]"
                      rows={4}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-rose-500 text-sm font-bold text-center bg-rose-50 py-3 rounded-2xl border border-rose-100"
                  >
                    {error}
                  </motion.p>
                )}
              </form>
            </div>

            {/* Footer Fijo */}
            <div className="p-6 sm:p-8 border-t border-slate-50 bg-white shrink-0">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 py-4 rounded-2xl order-2 sm:order-1 font-bold text-slate-500"
                >
                  Cancelar
                </Button>
                <Button
                  form="edit-profile-form"
                  type="submit"
                  isLoading={loading}
                  className="flex-1 py-4 rounded-2xl order-1 sm:order-2 font-bold shadow-lg shadow-indigo-100"
                  leftIcon={<Save size={20} />}
                >
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
