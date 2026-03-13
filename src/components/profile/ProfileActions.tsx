import React from 'react';
import { Bell, Settings, MessageSquare, UserPlus, UserMinus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, CheckCircle2, User } from 'lucide-react';

interface ProfileActionsProps {
  isOwnProfile: boolean;
  following: boolean;
  handleFollow: () => void;
  handleMessage: () => void;
  setIsEditProfileOpen: (open: boolean) => void;
  notificationStatus: string;
  handleRequestNotifications: () => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  currentUser: any;
  profileUser: any;
  handleRequestVerification: () => void;
  isRequestingVerification: boolean;
  logout: () => void;
}

export const ProfileActions: React.FC<ProfileActionsProps> = ({
  isOwnProfile,
  following,
  handleFollow,
  handleMessage,
  setIsEditProfileOpen,
  notificationStatus,
  handleRequestNotifications,
  isSettingsOpen,
  setIsSettingsOpen,
  currentUser,
  profileUser,
  handleRequestVerification,
  isRequestingVerification,
  logout
}) => {
  return (
    <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-2 w-full max-w-sm px-4">
      {isOwnProfile ? (
        <div className="flex flex-col w-full gap-2">
          <div className="flex w-full gap-2 justify-center">
            <button 
              onClick={() => setIsEditProfileOpen(true)}
              className="flex-1 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
            >
              <User size={20} />
              <span className="text-sm sm:text-base">Editar Perfil</span>
            </button>
          </div>
          <div className="flex w-full gap-2 justify-center">
            {notificationStatus !== 'granted' && (
              <button 
                onClick={handleRequestNotifications}
                className="flex-1 px-6 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                title="Activar Notificaciones"
              >
                <Bell size={20} />
                <span className="text-sm sm:text-base">Notificaciones</span>
              </button>
            )}
            <div className="relative flex-1">
              <button 
                onClick={() => {
                  if (currentUser?.is_super_admin) {
                    window.dispatchEvent(new CustomEvent('changeView', { detail: 'SuperAdmin' }));
                  } else {
                    setIsSettingsOpen(!isSettingsOpen);
                  }
                }}
                className="w-full px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                title={currentUser?.is_super_admin ? "Panel Super Admin" : "Configuración"}
              >
                <Settings size={20} />
                <span className="text-sm sm:text-base">
                  {currentUser?.is_super_admin ? "Super Admin" : "Ajustes"}
                </span>
              </button>
            
            <AnimatePresence>
              {isSettingsOpen && !currentUser?.is_super_admin && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                  <div className="p-2">
                    <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Cuenta
                    </p>
                    {!profileUser.is_verified && (
                      <button 
                        onClick={handleRequestVerification}
                        disabled={isRequestingVerification}
                        className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                          <CheckCircle2 size={18} />
                        </div>
                        <span>{isRequestingVerification ? 'Enviando...' : 'Solicitar Verificación'}</span>
                      </button>
                    )}

                    {profileUser.is_verified && (
                      <div className="px-3 py-2.5 text-sm font-bold text-emerald-600 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                          <CheckCircle2 size={18} />
                        </div>
                        <span>Cuenta Verificada</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      ) : (
        <div className="flex w-full gap-2">
          <button 
            onClick={handleFollow}
            className={cn(
              "flex-1 px-6 py-2.5 font-bold rounded-xl transition-all flex items-center justify-center gap-2",
              following 
                ? "bg-slate-100 text-slate-700 hover:bg-slate-200" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
            )}
          >
            {following ? (
              <>
                <UserMinus size={18} />
                <span>Siguiendo</span>
              </>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Seguir</span>
              </>
            )}
          </button>
          <button 
            onClick={handleMessage}
            className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center"
          >
            <MessageSquare size={20} />
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function for class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
