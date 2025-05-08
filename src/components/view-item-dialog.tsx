
"use client";

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { StockItem } from '@/types';
import { Barcode, MapPin, Tag, Building, Info, Package, AlertTriangle, Circle, MapPinned, XCircle, ImageIcon, UserCircle, DollarSign, Clock, Hash, TrendingDown } from 'lucide-react'; // Added TrendingDown
import { useAuth } from '@/context/auth-context';
import { cn } from "@/lib/utils"; // Import cn utility

interface ViewItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
}

export function ViewItemDialog({ isOpen, onClose, item }: ViewItemDialogProps) {
    const { isAdmin } = useAuth();

  if (!item) {
    return null;
  }

  // Function returns a Badge component now
  const getStatusBadgeComponent = () => {
      const threshold = item.minimumStock ?? 10; // Assuming default threshold if not set
      if (item.currentStock === 0) return (
         <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2">
            <AlertTriangle className="mr-1 h-3 w-3" /> Out of Stock
         </Badge>
      );
      if (item.currentStock <= threshold) return (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2">
             <TrendingDown className="mr-1 h-3 w-3" /> Low Stock
          </Badge>
      );
      return (
         <Badge variant="secondary" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2">
            <Circle className="mr-1 h-3 w-3" /> Okay
         </Badge>
      );
  };

  const renderDetailRow = (label: string, value: string | number | undefined | null, icon?: React.ElementType, formatAsCurrency?: boolean) => {
    if (value === undefined || value === null || value === '') return null;
    const Icon = icon;
    let displayValue = String(value); // Ensure displayValue is a string
    if (formatAsCurrency && typeof value === 'number') {
        displayValue = `$${value.toFixed(2)}`; // Simple currency formatting
    } else if (label === "Lead Time (Days)" && typeof value === 'number') {
         displayValue = `${value} days`;
    }

    return (
       <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0">
         <Label className="text-sm text-muted-foreground col-span-1 flex items-center gap-1.5">
           {Icon && <Icon className="h-4 w-4" />} {label}
         </Label>
         <p className="text-sm col-span-2 break-words">{displayValue}</p>
       </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             Item Details: {item.itemName}
              {getStatusBadgeComponent()} {/* Call the function to render the badge */}
          </DialogTitle>
          <DialogDescription>
             Detailed information about the selected stock item.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-1 py-4">
             {/* Display Photo if available */}
             {item.photoUrl && (
               <div className="mb-4 flex justify-center">
                 <img
                   src={item.photoUrl}
                   alt={item.itemName}
                   className="max-w-full max-h-48 object-contain rounded-md border"
                   data-ai-hint="product image"
                 />
               </div>
             )}
            {renderDetailRow("Current Stock", item.currentStock, Package)}
            {renderDetailRow("Minimum Stock", item.minimumStock, AlertTriangle)}
            {renderDetailRow("Category", item.category, Tag)}
            {renderDetailRow("Supplier", item.supplier, Building)}
            {renderDetailRow("Barcode", item.barcode, Barcode)}
            {renderDetailRow("Batch Number", item.batchNumber, Hash)} {/* Added Batch Number */}
            {renderDetailRow("Storage Location", item.location, MapPin)}
            {item.locationCoords && renderDetailRow("GPS Coordinates", `Lat: ${item.locationCoords.latitude.toFixed(5)}, Lon: ${item.locationCoords.longitude.toFixed(5)}`, MapPinned)}
            {renderDetailRow("Description", item.description, Info)}
            {renderDetailRow("Cost Price", item.costPrice, DollarSign, true)} {/* Added Cost Price */}
            {renderDetailRow("Lead Time (Days)", item.leadTime, Clock)} {/* Added Lead Time */}
            {isAdmin && renderDetailRow("Owner User ID", item.userId, UserCircle)}
          </div>
        </ScrollArea>

        <DialogFooter>
          {/* Use DialogClose for the close button */}
          <DialogClose asChild>
            <Button variant="outline">
               <XCircle className="mr-2 h-4 w-4" />
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
