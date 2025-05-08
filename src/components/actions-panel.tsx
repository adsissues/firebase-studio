
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, ScanBarcode, PlusCircle, MinusCircle, SearchIcon, RefreshCw as RestockIcon } from 'lucide-react'; // Use RestockIcon alias
import type { StockItem } from '@/types';

interface ActionsPanelProps {
  onPhotoSearchClick: () => void;
  onAddStockClick: () => void;
  onStockOutClick: () => void;
  isLoading?: boolean;
  frequentlyUsedItems?: StockItem[];
  onQuickAction: (action: 'in' | 'out' | 'restock', item: StockItem) => void; // Added 'restock' action
}

export function ActionsPanel({
  onPhotoSearchClick,
  onAddStockClick, // Consider removing if Add/Out tabs are sufficient
  onStockOutClick, // Consider removing if Add/Out tabs are sufficient
  isLoading = false,
  frequentlyUsedItems = [],
  onQuickAction,
}: ActionsPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFrequentItems = frequentlyUsedItems.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode && item.barcode.includes(searchTerm))
  );

  return (
    <Card className="shadow-md flex-grow"> {/* Ensure card takes available space */}
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Scan Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2"> {/* Adjust columns if removing batch scan */}
          <Button
            variant="outline"
            onClick={onPhotoSearchClick}
            disabled={isLoading}
            className="flex-grow"
          >
            <Camera className="mr-2" /> Photo Search
          </Button>
          <Button
            variant="outline"
            disabled={isLoading}
            title="Scan Item (Coming Soon)"
            className="flex-grow"
          >
            <ScanBarcode className="mr-2" /> Scan Item
          </Button>
           {/* Batch Scan button removed */}
        </div>

         {/* Action Templates section removed */}


        {/* Frequently Used Items (Optional Section) */}
        {frequentlyUsedItems && frequentlyUsedItems.length > 0 && (
           <div className="space-y-2 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Frequent Items</h4>
              <div className="relative">
                <SearchIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search frequent items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 text-sm h-8"
                  />
             </div>

             <ScrollArea className="h-40"> {/* Limit height and make scrollable */}
                {filteredFrequentItems.map(item => (
                   <div key={item.id} className="flex items-center justify-between py-1 px-1 hover:bg-accent rounded-md">
                     <span className="text-sm truncate">{item.itemName} ({item.currentStock})</span>
                     <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickAction('in', item)} disabled={isLoading} title={`Add 1 ${item.itemName}`}>
                            <PlusCircle className="h-4 w-4 text-success" />
                         </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickAction('out', item)} disabled={isLoading || item.currentStock <= 0} title={`Remove 1 ${item.itemName}`}>
                            <MinusCircle className="h-4 w-4 text-destructive" />
                         </Button>
                         {/* Use RestockIcon for restock action */}
                         <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onQuickAction('restock', item)} disabled={isLoading} title={`Restock ${item.itemName}`}>
                             <RestockIcon className="h-4 w-4 text-blue-500" />
                         </Button>
                     </div>
                   </div>
                ))}
                 {filteredFrequentItems.length === 0 && searchTerm && (
                    <p className="text-xs text-muted-foreground text-center py-2">No matching frequent items.</p>
                )}
             </ScrollArea>
           </div>
        )}
      </CardContent>
    </Card>
  );
}
