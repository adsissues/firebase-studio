
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
import { Barcode, MapPin, Tag, Building, Info, Package, AlertTriangle, Circle, MapPinned, XCircle, ImageIcon, UserCircle, DollarSign, Clock, Hash } from 'lucide-react'; // Added new icons
import { useAuth } from '@/context/auth-context';

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

  const getStatusBadge = () => {
      const threshold = item.minimumStock ?? 10;
      if (item.currentStock === 0) return  Out of Stock;
      if (item.currentStock <= threshold) return  Low Stock;
      return  Okay;
  };

  const renderDetailRow = (label: string, value: string | number | undefined | null, icon?: React.ElementType, formatAsCurrency?: boolean) => {
    if (value === undefined || value === null || value === '') return null;
    const Icon = icon;
    let displayValue = value;
    if (formatAsCurrency && typeof value === 'number') {
        displayValue = `$${value.toFixed(2)}`; // Simple currency formatting
    } else if (label === "Lead Time (Days)" && typeof value === 'number') {
         displayValue = `${value} days`;
    }

    return (
       
         
           
              {Icon &&  {label}}
           
           {displayValue}
         
       
    );
  };

  return (
    
      
        
          
            
              Item Details: {item.itemName}
              {getStatusBadge()}
            
             Detailed information about the selected stock item.
          
        

        
          
             {/* Display Photo if available */}
             {item.photoUrl && (
               
                 
                   alt={item.itemName}
                   className="max-w-full max-h-48 object-contain rounded-md border"
                   data-ai-hint="product image"
                 />
               
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
          
        

        

            
              
                
                  Close
                
              
          
        
      
    
  );
}

