"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="p-4 bg-slate-100 rounded-full">
        <FileQuestion size={48} className="text-slate-400" />
      </div>
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h1>
        <p className="text-slate-500 leading-relaxed">
          The page you are looking for doesn't exist or has been moved.
        </p>
      </div>
      <Button 
        onClick={() => window.location.href = '/'} 
        className="bg-blue-600 hover:bg-blue-700 text-white px-8"
      >
        Back to Home
      </Button>
    </div>
  );
}
