
"use client"

import * as React from "react"
// import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts" // Commented out as chart is replaced

// import {
//   ChartContainer,
//   ChartTooltip,
//   ChartTooltipContent,
//   type ChartConfig,
// } from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton";

interface CategoryBarChartProps {
  data: { name: string; value: number }[];
  isLoading?: boolean;
}

// // Define a broader palette of contrasting colors
// const CATEGORY_COLORS = [
//   "hsl(var(--chart-1))", 
//   "hsl(var(--chart-2))", 
//   "hsl(var(--chart-3))", 
//   "hsl(var(--chart-4))", 
//   "hsl(var(--chart-5))",
//   "hsl(210 80% 60%)", // A distinct blue
//   "hsl(30 80% 60%)",  // A distinct orange
//   "hsl(260 70% 65%)", // A distinct purple
// ];


export function CategoryBarChart({ data, isLoading = false }: CategoryBarChartProps) {

  // const chartConfig = React.useMemo(() => {
  //   const config: ChartConfig = {};
  //   data.forEach((item, index) => {
  //     config[item.name] = {
  //       label: item.name,
  //       color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  //     };
  //   });
  //   // A default key for the bar itself if dataKey is not directly tied to a config key
  //   config.value = { 
  //       label: "Count", // Generic label for the value
  //       color: "hsl(var(--muted-foreground))", // Default bar color, should be overridden by specific item config
  //   };
  //   return config;
  // }, [data]);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  // if (!data || data.length === 0) {
  //   return <p className="text-center text-muted-foreground py-4">No category data available.</p>;
  // }

  // Replacing the chart with the requested text
  return (
    <div className="flex items-center justify-center h-48 border rounded-md p-4 text-center text-muted-foreground">
      <p>In Dart, the mode is not visible</p>
    </div>
  );

  // Original chart rendering code:
  // return (
  //   <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
  //     <ResponsiveContainer width="100%" height={Math.max(250, data.length * 30)}> {/* Dynamic height */}
  //       <BarChart data={data} layout="vertical" margin={{ right: 30, left: 20, bottom: 5, top: 5 }}>
  //         <CartesianGrid horizontal={false} strokeDasharray="3 3" />
  //         <XAxis type="number" allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
  //         <YAxis 
  //           dataKey="name" 
  //           type="category" 
  //           tickLine={false} 
  //           axisLine={false} 
  //           stroke="hsl(var(--muted-foreground))"
  //           fontSize={12} // Increased font size
  //           width={100} // Increased width to accommodate longer labels
  //           interval={0} 
  //           tickFormatter={(value) => value.length > 15 ? `${value.substring(0,13)}...` : value} // Adjust truncation
  //         />
  //         <ChartTooltip
  //           cursor={{ fill: 'hsl(var(--accent))', radius: 4 }}
  //           content={<ChartTooltipContent indicator="dot" />}
  //         />
  //         <Bar dataKey="value" layout="vertical" radius={4}>
  //           {data.map((entry, index) => (
  //              <ResponsiveContainer key={`cell-${index}`} width="100%" height="100%">
  //                <Bar
  //                   dataKey="value"
  //                   fill={chartConfig[entry.name]?.color || CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
  //                   radius={4}
  //                 />
  //             </ResponsiveContainer>
  //           ))}
  //         </Bar>
  //       </BarChart>
  //     </ResponsiveContainer>
  //   </ChartContainer>
  // )
}
