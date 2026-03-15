import React, { useState, useRef } from 'react';
import { Image, Smile, Calendar, MapPin, X, Film, Camera } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuthService } from '../../services/authService';
import { SocialService } from '../../services/socialService';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { cn } from '../../lib/utils';

export const CreatePost = ({ onPostCreated }: { onPostCreated: (post: any) => void }) => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isPosting, setIsPosting] = useState(false);
  const [showAppointmentButton, setShowAppointmentButton] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const type = file.type.startsWith('video/') ? 'video' : 'image';
    setMediaType(type);

    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePost = async () => {
    if ((!content.trim() && !mediaUrl) || !user) return;
    setIsPosting(true);
    try {
      let finalMediaUrl = '';

      // Si hay un archivo, subirlo primero
      if (mediaFile) {
        finalMediaUrl = await AuthService.uploadMedia(mediaFile, 'posts');
      }

      const newPost = await SocialService.createPost(user.id, content, finalMediaUrl, mediaType, showAppointmentButton);
      
      // Resetear estado ANTES de llamar al callback para asegurar que el UI se actualice
      setContent('');
      setMediaUrl('');
      setMediaFile(null);
      setShowAppointmentButton(false);
      setIsExpanded(false);
      
      onPostCreated(newPost);
    } catch (error: any) {
      console.error('Failed to post', error);
      alert(error.message || 'Error al publicar. Verifica tu conexión o el formato del archivo.');
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 border-b border-slate-100 bg-white">
      <div className="flex gap-3 sm:gap-4">
        <div className="relative shrink-0">
          <img src={user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl object-cover shadow-md shadow-slate-200" alt="Avatar" />
        </div>
        <div className="flex-1">
          <div className="flex flex-col mb-2">
            <div className="flex items-center gap-1">
              <span className="font-bold text-slate-900 text-sm sm:text-base">{user?.display_name}</span>
              {user?.is_verified && (
                <VerifiedBadge size={14} />
              )}
            </div>
            <span className="text-slate-500 text-xs sm:text-sm">@{user?.username}</span>
          </div>
          <textarea
            className="w-full bg-transparent border-none focus:ring-0 text-base sm:text-lg resize-none placeholder-slate-400 min-h-[60px] sm:min-h-[80px]"
            placeholder="¿Qué está pasando en tu mundo?"
            rows={isExpanded ? 4 : 2}
            value={content}
            onFocus={() => setIsExpanded(true)}
            onChange={(e) => setContent(e.target.value)}
          />
          
          {mediaUrl && (
            <div className="relative mt-4 rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
              {mediaType === 'image' ? (
                <img src={mediaUrl || undefined} className="w-full h-auto" alt="Vista previa" />
              ) : (
                <video src={mediaUrl || undefined} className="w-full h-auto" controls />
              )}
              <Button 
                size="icon"
                variant="ghost"
                onClick={() => setMediaUrl('')}
                className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 z-10"
              >
                <X size={18} />
              </Button>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,video/*" 
            onChange={handleFileChange} 
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            className="hidden" 
            accept="image/*" 
            capture="environment"
            onChange={handleFileChange} 
          />

          {(isExpanded || content || mediaUrl) && (
            <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between bg-slate-50/50 p-2 sm:p-3 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900">Mis Citas</p>
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      {user?.is_verified 
                        ? "Activar botón de citas en este post" 
                        : "Solo disponible para usuarios verificados"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => user?.is_verified && setShowAppointmentButton(!showAppointmentButton)}
                  disabled={!user?.is_verified}
                  className={`relative inline-flex h-5 sm:h-6 w-10 sm:w-11 items-center rounded-full transition-colors focus:outline-none ${
                    showAppointmentButton ? 'bg-indigo-600' : 'bg-slate-300'
                  } ${!user?.is_verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-3 sm:h-4 w-3 sm:w-4 transform rounded-full bg-white transition-transform ${
                      showAppointmentButton ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-indigo-500 hover:bg-indigo-50"
                    title="Subir foto o video"
                  >
                    <Image size={20} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-emerald-500 hover:bg-emerald-50" 
                    title="Cámara"
                  >
                    <Camera size={20} />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-violet-500 hover:bg-violet-50" title="Emoji">
                    <Smile size={20} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-pink-500 hover:bg-pink-50" 
                    title="Ubicación"
                  >
                    <MapPin size={20} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => user?.is_verified && setShowAppointmentButton(!showAppointmentButton)}
                    className={cn(
                      "transition-all duration-300",
                      showAppointmentButton 
                        ? "text-indigo-600 bg-indigo-50 hover:bg-indigo-100" 
                        : "text-slate-400 hover:bg-slate-100",
                      !user?.is_verified && "opacity-50 cursor-not-allowed"
                    )}
                    title={user?.is_verified ? "Activar botón de citas" : "Solo para usuarios verificados"}
                  >
                    <Calendar size={20} />
                  </Button>
                </div>
                <Button
                  disabled={(!content.trim() && !mediaUrl)}
                  isLoading={isPosting}
                  onClick={handlePost}
                >
                  Publicar
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  </div>
);
};

