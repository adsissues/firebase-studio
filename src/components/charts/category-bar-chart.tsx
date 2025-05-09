
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF", "#FF1919", "#19B2FF"];

export function CategoryBarChart({ data, isLoading = false }: CategoryBarChartProps) {

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    data.forEach((item, index) => {
      config[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
    });
    // A default key for the bar itself if dataKey is not directly tied to a config key
    config.value = { 
        label: "Count", // Generic label for the value
        color: "hsl(var(--chart-1))", // Default bar color
    };
    return config;
  }, [data]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-4">No category data available.</p>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data} layout="vertical" margin={{ right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" allowDecimals={false} />
          <YAxis 
            dataKey="name" 
            type="category" 
            tickLine={false} 
            axisLine={false} 
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            width={80}
            interval={0} // Show all labels
            tickFormatter={(value) => value.length > 10 ? `${value.substring(0,10)}...` : value}
          />
          <ChartTooltip
            cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
            content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="value" layout="vertical" radius={4}>
            {data.map((entry, index) => (
              <ResponsiveContainer key={`cell-${index}`} width="100%" height="100%">
                 <Bar
                    dataKey="value"
                    fill={chartConfig[entry.name]?.color || COLORS[index % COLORS.length]}
                    radius={4}
                  />
              </ResponsiveContainer>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
