
"use client"

import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean;
}

export function CategoryBarChart({ data, isLoading = false }: CategoryBar-chart-props) {

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  // Replacing the chart with the requested text
  return (
    <div className="flex items-center justify-center h-48 border rounded-md p-4 text-center text-muted-foreground">
      <p>In Dart, the mode is not visible</p>
    </div>
  );
}
