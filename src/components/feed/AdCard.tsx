import React, { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Megaphone, ExternalLink, Eye, MousePointer2 } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { cn } from '../../lib/utils';

interface AdCardProps {
  ad: {
    id: string;
    title: string;
    description: string;
    image_url: string;
    target_url: string;
  };
}

export const AdCard: React.FC<AdCardProps> = ({ ad }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const impressionRecorded = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionRecorded.current) {
            dataService.recordAdImpression(ad.id);
            impressionRecorded.current = true;
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 } // Se cuenta como impresión si el 50% es visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, [ad.id]);

  const handleClick = () => {
    dataService.recordAdClick(ad.id);
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="p-4 sm:p-5 border-b border-slate-100 bg-indigo-50/30"
    >
      <div className="bg-white rounded-3xl border border-indigo-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
        <div className="relative h-48 sm:h-64 overflow-hidden">
          <img 
            src={ad.image_url} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            alt={ad.title}
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm">
            <Megaphone size={14} className="text-indigo-600" />
            <span className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">Patrocinado</span>
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="text-lg font-bold text-slate-900 mb-1">{ad.title}</h3>
          <p className="text-sm text-slate-600 mb-4 line-clamp-2">{ad.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-slate-400">
              <div className="flex items-center gap-1">
                <Eye size={14} />
                <span className="text-[10px] font-medium">Promocionado</span>
              </div>
            </div>
            
            <a
              href={ad.target_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
            >
              Saber más
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
