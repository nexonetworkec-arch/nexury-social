import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { X, Users, Mic, MicOff, Video, VideoOff, Send, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LiveService } from '../../services/liveService';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { motion, AnimatePresence } from 'motion/react';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

interface LiveStreamProps {
  channelName: string;
  role: 'host' | 'audience';
  onClose: () => void;
  streamTitle?: string;
  hostId?: string;
}

export const LiveStream: React.FC<LiveStreamProps> = ({ 
  channelName, 
  role, 
  onClose, 
  streamTitle = "Nexury Live",
  hostId
}) => {
  const { user } = useAuth();
  const [client, setClient] = useState<IAgoraRTCClient | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ICameraVideoTrack | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<IMicrophoneAudioTrack | null>(null);
  const [remoteUsers, setRemoteUsers] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Suscripción en tiempo real al chat
  useEffect(() => {
    if (!streamId) return;

    // Cargar mensajes iniciales
    const loadMessages = async () => {
      const initialMessages = await LiveService.getLiveMessages(streamId);
      setMessages(initialMessages);
    };
    loadMessages();

    // Suscribirse a nuevos mensajes
    const channel = supabase
      .channel(`live_chat_${streamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_messages',
          filter: `stream_id=eq.${streamId}`
        },
        async (payload) => {
          // Obtener el perfil del usuario que envió el mensaje
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url, display_name')
            .eq('id', payload.new.user_id)
            .single();
          
          const fullMessage = {
            ...payload.new,
            username: profile?.username,
            display_name: profile?.display_name,
            avatar_url: profile?.avatar_url
          };
          
          setMessages(prev => [...prev, fullMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [streamId]);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;
    let audioTrack: IMicrophoneAudioTrack | null = null;
    let videoTrack: ICameraVideoTrack | null = null;

    const init = async () => {
      if (isInitialized.current) return;
      isInitialized.current = true;
      setIsInitializing(true);
      setInitError(null);

      try {
        agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        setClient(agoraClient);

        if (role === 'host') {
          try {
            const tracks = await AgoraRTC.createMicrophoneAndCameraTracks();
            audioTrack = tracks[0];
            videoTrack = tracks[1];
            
            setLocalAudioTrack(audioTrack);
            setLocalVideoTrack(videoTrack);
            
            await agoraClient.join(APP_ID, channelName, null, user?.id);
            await agoraClient.publish([audioTrack, videoTrack]);
            
            if (localVideoRef.current) {
              videoTrack.play(localVideoRef.current);
            }

            // Registrar en DB
            const stream = await LiveService.startLiveStream(user!.id, streamTitle);
            setStreamId(stream.id);
          } catch (err: any) {
            console.error("Error creating tracks:", err);
            if (err.code === 'PERMISSION_DENIED') {
              setInitError("Permiso denegado para acceder a la cámara o micrófono.");
            } else if (err.code === 'NOT_READABLE') {
              setInitError("La cámara o el micrófono ya están en uso por otra aplicación.");
            } else {
              setInitError("No se pudo acceder a la cámara o el micrófono.");
            }
            throw err;
          }
        } else {
          await agoraClient.join(APP_ID, channelName, null, user?.id);
          
          agoraClient.on('user-published', async (remoteUser, mediaType) => {
            await agoraClient.subscribe(remoteUser, mediaType);
            if (mediaType === 'video') {
              setRemoteUsers(prev => [...prev, remoteUser]);
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteUser.videoTrack?.play(remoteVideoRef.current);
                }
              }, 100);
            }
            if (mediaType === 'audio') {
              remoteUser.audioTrack?.play();
            }
          });

          agoraClient.on('user-unpublished', (remoteUser) => {
            setRemoteUsers(prev => prev.filter(u => u.uid !== remoteUser.uid));
          });
        }
      } catch (err: any) {
        if (err.message?.includes('OPERATION_ABORTED') || err.code === 'OPERATION_ABORTED') {
          console.warn("Agora Init aborted (likely component unmounted or double init)");
          return;
        }
        console.error("Agora Init Error:", err);
        if (!initError) setInitError("Error al conectar con el servidor de streaming.");
      } finally {
        setIsInitializing(false);
      }
    };

    if (APP_ID) {
      init();
    } else {
      setInitError("Falta la configuración de Agora (App ID).");
      setIsInitializing(false);
    }

    return () => {
      const leave = async () => {
        if (role === 'host' && streamId) {
          try {
            await LiveService.endLiveStream(streamId, user!.id);
          } catch (e) {
            console.error("Error ending stream in DB:", e);
          }
        }
        
        if (audioTrack) {
          audioTrack.stop();
          audioTrack.close();
        }
        if (videoTrack) {
          videoTrack.stop();
          videoTrack.close();
        }
        
        if (agoraClient) {
          await agoraClient.leave();
        }
        isInitialized.current = false;
      };
      leave();
    };
  }, [channelName, role, user?.id]);

  const toggleMic = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(isVideoOff);
      setIsVideoOff(!isVideoOff);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !streamId || !user || isSending) return;

    setIsSending(true);
    try {
      await LiveService.sendLiveMessage(streamId, user.id, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending live message:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] bg-black flex flex-col sm:flex-row items-center justify-center p-4 sm:p-8"
    >
      <div className="relative w-full max-w-4xl aspect-video bg-neutral-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
        {/* Video Container */}
        <div ref={role === 'host' ? localVideoRef : remoteVideoRef} className="w-full h-full object-cover" />
        
        {/* Loading / Error States */}
        <AnimatePresence>
          {(isInitializing || initError) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-neutral-900 flex flex-col items-center justify-center p-8 text-center"
            >
              {isInitializing ? (
                <>
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-white font-medium">Conectando al stream...</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
                    <VideoOff size={32} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-2">Error de Conexión</h3>
                  <p className="text-white/60 text-sm max-w-xs mb-6">{initError}</p>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={onClose} className="rounded-xl">
                      Cerrar
                    </Button>
                    <Button onClick={() => { isInitialized.current = false; window.location.reload(); }} className="rounded-xl">
                      Reintentar
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay Info */}
        <div className="absolute top-6 left-6 flex items-center gap-3">
          <div className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider animate-pulse">
            En Vivo
          </div>
          <div className="bg-black/40 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10">
            <Users size={14} />
            <span>{viewerCount}</span>
          </div>
        </div>

        <div className="absolute top-6 right-6">
          <button 
            onClick={onClose}
            className="p-2 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-rose-600 transition-all border border-white/10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="absolute bottom-8 left-8 right-8 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <h3 className="text-white font-bold text-lg drop-shadow-lg">{streamTitle}</h3>
            <p className="text-white/70 text-sm">@{role === 'host' ? user?.username : 'Host'}</p>
          </div>

          {role === 'host' && (
            <div className="flex gap-3">
              <button 
                onClick={toggleMic}
                className={`p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all ${isMuted ? 'bg-rose-600 text-white' : 'bg-black/40 text-white hover:bg-white/20'}`}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
              <button 
                onClick={toggleVideo}
                className={`p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all ${isVideoOff ? 'bg-rose-600 text-white' : 'bg-black/40 text-white hover:bg-white/20'}`}
              >
                {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar */}
      <div className="w-full sm:w-80 h-full max-h-[400px] sm:max-h-none sm:ml-6 flex flex-col bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden mt-4 sm:mt-0">
        <div className="p-4 border-b border-white/10">
          <h4 className="text-white font-bold text-sm">Chat en vivo</h4>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-hide">
          {messages.length === 0 && (
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0" />
              <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none">
                <p className="text-white text-xs font-bold mb-1">Nexury Bot</p>
                <p className="text-white/80 text-xs">¡Bienvenido al stream! Sé respetuoso con los demás.</p>
              </div>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <img 
                src={msg.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`} 
                alt={msg.username}
                className="w-8 h-8 rounded-full shrink-0 object-cover"
              />
              <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none">
                <p className="text-white text-[10px] font-bold mb-1">{msg.display_name || msg.username}</p>
                <p className="text-white/90 text-xs">{msg.content}</p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="p-4 bg-black/20 flex gap-2">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Di algo..." 
            className="flex-1 bg-white/10 border-none rounded-xl px-4 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </motion.div>
  );
};
