'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ 
  progress, 
  className = '', 
  showLabel = true 
}: ProgressBarProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const animateRef = useRef<() => void>(() => {});

  const animate = useCallback(() => {
    setAnimatedProgress(prev => {
      const target = progress;
      const step = (target - prev) * 0.1;
      if (Math.abs(step) > 0.1) {
        rafRef.current = requestAnimationFrame(animateRef.current);
        return prev + step;
      }
      return target;
    });
  }, [progress]);

  animateRef.current = animate;

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animateRef.current);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [progress]);

  return (
    <div className={`w-full h-2.5 bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <div 
        className="h-full bg-blue-600 transition-all duration-700 ease-in-out"
        style={{ width: `${animatedProgress}%` }}
      ></div>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white text-shadow">
          {Math.round(animatedProgress)}%
        </div>
      )}
    </div>
  );
}