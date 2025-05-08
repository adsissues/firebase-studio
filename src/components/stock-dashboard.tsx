
"use client";

import * as React from 'react';
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
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned, Pencil, Trash2, UserCircle, TrendingDown, Circle, Eye } from 'lucide-react'; // Added Eye icon
import { useAuth } from '@/context/auth-context';
import { cn } from "@/lib/utils";

interface StockDashboardProps {
  items: StockItem[];
  onView: (item: StockItem) => void; // Added onView prop
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  isAdmin?: boolean;
  globalLowStockThreshold: number;
}

// Helper function to determine the status priority for sorting
const getItemStatusPriority = (item: StockItem, threshold: number): number => {
    const effectiveThreshold = item.minimumStock !== undefined ? item.minimumStock : threshold;
    const { currentStock } = item;

    if (currentStock > 0 && currentStock <= effectiveThreshold) {
      return 1; // Low Stock - Highest priority
    } else if (currentStock === 0) {
      return 3; // Out of Stock - Lowest priority
    } else {
      return 2; // Okay - Middle priority
    }
};


export function StockDashboard({ items, onView, onEdit, onDelete, isAdmin = false, globalLowStockThreshold }: StockDashboardProps) {
  const { user } = useAuth();

  const getStatusBadge = (item: StockItem) => {
    const effectiveThreshold = item.minimumStock !== undefined ? item.minimumStock : globalLowStockThreshold;
    const { currentStock } = item;

    if (currentStock === 0) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Out of Stock
        </Badge>
      );
    } else if (currentStock <= effectiveThreshold) {
       return (
         <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap">
           <TrendingDown className="mr-1 h-3 w-3" />
           Low Stock
         </Badge>
       );
     }
    else {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs whitespace-nowrap">
           <Circle className="mr-1 h-3 w-3" />
           Okay
         </Badge>
       );
    }
  };


  const renderDetail = (icon: React.ElementType, value: string | number | undefined | null, label?: string, fullValue?: string) => {
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
                {(label || (typeof value === 'string' && value.length > 20)) && (
                 <TooltipContent>{label ? `${label}: ` : ''}{tooltipContent}</TooltipContent>
                )}
            </Tooltip>
         </TooltipProvider>
      );
  }

   const renderPhoto = (item: StockItem) => {
      if (!item.photoUrl) return <span className="text-muted-foreground">-</span>;
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
                      {!item.location && !coordsLocation && <div>-</div>}
                   </div>
               </TooltipContent>
           </Tooltip>
        </TooltipProvider>
     );
    };

  const canPerformAction = (item: StockItem) => {
    if (!user) return false;
    if (isAdmin) return true;
    return item.userId === user.uid;
  };

  // Sort items: Low Stock first, then Okay, then Out of Stock
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const priorityA = getItemStatusPriority(a, globalLowStockThreshold);
      const priorityB = getItemStatusPriority(b, globalLowStockThreshold);
      return priorityA - priorityB; // Sorts in ascending order (1, 2, 3)
    });
  }, [items, globalLowStockThreshold]);


  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption key="caption" className="py-4">Overview of current stock levels.</TableCaption>
        <TableHeader key="header">
          <TableRow>
            {[
              <TableHead key="name" className="w-[15%] min-w-[120px]">Item Name</TableHead>,
              <TableHead key="photo" className="hidden xl:table-cell text-center w-[50px]">Photo</TableHead>,
              <TableHead key="category" className="hidden md:table-cell w-[10%] min-w-[80px]">Category</TableHead>,
              <TableHead key="supplier" className="hidden lg:table-cell w-[10%] min-w-[80px]">Supplier</TableHead>,
              <TableHead key="location" className="hidden sm:table-cell w-[15%] min-w-[100px]">Location</TableHead>,
              <TableHead key="barcode" className="hidden lg:table-cell w-[10%] min-w-[80px]">Barcode</TableHead>,
              <TableHead key="desc" className="hidden xl:table-cell w-[15%] min-w-[100px]">Description</TableHead>,
              isAdmin && <TableHead key="owner" className="hidden md:table-cell w-[10%] min-w-[80px]">Owner (User)</TableHead>,
              <TableHead key="current" className="text-right w-[70px]">Current</TableHead>,
              <TableHead key="min" className="text-right w-[50px]">Min.</TableHead>,
              <TableHead key="status" className="text-center w-[90px]">Status</TableHead>,
              <TableHead key="actions" className="text-center w-[120px]">Actions</TableHead> // Adjusted width for 3 icons
            ].filter(Boolean)}
          </TableRow>
        </TableHeader>
        <TableBody key="body">
          {sortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 12 : 11} className="h-24 text-center text-muted-foreground">
                No stock items found matching your search.
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item) => {
                const statusPriority = getItemStatusPriority(item, globalLowStockThreshold);
                const isLowStock = statusPriority === 1;
                const isOutOfStock = statusPriority === 3;

               return (
                 <TableRow
                    key={item.id}
                    className={cn(
                         isLowStock ? 'bg-destructive/10 hover:bg-destructive/20' : '',
                         isOutOfStock ? 'bg-destructive/20 hover:bg-destructive/30 opacity-70' : ''
                    )}
                  >
                    {[
                      <TableCell key="name" className="font-medium">{item.itemName}</TableCell>,
                      <TableCell key="photo" className="hidden xl:table-cell text-center">{renderPhoto(item)}</TableCell>,
                      <TableCell key="category" className="hidden md:table-cell text-muted-foreground text-xs">{renderDetail(Tag, item.category, 'Category')}</TableCell>,
                      <TableCell key="supplier" className="hidden lg:table-cell text-muted-foreground text-xs">{renderDetail(Building, item.supplier, 'Supplier')}</TableCell>,
                      <TableCell key="location" className="hidden sm:table-cell text-muted-foreground text-xs">{renderLocation(item)}</TableCell>,
                      <TableCell key="barcode" className="hidden lg:table-cell text-muted-foreground text-xs">{renderDetail(Barcode, item.barcode, 'Barcode')}</TableCell>,
                      <TableCell key="desc" className="hidden xl:table-cell text-muted-foreground text-xs">{renderDetail(Info, item.description, 'Description')}</TableCell>,
                      isAdmin && <TableCell key="owner" className="hidden md:table-cell text-muted-foreground text-xs">{renderDetail(UserCircle, item.userId, 'User ID', item.userId)}</TableCell>,
                      <TableCell key="current" className="text-right font-mono">{item.currentStock}</TableCell>,
                      <TableCell key="min" className="text-right font-mono text-muted-foreground">{item.minimumStock ?? '-'}</TableCell>,
                      <TableCell key="status" className="text-center">{getStatusBadge(item)}</TableCell>,
                      <TableCell key="actions" className="text-center">
                        {canPerformAction(item) ? (
                          <div className="flex justify-center gap-1">
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => onView(item)}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">View {item.itemName}</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Item Details</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                    ].filter(Boolean)}
                  </TableRow>
               );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
