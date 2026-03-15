import React, { useState } from 'react';
import { Search, Calendar, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { SocialService } from '../../services/socialService';
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

export const RightPanel = ({ 
  searchQuery, 
  onSearchChange,
  onTrendClick
}: { 
  searchQuery: string, 
  onSearchChange: (query: string) => void,
  onTrendClick?: (query: string) => void
}) => {
  const [trends, setTrends] = React.useState<{ category: string, title: string, posts: string }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTrends = async () => {
      try {
        const data = await SocialService.getTrends();
        const formattedTrends = data.map(t => ({
          category: 'Tendencia',
          title: `#${t.tag}`,
          posts: `${t.count} posts`
        }));
        setTrends(formattedTrends);
      } catch (err) {
        console.error('Error loading trends:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, []);

  const handleTrendClick = (title: string) => {
    if (onTrendClick) {
      onTrendClick(title);
    } else {
      onSearchChange(title);
    }
  };

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

      <div className="bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 flex flex-col max-h-[450px]">
        <h2 className="p-5 text-xl font-bold font-display text-slate-900 shrink-0">Tendencias</h2>
        <div className="overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="p-10 flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : trends.length > 0 ? (
            trends.map((trend, index) => (
              <TrendItem 
                key={index}
                category={trend.category}
                title={trend.title}
                posts={trend.posts}
                onClick={() => handleTrendClick(trend.title)}
              />
            ))
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500 font-medium">El mundo está tranquilo...</p>
              <p className="text-xs text-slate-400 mt-1">¡Sé el primero en crear una tendencia usando #hashtags!</p>
            </div>
          )}
        </div>
        {trends.length > 5 && (
          <Button 
            variant="ghost" 
            className="p-4 text-indigo-600 font-semibold text-sm hover:bg-indigo-50 w-full justify-start rounded-none shrink-0 border-t border-slate-100"
            onClick={() => alert('Explora más en la sección de búsqueda')}
          >
            Mostrar más
          </Button>
        )}
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

