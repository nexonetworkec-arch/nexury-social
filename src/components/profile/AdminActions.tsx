import React from 'react';
import { Shield, ShieldAlert, ShieldOff, Trash2, MoreVertical, Flag, Ban } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface AdminActionsProps {
  currentUser: any;
  profileUser: any;
  isAdminMenuOpen: boolean;
  setIsAdminMenuOpen: (open: boolean) => void;
  isUserMenuOpen: boolean;
  setIsUserMenuOpen: (open: boolean) => void;
  handleToggleVerify: () => void;
  handleBlockUser: () => void;
  handleDeleteUser: () => void;
  handleReportUser: () => void;
  handlePersonalBlock: () => void;
}

export const AdminActions: React.FC<AdminActionsProps> = ({
  currentUser,
  profileUser,
  isAdminMenuOpen,
  setIsAdminMenuOpen,
  isUserMenuOpen,
  setIsUserMenuOpen,
  handleToggleVerify,
  handleBlockUser,
  handleDeleteUser,
  handleReportUser,
  handlePersonalBlock
}) => {
  const isAdmin = currentUser?.is_admin || currentUser?.is_super_admin;
  const isOwnProfile = currentUser?.id === profileUser?.id;

  if (isOwnProfile) return null;

  return (
    <div className="absolute top-4 right-4 flex gap-2">
      {/* User Menu (Report/Block) */}
      <div className="relative">
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="p-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-600 rounded-full shadow-sm transition-all border border-slate-100"
        >
          <MoreVertical size={20} />
        </button>
        
        <AnimatePresence>
          {isUserMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              <div className="p-1.5">
                <button 
                  onClick={handleReportUser}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all flex items-center gap-2"
                >
                  <Flag size={16} />
                  Reportar Perfil
                </button>
                <button 
                  onClick={handlePersonalBlock}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-2"
                >
                  <Ban size={16} />
                  Bloquear (Personal)
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Admin Menu */}
      {isAdmin && (
        <div className="relative">
          <button 
            onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
            className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 transition-all"
          >
            <Shield size={20} />
          </button>
          
          <AnimatePresence>
            {isAdminMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1.5">
                  <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones Admin</p>
                  <button 
                    onClick={handleToggleVerify}
                    className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      {profileUser.is_verified ? <ShieldOff size={18} /> : <ShieldAlert size={18} />}
                    </div>
                    <span>{profileUser.is_verified ? 'Quitar Verificación' : 'Verificar Usuario'}</span>
                  </button>
                  
                  <button 
                    onClick={handleBlockUser}
                    className="w-full text-left px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-all flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <ShieldAlert size={18} />
                    </div>
                    <span>{profileUser.is_blocked ? 'Desbloquear Cuenta' : 'Bloquear Cuenta'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-50" />
                  
                  <button 
                    onClick={handleDeleteUser}
                    className="w-full text-left px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Trash2 size={18} />
                    </div>
                    <span>Eliminar Usuario</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
