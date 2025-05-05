
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
import { collection, getDocs, addDoc, updateDoc, doc, increment } from 'firebase/firestore'; // Removed unused imports
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading state

// Create a client
const queryClient = new QueryClient();

function StockManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast(); // Initialize toast

  // Fetch stock items from Firestore using React Query
  const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch } = useQuery<StockItem[]>({ // Destructure refetch
    queryKey: ['stockItems'],
    queryFn: async () => {
      console.log("Fetching stock items from Firestore..."); // Log fetch start
      try {
          const itemsCol = collection(db, 'stockItems');
          const itemSnapshot = await getDocs(itemsCol);
          const itemsList = itemSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
          } as StockItem));
          console.log(`Fetched ${itemsList.length} items.`); // Log fetch success
          // Ensure numeric types and handle potential undefined/nulls robustly
          return itemsList.map(item => ({
              ...item,
              currentStock: Number(item.currentStock) || 0,
              minStock: Number(item.minStock) || 0,
              // Ensure optional fields are present or undefined
              barcode: item.barcode || undefined,
              location: item.location || undefined,
              description: item.description || undefined,
              category: item.category || undefined,
              supplier: item.supplier || undefined,
              photoUrl: item.photoUrl || undefined,
              locationCoords: item.locationCoords || undefined,
          }));
      } catch (err) {
          console.error("Error fetching stock items:", err); // Log fetch error
          throw err; // Re-throw error for React Query to handle
      }
    },
  });

   // Mutation for adding a new item
   const addItemMutation = useMutation({
     mutationFn: async (newItemData: Omit<StockItem, 'id'>) => {
       console.log("Adding new item to Firestore:", newItemData); // Log add start
       const itemsCol = collection(db, 'stockItems');
       // Remove undefined fields before sending to Firestore
       const cleanData = Object.entries(newItemData).reduce((acc, [key, value]) => {
            if (value !== undefined) {
              acc[key as keyof typeof acc] = value;
            }
            return acc;
          }, {} as Omit<StockItem, 'id'>);

       const docRef = await addDoc(itemsCol, cleanData);
       console.log("Item added with ID:", docRef.id); // Log add success
       return { id: docRef.id, ...newItemData }; // Return the new item with its ID
     },
     onSuccess: (newItem) => {
       queryClient.invalidateQueries({ queryKey: ['stockItems'] }); // Refetch items after adding
       // Refetch explicitly after invalidation might be needed in some caching scenarios
       // refetch();
       toast({
         variant: "default",
         title: "Item Added",
         description: `${newItem.itemName} added to stock.`,
       });
     },
     onError: (error) => {
        console.error("Error adding item:", error); // Log add error
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
             console.log("Processing stock out for item:", data.itemId, "Quantity:", data.quantity); // Log stock out start
            const itemDocRef = doc(db, 'stockItems', data.itemId);
            // Use Firestore transaction or batched write if more complex logic needed
            await updateDoc(itemDocRef, {
                currentStock: increment(-data.quantity) // Atomically decrease stock
            });
            console.log("Stock updated successfully for item:", data.itemId); // Log stock out success
            return data; // Return original data for onSuccess context
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stockItems'] }); // Refetch items
            // refetch();
            const updatedItem = stockItems.find(item => item.id === data.itemId); // Get item name for toast
            toast({
                variant: "default",
                title: "Stock Updated",
                description: `${data.quantity} units of ${updatedItem?.itemName || 'item'} removed.`,
            });
        },
        onError: (error, data) => {
            console.error("Error updating stock:", error); // Log stock out error
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
     stockOutMutation.mutate(data);
   };

  const handleAddItemSubmit = (data: AddItemFormData) => {
       // Data from form should already include optional fields correctly (or as undefined/null)
       const newItemData: Omit<StockItem, 'id'> = {
         itemName: data.itemName,
         currentStock: data.currentStock,
         minStock: data.minStock,
         // Pass optional fields directly from form data
         barcode: data.barcode,
         location: data.location,
         description: data.description,
         category: data.category,
         supplier: data.supplier,
         photoUrl: data.photoUrl,
         locationCoords: data.locationCoords,
       };
       addItemMutation.mutate(newItemData);
  };


  // Filter items based on search query (case-insensitive)
    const filteredItems = stockItems.filter((item) => {
        const query = searchQuery.toLowerCase();
        return (
            item.itemName.toLowerCase().includes(query) ||
            (item.barcode && item.barcode.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.supplier && item.supplier.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
    });

  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-primary">StockWatch</h1>
        <p className="text-muted-foreground">Your Enhanced Stock Management Dashboard</p>
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
                    placeholder="Search by name, barcode, category, etc..." // Update placeholder
                  />
                {isLoadingItems && (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-60 w-full" /> {/* Increased height for potentially larger table */}
                  </div>
                )}
                {fetchError && (
                   <Alert variant="destructive">
                       <AlertTriangle className="h-4 w-4" />
                       <AlertTitle>Error Loading Data</AlertTitle>
                       <AlertDescription>
                           Could not load stock items from the database. Please check your connection or try again later. ({(fetchError as Error).message})
                           <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">Retry</Button>
                       </AlertDescription>
                   </Alert>
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
                   <CardContent className="p-0 pt-0"> {/* Removed top padding */}
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
                    <CardContent className="p-0 pt-0"> {/* Removed top padding */}
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
