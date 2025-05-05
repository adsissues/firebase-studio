'use client'; // Mark this as a Client Component

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { StockOutForm, type StockOutFormData } from '@/components/stock-out-form';
import { AddItemForm, type AddItemFormData } from '@/components/add-item-form'; // Import AddItemForm
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components
import type { StockItem } from '@/types';
import { useState, useEffect } from 'react'; // Import useState and useEffect
import { useToast } from "@/hooks/use-toast"; // Import useToast

// Mock Data - Replace with actual data fetching later
const initialStockItems: StockItem[] = [
  { id: 'item-1', itemName: 'Blue Widget', currentStock: 15, minStock: 5, barcode: '111', location: 'A1' },
  { id: 'item-2', itemName: 'Red Gadget', currentStock: 3, minStock: 10, barcode: '222', location: 'B2' },
  { id: 'item-3', itemName: 'Green Gizmo', currentStock: 50, minStock: 20, barcode: '333', location: 'C3' },
  { id: 'item-4', itemName: 'Yellow Thingamajig', currentStock: 8, minStock: 8, barcode: '444', location: 'A1' },
];

export default function Home() {
  // State for stock items - initialized to prevent hydration issues
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast(); // Initialize toast

  // Load initial data on the client side after hydration
  useEffect(() => {
    // Simulate fetching data
    setStockItems(initialStockItems);
  }, []);


  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStockOutSubmit = (data: StockOutFormData) => {
    setStockItems((prevItems) =>
      prevItems.map((item) =>
        item.id === data.itemId
          ? { ...item, currentStock: Math.max(0, item.currentStock - data.quantity) } // Ensure stock doesn't go below 0
          : item
      )
    );
    const updatedItem = stockItems.find(item => item.id === data.itemId);
    console.log('Submitting Stock Out Data:', data);
    toast({
       variant: "default", // Use default variant for success
       title: "Stock Updated",
       description: `${data.quantity} units of ${updatedItem?.itemName || 'item'} removed.`,
     });
  };

  const handleAddItemSubmit = (data: AddItemFormData) => {
      const newItem: StockItem = {
          // Simple ID generation for demo - use UUID in real app
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          itemName: data.itemName,
          currentStock: data.currentStock,
          minStock: data.minStock,
          barcode: data.barcode || undefined, // Handle optional field
          location: data.location || undefined, // Handle optional field
      };
      setStockItems((prevItems) => [...prevItems, newItem]);
      console.log('Adding New Item:', newItem);
      toast({
        variant: "default", // Use default variant for success
        title: "Item Added",
        description: `${newItem.itemName} added to stock.`,
      });
  };


  // Filter items based on search query
  const filteredItems = stockItems.filter((item) =>
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">StockWatch</h1>
        <p className="text-muted-foreground">Your Stock Management Dashboard</p>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Search and Dashboard */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="shadow-md">
             <CardHeader>
               <CardTitle>Stock Levels</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <ItemSearch
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                  />
                <StockDashboard items={filteredItems} />
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Action Forms (Stock Out / Add Item) */}
        <div className="lg:col-span-1">
           <Tabs defaultValue="stock-out" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stock-out">Stock Out</TabsTrigger>
                <TabsTrigger value="add-item">Add Item</TabsTrigger>
              </TabsList>
              <TabsContent value="stock-out">
                 <Card className="shadow-md">
                   <CardContent className="p-0 pt-6"> {/* Adjust padding */}
                     <StockOutForm items={stockItems} onSubmit={handleStockOutSubmit} />
                   </CardContent>
                 </Card>
              </TabsContent>
              <TabsContent value="add-item">
                 <Card className="shadow-md">
                    <CardContent className="p-0 pt-6"> {/* Adjust padding */}
                      <AddItemForm onSubmit={handleAddItemSubmit} />
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
