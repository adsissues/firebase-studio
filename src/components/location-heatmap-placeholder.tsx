
"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Map } from 'lucide-react';

export function LocationHeatmapPlaceholder() {
  return (
    <div className="p-4 border rounded-lg bg-muted/40 min-h-[200px] flex flex-col items-center justify-center text-center">
      <Map className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-muted-foreground">Stock Location Heatmap</h3>
      <p className="text-sm text-muted-foreground mt-1">
        This feature will visually represent stock concentration across different warehouse locations.
      </p>
      <p className="text-xs text-muted-foreground mt-2">(Coming Soon)</p>
      <Skeleton className="w-full h-32 mt-4" />
    </div>
  );
}
