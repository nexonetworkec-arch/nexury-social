import React from 'react';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';

interface AccessDeniedProps {
  onBack?: () => void;
  requiredRole?: 'Admin' | 'Super Admin';
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack, requiredRole = 'Admin' }) => {
  return (
    <div className="flex-1 w-full max-w-[650px] border-x border-slate-100 min-h-screen bg-white flex flex-col items-center justify-center p-12 text-center">
      <div className="w-24 h-24 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-xl shadow-rose-100 animate-bounce">
        <ShieldAlert size={48} />
      </div>
      
      <h2 className="text-3xl font-bold text-slate-900 mb-4 font-display">Acceso Denegado</h2>
      
      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-8 max-w-sm">
        <p className="text-slate-600 leading-relaxed">
          Lo sentimos, no tienes los permisos necesarios para acceder al <span className="font-bold text-slate-900">Panel de {requiredRole}</span>.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <Button 
          variant="primary" 
          className="flex-1 gap-2"
          onClick={() => window.dispatchEvent(new CustomEvent('changeView', { detail: 'Inicio' }))}
        >
          <Home size={18} />
          Ir al Inicio
        </Button>
        
        {onBack && (
          <Button 
            variant="ghost" 
            className="flex-1 gap-2 border border-slate-200"
            onClick={onBack}
          >
            <ArrowLeft size={18} />
            Volver
          </Button>
        )}
      </div>
      
      <p className="mt-12 text-xs text-slate-400 font-medium uppercase tracking-widest">
        Nexury Security System v2.0
      </p>
    </div>
  );
};
