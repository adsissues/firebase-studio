'use client'; // Mark this as a Client Component

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { StockOutForm, type StockOutFormData } from '@/components/stock-out-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { StockItem } from '@/types';
import { useState, useEffect } from 'react'; // Import useState and useEffect

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

  // Load initial data on the client side after hydration
  useEffect(() => {
    setStockItems(initialStockItems);
  }, []);


  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStockOutSubmit = (data: StockOutFormData) => {
    // Update the stock level locally
    setStockItems((prevItems) =>
      prevItems.map((item) =>
        item.id === data.itemId
          ? { ...item, currentStock: item.currentStock - data.quantity }
          : item
      )
    );
    // Here you would typically also send this data to your backend/Firebase
    console.log('Submitting Stock Out Data:', data);
    alert(`Logged stock out: ${data.quantity} of item ID ${data.itemId}`);
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
           <Card>
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

        {/* Right Column: Stock Out Form */}
        <div className="lg:col-span-1">
           <StockOutForm items={stockItems} onSubmit={handleStockOutSubmit} />
        </div>
      </div>
    </div>
  );
}
