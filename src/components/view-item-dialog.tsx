
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
import { Barcode, MapPin, Tag, Building, Info, Package, AlertTriangle, Circle, MapPinned, XCircle, ImageIcon, UserCircle as UserIconLucide, TrendingDown, PoundSterling, Phone, Mail as MailIcon, Globe, Clock } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from 'date-fns'; 

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

  const getStatusBadgeComponent = () => {
      const threshold = item.minimumStock ?? 10; // Default to 10 if not set
      const effectiveMinThreshold = item.minimumStock ?? threshold; // Use item's min or global low as base
      const overstockPercentage = 200; // Default 200% - consider making this configurable or part of AdminSettings
      const overstockQtyThreshold = item.overstockThreshold ?? (effectiveMinThreshold * (overstockPercentage / 100));


      if (item.currentStock === 0) return (
         <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2">
            <AlertTriangle className="mr-1 h-3 w-3" /> Out of Stock
         </Badge>
      );
      if (item.currentStock <= effectiveMinThreshold) return (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2">
             <TrendingDown className="mr-1 h-3 w-3" /> Low Stock
          </Badge>
      );
      if (item.currentStock > overstockQtyThreshold && overstockQtyThreshold > 0) return (
        <Badge variant="default" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2 bg-yellow-500 text-black hover:bg-yellow-600">
             <AlertTriangle className="mr-1 h-3 w-3" /> Overstock
          </Badge>
      );

      return (
         <Badge variant="success" className="flex items-center gap-1 text-xs whitespace-nowrap ml-2 bg-green-600 hover:bg-green-700">
            <Circle className="mr-1 h-3 w-3 fill-current" /> Good
         </Badge>
      );
  };

  const renderDetailRow = (label: string, value: string | number | undefined | null, icon?: React.ElementType, formatAsCurrency?: boolean) => {
    if (value === undefined || value === null || String(value).trim() === '') return null;
    const Icon = icon;
    let displayValue = String(value);
     if (formatAsCurrency && typeof value === 'number') {
         displayValue = `£${value.toFixed(2)}`;
     }

    return (
       <div className="grid grid-cols-3 gap-2 py-2 border-b last:border-b-0 items-start">
         <Label className="text-sm text-muted-foreground col-span-1 flex items-center gap-1.5 pt-0.5">
           {Icon && <Icon className="h-4 w-4 flex-shrink-0" />} {label}
         </Label>
         <p className="text-sm col-span-2 break-words">{displayValue}</p>
       </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
             Item Details: {item.itemName}
              {getStatusBadgeComponent()}
          </DialogTitle>
          <DialogDescription>
             Detailed information about the selected stock item.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-1 py-4">
             {item.photoUrl && (
               <div className="mb-4 flex justify-center">
                 <img src={item.photoUrl} alt={item.itemName} className="max-w-full max-h-48 object-contain rounded-md border" data-ai-hint="product image" />
               </div>
             )}
            {renderDetailRow("Current Stock", item.currentStock, Package)}
            {renderDetailRow("Minimum Stock", item.minimumStock, AlertTriangle)}
            {renderDetailRow("Overstock Threshold", item.overstockThreshold, AlertTriangle)}
            {renderDetailRow("Cost Price", item.costPrice, PoundSterling, true)}
            {renderDetailRow("Category", item.category, Tag)}
            {renderDetailRow("Barcode", item.barcode, Barcode)}
            {renderDetailRow("Storage Location", item.location, MapPin)}
            {item.locationCoords && renderDetailRow("GPS Coordinates", `Lat: ${item.locationCoords.latitude.toFixed(5)}, Lon: ${item.locationCoords.longitude.toFixed(5)}`, MapPinned)}
            {item.description && renderDetailRow("Description", item.description, Info)}
            {isAdmin && item.userId && renderDetailRow("Owner User ID", item.userId, UserIconLucide)}
            {item.lastMovementDate && renderDetailRow("Last Movement", formatDistanceToNow(item.lastMovementDate.toDate(), { addSuffix: true }), Clock)}


            {(item.supplierName || item.supplierContactPerson || item.supplierPhone || item.supplierEmail || item.supplierWebsite || item.supplierAddress) && (
                 <div className="pt-3 mt-3 border-t">
                    <h4 className="text-md font-semibold mb-2 text-primary flex items-center gap-1.5"><Building className="h-5 w-5"/>Supplier Information</h4>
                    {renderDetailRow("Company Name", item.supplierName)}
                    {renderDetailRow("Contact Person", item.supplierContactPerson, UserIconLucide)}
                    {renderDetailRow("Phone", item.supplierPhone, Phone)}
                    {renderDetailRow("Email", item.supplierEmail, MailIcon)}
                    {renderDetailRow("Website", item.supplierWebsite, Globe)}
                    {renderDetailRow("Address", item.supplierAddress, MapPin)}
                 </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline"><XCircle className="mr-2 h-4 w-4" /> Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
