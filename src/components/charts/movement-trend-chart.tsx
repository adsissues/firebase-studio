
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts" // Added Tooltip

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip, // Use ChartTooltip instead of direct Tooltip
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface MovementTrendChartProps {
  // Data can now include an optional 'Restock' key
  data: { name: string; StockIn: number; StockOut: number; Restock?: number }[];
  isLoading?: boolean;
}

// Update chartConfig to include Restock
const chartConfig = {
  StockIn: {
    label: "Stock In",
    color: "hsl(var(--chart-2))", // Greenish
  },
  StockOut: {
    label: "Stock Out",
    color: "hsl(var(--chart-1))", // Reddish/Orangish
  },
  Restock: { // Add configuration for Restock
      label: "Restock",
      color: "hsl(var(--chart-4))", // Yellowish/Different color
  },
} satisfies ChartConfig

export function MovementTrendChart({ data, isLoading = false }: MovementTrendChartProps) {
  if (isLoading) {
     return ;
   }

  if (!data || data.length === 0) {
     return No movement data for the selected period.;
   }

   // Check if any data point includes the Restock key to decide whether to render the Area
   const hasRestockData = data.some(d => d.Restock !== undefined && d.Restock > 0);

  return (
    
       
         
           
              try {
                   const date = new Date(value);
                   // Format as MM/DD for brevity
                   return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                 } catch { return value; }
              }}
             tick={{ fontSize: 10 }}
           />
           
           {/* Use ChartTooltip for better integration with ChartContainer config */}
           
             
            />
         {/* Render StockOut Area */}
         
           
           fill={chartConfig.StockOut.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockOut.color}
           stackId="a" // Keep same stack ID if you want them stacked
         />
          {/* Render Restock Area only if data exists */}
          {hasRestockData && (
              
                  
                  fill={chartConfig.Restock.color}
                  fillOpacity={0.5} // Slightly different opacity?
                  stroke={chartConfig.Restock.color}
                  stackId="a" // Stack with In/Out
              
           )}
         {/* Render StockIn Area */}
         
           
           fill={chartConfig.StockIn.color}
           fillOpacity={0.4}
           stroke={chartConfig.StockIn.color}
           stackId="a" // Keep same stack ID
         />
       
     
  )
}

