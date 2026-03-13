import React from 'react';
import { motion } from 'motion/react';

import { Logo } from './Logo';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#0f172a] flex flex-col items-center justify-center">
      <Logo size="xl" animate={true} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex flex-col items-center"
      >
        <h1 className="text-2xl font-bold text-white tracking-widest uppercase">Nexury</h1>
        <div className="mt-4 w-48 h-1 bg-slate-800 rounded-full overflow-hidden">
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ 
              duration: 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent"
          />
        </div>
      </motion.div>
    </div>
  );
};
