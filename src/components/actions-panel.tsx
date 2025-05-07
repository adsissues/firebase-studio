
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, ScanBarcode, PlusCircle, MinusCircle, SearchIcon, Clock } from 'lucide-react';
import type { StockItem } from '@/types'; // Assuming you have StockItem type defined

interface ActionsPanelProps {
  onPhotoSearchClick: () => void;
  onAddStockClick: () => void; // Or handle directly
  onStockOutClick: () => void; // Or handle directly
  isLoading?: boolean;
  frequentlyUsedItems?: StockItem[]; // Optional: Pass frequently used items
  onQuickAction: (action: 'in' | 'out', item: StockItem) => void; // Callback for quick +1/-1
}

export function ActionsPanel({
  onPhotoSearchClick,
  onAddStockClick,
  onStockOutClick,
  isLoading = false,
  frequentlyUsedItems = [],
  onQuickAction,
}: ActionsPanelProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  // This search is just for the "Frequent Items" list within this panel
  const filteredFrequentItems = frequentlyUsedItems.filter(item =>
    item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.barcode && item.barcode.includes(searchTerm))
  );

  return (
    <Card className="shadow-lg rounded-xl">
      <CardHeader className="border-b p-4">
        <CardTitle className="text-xl text-primary">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Search & Scan Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onPhotoSearchClick}
            disabled={isLoading}
            className="flex-1"
            aria-label="Search by Photo"
          >
            <Camera className="mr-2 h-4 w-4" /> Photo
          </Button>
          <Button
            variant="outline"
            // onClick={onBarcodeScanClick} // Assuming you have a barcode scan function trigger
            disabled={isLoading}
             className="flex-1"
            aria-label="Scan Barcode"
          >
            <ScanBarcode className="mr-2 h-4 w-4" /> Scan
          </Button>
        </div>

        {/* Main Action Buttons (Consider if needed if tabs below handle this) */}
        {/* <div className="flex gap-2">
           <Button onClick={onAddStockClick} disabled={isLoading} className="flex-1 bg-success hover:bg-success/90">
               <PlusCircle className="mr-2 h-4 w-4" /> Stock In
           </Button>
            <Button onClick={onStockOutClick} disabled={isLoading} className="flex-1 bg-destructive hover:bg-destructive/90">
                <MinusCircle className="mr-2 h-4 w-4" /> Stock Out
            </Button>
        </div> */}

        {/* Frequently Used Items (Optional Section) */}
        {frequentlyUsedItems.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Frequent Items</h4>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search frequent items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 text-xs h-8"
                disabled={isLoading}
              />
            </div>
            <ScrollArea className="h-[150px] pr-3">
              <ul className="space-y-1">
                {filteredFrequentItems.map(item => (
                  <li key={item.id} className="flex items-center justify-between text-xs p-1 rounded hover:bg-muted">
                    <span className="truncate pr-2">{item.itemName} ({item.currentStock})</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-success hover:text-success"
                        onClick={() => onQuickAction('in', item)}
                        disabled={isLoading}
                        aria-label={`Quick add 1 ${item.itemName}`}
                       >
                        <PlusCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:text-destructive"
                        onClick={() => onQuickAction('out', item)}
                         disabled={isLoading || item.currentStock <= 0}
                        aria-label={`Quick remove 1 ${item.itemName}`}
                       >
                        <MinusCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
                 {filteredFrequentItems.length === 0 && searchTerm && (
                    <p className="text-center text-xs text-muted-foreground py-2">No matching frequent items.</p>
                )}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

    