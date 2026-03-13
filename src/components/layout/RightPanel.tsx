import React, { useState } from 'react';
import { Search, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { dataService } from '../../services/dataService';
import { Button } from '../ui/Button';
import { SuggestedUsers } from './SuggestedUsers';

const TrendItem = ({ category, title, posts, onClick }: { category: string, title: string, posts: string, onClick: () => void }) => (
  <div 
    className="p-4 hover:bg-neutral-100 cursor-pointer transition-colors"
    onClick={onClick}
  >
    <p className="text-xs text-neutral-500">{category} · Trending</p>
    <p className="font-bold">{title}</p>
    <p className="text-xs text-neutral-500">{posts} posts</p>
  </div>
);

export const RightPanel = ({ searchQuery, onSearchChange }: { searchQuery: string, onSearchChange: (query: string) => void }) => {
  return (
    <div className="hidden xl:flex flex-col h-screen sticky top-0 p-6 gap-6 w-[380px] bg-white border-l border-slate-100 overflow-y-auto no-scrollbar">
      <div className="relative group shrink-0">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
        <input 
          type="text" 
          placeholder="Buscar en Nexury" 
          className="w-full bg-slate-100 border-2 border-transparent rounded-2xl py-3 pl-12 pr-4 focus:ring-0 focus:border-indigo-500/30 focus:bg-white transition-all outline-none text-sm"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100">
        <h2 className="p-5 text-xl font-bold font-display text-slate-900">Tendencias</h2>
        <TrendItem category="Tecnología" title="AI Studio" posts="125k" onClick={() => onSearchChange('AI Studio')} />
        <TrendItem category="Deportes" title="Champions League" posts="84k" onClick={() => onSearchChange('Champions League')} />
        <TrendItem category="Entretenimiento" title="Nuevo Estreno" posts="42k" onClick={() => onSearchChange('Nuevo Estreno')} />
        <TrendItem category="Negocios" title="Mercado Bursátil" posts="12k" onClick={() => onSearchChange('Mercado Bursátil')} />
        <Button 
          variant="ghost" 
          className="p-5 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 w-full justify-start rounded-none"
          onClick={() => alert('Cargando más tendencias...')}
        >
          Mostrar más
        </Button>
      </div>

      <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-xl font-bold font-display text-slate-900">Comunidad</h2>
          <p className="text-xs text-slate-400 mt-1">Conecta con todos los miembros</p>
        </div>
        <SuggestedUsers />
      </div>
      
      <div className="px-4 text-[0.7rem] text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
        <span className="hover:underline cursor-pointer">Términos de Servicio</span>
        <span className="hover:underline cursor-pointer">Política de Privacidad</span>
        <span className="hover:underline cursor-pointer">Cookies</span>
        <span className="hover:underline cursor-pointer">Accesibilidad</span>
        <span className="hover:underline cursor-pointer">Información de anuncios</span>
        <span>© 2026 Nexury Social Inc.</span>
      </div>
    </div>
  );
};

