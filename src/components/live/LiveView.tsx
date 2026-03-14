import React, { useEffect, useState } from 'react';
import { Video, Users, Play, Plus, Info, Trash2, History } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { LiveStream as LiveStreamType } from '../../types';
import { LiveStream } from './LiveStream';
import { motion, AnimatePresence } from 'motion/react';
import { VerifiedBadge } from '../ui/VerifiedBadge';

export const LiveView: React.FC = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<LiveStreamType[]>([]);
  const [pastStreams, setPastStreams] = useState<LiveStreamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [activeStream, setActiveStream] = useState<{ channel: string, role: 'host' | 'audience', title?: string } | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState('');

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const [activeData, pastData] = await Promise.all([
          dataService.getActiveLiveStreams(),
          dataService.getPastLiveStreams()
        ]);
        setStreams(activeData);
        setPastStreams(pastData);
      } catch (err) {
        console.error('Error fetching live streams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStreams();
  }, []);

  const handleDeleteStream = async (e: React.MouseEvent, streamId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await dataService.deleteLiveStream(streamId, user?.id || '');
      setPastStreams(prev => prev.filter(s => s.id !== streamId));
      setStreams(prev => prev.filter(s => s.id !== streamId));
    } catch (err) {
      console.error('Error deleting stream:', err);
    }
  };

  const handleStartLive = async () => {
    if (!newStreamTitle.trim()) return;
    setActiveStream({
      channel: user!.id,
      role: 'host',
      title: newStreamTitle
    });
    setShowStartModal(false);
  };

  const joinStream = (stream: LiveStreamType) => {
    setActiveStream({
      channel: stream.user_id,
      role: 'audience',
      title: stream.title
    });
  };

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white">
      <header className="sticky top-0 z-40 glass p-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display brand-text-gradient">Nexury Live</h1>
          <p className="text-xs text-slate-400 mt-0.5">Mira lo que está pasando ahora mismo</p>
        </div>
        <Button 
          onClick={() => setShowStartModal(true)}
          className="rounded-2xl gap-2"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Transmitir</span>
        </Button>
      </header>

      <div className="flex border-b border-slate-100 bg-white/50 backdrop-blur-md sticky top-[88px] z-30">
        <button 
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          En Vivo
          {activeTab === 'active' && (
            <motion.div layoutId="liveTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
        <button 
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-4 text-sm font-bold transition-colors relative ${activeTab === 'past' ? 'text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Anteriores
          {activeTab === 'past' && (
            <motion.div layoutId="liveTab" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-indigo-600 rounded-full" />
          )}
        </button>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-slate-400 font-medium animate-pulse">Buscando transmisiones...</p>
          </div>
        ) : (activeTab === 'active' ? streams : pastStreams).length > 0 ? (
          <div className="grid grid-cols-1 gap-6">
            {(activeTab === 'active' ? streams : pastStreams).map((stream) => (
              <motion.div 
                key={stream.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer"
                onClick={() => activeTab === 'active' && joinStream(stream)}
              >
                <div className="aspect-video bg-neutral-900 relative">
                  <img 
                    src={`https://picsum.photos/seed/${stream.id}/800/450`} 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" 
                    alt="" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  
                  <div className="absolute top-4 left-4 flex gap-2">
                    {stream.is_active ? (
                      <div className="bg-rose-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        Live
                      </div>
                    ) : (
                      <div className="bg-slate-600 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        Grabado
                      </div>
                    )}
                    <div className="bg-black/40 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-md flex items-center gap-1.5">
                      <Users size={12} />
                      <span>{stream.viewer_count}</span>
                    </div>
                  </div>

                  {user?.id === stream.user_id && (
                    <button 
                      onClick={(e) => handleDeleteStream(e, stream.id)}
                      className="absolute top-4 right-4 p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl backdrop-blur-md border border-rose-500/30 transition-all z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                      title="Eliminar grabación"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {stream.is_active && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 scale-90 group-hover:scale-100 transition-transform">
                        <Play size={32} className="text-white fill-white ml-1" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex items-center gap-4">
                  <img src={stream.avatar_url} className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm" alt="" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{stream.title}</h3>
                    <div className="flex items-center gap-1.5">
                      <p className="text-slate-500 text-sm truncate">{stream.display_name}</p>
                      {stream.is_verified && <VerifiedBadge size={14} />}
                      {!stream.is_active && stream.ended_at && (
                        <span className="text-[10px] text-slate-400 ml-2">
                          • {new Date(stream.ended_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-10">
            <div className="w-20 h-20 bg-slate-50 text-slate-200 rounded-[2rem] flex items-center justify-center mb-6">
              {activeTab === 'active' ? <Video size={40} /> : <History size={40} />}
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {activeTab === 'active' ? 'No hay transmisiones activas' : 'No hay historial de transmisiones'}
            </h3>
            <p className="text-slate-400 text-sm max-w-xs">
              {activeTab === 'active' 
                ? 'Sé el primero en iniciar una transmisión en vivo y conecta con tu audiencia.' 
                : 'Tus transmisiones pasadas aparecerán aquí una vez que finalices un directo.'}
            </p>
            {activeTab === 'active' && (
              <Button 
                variant="outline" 
                className="mt-8 rounded-2xl"
                onClick={() => setShowStartModal(true)}
              >
                Iniciar mi primer Live
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Start Live Modal */}
      <AnimatePresence>
        {showStartModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStartModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <Video size={28} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Iniciar Transmisión</h2>
                <p className="text-slate-500 text-sm mb-8">Dale un título atractivo a tu live para que más personas se unan.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block ml-1">Título del Live</label>
                    <input 
                      type="text" 
                      placeholder="Ej: Charlando con la comunidad..." 
                      className="w-full bg-slate-50 border-2 border-transparent rounded-2xl py-4 px-6 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm font-medium"
                      value={newStreamTitle}
                      onChange={(e) => setNewStreamTitle(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-relaxed">
                      Al iniciar, tu cámara y micrófono se activarán. Asegúrate de tener una buena conexión a internet.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-10">
                  <Button 
                    variant="ghost" 
                    className="flex-1 rounded-2xl py-6"
                    onClick={() => setShowStartModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="flex-1 rounded-2xl py-6 shadow-lg shadow-indigo-200"
                    onClick={handleStartLive}
                    disabled={!newStreamTitle.trim()}
                  >
                    Empezar ahora
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Stream Overlay */}
      <AnimatePresence>
        {activeStream && (
          <LiveStream 
            channelName={activeStream.channel}
            role={activeStream.role}
            streamTitle={activeStream.title}
            onClose={() => setActiveStream(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
