
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
import { Button } from '@/components/ui/button'; // Import Button
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip
import type { StockItem } from '@/types';
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned, Pencil, Trash2 } from 'lucide-react'; // Add more icons

interface StockDashboardProps {
  items: StockItem[];
  onEdit: (item: StockItem) => void; // Add onEdit handler prop
  onDelete: (item: StockItem) => void; // Add onDelete handler prop
}

export function StockDashboard({ items, onEdit, onDelete }: StockDashboardProps) {
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
      if (!value && value !== 0) return <span className="text-muted-foreground">-</span>; // Check for 0 as well
      const Icon = icon;
      const displayValue = typeof value === 'string' && value.length > 20 ? `${value.substring(0, 17)}...` : value;
      return (
         <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{displayValue}</span>
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
              <img src={item.photoUrl} alt={item.itemName} className="max-w-xs max-h-40 object-contain rounded" data-ai-hint="product image" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    const renderLocation = (item: StockItem) => {
     const displayLocation = item.location || (item.locationCoords ? `GPS: ${item.locationCoords.latitude.toFixed(4)}, ${item.locationCoords.longitude.toFixed(4)}` : '-');
     const Icon = item.locationCoords ? MapPinned : MapPin;
     const truncatedDisplayLocation = typeof displayLocation === 'string' && displayLocation.length > 20 ? `${displayLocation.substring(0, 17)}...` : displayLocation;


     return (
        <TooltipProvider delayDuration={100}>
           <Tooltip>
               <TooltipTrigger asChild>
                 <span className="flex items-center gap-1 cursor-default">
                   <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                   <span className="truncate">{truncatedDisplayLocation}</span>
                 </span>
               </TooltipTrigger>
                <TooltipContent>
                   <div className="max-w-xs break-words"> {/* Ensure content wraps */}
                      {item.location && <div>Storage: {item.location}</div>}
                      {item.locationCoords && <div>Coordinates: Lat {item.locationCoords.latitude.toFixed(6)}, Lon {item.locationCoords.longitude.toFixed(6)}</div>}
                   </div>
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
            <TableHead className="w-[20%] min-w-[150px]">Item Name</TableHead> {/* Adjusted width */}
             <TableHead className="hidden xl:table-cell text-center w-[50px]">Photo</TableHead> {/* Fixed width */}
             <TableHead className="hidden md:table-cell w-[10%] min-w-[80px]">Category</TableHead> {/* Adjusted width */}
             <TableHead className="hidden lg:table-cell w-[10%] min-w-[80px]">Supplier</TableHead> {/* Adjusted width */}
            <TableHead className="hidden sm:table-cell w-[15%] min-w-[100px]">Location</TableHead> {/* Adjusted width */}
            <TableHead className="hidden lg:table-cell w-[10%] min-w-[80px]">Barcode</TableHead> {/* Adjusted width */}
             <TableHead className="hidden xl:table-cell w-[15%] min-w-[100px]">Description</TableHead> {/* Adjusted width */}
            <TableHead className="text-right w-[70px]">Current</TableHead> {/* Fixed width */}
            <TableHead className="text-right w-[50px]">Min.</TableHead> {/* Fixed width */}
            <TableHead className="text-center w-[90px]">Status</TableHead> {/* Fixed width */}
            <TableHead className="text-center w-[100px]">Actions</TableHead> {/* Added Actions Header, fixed width */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground"> {/* Updated colSpan */}
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
                 <TableCell className="text-center"> {/* Added Actions Cell */}
                   <div className="flex justify-center gap-1">
                     <TooltipProvider delayDuration={100}>
                       <Tooltip>
                         <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}>
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit {item.itemName}</span>
                            </Button>
                         </TooltipTrigger>
                         <TooltipContent>Edit Item</TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                      <TooltipProvider delayDuration={100}>
                       <Tooltip>
                         <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item)}>
                              <Trash2 className="h-4 w-4" />
                               <span className="sr-only">Delete {item.itemName}</span>
                            </Button>
                         </TooltipTrigger>
                         <TooltipContent>Delete Item</TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </div>
                 </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

