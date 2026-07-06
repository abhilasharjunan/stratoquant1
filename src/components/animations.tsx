"use client";

import { motion } from "framer-motion";

export const FadeIn = ({ children, delay = 0, duration = 0.5 }: { children: React.ReactNode, delay?: number, duration?: number }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration, delay }}
  >
    {children}
  </motion.div>
);

export const ScaleIn = ({ children }: { children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }} 
    animate={{ opacity: 1, scale: 1 }} 
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
);

export const SlideIn = ({ children, direction = 'right' }: { children: React.ReactNode, direction?: 'left' | 'right' }) => (
  <motion.div 
    initial={{ opacity: 0, x: direction === 'right' ? 20 : -20 }} 
    animate={{ opacity: 1, x: 0 }} 
    transition={{ duration: 0.4 }}
  >
    {children}
  </motion.div>
);
