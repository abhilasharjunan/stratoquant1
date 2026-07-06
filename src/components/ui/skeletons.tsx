import React from 'react';

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded-xl ${className}`} />;
}

export function SkeletonText({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />;
}

export function SkeletonChart({ height = "h-64" }: { height?: string }) {
  return <div className={`animate-pulse bg-slate-100 rounded-2xl ${height} w-full`} />;
}
