
"use client";

import type * as React from 'react';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
import type { StockItem } from '@/types';
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned } from 'lucide-react'; // Add more icons

interface StockDashboardProps {
  items: StockItem[];
}

export function StockDashboard({ items }: StockDashboardProps) {
  const getStatus = (item: StockItem) => {
    // Handle cases where minStock might be 0 or undefined to avoid division by zero
    if (item.currentStock === 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    } else if (item.minStock && item.currentStock <= item.minStock) { // Only check if minStock is defined and > 0 implicitly
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else if (item.minStock && (item.currentStock / item.minStock) < 1.5) { // Indicate warning
      return <Badge variant="secondary" className="text-xs whitespace-nowrap">Okay</Badge>;
    } else {
      // Consider items without minStock or with high stock as 'Good'
      return <Badge variant="success" className="text-xs whitespace-nowrap">Good</Badge>;
    }
  };

  const renderDetail = (icon: React.ElementType, value: string | number | undefined, label?: string) => {
      if (!value) return <span className="text-muted-foreground">-</span>;
      const Icon = icon;
      return (
         <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{value}</span>
                  </span>
                </TooltipTrigger>
                {label && <TooltipContent>{label}: {value}</TooltipContent>}
            </Tooltip>
         </TooltipProvider>
      );
  }

   const renderPhoto = (item: StockItem) => {
      if (!item.photoUrl) return <span className="text-muted-foreground">-</span>;
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center justify-center cursor-pointer text-primary hover:underline">
                 <ImageIcon className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-0 border-none">
              <img src={item.photoUrl} alt={item.itemName} className="max-w-xs max-h-40 object-contain rounded" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    const renderLocation = (item: StockItem) => {
     const displayLocation = item.location || (item.locationCoords ? `GPS: ${item.locationCoords.latitude.toFixed(4)}, ${item.locationCoords.longitude.toFixed(4)}` : '-');
     const Icon = item.locationCoords ? MapPinned : MapPin;

     return (
        <TooltipProvider delayDuration={100}>
           <Tooltip>
               <TooltipTrigger asChild>
                 <span className="flex items-center gap-1 cursor-default">
                   <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                   <span className="truncate">{displayLocation}</span>
                 </span>
               </TooltipTrigger>
                <TooltipContent>
                  {item.location && <div>Storage: {item.location}</div>}
                  {item.locationCoords && <div>Coordinates: Lat {item.locationCoords.latitude.toFixed(6)}, Lon {item.locationCoords.longitude.toFixed(6)}</div>}
               </TooltipContent>
           </Tooltip>
        </TooltipProvider>
     );
    };


  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption className="py-4">Overview of current stock levels.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[25%]">Item Name</TableHead>
             <TableHead className="hidden xl:table-cell text-center">Photo</TableHead>
             <TableHead className="hidden md:table-cell">Category</TableHead>
             <TableHead className="hidden lg:table-cell">Supplier</TableHead>
            <TableHead className="hidden sm:table-cell">Location</TableHead>
            <TableHead className="hidden lg:table-cell">Barcode</TableHead>
             <TableHead className="hidden xl:table-cell">Description</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Min.</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                No stock items found matching your search.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id} className={item.minStock && item.currentStock <= item.minStock && item.currentStock !== 0 ? 'bg-destructive/10 hover:bg-destructive/20' : item.currentStock === 0 ? 'bg-destructive/20 hover:bg-destructive/30 opacity-70' : ''}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                 <TableCell className="hidden xl:table-cell text-center">{renderPhoto(item)}</TableCell>
                 <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{renderDetail(Tag, item.category, 'Category')}</TableCell>
                 <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{renderDetail(Building, item.supplier, 'Supplier')}</TableCell>
                 <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{renderLocation(item)}</TableCell>
                 <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{renderDetail(Barcode, item.barcode, 'Barcode')}</TableCell>
                 <TableCell className="hidden xl:table-cell text-muted-foreground text-xs">{renderDetail(Info, item.description, 'Description')}</TableCell>
                <TableCell className="text-right font-mono">{item.currentStock}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{item.minStock ?? '-'}</TableCell>
                <TableCell className="text-center">{getStatus(item)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
