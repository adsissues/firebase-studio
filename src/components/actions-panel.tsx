
"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, ScanBarcode, PlusCircle, MinusCircle, SearchIcon, Clock, Layers, RefreshCw } from 'lucide-react'; // Added Layers, RefreshCw
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
    
      
        
          Quick Actions
        
        
          {/* Search & Scan Buttons */}
          
            
              
               Photo Search
              
            
            
              
               Scan Item
              
            
             Batch Scan
           
          

           {/* Quick Action Templates Placeholder */}
           
             Action Templates (Coming Soon)
             
                Template: Regular Delivery
                Template: Transfer
             
         

        {/* Frequently Used Items (Optional Section) */}
        {frequentlyUsedItems.length > 0 && (
           
             Frequent Items
             
              
                
                 Search frequent items...
                 
              
             
             
                {filteredFrequentItems.map(item => (
                   
                     
                       {item.itemName} ({item.currentStock})
                     
                     
                        
                          
                        
                         
                           
                         
                        
                         
                           
                         
                        
                          
                        
                     
                   
                ))}
                 {filteredFrequentItems.length === 0 && searchTerm && (
                    No matching frequent items.
                )}
             
           
        )}
      
    
  );
}

    