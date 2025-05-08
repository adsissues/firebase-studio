
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
import { Barcode, MapPin, Tag, Building, Info, Package, AlertTriangle, Circle, MapPinned, XCircle, ImageIcon, UserCircle } from 'lucide-react'; // Import icons
import { useAuth } from '@/context/auth-context'; // To show owner if admin

interface ViewItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: StockItem | null;
}

export function ViewItemDialog({ isOpen, onClose, item }: ViewItemDialogProps) {
    const { isAdmin } = useAuth(); // Use auth context to check admin status

  if (!item) {
    return null; // Don't render if no item is provided
  }

  const getStatusBadge = () => {
      // Use a default threshold if admin settings aren't available here, or pass it as a prop
      const threshold = item.minimumStock ?? 10; // Example: Default threshold 10
      if (item.currentStock === 0) return <Badge variant="destructive" className="ml-2"><AlertTriangle className="mr-1 h-3 w-3"/> Out of Stock</Badge>;
      if (item.currentStock <= threshold) return <Badge variant="destructive" className="ml-2"><AlertTriangle className="mr-1 h-3 w-3"/> Low Stock</Badge>;
      return <Badge variant="secondary" className="ml-2"><Circle className="mr-1 h-3 w-3"/> Okay</Badge>;
  };

  const renderDetailRow = (label: string, value: string | number | undefined | null, icon?: React.ElementType) => {
    if (value === undefined || value === null || value === '') return null; // Don't render row if value is empty
    const Icon = icon;
    return (
      <div className="grid grid-cols-3 gap-2 items-center py-2 border-b border-border/50 last:border-b-0">
        <Label className="text-muted-foreground font-medium col-span-1 flex items-center">
          {Icon && <Icon className="mr-2 h-4 w-4 text-primary" />} {label}
        </Label>
        <div className="col-span-2 text-sm">{value}</div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            Item Details: {item.itemName}
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            Detailed information about the selected stock item.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] p-1">
          <div className="grid gap-2 py-4 pr-4">
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
            {renderDetailRow("Storage Location", item.location, MapPin)}
            {item.locationCoords && renderDetailRow("GPS Coordinates", `Lat: ${item.locationCoords.latitude.toFixed(5)}, Lon: ${item.locationCoords.longitude.toFixed(5)}`, MapPinned)}
            {renderDetailRow("Description", item.description, Info)}
            {isAdmin && renderDetailRow("Owner User ID", item.userId, UserCircle)}
            {/* Add more fields as needed */}
          </div>
        </ScrollArea>

        <DialogFooter className="sm:justify-end pt-4 border-t">
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              <XCircle className="mr-2 h-4 w-4" /> Close
            </Button>
          </DialogClose>
          {/* Optionally add an Edit button here */}
          {/* <Button type="button" onClick={() => { onEdit(item); onClose(); }}> <Pencil className="mr-2 h-4 w-4"/> Edit </Button> */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
