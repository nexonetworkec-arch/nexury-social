import React from 'react';
import { usePresence } from '../../context/PresenceContext';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserStatusProps {
  userId: string;
  lastSeen?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const UserStatus: React.FC<UserStatusProps> = ({ 
  userId, 
  lastSeen, 
  showText = false,
  size = 'md' 
}) => {
  const { onlineUsers } = usePresence();
  const isOnline = onlineUsers.has(userId);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
        {isOnline && (
          <div className={`absolute inset-0 ${sizeClasses[size]} rounded-full bg-emerald-500 animate-ping opacity-40`} />
        )}
      </div>
      {showText && (
        <span className="text-xs font-medium text-slate-500">
          {isOnline ? (
            <span className="text-emerald-600">En línea</span>
          ) : lastSeen ? (
            `Visto ${formatDistanceToNow(new Date(lastSeen), { addSuffix: true, locale: es })}`
          ) : (
            'Desconectado'
          )}
        </span>
      )}
    </div>
  );
};
