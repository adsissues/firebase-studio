
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, AlertTriangle, XCircle, ArrowDown, ArrowUp, RefreshCcw } from 'lucide-react'; // Removed PoundSterling

export interface KPIData {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  todayIn: number;
  todayOut: number;
  todayRestock: number;
  totalInventoryValue?: number; 
}

interface DashboardKPIsProps {
  data: KPIData | null;
  isLoading?: boolean;
}

interface KPIItemProps {
    title: string;
    value: number | string;
    icon: React.ElementType;
    iconColor?: string;
    isLoading?: boolean;
    prefix?: string; 
}

const KPIItem: React.FC<KPIItemProps> = ({ title, value, icon: Icon, iconColor = "text-primary", isLoading, prefix = '' }) => (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${iconColor}`} />
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <Skeleton className="h-6 w-1/2" />
            ) : (
                <div className="text-2xl font-bold">{prefix}{value}</div>
            )}
        </CardContent>
    </Card>
);


export function DashboardKPIs({ data, isLoading = false }: DashboardKPIsProps) {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 mb-6"> {/* Adjusted grid to xl:grid-cols-6 since one item is removed */}
        <KPIItem
            title="Total Items"
            value={data?.totalItems ?? 0}
            icon={Package}
            isLoading={isLoading}
        />
       <KPIItem
            title="Low Stock"
            value={data?.lowStockItems ?? 0}
            icon={AlertTriangle}
            iconColor={ (data?.lowStockItems ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}
            isLoading={isLoading}
        />
        <KPIItem
            title="Out of Stock"
            value={data?.outOfStockItems ?? 0}
            icon={XCircle}
            iconColor={(data?.outOfStockItems ?? 0) > 0 ? "text-destructive" : "text-muted-foreground"}
            isLoading={isLoading}
        />
         <KPIItem
            title="Today's In"
            value={data?.todayIn ?? 0}
            icon={ArrowUp}
             iconColor="text-success"
            isLoading={isLoading}
        />
        <KPIItem
            title="Today's Out"
            value={data?.todayOut ?? 0}
            icon={ArrowDown}
            iconColor="text-destructive"
            isLoading={isLoading}
        />
        <KPIItem
            title="Today's Restock"
            value={data?.todayRestock ?? 0}
            icon={RefreshCcw}
            iconColor="text-blue-500"
            isLoading={isLoading}
        />
        {/* Removed KPIItem for 'Inv. Value' */}
    </div>
  );
}

