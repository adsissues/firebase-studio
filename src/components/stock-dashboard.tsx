
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
import type { StockItem, AdminSettings } from '@/types'; // Import AdminSettings
import { AlertTriangle, MapPin, Barcode, Tag, Building, Info, Image as ImageIcon, MapPinned, Pencil, Trash2, UserCircle, TrendingDown, Circle, Eye, ShoppingCart, Phone, Mail as MailIcon, Activity, RotateCcw } from 'lucide-react'; // Added RotateCcw for Inactive
import { useAuth } from '@/context/auth-context';
import { cn } from "@/lib/utils";


// Define status info structure to include icon and rowClass
interface StatusInfo {
    priority: number;
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'inactive'; // Add new variants
    icon: React.ElementType;
    rowClass?: string;
    textColor?: string; // Optional: for specific text color on badge
}


export const getItemStatusInfo = (item: StockItem, globalLowStockThreshold: number, adminSettings?: Partial<AdminSettings>): StatusInfo => {
    const effectiveMinThreshold = item.minimumStock ?? globalLowStockThreshold;
    const { currentStock, lastMovementDate } = item;

    if (adminSettings?.inactivityAlertDays && lastMovementDate) {
        const daysSinceMovement = (new Date().getTime() - (lastMovementDate.toDate?.() ?? new Date(0)).getTime()) / (1000 * 3600 * 24);
        if (daysSinceMovement > adminSettings.inactivityAlertDays) {
             return { priority: 0, label: "Inactive", variant: "inactive", icon: Activity, rowClass: "bg-inactive/10 hover:bg-inactive/20", textColor: "text-inactive-foreground" };
        }
    }

    if (currentStock === 0) {
      return { priority: 1, label: "Out of Stock", variant: "destructive", icon: AlertTriangle, rowClass: "bg-destructive/20 hover:bg-destructive/30 opacity-80", textColor: "text-destructive-foreground" };
    }
    
    const overstockPercentage = adminSettings?.overstockThresholdPercentage ?? 200;
    const overstockQtyThreshold = item.overstockThreshold ?? (effectiveMinThreshold * (overstockPercentage / 100));

    if (currentStock > overstockQtyThreshold && overstockQtyThreshold > 0) {
         return { priority: 2, label: "Overstock", variant: "info", icon: TrendingDown, rowClass: "bg-info/10 hover:bg-info/20", textColor: "text-info-foreground" };
    }

    if (currentStock <= effectiveMinThreshold) {
      return { priority: 3, label: "Low Stock", variant: "destructive", icon: AlertTriangle, rowClass: "bg-destructive/10 hover:bg-destructive/20", textColor: "text-destructive-foreground" };
    }
    
    // Optional "Getting Low" state
    if (currentStock <= effectiveMinThreshold * 1.5) { // Example: 1.5x the min threshold
      return { priority: 4, label: "Getting Low", variant: "warning", icon: AlertTriangle, rowClass: "bg-warning/10 hover:bg-warning/20", textColor: "text-warning-foreground" };
    }

    return { priority: 5, label: "Good", variant: "success", icon: Circle, rowClass: "", textColor: "text-success-foreground" };
};


interface StockDashboardProps {
  items: StockItem[];
  onView: (item: StockItem) => void;
  onEdit: (item: StockItem) => void;
  onDelete: (item: StockItem) => void;
  onReorder: (item: StockItem) => void;
  isAdmin?: boolean;
  globalLowStockThreshold: number;
  adminSettings: AdminSettings; // Pass full admin settings
}


export function StockDashboard({ items, onView, onEdit, onDelete, onReorder, isAdmin = false, globalLowStockThreshold, adminSettings }: StockDashboardProps) {
  const { user } = useAuth();

  const getStatusBadge = (item: StockItem) => {
    const statusInfo = getItemStatusInfo(item, globalLowStockThreshold, adminSettings);
    return (
        <Badge variant={statusInfo.variant} className={cn("flex items-center gap-1 text-xs whitespace-nowrap", statusInfo.textColor)}>
          <statusInfo.icon className="mr-1 h-3 w-3" />
          {statusInfo.label}
        </Badge>
    );
  };


  const renderDetail = (icon: React.ElementType, value: string | number | undefined | null, label?: string, fullValue?: string) => {
      if (!value && value !== 0) return <span className="text-muted-foreground">-</span>;
      const IconComponent = icon;
      const displayValue = typeof value === 'string' && value.length > 15 ? `${value.substring(0, 12)}...` : value;
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
                {(label || (typeof value === 'string' && value.length > 15)) && (
                 <TooltipContent><div className="max-w-xs break-words">{label ? `${label}: ` : ''}{tooltipContent}</div></TooltipContent>
                )}
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
              <span className="flex items-center justify-center cursor-pointer text-primary hover:underline"><ImageIcon className="h-4 w-4" /></span>
            </TooltipTrigger>
            <TooltipContent className="p-0 border-none"><img src={item.photoUrl} alt={item.itemName} className="max-w-xs max-h-40 object-contain rounded" data-ai-hint="product image" /></TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    };

    const renderLocation = (item: StockItem) => {
     const textLocation = item.location || '-';
     const coordsLocation = item.locationCoords ? `GPS: ${item.locationCoords.latitude.toFixed(4)}, ${item.locationCoords.longitude.toFixed(4)}` : null;
     const displayLocation = item.location ? textLocation : (coordsLocation || '-');
     const IconComponent = item.locationCoords ? MapPinned : MapPin;
     const truncatedDisplayLocation = displayLocation.length > 15 ? `${displayLocation.substring(0, 12)}...` : displayLocation;
     return (
        <TooltipProvider delayDuration={100}>
           <Tooltip>
               <TooltipTrigger asChild><span className="flex items-center gap-1 cursor-default"><IconComponent className="h-3 w-3 text-muted-foreground flex-shrink-0" /><span className="truncate">{truncatedDisplayLocation}</span></span></TooltipTrigger>
                <TooltipContent><div className="max-w-xs break-words">{item.location && <div>Storage: {item.location}</div>}{coordsLocation && <div>Coordinates: {coordsLocation.replace('GPS: ', '')}</div>}{!item.location && !coordsLocation && <div>-</div>}</div></TooltipContent>
           </Tooltip>
        </TooltipProvider>
     );
    };

  const canPerformAction = (item: StockItem) => {
    if (!user) return false;
    if (isAdmin) return true;
    return item.userId === user.uid;
  };

  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const statusA = getItemStatusInfo(a, globalLowStockThreshold, adminSettings);
      const statusB = getItemStatusInfo(b, globalLowStockThreshold, adminSettings);
      if (statusA.priority !== statusB.priority) {
        return statusA.priority - statusB.priority;
      }
      // Optional: secondary sort by name if priorities are equal
      return a.itemName.localeCompare(b.itemName);
    });
  }, [items, globalLowStockThreshold, adminSettings]);


  return (
    <div className="rounded-lg border shadow-sm overflow-hidden">
      <Table>
        <TableCaption>
          {isAdmin ? "Overview of current stock levels. Critical items are highlighted." : "Inventory listing. Contact an admin to modify items you don't own."}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[12%] min-w-[100px]">Item</TableHead>
            <TableHead className="hidden xl:table-cell text-center w-[40px]">Photo</TableHead>
            <TableHead className="hidden md:table-cell w-[8%] min-w-[70px]">Category</TableHead>
            <TableHead className="hidden md:table-cell w-[15%] min-w-[120px]">Supplier</TableHead>
            <TableHead className="hidden sm:table-cell w-[12%] min-w-[90px]">Location</TableHead>
            {isAdmin && <TableHead className="hidden lg:table-cell w-[8%] min-w-[70px]">Owner</TableHead>}
            <TableHead className="text-right w-[50px]">Qty</TableHead>
            <TableHead className="text-right w-[40px]">Min</TableHead>
            <TableHead className="text-center w-[100px]">Status</TableHead>
            <TableHead className="text-center w-[120px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.length === 0 ? (
            <TableRow><TableCell colSpan={isAdmin ? 10 : 9} className="h-24 text-center text-muted-foreground">No stock items found.</TableCell></TableRow>
          ) : (
            sortedItems.map((item) => {
                const statusInfo = getItemStatusInfo(item, globalLowStockThreshold, adminSettings);
                const itemIsEditable = canPerformAction(item);
               return (
                 <TableRow key={item.id} className={cn(statusInfo.rowClass)}>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell className="hidden xl:table-cell text-center">{renderPhoto(item)}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">{renderDetail(Tag, item.category, 'Category')}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                          {item.supplierName ? (
                              <TooltipProvider delayDuration={100}>
                                  <Tooltip>
                                      <TooltipTrigger asChild><span className="flex items-center gap-1 cursor-default"><Building className="h-3 w-3 text-muted-foreground flex-shrink-0" /><span className="truncate">{item.supplierName}</span></span></TooltipTrigger>
                                      <TooltipContent><div className="text-xs">
                                          {item.supplierContactPerson && <p>Contact: {item.supplierContactPerson}</p>}
                                          {item.supplierPhone && <p className="flex items-center gap-1"><Phone className="h-3 w-3"/> {item.supplierPhone}</p>}
                                          {item.supplierEmail && <p className="flex items-center gap-1"><MailIcon className="h-3 w-3"/> {item.supplierEmail}</p>}
                                      </div></TooltipContent>
                                  </Tooltip>
                              </TooltipProvider>
                          ) : (item.supplier ? renderDetail(Building, item.supplier, 'Supplier (Legacy)') : <span className="text-muted-foreground">-</span>)}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{renderLocation(item)}</TableCell>
                    {isAdmin && <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{renderDetail(UserCircle, item.userId ? item.userId.substring(0,8)+'...' : 'N/A', 'User ID', item.userId)}</TableCell>}
                    <TableCell className="text-right font-mono">{item.currentStock}</TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{item.minimumStock ?? '-'}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(item)}</TableCell>
                    <TableCell className="text-center">
                        <div className="flex justify-center gap-0.5">
                            <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:text-blue-700" onClick={() => onView(item)}><Eye className="h-4 w-4" /><span className="sr-only">View</span></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip></TooltipProvider>
                            {itemIsEditable && <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(item)}><Pencil className="h-4 w-4" /><span className="sr-only">Edit</span></Button></TooltipTrigger><TooltipContent>Edit</TooltipContent></Tooltip></TooltipProvider>}
                            {itemIsEditable && (statusInfo.priority <= 3 && (item.supplierName || item.supplierEmail || item.supplierPhone)) &&
                                <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-green-600 hover:text-green-700" onClick={() => onReorder(item)}><ShoppingCart className="h-4 w-4" /><span className="sr-only">Reorder</span></Button></TooltipTrigger><TooltipContent>Reorder/Contact Supplier</TooltipContent></Tooltip></TooltipProvider>
                            }
                            {itemIsEditable && <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(item)}><Trash2 className="h-4 w-4" /><span className="sr-only">Delete</span></Button></TooltipTrigger><TooltipContent>Delete</TooltipContent></Tooltip></TooltipProvider>}
                        </div>
                    </TableCell>
                  </TableRow>
               );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
