"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SectorPieChart } from '@/components/funds/SectorPieChart';
import { Loader2 } from 'lucide-react';

interface SectorData {
  sectors: Record<string, number>;
  totalValue: number;
  totalSectorValue: number;
}

export default function PortfolioSectorChart() {
  const [data, setData] = useState<SectorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSectors = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/portfolio/sectors');
        if (!res.ok) {
          if (res.status === 401) { setData(null); return; }
          throw new Error('Failed to fetch sector data');
        }
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    fetchSectors();
  }, []);

  if (loading) {
    return (
      <Card className="border-none shadow-sm bg-white">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Sector Allocation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="animate-spin text-slate-400" size={24} />
        </CardContent>
      </Card>
    );
  }

  if (error || !data || Object.keys(data.sectors).length === 0) {
    return null;
  }

  const sectorCount = Object.keys(data.sectors).length;

  return (
    <Card className="border-none shadow-sm bg-white">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Sector Allocation</CardTitle>
        <p className="text-sm text-slate-500">
          {sectorCount} sectors across your portfolio · ₹{data.totalValue.toLocaleString('en-IN')} total
        </p>
      </CardHeader>
      <CardContent>
        <SectorPieChart data={data.sectors} />
      </CardContent>
    </Card>
  );
}
