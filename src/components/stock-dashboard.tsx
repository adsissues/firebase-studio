
"use client";

import type * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption, // Import TableCaption
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { StockItem } from '@/types';
import { AlertTriangle, MapPin, Barcode } from 'lucide-react'; // Add icons

interface StockDashboardProps {
  items: StockItem[];
}

export function StockDashboard({ items }: StockDashboardProps) {
  const getStatus = (item: StockItem) => {
    const stockRatio = item.minStock > 0 ? item.currentStock / item.minStock : 1;
    if (item.currentStock === 0) {
       return (
         <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
           <AlertTriangle className="h-3 w-3" />
           Out of Stock
         </Badge>
       );
    } else if (item.currentStock <= item.minStock) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else if (stockRatio < 1.5) { // Indicate warning if stock is getting close to minimum
       return <Badge variant="secondary" className="text-xs whitespace-nowrap">Okay</Badge>; // Use secondary for 'Okay'
    }
     else {
      return <Badge variant="success" className="text-xs whitespace-nowrap">Good</Badge>;
    }
  };

  return (
    <div className="rounded-lg border shadow-sm overflow-hidden"> {/* Ensure overflow is hidden for rounded corners */}
      <Table>
        <TableCaption className="py-4">Overview of current stock levels.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Item Name</TableHead>
            <TableHead className="hidden sm:table-cell">Location</TableHead> {/* Hide on small screens */}
            <TableHead className="hidden lg:table-cell">Barcode</TableHead> {/* Hide on small/medium screens */}
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Min.</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No stock items found matching your search.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className={item.currentStock <= item.minStock ? 'bg-destructive/10 hover:bg-destructive/20' : ''}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                   {item.location ? (
                     <span className="flex items-center gap-1">
                       <MapPin className="h-3 w-3" /> {item.location}
                     </span>
                   ) : (
                     '-'
                   )}
                 </TableCell>
                 <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                   {item.barcode ? (
                     <span className="flex items-center gap-1">
                       <Barcode className="h-3 w-3" /> {item.barcode}
                     </span>
                   ) : (
                     '-'
                   )}
                 </TableCell>
                <TableCell className="text-right font-mono">{item.currentStock}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{item.minStock}</TableCell>
                <TableCell className="text-center">{getStatus(item)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
