import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Search, UserPlus, UserCheck, MessageSquare, ExternalLink } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';

import { SEO } from '../common/SEO';

export const NexuariosList = ({ initialSearchQuery = '' }: { initialSearchQuery?: string }) => {
  const { user: currentUser } = useAuth();
  const [nexuarios, setNexuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    const fetchNexuarios = async () => {
      setLoading(true);
      try {
        const data = await dataService.getNexuarios();
        setNexuarios(data);
        
        // Si hay usuario logueado, ver a quién sigue
        if (currentUser) {
          // Esto es una simplificación, en una app real tendríamos un endpoint para esto
          // Por ahora, solo cargamos los nexuarios
        }
      } catch (error) {
        console.error('Error fetching nexuarios:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNexuarios();
  }, [currentUser]);

  const filteredNexuarios = nexuarios.filter(n => 
    n.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewProfile = (userId: string) => {
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId } 
    });
    window.dispatchEvent(event);
  };

  const { openChat } = useChat();

  const handleMessage = (userId: string) => {
    openChat(userId);
  };

  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white">
      <SEO title="Nexuarios" description="Conoce a la comunidad de Nexury. Conecta con personas increíbles." />
      <header className="sticky top-0 z-40 glass p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold font-display brand-text-gradient flex items-center gap-2">
            <Users className="text-indigo-600" />
            Nexuarios
          </h1>
          <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full">
            {nexuarios.length} miembros
          </span>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar Nexuarios por nombre, usuario o bio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="text-slate-400 font-medium animate-pulse">Conectando con la comunidad...</p>
          </div>
        ) : filteredNexuarios.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredNexuarios.map((nexuario, index) => (
              <motion.div
                key={nexuario.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group bg-white border border-slate-100 rounded-3xl p-4 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-100 transition-all flex items-center gap-4"
              >
                <button 
                  onClick={() => handleViewProfile(nexuario.id)}
                  className="relative flex-shrink-0"
                >
                  <img
                    src={nexuario.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nexuario.id}`}
                    alt={nexuario.display_name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-sm group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  {nexuario.is_verified && (
                    <div className="absolute -bottom-1 -right-1">
                      <VerifiedBadge size={18} />
                    </div>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 mb-0.5">
                    <button 
                      onClick={() => handleViewProfile(nexuario.id)}
                      className="font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate"
                    >
                      {nexuario.display_name}
                    </button>
                    {nexuario.is_verified && (
                      <VerifiedBadge size={14} />
                    )}
                  </div>
                  <p className="text-slate-500 text-sm truncate mb-1">@{nexuario.username}</p>
                  {nexuario.bio && (
                    <p className="text-slate-600 text-xs line-clamp-1 italic">
                      {nexuario.bio}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMessage(nexuario.id)}
                    className="rounded-xl h-10 w-10 p-0 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                  >
                    <MessageSquare size={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProfile(nexuario.id)}
                    className="rounded-xl border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600"
                  >
                    Ver perfil
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center">
              <Users size={32} />
            </div>
            <p className="text-slate-500 font-medium">No se encontraron Nexuarios con ese nombre.</p>
            <Button variant="ghost" onClick={() => setSearchQuery('')}>
              Limpiar búsqueda
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
