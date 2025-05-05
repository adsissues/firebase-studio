
'use client'; // Mark this as a Client Component

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { StockOutForm, type StockOutFormData } from '@/components/stock-out-form';
import { AddItemForm, type AddItemFormData } from '@/components/add-item-form'; // Import AddItemForm
import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form'; // Import EditItemForm
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Import Tabs components
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'; // Import Dialog components
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; // Import Alert Dialog
import type { StockItem } from '@/types';
import { useState } from 'react'; // Import useState
import { useToast } from "@/hooks/use-toast"; // Import useToast
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { db } from '@/lib/firebase/firebase'; // Import Firestore instance
import { collection, getDocs, addDoc, updateDoc, doc, increment, deleteDoc } from 'firebase/firestore'; // Import deleteDoc
import { Skeleton } from '@/components/ui/skeleton'; // Import Skeleton for loading state
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'; // Import icons for dialogs

// Create a client
const queryClient = new QueryClient();

function StockManagementPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast(); // Initialize toast
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

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
            if (value !== undefined && value !== null && value !== '') { // Also check for empty strings
              acc[key as keyof typeof acc] = value;
            }
            return acc;
          }, {} as Partial<Omit<StockItem, 'id'>>); // Use Partial here

       const docRef = await addDoc(itemsCol, cleanData);
       console.log("Item added with ID:", docRef.id); // Log add success
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
        console.error("Error adding item:", error); // Log add error
        toast({
           variant: "destructive",
           title: "Error Adding Item",
           description: "Could not add the item to stock. Please try again.",
        });
     },
   });

    // Mutation for editing an existing item
    const editItemMutation = useMutation({
        mutationFn: async (itemData: StockItem) => {
            console.log("Editing item in Firestore:", itemData);
            const itemDocRef = doc(db, 'stockItems', itemData.id);
            // Prepare data, removing ID and cleaning undefined/null/empty fields
            const { id, ...updateData } = itemData;
             const cleanData = Object.entries(updateData).reduce((acc, [key, value]) => {
                 if (value !== undefined && value !== null && value !== '') { // Check for empty strings too
                    acc[key as keyof typeof acc] = value;
                 }
                 return acc;
             }, {} as Partial<Omit<StockItem, 'id'>>); // Use Partial

            await updateDoc(itemDocRef, cleanData);
            console.log("Item updated successfully:", itemData.id);
            return itemData; // Return the updated item
        },
        onSuccess: (updatedItem) => {
            queryClient.invalidateQueries({ queryKey: ['stockItems'] });
            setIsEditDialogOpen(false); // Close dialog on success
            setItemToEdit(null);
            toast({
                variant: "default",
                title: "Item Updated",
                description: `${updatedItem.itemName} has been updated.`,
            });
        },
        onError: (error, updatedItem) => {
            console.error("Error updating item:", error);
            toast({
                variant: "destructive",
                title: "Error Updating Item",
                description: `Could not update ${updatedItem.itemName}. Please try again.`,
            });
        },
    });

    // Mutation for deleting an item
    const deleteItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            console.log("Deleting item from Firestore:", itemId);
            const itemDocRef = doc(db, 'stockItems', itemId);
            await deleteDoc(itemDocRef);
            console.log("Item deleted successfully:", itemId);
            return itemId; // Return the deleted item's ID
        },
        onSuccess: (itemId) => {
             queryClient.invalidateQueries({ queryKey: ['stockItems'] });
             setIsDeleteDialogOpen(false); // Close confirmation dialog
             setItemToDelete(null);
             // Find the item name *before* it's removed from the cache for the toast message
             const deletedItemName = stockItems.find(item => item.id === itemId)?.itemName || 'Item';
             toast({
                 variant: "default", // Use default variant for successful deletion
                 title: "Item Deleted",
                 description: `${deletedItemName} has been removed from stock.`,
             });
        },
        onError: (error, itemId) => {
             console.error("Error deleting item:", error);
             const deletedItemName = stockItems.find(item => item.id === itemId)?.itemName || 'Item';
             toast({
                 variant: "destructive",
                 title: "Error Deleting Item",
                 description: `Could not delete ${deletedItemName}. Please try again.`,
             });
              setIsDeleteDialogOpen(false); // Close confirmation dialog even on error
              setItemToDelete(null);
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

  const handleEditItemSubmit = (data: EditItemFormData) => {
      if (!itemToEdit) return; // Should not happen if dialog is open

      const updatedItem: StockItem = {
          ...itemToEdit, // Start with existing data (including ID)
          ...data, // Override with form data
          // Optional fields might come as empty strings from form, convert to undefined if needed
          barcode: data.barcode || undefined,
          location: data.location || undefined,
          description: data.description || undefined,
          category: data.category || undefined,
          supplier: data.supplier || undefined,
          photoUrl: data.photoUrl || undefined, // Assume photoUrl is managed (e.g., kept if not changed)
          locationCoords: data.locationCoords || undefined, // Assume locationCoords are managed
      };
      editItemMutation.mutate(updatedItem);
  };

   const handleEditClick = (item: StockItem) => {
     setItemToEdit(item);
     setIsEditDialogOpen(true);
   };

   const handleDeleteClick = (item: StockItem) => {
     setItemToDelete(item);
     setIsDeleteDialogOpen(true);
   };

   const confirmDeleteItem = () => {
     if (itemToDelete) {
       deleteItemMutation.mutate(itemToDelete.id);
     }
   };


  // Filter items based on search query (case-insensitive)
    const filteredItems = stockItems.filter((item) => {
        const query = searchQuery.toLowerCase();
        // Check if item exists and has itemName before accessing its properties
        if (!item || typeof item.itemName !== 'string') {
            return false;
        }
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
                {!isLoadingItems && !fetchError && (
                    <StockDashboard
                        items={filteredItems}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                     />
                 )}
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Action Forms (Stock Out / Add Item) */}
        <div className="lg:col-span-1">
           <Tabs defaultValue="stock-out" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stock-out" disabled={stockOutMutation.isPending || addItemMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending}>Stock Out</TabsTrigger>
                <TabsTrigger value="add-item" disabled={stockOutMutation.isPending || addItemMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending}>Add Item</TabsTrigger>
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

      {/* Edit Item Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]"> {/* Wider dialog for edit form */}
                <DialogHeader>
                    <DialogTitle>Edit Item: {itemToEdit?.itemName}</DialogTitle>
                    <DialogDescription>
                        Make changes to the item details below. Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                {itemToEdit && (
                    <EditItemForm
                        item={itemToEdit}
                        onSubmit={handleEditItemSubmit}
                        isLoading={editItemMutation.isPending}
                        onCancel={() => setIsEditDialogOpen(false)} // Add cancel handler
                    />
                )}
                 {/* Footer removed as the form now contains submit/cancel buttons */}
            </DialogContent>
        </Dialog>


       {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the item
                        <span className="font-semibold"> {itemToDelete?.itemName} </span>
                         and remove its data from the system.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmDeleteItem}
                        disabled={deleteItemMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90" // Destructive style
                    >
                        {deleteItemMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                            </>
                        ) : (
                           <>
                             <Trash2 className="mr-2 h-4 w-4" /> Delete Item
                           </>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>


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
