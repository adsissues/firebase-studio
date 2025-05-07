
"use client"

import * as React from "react"
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean; // Optional loading state
}

// Generate colors dynamically or use a predefined palette
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF1919", "#19B2FF"];

export function CategoryChart({ data, isLoading = false }: CategoryChartProps) {

   const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length], // Cycle through colors
      };
    });
    return config;
  }, [data]);


  if (isLoading) {
     return <Skeleton className="h-48 w-full" />;
   }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No category data available.</p>;
  }

  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);


  return (
      <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Tooltip
                    cursor={false}
                     content={<ChartTooltipContent hideLabel nameKey="name" />}
                 />
                 <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    strokeWidth={5}
                    activeIndex={0} // Consider removing or making dynamic if interaction needed
                    // activeShape={} // Optional custom shape
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color || COLORS[index % COLORS.length]} />
                     ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
     </ChartContainer>
  )
}

    