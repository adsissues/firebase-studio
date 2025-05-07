
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
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

interface MovementTrendChartProps {
  data: { name: string; StockIn: number; StockOut: number }[];
  isLoading?: boolean;
}

const chartConfig = {
  StockIn: {
    label: "Stock In",
    color: "hsl(var(--chart-2))", // Use theme color
  },
  StockOut: {
    label: "Stock Out",
    color: "hsl(var(--chart-1))", // Use theme color
  },
} satisfies ChartConfig

export function MovementTrendChart({ data, isLoading = false }: MovementTrendChartProps) {
  if (isLoading) {
     return <Skeleton className="h-48 w-full" />;
   }

  if (!data || data.length === 0) {
     return <p className="text-center text-muted-foreground py-4">No movement data for the selected period.</p>;
   }

  return (
    <ChartContainer config={chartConfig} className="max-h-[250px] w-full">
       <AreaChart
         accessibilityLayer
         data={data}
         margin={{
           left: 0,
           right: 12,
           top: 5,
           bottom: 0,
         }}
       >
         <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
             dataKey="name"
             tickLine={false}
             axisLine={false}
             tickMargin={8}
             tickFormatter={(value) => {
                 // Example: Format date string 'YYYY-MM-DD' to 'MM/DD'
                 try {
                   const date = new Date(value);
                   return `${date.getMonth() + 1}/${date.getDate()}`;
                 } catch { return value; } // Fallback
              }}
             tick={{ fontSize: 10 }} // Smaller font size for x-axis ticks
           />
           <YAxis tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10 }} />
         <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
         <Area
           dataKey="StockOut"
           type="natural"
           fill={chartConfig.StockOut.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockOut.color}
           stackId="a"
         />
         <Area
           dataKey="StockIn"
           type="natural"
           fill={chartConfig.StockIn.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockIn.color}
           stackId="a"
         />
       </AreaChart>
     </ChartContainer>
  )
}

    