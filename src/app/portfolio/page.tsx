"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ManualHoldingEntry from '@/components/portfolio/ManualHoldingEntry';
import CsvUpload from '@/components/portfolio/CsvUpload';
import HoldingsList from '@/components/portfolio/HoldingsList';
import PortfolioSectorChart from '@/components/portfolio/PortfolioSectorChart';

export default function PortfolioManager() {
  const [entryMode, setEntryMode] = useState<'manual' | 'csv'>('manual');
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Portfolio</h1>
        <p className="text-slate-500">Add or modify your mutual fund holdings.</p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
        <Button 
          variant={entryMode === 'manual' ? 'default' : 'ghost'} 
          onClick={() => setEntryMode('manual')}
          className={entryMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}
        >
          Manual Entry
        </Button>
        <Button 
          variant={entryMode === 'csv' ? 'default' : 'ghost'} 
          onClick={() => { setEntryMode('csv'); setRefreshKey(k => k + 1); }}
          className={entryMode === 'csv' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}
        >
          CSV Upload
        </Button>
      </div>

      {entryMode === 'manual' ? (
        <ManualHoldingEntry onSuccess={() => setRefreshKey(k => k + 1)} />
      ) : (
        <CsvUpload onSuccess={() => setRefreshKey(k => k + 1)} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="lg:col-span-2">
          <PortfolioSectorChart key={refreshKey} />
        </div>
      </div>

      <HoldingsList key={refreshKey} />
    </div>
  );
}
