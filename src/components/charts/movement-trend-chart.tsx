"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts" 

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
  ChartLegend, // Import ChartLegend
  ChartLegendContent, // Import ChartLegendContent
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface MovementTrendChartProps {
  data: { name: string; StockIn: number; StockOut: number; Restock?: number }[];
  isLoading?: boolean;
}

const chartConfig = {
  StockIn: {
    label: "Units In", // Clarified label
    color: "hsl(var(--chart-2))", 
  },
  StockOut: {
    label: "Units Out", // Clarified label
    color: "hsl(var(--chart-1))", 
  },
  Restock: { 
      label: "Units Restocked", // Clarified label
      color: "hsl(var(--chart-4))", 
  },
} satisfies ChartConfig

export function MovementTrendChart({ data, isLoading = false }: MovementTrendChartProps) {
  if (isLoading) {
     return <Skeleton className="h-48 w-full" />; 
   }

  if (!data || data.length === 0) {
     return <p className="text-center text-muted-foreground py-4">No movement data for the selected period.</p>;
   }

   const hasRestockData = data.some(d => d.Restock !== undefined && d.Restock > 0);

  return (
     <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
       <AreaChart
         accessibilityLayer
         data={data}
         margin={{
           left: 12,
           right: 12,
           top: 5, // Added top margin for legend
         }}
       >
         <CartesianGrid vertical={false} />
         <XAxis
           dataKey="name"
           tickLine={false}
           axisLine={false}
           tickMargin={8}
           tickFormatter={(value) => {
             try {
                   const date = new Date(value);
                   return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                 } catch { return value; }
              }}
             tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
             stroke="hsl(var(--muted-foreground))"
           />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tickMargin={8} 
              width={40} // Increased width for larger numbers
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} 
              stroke="hsl(var(--muted-foreground))"
              label={{ value: 'Units', angle: -90, position: 'insideLeft', offset: -5, fontSize: 10, fill: "hsl(var(--foreground))" }} // Added Y-axis label
            />
           <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" nameKey="name" />} // Ensure nameKey is passed if needed
            />
          <ChartLegend content={<ChartLegendContent />} /> 
         <Area
           dataKey="StockOut"
           type="monotone" // Changed to monotone for smoother curves
           fill={chartConfig.StockOut.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockOut.color}
           stackId="a" 
         />
          {hasRestockData && (
              <Area
                  dataKey="Restock"
                  type="monotone"
                  fill={chartConfig.Restock.color}
                  fillOpacity={0.5} 
                  stroke={chartConfig.Restock.color}
                  stackId="a" 
              />
           )}
         <Area
           dataKey="StockIn"
           type="monotone" 
           fill={chartConfig.StockIn.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockIn.color}
           stackId="a" 
         />
       </AreaChart>
     </ChartContainer>
  )
}