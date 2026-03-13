import React from 'react';
import { VerifiedBadge } from '../ui/VerifiedBadge';
import { UserStatus } from '../ui/UserStatus';

interface ProfileHeaderProps {
  profileUser: any;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ profileUser }) => {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{profileUser.display_name}</h2>
        {profileUser.is_verified && (
          <VerifiedBadge size={20} />
        )}
        <div className="flex gap-1">
          {profileUser.is_super_admin ? (
            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Super Admin</span>
          ) : profileUser.is_admin ? (
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-full uppercase tracking-wider">Admin</span>
          ) : null}
        </div>
      </div>
      <p className="text-slate-500 text-sm sm:text-base">@{profileUser.username}</p>
      <div className="flex justify-center mt-1">
        <UserStatus userId={profileUser.id} lastSeen={profileUser.last_seen} showText size="sm" />
      </div>
    </div>
  );
};
