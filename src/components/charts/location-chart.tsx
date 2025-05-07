
"use client"

import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart, Sector } from "recharts"
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

const COLORS = ["#2563eb", "#f97316", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2"]; // Example Tailwind colors

export function LocationChart({ data, isLoading = false }: LocationChartProps) {

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
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
             content={<ChartTooltipContent hideLabel indicator="dot" />}
           />
            <Pie
             data={data}
             dataKey="value"
             nameKey="name"
             innerRadius={60}
             strokeWidth={5}
             activeIndex={0} // Consider making dynamic if interaction needed
             // Optional: Custom active shape rendering
            //  activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
            //     <g>
            //       <Sector {...props} outerRadius={outerRadius + 10} />
            //       <Sector
            //         {...props}
            //         outerRadius={outerRadius + 20}
            //         innerRadius={outerRadius + 12}
            //       />
            //     </g>
            //  )}
           >
             {data.map((entry, index) => (
                <Label
                   key={`label-${index}`}
                   content={({ viewBox }) => {
                     if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                       return (
                         <text
                           x={viewBox.cx}
                           y={viewBox.cy}
                           textAnchor="middle"
                           dominantBaseline="middle"
                         >
                           <tspan
                             x={viewBox.cx}
                             y={viewBox.cy}
                             className="fill-foreground text-3xl font-bold"
                           >
                             {totalValue.toLocaleString()}
                           </tspan>
                           <tspan
                             x={viewBox.cx}
                             y={(viewBox.cy || 0) + 24}
                             className="fill-muted-foreground"
                           >
                             Items
                           </tspan>
                         </text>
                       )
                     }
                      return null;
                   }}
                 />
              ))}
           </Pie>
         </PieChart>
     </ChartContainer>
  )
}

    