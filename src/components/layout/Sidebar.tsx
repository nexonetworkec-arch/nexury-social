import React, { useState } from 'react';
import { Home, Search, Bell, User, Bookmark, MoreHorizontal, Feather, LogOut, Calendar, Users, MessageSquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { VerifiedBadge } from '../ui/VerifiedBadge';

const SidebarItem = ({ icon: Icon, label, active, onClick, badgeCount }: { icon: any, label: string, active?: boolean, onClick?: () => void, badgeCount?: number }) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 p-3.5 rounded-2xl cursor-pointer transition-all duration-300 group relative",
      active 
        ? "bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50" 
        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
    )}
  >
    <div className="relative">
      <Icon size={24} className={cn("transition-transform duration-300 group-hover:scale-110", active && "scale-110")} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] flex items-center justify-center rounded-full border-2 border-white">
          {badgeCount > 9 ? '9+' : badgeCount}
        </span>
      )}
    </div>
    <span className="text-[1.05rem] hidden lg:block font-medium">{label}</span>
  </div>
);

export const Sidebar = ({ currentView, onViewChange }: { currentView: string, onViewChange: (view: string) => void }) => {
  const { user, logout } = useAuth();
  const { unreadNotificationsCount, unreadMessagesCount } = useNotifications();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleTabClick = (label: string) => {
    onViewChange(label);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden sm:flex flex-col h-screen sticky top-0 p-4 lg:p-6 gap-2 border-r border-slate-100 w-20 lg:w-72 bg-white overflow-y-auto no-scrollbar">
        <div className="p-3 mb-4 shrink-0">
          <div className="w-12 h-12 brand-gradient rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 rotate-3 hover:rotate-0 transition-transform duration-300 cursor-pointer mb-6" onClick={() => handleTabClick('Inicio')}>
            <span className="text-white font-bold text-2xl font-display">N</span>
          </div>
        </div>
        
        <div className="space-y-1 shrink-0">
          <SidebarItem icon={Home} label="Inicio" active={currentView === 'Inicio'} onClick={() => handleTabClick('Inicio')} />
          <SidebarItem icon={Users} label="Nexuarios" active={currentView === 'Nexuarios'} onClick={() => handleTabClick('Nexuarios')} />
          <SidebarItem icon={Search} label="Explorar" active={currentView === 'Explorar'} onClick={() => handleTabClick('Explorar')} />
          <SidebarItem 
            icon={Bell} 
            label="Notificaciones" 
            active={currentView === 'Notificaciones'} 
            onClick={() => handleTabClick('Notificaciones')} 
            badgeCount={unreadNotificationsCount}
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Mensajes" 
            active={currentView === 'Mensajes'} 
            onClick={() => handleTabClick('Mensajes')} 
            badgeCount={unreadMessagesCount}
          />
          <SidebarItem icon={Calendar} label="Citas" active={currentView === 'Citas'} onClick={() => handleTabClick('Citas')} />
          <SidebarItem icon={Bookmark} label="Guardados" active={currentView === 'Guardados'} onClick={() => handleTabClick('Guardados')} />
          <SidebarItem icon={User} label="Perfil" active={currentView === 'Perfil'} onClick={() => handleTabClick('Perfil')} />
        </div>
        
        <div className="mt-auto pt-8 relative group/user shrink-0">
          <div 
            onClick={() => handleTabClick('Perfil')}
            className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all border border-transparent hover:border-slate-100"
          >
            <div className="relative">
              <img src={user?.avatar_url || "https://picsum.photos/seed/john/200"} className="w-11 h-11 rounded-xl object-cover" alt="Usuario" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="font-bold text-sm text-slate-900 truncate">{user?.display_name || "Usuario"}</p>
                {user?.is_verified && (
                  <VerifiedBadge size={14} />
                )}
              </div>
              <p className="text-slate-500 text-xs truncate">@{user?.username || "usuario"}</p>
            </div>
            <MoreHorizontal size={18} className="text-slate-400 hidden lg:block" />
          </div>
          
          {/* Logout Tooltip/Menu */}
          <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-100 rounded-2xl shadow-xl opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all z-50 overflow-hidden">
            <button 
              onClick={handleLogout}
              className="w-full text-left px-5 py-4 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-3"
            >
              <LogOut size={18} />
              <span>Cerrar sesión @{user?.username}</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 flex items-center z-50 pb-safe px-2">
        <div className="flex w-full justify-between items-center overflow-x-auto no-scrollbar py-2">
          <div onClick={() => handleTabClick('Inicio')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0", currentView === 'Inicio' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}><Home size={24} /></div>
          <div onClick={() => handleTabClick('Nexuarios')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0", currentView === 'Nexuarios' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}><Users size={24} /></div>
          <div onClick={() => handleTabClick('Explorar')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0", currentView === 'Explorar' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}><Search size={24} /></div>
          <div onClick={() => handleTabClick('Notificaciones')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0 relative", currentView === 'Notificaciones' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}>
            <Bell size={24} />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </div>
          <div onClick={() => handleTabClick('Mensajes')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0 relative", currentView === 'Mensajes' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}>
            <MessageSquare size={24} />
            {unreadMessagesCount > 0 && (
              <span className="absolute top-2 right-2 bg-rose-500 text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">
                {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
              </span>
            )}
          </div>
          <div onClick={() => handleTabClick('Citas')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0", currentView === 'Citas' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}><Calendar size={24} /></div>
          <div onClick={() => handleTabClick('Perfil')} className={cn("p-3 rounded-2xl transition-all flex-shrink-0", currentView === 'Perfil' ? "text-indigo-600 bg-indigo-50 shadow-sm" : "text-slate-400")}><User size={24} /></div>
        </div>
      </nav>
    </>
  );
};

