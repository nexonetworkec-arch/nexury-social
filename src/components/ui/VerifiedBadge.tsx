import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ 
  size = 16, 
  className,
  showTooltip = true
}) => {
  const [showMobileTooltip, setShowMobileTooltip] = React.useState(false);

  return (
    <div 
      className={cn("relative group inline-flex items-center justify-center cursor-help", className)}
      onClick={(e) => {
        e.stopPropagation();
        setShowMobileTooltip(!showMobileTooltip);
        // Auto-hide after 2 seconds on mobile
        if (!showMobileTooltip) {
          setTimeout(() => setShowMobileTooltip(false), 2000);
        }
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ 
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1
        }}
        whileHover={{ scale: 1.15 }}
        className="relative flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-indigo-500/30 blur-[4px] rounded-full animate-pulse" />
        
        {/* Main Badge Body */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 rounded-full shadow-[0_2px_10px_rgba(79,70,229,0.4)] border border-white/20" />
        
        {/* Checkmark Icon */}
        <Check 
          size={size * 0.7} 
          strokeWidth={3.5}
          className="text-white relative z-10 drop-shadow-sm" 
        />
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
      </motion.div>

      {showTooltip && (
        <div className={cn(
          "absolute -top-10 left-1/2 -translate-x-1/2 transition-all duration-200 pointer-events-none z-50",
          showMobileTooltip ? "opacity-100 scale-100" : "opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100"
        )}>
          <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[10px] px-3 py-1.5 rounded-xl font-bold whitespace-nowrap shadow-xl border border-white/10 relative">
            Cuenta Verificada
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45" />
          </div>
        </div>
      )}
    </div>
  );
};
