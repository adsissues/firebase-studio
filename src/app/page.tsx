
'use client';

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { StockOutForm, type StockOutFormData } from '@/components/stock-out-form';
import { AddItemForm, type AddItemFormData } from '@/components/add-item-form';
import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { StockItem } from '@/types';
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider, useQuery, useMutation, QueryCache } from '@tanstack/react-query'; // Import QueryCache
import { db, auth } from '@/lib/firebase/firebase'; // Import auth as well
import { collection, getDocs, addDoc, updateDoc, doc, increment, deleteDoc, writeBatch, query, where } from 'firebase/firestore'; // Import query, where, writeBatch
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2, LogOut } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth'; // Import RequireAuth
import { useAuth } from '@/context/auth-context'; // Import useAuth
import { signOut } from 'firebase/auth'; // Import signOut

// Create a client with a QueryCache to handle auth errors globally
const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, queryInstance) => {
      // Check if the error indicates an authentication issue (e.g., permission denied)
      // This check might need to be more specific based on Firestore error codes
      if ((error as any)?.code === 'permission-denied' || (error as any)?.code === 'unauthenticated') {
        console.warn("Authentication error detected by React Query. Signing out...");
        signOut(auth).catch(signOutError => console.error("Error signing out after query error:", signOutError));
        // Optionally, redirect to login page or show a global message
        // You might need access to router here or use a different approach
      }
      // Log other errors as well
      console.error(`Query Error [${queryInstance.queryKey}]:`, error);
    },
  }),
   // Add mutation cache if needed for mutation errors
});

function StockManagementPageContent() { // Renamed original component
  const { user, isAdmin } = useAuth(); // Get user and admin status
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  // Fetch stock items - Fetch only if user is logged in
  const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch } = useQuery<StockItem[]>({
    queryKey: ['stockItems', user?.uid], // Include user ID in query key to refetch on user change
    queryFn: async () => {
       if (!user) {
            console.log("User not logged in, skipping fetch.");
            return []; // Don't fetch if user is not logged in
       }
      console.log("Fetching stock items from Firestore for user:", user.uid);
      try {
          // Assuming items are stored under a user-specific subcollection or filtered by userId
          // Option 1: Subcollection (e.g., users/{userId}/stockItems)
          // const itemsCol = collection(db, 'users', user.uid, 'stockItems');

          // Option 2: Root collection with filtering (ensure Firestore rules allow this)
          // Add a 'userId' field to your StockItem documents when adding/editing
           const itemsCol = collection(db, 'stockItems');
           const q = query(itemsCol, where("userId", "==", user.uid)); // Filter by userId
           const itemSnapshot = await getDocs(q);

          // const itemSnapshot = await getDocs(itemsCol); // Use this if using subcollections

          const itemsList = itemSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
          } as StockItem));
          console.log(`Fetched ${itemsList.length} items.`);
          return itemsList.map(item => ({
              ...item,
              currentStock: Number(item.currentStock) || 0,
              minStock: Number(item.minStock) || 0,
              barcode: item.barcode || undefined,
              location: item.location || undefined,
              description: item.description || undefined,
              category: item.category || undefined,
              supplier: item.supplier || undefined,
              photoUrl: item.photoUrl || undefined,
              locationCoords: item.locationCoords || undefined,
              // userId field should exist if using filtering method
          }));
      } catch (err) {
          console.error("Error fetching stock items:", err);
          // Handle permission errors specifically if needed
           if ((err as any)?.code === 'permission-denied') {
              toast({
                  variant: "destructive",
                  title: "Permission Denied",
                  description: "You do not have permission to view stock items.",
              });
              // Consider signing out the user if permission denied persists
               // await signOut(auth);
           }
          throw err;
      }
    },
     enabled: !!user, // Only run query if user is authenticated
     staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
     refetchOnWindowFocus: true, // Refetch on window focus
  });

   // Mutation for adding a new item
   const addItemMutation = useMutation({
     mutationFn: async (newItemData: Omit<StockItem, 'id' | 'userId'>) => { // Exclude userId from input type
       if (!user) throw new Error("User not authenticated"); // Guard clause
       console.log("Adding new item to Firestore:", newItemData);
       // Option 1: Subcollection
       // const itemsCol = collection(db, 'users', user.uid, 'stockItems');
       // Option 2: Root collection + userId field
       const itemsCol = collection(db, 'stockItems');

       const cleanData = Object.entries(newItemData).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              acc[key as keyof typeof acc] = value;
            }
            return acc;
          }, {} as Partial<Omit<StockItem, 'id' | 'userId'>>);

        // Add userId to the data being saved
        const dataToSave = { ...cleanData, userId: user.uid };


       const docRef = await addDoc(itemsCol, dataToSave); // Save data with userId
       console.log("Item added with ID:", docRef.id);
       return { id: docRef.id, ...newItemData, userId: user.uid }; // Return the new item with its ID and userId
     },
     onSuccess: (newItem) => {
        queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] }); // Use user-specific key
        toast({
            variant: "default",
            title: "Item Added",
            description: `${newItem.itemName} added to stock.`,
        });
        // Reset AddItemForm? Depends on UX preference
     },
     onError: (error: any) => {
        console.error("Error adding item:", error);
        toast({
           variant: "destructive",
           title: "Error Adding Item",
           description: error.message || "Could not add the item. Please try again.",
        });
     },
   });

    // Mutation for editing an existing item
    const editItemMutation = useMutation({
        mutationFn: async (itemData: StockItem) => {
            if (!user) throw new Error("User not authenticated");
            // Ensure the item being edited belongs to the current user (important for security if using root collection)
             if (itemData.userId !== user.uid && !isAdmin) { // Admins might be allowed to edit any item
                 throw new Error("Permission denied: You can only edit your own items.");
             }

            console.log("Editing item in Firestore:", itemData);
            // Option 1: Subcollection path
            // const itemDocRef = doc(db, 'users', user.uid, 'stockItems', itemData.id);
            // Option 2: Root collection path
             const itemDocRef = doc(db, 'stockItems', itemData.id);

            const { id, ...updateData } = itemData;
             const cleanData = Object.entries(updateData).reduce((acc, [key, value]) => {
                 if (value !== undefined && value !== null && value !== '') {
                    acc[key as keyof typeof acc] = value;
                 }
                 // Ensure userId is not accidentally removed or changed if not admin
                  if (key === 'userId' && value !== user.uid && !isAdmin) {
                      // Skip updating userId if it doesn't match and user is not admin
                      console.warn("Attempted to change userId without admin rights. Skipping.");
                  } else if (key === 'userId' && value) {
                     acc[key as keyof typeof acc] = value; // Allow admin to change userId if needed, or keep it the same
                  } else if (key !== 'userId') {
                      acc[key as keyof typeof acc] = value;
                  }

                 return acc;
             }, {} as Partial<Omit<StockItem, 'id'>>);

            await updateDoc(itemDocRef, cleanData);
            console.log("Item updated successfully:", itemData.id);
            return itemData;
        },
        onSuccess: (updatedItem) => {
             queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
            setIsEditDialogOpen(false);
            setItemToEdit(null);
            toast({
                variant: "default",
                title: "Item Updated",
                description: `${updatedItem.itemName} has been updated.`,
            });
        },
        onError: (error: any, updatedItem) => {
            console.error("Error updating item:", error);
            toast({
                variant: "destructive",
                title: "Error Updating Item",
                description: error.message || `Could not update ${updatedItem?.itemName || 'item'}. Please try again.`,
            });
        },
    });

    // Mutation for deleting an item
    const deleteItemMutation = useMutation({
        mutationFn: async (itemToDelete: StockItem) => { // Pass full item for permission check
            if (!user) throw new Error("User not authenticated");
            // Ensure the item being deleted belongs to the current user
             if (itemToDelete.userId !== user.uid && !isAdmin) {
                 throw new Error("Permission denied: You can only delete your own items.");
             }
            console.log("Deleting item from Firestore:", itemToDelete.id);
             // Option 1: Subcollection path
             // const itemDocRef = doc(db, 'users', user.uid, 'stockItems', itemToDelete.id);
             // Option 2: Root collection path
            const itemDocRef = doc(db, 'stockItems', itemToDelete.id);
            await deleteDoc(itemDocRef);
            console.log("Item deleted successfully:", itemToDelete.id);
            return itemToDelete.id;
        },
        onSuccess: (itemId) => {
             queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
             setIsDeleteDialogOpen(false);
             const deletedItemName = itemToDelete?.itemName || 'Item'; // Use state variable
             setItemToDelete(null);
             toast({
                 variant: "default",
                 title: "Item Deleted",
                 description: `${deletedItemName} has been removed from stock.`,
             });
        },
        onError: (error: any, itemBeingDeleted) => { // Access item from second arg
             console.error("Error deleting item:", error);
             const deletedItemName = itemBeingDeleted?.itemName || 'Item';
             toast({
                 variant: "destructive",
                 title: "Error Deleting Item",
                 description: error.message || `Could not delete ${deletedItemName}. Please try again.`,
             });
              setIsDeleteDialogOpen(false);
              setItemToDelete(null);
        },
    });


   // Mutation for updating stock (stock out)
    const stockOutMutation = useMutation({
        mutationFn: async (data: StockOutFormData) => {
             if (!user) throw new Error("User not authenticated");
              const itemToUpdate = stockItems.find(item => item.id === data.itemId);
              // Permission check (ensure item belongs to user)
             if (itemToUpdate?.userId !== user.uid && !isAdmin) {
                 throw new Error("Permission denied: Cannot modify stock for items you don't own.");
             }
             console.log("Processing stock out for item:", data.itemId, "Quantity:", data.quantity);
             // Option 1: Subcollection path
             // const itemDocRef = doc(db, 'users', user.uid, 'stockItems', data.itemId);
             // Option 2: Root collection path
             const itemDocRef = doc(db, 'stockItems', data.itemId);

             // Consider using a transaction for atomicity if needed, especially if checking stock before decrementing
             const batch = writeBatch(db);
             batch.update(itemDocRef, {
                 currentStock: increment(-data.quantity) // Atomically decrease stock
             });
             // Potentially add a log entry in the same batch
             // const logRef = doc(collection(db, 'stockLogs')); // Example log collection
             // batch.set(logRef, { itemId: data.itemId, quantity: -data.quantity, userId: user.uid, timestamp: new Date() });

             await batch.commit(); // Commit the batch

            console.log("Stock updated successfully for item:", data.itemId);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
            const updatedItem = stockItems.find(item => item.id === data.itemId);
            toast({
                variant: "default",
                title: "Stock Updated",
                description: `${data.quantity} units of ${updatedItem?.itemName || 'item'} removed.`,
            });
             // Reset StockOutForm?
             // Find the form instance and call reset, or manage reset state here
        },
        onError: (error: any, data) => {
            console.error("Error updating stock:", error);
            const updatedItem = stockItems.find(item => item.id === data.itemId);
            toast({
                variant: "destructive",
                title: "Error Updating Stock",
                description: error.message || `Could not remove stock for ${updatedItem?.itemName || 'item'}. Please try again.`,
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
       const newItemData: Omit<StockItem, 'id' | 'userId'> = { // Exclude userId here
         itemName: data.itemName,
         currentStock: data.currentStock,
         minStock: data.minStock,
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
      if (!itemToEdit) return;

      // Ensure userId is included correctly
      const updatedItem: StockItem = {
          ...itemToEdit, // Start with existing data (includes id and potentially userId)
          ...data, // Override with form data
          // Ensure optional fields are handled
          barcode: data.barcode || undefined,
          location: data.location || undefined,
          description: data.description || undefined,
          category: data.category || undefined,
          supplier: data.supplier || undefined,
          photoUrl: data.photoUrl || undefined,
          locationCoords: data.locationCoords || undefined,
          userId: itemToEdit.userId || user?.uid, // Keep original userId or fallback to current user's UID
      };

      // Double-check userId before mutation if critical
      if (!updatedItem.userId) {
          console.error("Missing userId in item data for edit:", updatedItem);
          toast({ variant: "destructive", title: "Error", description: "Cannot update item without user association." });
          return;
      }

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
       deleteItemMutation.mutate(itemToDelete); // Pass the full item
     }
   };

   const handleSignOut = async () => {
    try {
      await signOut(auth);
      queryClient.clear(); // Clear React Query cache on sign out
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({ variant: "destructive", title: "Sign Out Error", description: "Could not sign you out." });
    }
  };

  // Filter items based on search query
    const filteredItems = stockItems.filter((item) => {
        const query = searchQuery.toLowerCase();
        if (!item || typeof item.itemName !== 'string') return false;
        return (
            item.itemName.toLowerCase().includes(query) ||
            (item.barcode && item.barcode.toLowerCase().includes(query)) ||
            (item.category && item.category.toLowerCase().includes(query)) ||
            (item.supplier && item.supplier.toLowerCase().includes(query)) ||
            (item.location && item.location.toLowerCase().includes(query)) ||
            (item.description && item.description.toLowerCase().includes(query))
        );
    });

  // Determine if any mutation is loading
   const isMutating = stockOutMutation.isPending || addItemMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending;

  return (
     // Apply RequireAuth HOC here or in the parent Home component
     // For simplicity, applying content rendering logic directly based on auth state
    <div className="container mx-auto p-4 md:p-8">
       <header className="mb-8 flex justify-between items-center">
           <div>
               <h1 className="text-3xl font-bold text-primary">StockWatch</h1>
               <p className="text-muted-foreground">
                    {isAdmin ? 'Admin Dashboard' : 'Your Stock Management Dashboard'}
                    {user && ` (Logged in as ${user.email})`}
                </p>
           </div>
           <Button variant="outline" onClick={handleSignOut} disabled={isMutating}>
               <LogOut className="mr-2 h-4 w-4" /> Sign Out
           </Button>
       </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Search and Dashboard */}
        <div className="lg:col-span-2 space-y-6">
           <Card className="shadow-md">
             <CardHeader>
               <CardTitle>Stock Levels {isAdmin && '(Admin View)'}</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <ItemSearch
                    searchQuery={searchQuery}
                    onSearchChange={handleSearchChange}
                    placeholder="Search by name, barcode, category, etc..."
                  />
                {isLoadingItems && (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-60 w-full" />
                  </div>
                )}
                {fetchError && (
                   <Alert variant="destructive">
                       <AlertTriangle className="h-4 w-4" />
                       <AlertTitle>Error Loading Data</AlertTitle>
                       <AlertDescription>
                           Could not load stock items. {(fetchError as Error).message}
                           <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-4">Retry</Button>
                       </AlertDescription>
                   </Alert>
                )}
                {!isLoadingItems && !fetchError && (
                    <StockDashboard
                        items={filteredItems}
                        onEdit={handleEditClick} // Pass edit handler
                        onDelete={handleDeleteClick} // Pass delete handler
                        isAdmin={isAdmin} // Pass admin status
                     />
                 )}
              </CardContent>
           </Card>
        </div>

        {/* Right Column: Action Forms (Stock Out / Add Item) */}
        <div className="lg:col-span-1">
           <Tabs defaultValue="stock-out" className="w-full">
               <TabsList className="grid w-full grid-cols-2">
                    {/* Disable tabs while any mutation is in progress */}
                    <TabsTrigger value="stock-out" disabled={isMutating}>Stock Out</TabsTrigger>
                    <TabsTrigger value="add-item" disabled={isMutating}>Add Item</TabsTrigger>
                </TabsList>
              <TabsContent value="stock-out">
                 <Card className="shadow-md">
                   <CardContent className="p-0 pt-0">
                     <StockOutForm
                        items={stockItems} // Pass all items, form handles filtering available ones
                        onSubmit={handleStockOutSubmit}
                        isLoading={stockOutMutation.isPending}
                      />
                   </CardContent>
                 </Card>
              </TabsContent>
              <TabsContent value="add-item">
                 <Card className="shadow-md">
                    <CardContent className="p-0 pt-0">
                      <AddItemForm
                        onSubmit={handleAddItemSubmit}
                        isLoading={addItemMutation.isPending}
                      />
                    </CardContent>
                  </Card>
              </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* Edit Item Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Item: {itemToEdit?.itemName}</DialogTitle>
                    <DialogDescription>
                        Make changes to the item details below. Click save when done.
                    </DialogDescription>
                </DialogHeader>
                {itemToEdit && (
                    <EditItemForm
                        item={itemToEdit}
                        onSubmit={handleEditItemSubmit}
                        isLoading={editItemMutation.isPending}
                        onCancel={() => setIsEditDialogOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>


       {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete <span className="font-semibold">{itemToDelete?.itemName}</span>. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={confirmDeleteItem}
                        disabled={deleteItemMutation.isPending}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {deleteItemMutation.isPending ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                        ) : (
                           <><Trash2 className="mr-2 h-4 w-4" /> Delete Item</>
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}


// Wrap the page component with QueryClientProvider and RequireAuth
export default function Home() {
    return (
        <QueryClientProvider client={queryClient}>
             {/* Require basic authentication to view the page */}
            <RequireAuth>
                 <StockManagementPageContent />
            </RequireAuth>
        </QueryClientProvider>
    );
}
