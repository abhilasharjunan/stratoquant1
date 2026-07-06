"use client";

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === '/' || pathname.startsWith('/auth')) return null;

  return (
    <nav className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-white">
      <div 
        className="text-xl font-bold text-slate-900 tracking-tight cursor-pointer"
        onClick={() => router.push('/dashboard')}
      >
        Folio<span className="text-blue-600">Veda</span>
      </div>
      <div className="flex gap-4 text-sm">
        <button
          onClick={() => router.push('/dashboard')}
          className={`px-3 py-1.5 rounded-md transition-colors ${
            pathname === '/dashboard' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Dashboard
        </button>
         <button
           onClick={() => router.push('/portfolio')}
           className={`px-3 py-1.5 rounded-md transition-colors ${
             pathname.startsWith('/portfolio') ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:text-slate-900'
           }`}
         >
           Portfolio
         </button>
          <button
            onClick={() => router.push('/portfolio/risk')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/portfolio/risk' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Portfolio Risk
          </button>
          <button
            onClick={() => router.push('/funds/compare')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/funds/compare' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Compare Funds
          </button>
          <button
            onClick={() => router.push('/top-funds')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              pathname === '/top-funds' ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top Funds
          </button>

      </div>
    </nav>
  );
}
