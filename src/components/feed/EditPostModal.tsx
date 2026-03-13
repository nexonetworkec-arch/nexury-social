import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image, Camera, Save, Upload, Calendar } from 'lucide-react';
import { Post } from '../../types';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface EditPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: Post;
  onPostUpdated: (updatedPost: Post) => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({ isOpen, onClose, post, onPostUpdated }) => {
  const [content, setContent] = useState(post.content);
  const [mediaUrl, setMediaUrl] = useState(post.image_url || '');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>(post.media_type || 'image');
  const [showAppointmentButton, setShowAppointmentButton] = useState(post.show_appointment_button === true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      let finalMediaUrl = mediaUrl;

      if (mediaFile) {
        finalMediaUrl = await dataService.uploadMedia(post.user_id, mediaFile, 'posts');
      }

      const updatedPost = await dataService.updatePost(
        post.id, 
        post.user_id, 
        content, 
        finalMediaUrl, 
        mediaType,
        showAppointmentButton
      );
      
      onPostUpdated(updatedPost);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar publicación');
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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl z-[60] overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
          >
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6 sm:mb-8 sticky top-0 bg-white z-10 pb-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Editar Publicación</h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Contenido</label>
                  <textarea
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border-none rounded-xl sm:rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all resize-none text-slate-700 text-sm sm:text-base"
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="¿Qué quieres cambiar?"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Multimedia</label>
                  
                  {mediaUrl && (
                    <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                      {mediaType === 'image' ? (
                        <img src={mediaUrl} className="w-full h-auto max-h-[200px] object-cover" alt="Preview" />
                      ) : (
                        <video src={mediaUrl} className="w-full h-auto max-h-[200px] object-cover" controls />
                      )}
                      <button 
                        type="button"
                        onClick={() => {
                          setMediaUrl('');
                          setMediaFile(null);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-xl sm:rounded-2xl border-slate-200 text-slate-600 py-2.5 sm:py-3 text-sm"
                      leftIcon={<Upload size={18} />}
                    >
                      Galería
                    </Button>
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={() => cameraInputRef.current?.click()}
                      className="rounded-xl sm:rounded-2xl border-slate-200 text-slate-600 py-2.5 sm:py-3 text-sm"
                      leftIcon={<Camera size={18} />}
                    >
                      Cámara
                    </Button>
                    <Button 
                      type="button"
                      variant={showAppointmentButton ? "primary" : "outline"}
                      onClick={() => post.is_verified && setShowAppointmentButton(!showAppointmentButton)}
                      disabled={!post.is_verified}
                      className={cn(
                        "rounded-xl sm:rounded-2xl py-2.5 sm:py-3 text-sm transition-all duration-300",
                        showAppointmentButton 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                          : "border-slate-200 text-slate-600 hover:bg-slate-50",
                        !post.is_verified && "opacity-50 cursor-not-allowed"
                      )}
                      leftIcon={<Calendar size={18} />}
                    >
                      Citas
                    </Button>
                  </div>

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
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-slate-700 ml-1">Configuración</label>
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Mis Citas</p>
                        <p className="text-xs text-slate-500">
                          {post.is_verified 
                            ? "Activar botón de citas en este post" 
                            : "Solo disponible para usuarios verificados"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {showAppointmentButton && (
                        <div className="flex items-center animate-in fade-in slide-in-from-right-2 duration-300">
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 h-8 w-8" 
                            title="Vista previa: Solicitar Cita"
                            disabled
                          >
                            <Calendar size={16} />
                          </Button>
                          <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => post.is_verified && setShowAppointmentButton(!showAppointmentButton)}
                        disabled={!post.is_verified}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          showAppointmentButton ? 'bg-indigo-600' : 'bg-slate-300'
                        } ${!post.is_verified ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showAppointmentButton ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="text-rose-500 text-sm font-medium text-center bg-rose-50 py-2 rounded-xl border border-rose-100">
                    {error}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sticky bottom-0 bg-white pb-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl order-2 sm:order-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    isLoading={loading}
                    className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl order-1 sm:order-2"
                    leftIcon={<Save size={20} />}
                  >
                    Guardar
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
