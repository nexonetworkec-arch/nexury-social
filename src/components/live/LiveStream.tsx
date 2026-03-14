import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC, { IAgoraRTCClient, ICameraVideoTrack, IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { X, Users, Mic, MicOff, Video, VideoOff, Send, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
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
  
  const localVideoRef = useRef<HTMLDivElement>(null);
  const remoteVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let agoraClient: IAgoraRTCClient;

    const init = async () => {
      agoraClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
      setClient(agoraClient);

      if (role === 'host') {
        const [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
        setLocalAudioTrack(audioTrack);
        setLocalVideoTrack(videoTrack);
        
        await agoraClient.join(APP_ID, channelName, null, user?.id);
        await agoraClient.publish([audioTrack, videoTrack]);
        
        if (localVideoRef.current) {
          videoTrack.play(localVideoRef.current);
        }

        // Registrar en DB
        const stream = await dataService.startLiveStream(user!.id, streamTitle);
        setStreamId(stream.id);
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
    };

    if (APP_ID) {
      init();
    } else {
      console.error("Agora App ID is missing");
    }

    return () => {
      const leave = async () => {
        if (role === 'host' && streamId) {
          await dataService.endLiveStream(streamId, user!.id);
        }
        localAudioTrack?.close();
        localVideoTrack?.close();
        await agoraClient?.leave();
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

      {/* Chat Sidebar (Placeholder) */}
      <div className="w-full sm:w-80 h-full max-h-[400px] sm:max-h-none sm:ml-6 flex flex-col bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden mt-4 sm:mt-0">
        <div className="p-4 border-b border-white/10">
          <h4 className="text-white font-bold text-sm">Chat en vivo</h4>
        </div>
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500 shrink-0" />
            <div className="bg-white/10 p-3 rounded-2xl rounded-tl-none">
              <p className="text-white text-xs font-bold mb-1">Nexury Bot</p>
              <p className="text-white/80 text-xs">¡Bienvenido al stream! Sé respetuoso con los demás.</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-black/20 flex gap-2">
          <input 
            type="text" 
            placeholder="Di algo..." 
            className="flex-1 bg-white/10 border-none rounded-xl px-4 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all">
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
