"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart, Sector, Cell } from "recharts" // Added Cell
import type { PieSectorDataItem } from "recharts/types/polar/Pie"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface LocationChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean; // Optional loading state
}

// Use the same broader palette as CategoryBarChart for consistency if needed
const LOCATION_COLORS = [
  "hsl(var(--chart-1))", 
  "hsl(var(--chart-2))", 
  "hsl(var(--chart-3))", 
  "hsl(var(--chart-4))", 
  "hsl(var(--chart-5))",
  "hsl(100 70% 50%)", // A distinct lime green
  "hsl(330 70% 60%)", // A distinct pink
  "hsl(50 80% 55%)",  // A distinct gold
];

export function LocationChart({ data, isLoading = false }: LocationChartProps) {

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: LOCATION_COLORS[index % LOCATION_COLORS.length],
      };
    });
    return config;
  }, [data]);


  const totalValue = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.value, 0);
  }, [data]);

  if (isLoading) {
     return <Skeleton className="h-48 w-full" />;
   }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No location data available.</p>;
  }

  return (
    <ChartContainer
        config={chartConfig}
        className="mx-auto aspect-square max-h-[250px]"
     >
        <PieChart>
           <ChartTooltip
             cursor={false}
             content={<ChartTooltipContent hideLabel indicator="dot" nameKey="name" />}
           />
            <Pie
             data={data}
             dataKey="value"
             nameKey="name"
             innerRadius={60}
             outerRadius={80} // Adjust outer radius for better visual
             strokeWidth={2} // Reduced stroke width slightly
            >
             {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color || LOCATION_COLORS[index % LOCATION_COLORS.length]} />
              ))}
                <Label
                   content={({ viewBox }) => {
                     if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                       return (
                         <text
                           x={viewBox.cx}
                           y={viewBox.cy}
                           textAnchor="middle"
                           dominantBaseline="middle"
                           className="fill-foreground text-xl font-bold" // Adjusted size
                         >
                           {totalValue.toLocaleString()}
                           <tspan
                             x={viewBox.cx}
                             y={(viewBox.cy || 0) + 20} // Adjusted y offset
                             className="fill-muted-foreground text-xs" // Adjusted size
                           >
                             Items
                           </tspan>
                         </text>
                       )
                     }
                      return null;
                   }}
                   position="center" // Ensure label is centered
                 />
           </Pie>
         </PieChart>
     </ChartContainer>
  )
}