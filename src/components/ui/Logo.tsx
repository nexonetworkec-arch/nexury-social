import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  className?: string;
  animate?: boolean;
  withGlint?: boolean;
  customSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 'md', 
  className, 
  animate = false,
  withGlint = true,
  customSize
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-xl',
    md: 'w-12 h-12 rounded-2xl text-2xl',
    lg: 'w-16 h-16 rounded-[1.5rem] text-4xl',
    xl: 'w-32 h-32 rounded-[2.5rem] text-6xl',
    custom: customSize || ''
  };

  const container = (
    <div className={cn(
      "bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-500/20 relative overflow-hidden",
      sizeClasses[size],
      className
    )}>
      {/* Animated Shine */}
      {animate && (
        <motion.div 
          animate={{ 
            x: ['-100%', '200%'],
            opacity: [0, 0.3, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            repeatDelay: 1
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -skew-x-12"
        />
      )}
      
      <span className={cn(
        "font-black text-white tracking-tighter select-none",
        size === 'sm' ? 'text-lg' : ''
      )}>N</span>
      
      {/* Sparkle/Glint */}
      {withGlint && (
        <motion.div 
          animate={animate ? { 
            scale: [1, 1.5, 1],
            opacity: [0.5, 1, 0.5]
          } : {}}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={cn(
            "absolute bg-white rounded-full blur-[1px] shadow-[0_0_10px_white]",
            size === 'sm' ? 'top-1 right-1 w-0.5 h-0.5' : 
            size === 'md' ? 'top-2 right-2 w-1 h-1' : 
            'top-4 right-4 w-2 h-2'
          )}
        />
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {container}
      </motion.div>
    );
  }

  return container;
};
