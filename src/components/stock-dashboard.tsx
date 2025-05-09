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
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned, Pencil, Trash2, UserCircle, TrendingDown, Circle, Eye,ShoppingCart } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from "@/lib/utils";

interface StockDashboardProps {
  items: StockItem[];
  onView: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  isAdmin?: boolean;
  globalLowStockThreshold: number;
}

// Helper function to determine the status priority for sorting and styling
const getItemStatusInfo = (item: StockItem, threshold: number): { priority: number; label: string; variant: 'default' | 'secondary' | 'destructive' | 'success', icon: React.ElementType, rowClass?: string } => {
    const effectiveThreshold = item.minimumStock !== undefined ? item.minimumStock : threshold;
    const { currentStock } = item;

    if (currentStock === 0) {
      return { priority: 1, label: "Out of Stock", variant: "destructive", icon: AlertTriangle, rowClass: "bg-destructive/20 hover:bg-destructive/30 opacity-80" }; // Highest priority, most critical
    } else if (currentStock <= effectiveThreshold) {
      return { priority: 2, label: "Low Stock", variant: "destructive", icon: TrendingDown, rowClass: "bg-destructive/10 hover:bg-destructive/20" }; // Second highest
    } else if (currentStock <= effectiveThreshold * 1.5) { // Example: "Getting Low" if within 150% of threshold
      return { priority: 3, label: "Getting Low", variant: "default", icon: Circle, rowClass: "bg-yellow-500/10 dark:bg-yellow-700/20 hover:bg-yellow-500/20 dark:hover:bg-yellow-700/30" }; // Middle priority
    } else {
      return { priority: 4, label: "Good", variant: "success", icon: Circle, rowClass: "" }; // Lowest priority (good stock)
    }
};


export function StockDashboard({ items, onView, onEdit, onDelete, isAdmin = false, globalLowStockThreshold }: StockDashboardProps) {
  const { user } = useAuth();

  const getStatusBadge = (item: StockItem) => {
    const statusInfo = getItemStatusInfo(item, globalLowStockThreshold);
    return (
        <Badge variant={statusInfo.variant} className="flex items-center gap-1 text-xs whitespace-nowrap">
          <statusInfo.icon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
    );
  };


  const renderDetail = (icon: React.ElementType, value: string | number | undefined | null, label?: string, fullValue?: string) => {
      if (!value && value !== 0) return <span className="text-muted-foreground">-</span>;
      const IconComponent = icon;
      const displayValue = typeof value === 'string' && value.length > 20 ? `${value.substring(0, 17)}...` : value;
      const tooltipContent = fullValue || (typeof value === 'string' ? value : String(value));
      return (
         <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <span className="flex items-center gap-1 cursor-default">
                    <IconComponent className="h-3 w-3 text-muted-foreground flex-shrink-0" />
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
     const IconComponent = item.locationCoords ? MapPinned : MapPin;
     const truncatedDisplayLocation = displayLocation.length > 20 ? `${displayLocation.substring(0, 17)}...` : displayLocation;

     return (
        <TooltipProvider delayDuration={100}>
           <Tooltip>
               <TooltipTrigger asChild>
                 <span className="flex items-center gap-1 cursor-default">
                   <IconComponent className="h-3 w-3 text-muted-foreground flex-shrink-0" />
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

  const handleReorderClick = (item: StockItem) => {
    // In a real app, this would open a pre-filled reorder form or trigger an API call
    console.log(`TODO: Initiate reorder for item: ${item.itemName} (ID: ${item.id})`);
    alert(`Reorder button clicked for ${item.itemName}.\nCheck console for details. This would normally open a reorder form or send a request.`);
  };

  // Sort items: Out of Stock, Low Stock, Getting Low, then Okay
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const statusA = getItemStatusInfo(a, globalLowStockThreshold);
      const statusB = getItemStatusInfo(b, globalLowStockThreshold);
      return statusA.priority - statusB.priority;
    });
  }, [items, globalLowStockThreshold]);


  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption key="caption" className="py-4">Overview of current stock levels. Low stock items are highlighted.</TableCaption>
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
              <TableHead key="status" className="text-center w-[110px]">Status</TableHead>, // Increased width for new badge
              <TableHead key="actions" className="text-center w-[150px]">Actions</TableHead> // Adjusted width for 4 icons
            ].filter(Boolean)}
          </TableRow>
        </TableHeader>
        <TableBody key="body">
          {sortedItems.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 12 : 11} className="h-24 text-center text-muted-foreground">
                No stock items found matching your search or filters.
              </TableCell>
            </TableRow>
          ) : (
            sortedItems.map((item) => {
                const statusInfo = getItemStatusInfo(item, globalLowStockThreshold);

               return (
                 <TableRow
                    key={item.id}
                    className={cn(statusInfo.rowClass)}
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => handleReorderClick(item)}>
                                        <ShoppingCart className="h-4 w-4" />
                                        <span className="sr-only">Reorder {item.itemName}</span>
                                    </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Reorder Item (Placeholder)</TooltipContent>
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
