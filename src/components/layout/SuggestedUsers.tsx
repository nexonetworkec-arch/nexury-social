import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { UserStatus } from '../ui/UserStatus';
import { Calendar, MessageSquare } from 'lucide-react';
import { RequestAppointmentModal } from '../appointments/RequestAppointmentModal';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';

interface FollowItemProps {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

const FollowItem: React.FC<FollowItemProps> = ({ id, name, username, avatarUrl, isVerified }) => {
  const { user, refreshUser } = useAuth();
  const [following, setFollowing] = useState(false);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isAppointmentsEnabled, setIsAppointmentsEnabled] = useState(false);

  useEffect(() => {
    const checkBenefit = async () => {
      const active = await dataService.isBenefitActive('appointments');
      setIsAppointmentsEnabled(active);
    };
    checkBenefit();
  }, []);

  useEffect(() => {
    const checkFollowing = async () => {
      if (user && id) {
        try {
          const isFollowing = await dataService.checkIfFollowing(user.id, id);
          setFollowing(isFollowing);
        } catch (error) {
          console.error('Error checking following status', error);
        }
      }
    };
    checkFollowing();
  }, [user, id]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const newFollowingState = !following;
    setFollowing(newFollowingState);
    try {
      await dataService.followUser(user.id, id);
      await refreshUser();
    } catch (error) {
      console.error('Error following user', error);
      setFollowing(!newFollowingState);
    }
  };

  const handleMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await dataService.getOrCreateConversation(user.id, id);
      const event = new CustomEvent('changeView', { detail: 'Mensajes' });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error starting conversation', error);
    }
  };

  const handleProfileClick = () => {
    const event = new CustomEvent('changeView', { 
      detail: { view: 'Perfil', userId: id } 
    });
    window.dispatchEvent(event);
  };

  return (
    <div 
      className="p-4 flex items-center justify-between hover:bg-neutral-200 cursor-pointer transition-colors group"
      onClick={handleProfileClick}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <img src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`} className="w-10 h-10 rounded-full object-cover" alt="Usuario" />
          <div className="absolute -bottom-0.5 -right-0.5">
            <UserStatus userId={id} size="sm" />
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="font-bold text-sm">{name}</p>
            {isVerified && (
              <VerifiedBadge size={14} />
            )}
          </div>
          <p className="text-neutral-500 text-sm">@{username}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={handleMessage}
          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
          title="Enviar Mensaje"
        >
          <MessageSquare size={18} />
        </button>
        {isAppointmentsEnabled && user?.is_verified && isVerified && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsAppointmentModalOpen(true);
            }}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
            title="Solicitar Cita"
          >
            <Calendar size={18} />
          </button>
        )}
        <Button 
          size="sm"
          variant={following ? 'outline' : 'primary'}
          onClick={handleFollow}
          className={cn(
            "px-4 py-1.5 rounded-full font-bold text-sm transition-colors",
            following && "hover:bg-red-50 hover:text-red-600 hover:border-red-200"
          )}
        >
          {following ? 'Siguiendo' : 'Seguir'}
        </Button>
      </div>

      <RequestAppointmentModal 
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
        targetUser={{ id, display_name: name, username, avatar_url: avatarUrl || '', bio: '', is_admin: 0, created_at: '' }}
      />
    </div>
  );
};

export const SuggestedUsers = () => {
  const { user } = useAuth();
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await dataService.getSuggestedUsers(user?.id);
        setAllUsers(data);
        setFilteredUsers(data);
      } catch (error) {
        console.error('Error fetching users', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();

    // Real-time listener for profiles
    const channel = supabase
      .channel('suggested_users_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers(); // Re-fetch on any change for simplicity and consistency
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    const filtered = allUsers.filter(u => 
      u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, allUsers]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
        <p className="text-slate-400 text-sm">Cargando comunidad...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Buscar en la comunidad..." 
            className="w-full bg-slate-100 border-none rounded-xl py-2 px-4 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No se encontraron usuarios con ese nombre
          </div>
        ) : (
          filteredUsers.map(u => (
            <FollowItem 
              key={u.id} 
              id={u.id} 
              name={u.display_name} 
              username={u.username} 
              avatarUrl={u.avatar_url}
              isVerified={u.is_verified} 
            />
          ))
        )}
      </div>
      
      <div className="p-4 bg-slate-50/50 text-center border-t border-slate-100">
        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
          {allUsers.length} miembros en la comunidad
        </p>
      </div>
    </div>
  );
};
