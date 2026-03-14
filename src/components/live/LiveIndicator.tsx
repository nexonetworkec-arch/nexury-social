import React from 'react';
import { motion } from 'motion/react';

interface LiveIndicatorProps {
  isLive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({ isLive, size = 'md', children }) => {
  if (!isLive) return <>{children}</>;

  const ringSize = size === 'sm' ? 'p-0.5' : size === 'md' ? 'p-1' : 'p-1.5';

  return (
    <div className="relative inline-block">
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
          rotate: [0, 360],
        }}
        transition={{
          scale: { duration: 2, repeat: Infinity },
          rotate: { duration: 8, repeat: Infinity, ease: "linear" }
        }}
        className={`rounded-full ${ringSize} bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600`}
      >
        <div className="bg-[#fafafa] rounded-full p-0.5">
          {children}
        </div>
      </motion.div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-tighter border border-white">
        Live
      </div>
    </div>
  );
};
