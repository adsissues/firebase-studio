
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
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { StockItem } from '@/types';
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned, Pencil, Trash2, UserCircle } from 'lucide-react'; // Added UserCircle

interface StockDashboardProps {
  items: StockItem[];
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  isAdmin?: boolean; // Add isAdmin prop
}

export function StockDashboard({ items, onEdit, onDelete, isAdmin = false }: StockDashboardProps) {
  const getStatus = (item: StockItem) => {
    if (item.currentStock === 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    } else if (item.minStock && item.currentStock <= item.minStock) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="h-3 w-3" />
          Low Stock
        </Badge>
      );
    } else if (item.minStock && (item.currentStock / item.minStock) < 1.5) {
      return <Badge variant="secondary" className="text-xs whitespace-nowrap">Okay</Badge>;
    } else {
      return <Badge variant="success" className="text-xs whitespace-nowrap">Good</Badge>;
    }
  };

  const renderDetail = (icon: React.ElementType, value: string | number | undefined, label?: string, fullValue?: string) => {
      if (!value && value !== 0) return <span className="text-muted-foreground">-</span>;
      const Icon = icon;
      const displayValue = typeof value === 'string' && value.length > 20 ? `${value.substring(0, 17)}...` : value;
      const tooltipContent = fullValue || (typeof value === 'string' ? value : String(value));
      return (
         <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{displayValue}</span>
                  </span>
                </TooltipTrigger>
                {(label || (typeof value === 'string' && value.length > 20)) && ( // Show tooltip if labeled or truncated
                 <TooltipContent>{label ? `${label}: ` : ''}{tooltipContent}</TooltipContent>
                )}
            </Tooltip>
         </TooltipProvider>
      );
  }

   const renderPhoto = (item: StockItem) => {
      if (!item.photoUrl) return <span className="text-muted-foreground">-</span>;
      // Basic check if it's likely a data URI
      const isDataUri = item.photoUrl.startsWith('data:image');
      return (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex items-center justify-center cursor-pointer text-primary hover:underline">
                 <ImageIcon className="h-4 w-4" />
              </span>
            </TooltipTrigger>
            <TooltipContent className="p-0 border-none">
              <img
                src={item.photoUrl}
                alt={item.itemName}
                className="max-w-xs max-h-40 object-contain rounded"
                // Add AI hint only if it's likely *not* a data URI to avoid revealing potentially sensitive data
                data-ai-hint={!isDataUri ? "product image" : undefined}
               />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    const renderLocation = (item: StockItem) => {
     const textLocation = item.location || '-';
     const coordsLocation = item.locationCoords ? `GPS: ${item.locationCoords.latitude.toFixed(4)}, ${item.locationCoords.longitude.toFixed(4)}` : null;
     const displayLocation = item.location ? textLocation : (coordsLocation || '-');
     const Icon = item.locationCoords ? MapPinned : MapPin;
     const truncatedDisplayLocation = displayLocation.length > 20 ? `${displayLocation.substring(0, 17)}...` : displayLocation;

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
                   <div className="max-w-xs break-words">
                      {item.location && <div>Storage: {item.location}</div>}
                      {coordsLocation && <div>Coordinates: {coordsLocation.replace('GPS: ', '')}</div>}
                       {/* Display '-' only if both are missing */}
                      {!item.location && !coordsLocation && <div>-</div>}
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
            <TableHead className="w-[15%] min-w-[120px]">Item Name</TableHead>
             <TableHead className="hidden xl:table-cell text-center w-[50px]">Photo</TableHead>
             <TableHead className="hidden md:table-cell w-[10%] min-w-[80px]">Category</TableHead>
             <TableHead className="hidden lg:table-cell w-[10%] min-w-[80px]">Supplier</TableHead>
            <TableHead className="hidden sm:table-cell w-[15%] min-w-[100px]">Location</TableHead>
            <TableHead className="hidden lg:table-cell w-[10%] min-w-[80px]">Barcode</TableHead>
             <TableHead className="hidden xl:table-cell w-[15%] min-w-[100px]">Description</TableHead>
             {isAdmin && <TableHead className="hidden md:table-cell w-[10%] min-w-[80px]">Owner (User)</TableHead>} {/* Show Owner if Admin */}
            <TableHead className="text-right w-[70px]">Current</TableHead>
            <TableHead className="text-right w-[50px]">Min.</TableHead>
            <TableHead className="text-center w-[90px]">Status</TableHead>
            {/* Actions column always visible, but content depends on role */}
            <TableHead className="text-center w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 12 : 11} className="h-24 text-center text-muted-foreground">{/* Adjust colSpan based on isAdmin */}
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
                {isAdmin && <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{renderDetail(UserCircle, item.userId, 'User ID', item.userId)}</TableCell>} {/* Show Owner if Admin */}
                <TableCell className="text-right font-mono">{item.currentStock}</TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">{item.minStock ?? '-'}</TableCell>
                <TableCell className="text-center">{getStatus(item)}</TableCell>
                <TableCell className="text-center">
                   {/* Conditionally render actions based on isAdmin or ownership (assuming userId exists on item) */}
                  {/* For now, only admin can edit/delete any item. Non-admins can only edit/delete their own (handled in mutation logic) */}
                  {/* We show buttons for all owned items for non-admins, and all items for admins */}
                  {/* The actual permission is enforced in the mutation function */}
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
