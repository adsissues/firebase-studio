
'use client'; // Mark this as a Client Component

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { StockOutForm, type StockOutFormData } from '@/components/stock-out-form';
import { AddItemForm, type AddItemFormData } from '@/components/add-item-form'; // Import AddItemForm
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components
import type { StockItem } from '@/types';
import { useState } from 'react'; // Import useState
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/firebase/firebase'; // Import Firestore instance
import { collection, getDocs, addDoc, updateDoc, doc, increment, query, where, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading state

// Create a client
const queryClient = new QueryClient();

function StockManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast(); // Initialize toast

  // Fetch stock items from Firestore using React Query
  const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError } = useQuery<StockItem[]>({
    queryKey: ['stockItems'],
    queryFn: async () => {
      const itemsCol = collection(db, 'stockItems');
      const itemSnapshot = await getDocs(itemsCol);
      const itemsList = itemSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as StockItem));
      // Ensure numeric types are correctly parsed if necessary (Firestore might store as number)
       return itemsList.map(item => ({
          ...item,
          currentStock: Number(item.currentStock) || 0,
          minStock: Number(item.minStock) || 0,
       }));
    },
  });

   // Mutation for adding a new item
   const addItemMutation = useMutation({
     mutationFn: async (newItemData: Omit<StockItem, 'id'>) => {
       const itemsCol = collection(db, 'stockItems');
       const docRef = await addDoc(itemsCol, newItemData);
       return { id: docRef.id, ...newItemData }; // Return the new item with its ID
     },
     onSuccess: (newItem) => {
       queryClient.invalidateQueries({ queryKey: ['stockItems'] }); // Refetch items after adding
       toast({
         variant: "default",
         title: "Item Added",
         description: `${newItem.itemName} added to stock.`,
       });
     },
     onError: (error) => {
        console.error("Error adding item:", error);
        toast({
           variant: "destructive",
           title: "Error Adding Item",
           description: "Could not add the item to stock. Please try again.",
        });
     },
   });

   // Mutation for updating stock (stock out)
    const stockOutMutation = useMutation({
        mutationFn: async (data: StockOutFormData) => {
            const itemDocRef = doc(db, 'stockItems', data.itemId);
            // Use Firestore transaction or batched write if more complex logic needed
            await updateDoc(itemDocRef, {
                currentStock: increment(-data.quantity) // Atomically decrease stock
            });
            return data; // Return original data for onSuccess context
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stockItems'] }); // Refetch items
            const updatedItem = stockItems.find(item => item.id === data.itemId); // Get item name for toast
            toast({
                variant: "default",
                title: "Stock Updated",
                description: `${data.quantity} units of ${updatedItem?.itemName || 'item'} removed.`,
            });
        },
        onError: (error, data) => {
            console.error("Error updating stock:", error);
            const updatedItem = stockItems.find(item => item.id === data.itemId);
            toast({
                variant: "destructive",
                title: "Error Updating Stock",
                description: `Could not remove stock for ${updatedItem?.itemName || 'item'}. Please try again.`,
            });
        },
    });


  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleStockOutSubmit = (data: StockOutFormData) => {
     // Validation is now primarily handled within the StockOutForm
     // Additional checks could be done here if needed before mutation
     stockOutMutation.mutate(data);
   };

  const handleAddItemSubmit = (data: AddItemFormData) => {
      const newItemData: Omit<StockItem, 'id'> = {
        itemName: data.itemName,
        currentStock: data.currentStock,
        minStock: data.minStock,
        // Only include optional fields if they have a value
        ...(data.barcode && { barcode: data.barcode }),
        ...(data.location && { location: data.location }),
      };
      addItemMutation.mutate(newItemData);
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
                {isLoadingItems && (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                )}
                {fetchError && (
                  <p className="text-destructive">Error loading stock items: {(fetchError as Error).message}</p>
                )}
                {!isLoadingItems && !fetchError && <StockDashboard items={filteredItems} />}
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Action Forms (Stock Out / Add Item) */}
        <div className="lg:col-span-1">
           <Tabs defaultValue="stock-out" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stock-out" disabled={stockOutMutation.isPending || addItemMutation.isPending}>Stock Out</TabsTrigger>
                <TabsTrigger value="add-item" disabled={stockOutMutation.isPending || addItemMutation.isPending}>Add Item</TabsTrigger>
              </TabsList>
              <TabsContent value="stock-out">
                 <Card className="shadow-md">
                   <CardContent className="p-0 pt-6"> {/* Adjust padding */}
                     <StockOutForm
                        items={stockItems}
                        onSubmit={handleStockOutSubmit}
                        isLoading={stockOutMutation.isPending} // Pass loading state
                      />
                   </CardContent>
                 </Card>
              </TabsContent>
              <TabsContent value="add-item">
                 <Card className="shadow-md">
                    <CardContent className="p-0 pt-6"> {/* Adjust padding */}
                      <AddItemForm
                        onSubmit={handleAddItemSubmit}
                        isLoading={addItemMutation.isPending} // Pass loading state
                      />
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}

// Wrap the page component with QueryClientProvider
export default function Home() {
    return (
        <QueryClientProvider client={queryClient}>
            <StockManagementPage />
        </QueryClientProvider>
    );
}
