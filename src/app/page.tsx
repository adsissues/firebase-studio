
'use client';

    import * as React from 'react';
    import { ItemSearch } from '@/components/item-search';
    import { StockDashboard } from '@/components/stock-dashboard';
    import { StockOutForm, type StockOutFormDataSubmit } from '@/components/stock-out-form'; // Adjusted import name
    import { AddStockForm, type AddStockFormData } from '@/components/add-stock-form'; // Renamed component and type
    import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form';
    import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
    import type { StockItem } from '@/types';
    import { useState } from 'react';
    import { useToast } from "@/hooks/use-toast";
    import { QueryClient, QueryClientProvider, useQuery, useMutation, QueryCache } from '@tanstack/react-query';
    import { db, auth } from '@/lib/firebase/firebase';
    import { collection, getDocs, addDoc, updateDoc, doc, increment, deleteDoc, writeBatch, query, where, runTransaction } from 'firebase/firestore'; // Import query, where, writeBatch, runTransaction
    import { Skeleton } from '@/components/ui/skeleton';
    import { Button } from '@/components/ui/button';
    import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
    import { AlertTriangle, Loader2, Trash2, LogOut, Settings } from 'lucide-react';
    import { RequireAuth } from '@/components/auth/require-auth';
    import { useAuth } from '@/context/auth-context';
    import { signOut } from 'firebase/auth';
    import { ThemeToggle } from "@/components/theme-toggle";
    import { AdminSettingsDialog } from '@/components/admin-settings-dialog';

    const queryClient = new QueryClient({
      queryCache: new QueryCache({
        onError: (error, queryInstance) => {
          if ((error as any)?.code === 'permission-denied' || (error as any)?.code === 'unauthenticated') {
            console.warn("Authentication error detected by React Query. Signing out...");
            signOut(auth).catch(signOutError => console.error("Error signing out after query error:", signOutError));
          }
          console.error(`Query Error [${queryInstance.queryKey}]:`, error);
        },
      }),
    });

    function StockManagementPageContent() {
      const { user, isAdmin } = useAuth();
      const [searchQuery, setSearchQuery] = useState('');
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
      const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

      // Fetch stock items
      const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch } = useQuery<StockItem[]>({
        queryKey: ['stockItems', user?.uid],
        queryFn: async () => {
           if (!user) return [];
           console.log("Fetching stock items from Firestore for user:", user.uid);
           try {
               const itemsCol = collection(db, 'stockItems');
               const q = query(itemsCol, where("userId", "==", user.uid));
               const itemSnapshot = await getDocs(q);

               const itemsList = itemSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
              } as StockItem));
              console.log(`Fetched ${itemsList.length} items.`);

              return itemsList.map(item => ({
                  ...item,
                  currentStock: Number(item.currentStock ?? 0),
                  maximumStock: Number(item.maximumStock ?? 0), // Changed from minStock
                  itemName: item.itemName || 'Unknown Item',
                  barcode: item.barcode || undefined,
                  location: item.location || undefined,
                  description: item.description || undefined,
                  category: item.category || undefined,
                  supplier: item.supplier || undefined,
                  photoUrl: item.photoUrl || undefined,
                  locationCoords: item.locationCoords || undefined,
                  userId: item.userId || user.uid,
              }));
          } catch (err) {
              console.error("Error fetching stock items:", err);
               if ((err as any)?.code === 'permission-denied') {
                  toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to view stock items." });
               } else if ((err as any)?.code === 'unauthenticated') {
                    toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to view stock items." });
               }
              throw err;
          }
        },
         enabled: !!user,
         staleTime: 5 * 60 * 1000,
         refetchOnWindowFocus: true,
      });

        // Mutation for adding stock (handles both new items and adding to existing)
        const addStockMutation = useMutation({
            mutationFn: async (formData: AddStockFormData) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");

                const { itemName, quantity, barcode } = formData;
                console.log("Adding stock:", formData);

                const itemsCol = collection(db, 'stockItems');
                let targetItemQuery;

                // Prioritize finding by barcode if provided
                if (barcode) {
                    targetItemQuery = query(itemsCol, where("userId", "==", user.uid), where("barcode", "==", barcode));
                } else {
                    // Fallback to finding by item name
                    targetItemQuery = query(itemsCol, where("userId", "==", user.uid), where("itemName", "==", itemName));
                }

                const querySnapshot = await getDocs(targetItemQuery);

                // Prepare data for update/add, removing undefined
                 const dataToSave = Object.entries(formData).reduce((acc, [key, value]) => {
                      if (value !== undefined && key !== 'quantity') { // Exclude quantity from base data
                          acc[key as keyof typeof acc] = value;
                      }
                      return acc;
                  }, {} as Partial<Omit<StockItem, 'id' | 'userId' | 'currentStock'>> & { userId?: string }); // Ensure correct type

                  dataToSave.userId = user.uid; // Ensure userId is set

                 if (!querySnapshot.empty) {
                     // --- Item exists, update stock ---
                     const existingDoc = querySnapshot.docs[0]; // Assume first match is the one
                     const itemDocRef = doc(db, 'stockItems', existingDoc.id);
                     console.log("Item exists, updating stock for ID:", existingDoc.id);

                      // Use a transaction to safely update stock and other fields
                      await runTransaction(db, async (transaction) => {
                           const sfDoc = await transaction.get(itemDocRef);
                           if (!sfDoc.exists()) {
                               throw "Document does not exist!";
                           }
                           // Only update fields that were provided in the form, don't overwrite existing with undefined
                           const currentData = sfDoc.data();
                           const updatedData = { ...dataToSave }; // Start with cleaned form data

                           // Ensure maximumStock is updated if provided
                           if (formData.maximumStock !== undefined) {
                              updatedData.maximumStock = formData.maximumStock;
                           } else if (currentData.maximumStock !== undefined) {
                               updatedData.maximumStock = currentData.maximumStock; // Keep existing if not provided
                           }

                           // Ensure other fields are only updated if provided in the form
                            if (formData.location !== undefined) updatedData.location = formData.location; else if(currentData.location !== undefined) updatedData.location = currentData.location;
                            if (formData.supplier !== undefined) updatedData.supplier = formData.supplier; else if(currentData.supplier !== undefined) updatedData.supplier = currentData.supplier;
                            if (formData.photoUrl !== undefined) updatedData.photoUrl = formData.photoUrl; else if(currentData.photoUrl !== undefined) updatedData.photoUrl = currentData.photoUrl;
                            // Add other optional fields here if needed

                           // Atomically increment the current stock
                           const newStock = (currentData.currentStock || 0) + quantity;
                           transaction.update(itemDocRef, { ...updatedData, currentStock: newStock });
                       });

                     return { ...existingDoc.data(), id: existingDoc.id, quantityAdded: quantity } as StockItem & { quantityAdded: number };
                 } else {
                     // --- Item does not exist, add new ---
                     console.log("Item does not exist, adding new item:", itemName);
                     // Set initial current stock to the quantity added
                     const newItemDataWithStock = {
                         ...dataToSave,
                         currentStock: quantity,
                     };

                      // Remove userId again before adding as it's already in dataToSave
                      const { userId, ...finalData } = newItemDataWithStock;
                      const dataWithUser = { ...finalData, userId: user.uid }; // Add user ID

                     const docRef = await addDoc(itemsCol, dataWithUser);
                     console.log("New item added with ID:", docRef.id);
                     // Return the full item structure
                     return { id: docRef.id, ...newItemDataWithStock, userId: user.uid, quantityAdded: quantity } as StockItem & { quantityAdded: number };
                 }
             },
             onSuccess: (result) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
                 toast({
                     variant: "default",
                     title: "Stock Added",
                     description: `${result.quantityAdded} units of ${result.itemName} added successfully.`,
                 });
             },
             onError: (error: any) => {
                 console.error("Error adding stock:", error);
                 toast({
                    variant: "destructive",
                    title: "Error Adding Stock",
                    description: error.message || "Could not add stock. Please try again.",
                 });
             },
        });


        // Mutation for editing an existing item
        const editItemMutation = useMutation({
            mutationFn: async (itemData: StockItem) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");
                 if (itemData.userId !== user.uid && !isAdmin) {
                     throw new Error("Permission denied: You can only edit your own items.");
                 }

                console.log("Editing item in Firestore:", itemData);
                 const itemDocRef = doc(db, 'stockItems', itemData.id);
                 const { id, ...updateData } = itemData;

                 const cleanData = Object.entries(updateData).reduce((acc, [key, value]) => {
                     if (value !== undefined) {
                         if (key === 'userId') {
                             if (isAdmin || value === user.uid) {
                                 acc[key as keyof typeof acc] = value;
                             } else {
                                 console.warn("Attempted to change userId without admin rights or mismatch. Skipping userId update.");
                             }
                         } else {
                             acc[key as keyof typeof acc] = value;
                         }
                     }
                     return acc;
                 }, {} as Partial<Omit<StockItem, 'id'>>);

                 if (Object.keys(cleanData).length === 0) {
                     console.log("No changes detected after cleaning data. Skipping update.");
                     return itemData;
                 }
                 console.log("Cleaned data for update:", cleanData);

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
                 if (error.code === 'invalid-argument') {
                     toast({
                         variant: "destructive",
                         title: "Invalid Data Error",
                         description: "There was an issue with the data format provided. (Details: " + error.message + ")",
                     });
                 } else {
                    toast({
                        variant: "destructive",
                        title: "Error Updating Item",
                        description: error.message || `Could not update ${updatedItem?.itemName || 'item'}.`,
                    });
                 }
            },
        });

        // Mutation for deleting an item
        const deleteItemMutation = useMutation({
            mutationFn: async (itemToDelete: StockItem) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");
                 if (itemToDelete.userId !== user.uid && !isAdmin) {
                     throw new Error("Permission denied: You can only delete your own items.");
                 }
                console.log("Deleting item from Firestore:", itemToDelete.id);
                const itemDocRef = doc(db, 'stockItems', itemToDelete.id);
                await deleteDoc(itemDocRef);
                console.log("Item deleted successfully:", itemToDelete.id);
                return itemToDelete.id;
            },
            onSuccess: (itemId) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
                 setIsDeleteDialogOpen(false);
                 const deletedItemName = itemToDelete?.itemName || 'Item';
                 setItemToDelete(null);
                 toast({
                     variant: "default",
                     title: "Item Deleted",
                     description: `${deletedItemName} has been removed from stock.`,
                 });
            },
            onError: (error: any, itemBeingDeleted) => {
                 console.error("Error deleting item:", error);
                 const deletedItemName = itemBeingDeleted?.itemName || 'Item';
                 toast({
                     variant: "destructive",
                     title: "Error Deleting Item",
                     description: error.message || `Could not delete ${deletedItemName}.`,
                 });
                  setIsDeleteDialogOpen(false);
                  setItemToDelete(null);
            },
        });


       // Mutation for updating stock (stock out) - using StockOutFormDataSubmit
        const stockOutMutation = useMutation({
            mutationFn: async (data: StockOutFormDataSubmit) => {
                 if (!user || !db) throw new Error("User not authenticated or DB not available");
                  const itemToUpdate = stockItems.find(item => item.id === data.itemId);
                 if (!itemToUpdate) {
                     throw new Error("Item not found.");
                 }
                 if (itemToUpdate.userId !== user.uid && !isAdmin) {
                     throw new Error("Permission denied: Cannot modify stock for items you don't own.");
                 }
                 console.log("Processing stock out for item:", data.itemId, "Quantity:", data.quantity);
                 const itemDocRef = doc(db, 'stockItems', data.itemId);

                 const batch = writeBatch(db);
                 batch.update(itemDocRef, {
                     currentStock: increment(-data.quantity)
                 });

                 await batch.commit();

                console.log("Stock updated successfully for item:", data.itemId);
                return { ...data, itemName: itemToUpdate.itemName };
            },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
                toast({
                    variant: "default",
                    title: "Stock Updated",
                    description: `${data.quantity} units of ${data.itemName || 'item'} removed.`,
                });
            },
            onError: (error: any, data) => {
                console.error("Error updating stock:", error);
                const failedItem = stockItems.find(item => item.id === data.itemId);
                toast({
                    variant: "destructive",
                    title: "Error Updating Stock",
                    description: error.message || `Could not remove stock for ${failedItem?.itemName || 'item'}.`,
                });
            },
        });

      const handleSearchChange = (query: string) => {
        setSearchQuery(query);
      };

      const handleStockOutSubmit = (data: StockOutFormDataSubmit) => { // Adjusted type
         stockOutMutation.mutate(data);
       };

      const handleAddStockSubmit = (data: AddStockFormData) => { // Renamed handler
           addStockMutation.mutate(data); // Use the new mutation
      };

      const handleEditItemSubmit = (data: EditItemFormData) => {
          if (!itemToEdit) return;

          const updatedItem: StockItem = {
              ...itemToEdit,
              itemName: data.itemName,
              currentStock: data.currentStock ?? 0,
              maximumStock: data.maximumStock ?? 0, // Changed from minStock
              barcode: data.barcode || undefined,
              location: data.location || undefined,
              description: data.description || undefined,
              category: data.category || undefined,
              supplier: data.supplier || undefined,
              photoUrl: data.photoUrl || undefined,
              locationCoords: data.locationCoords || undefined,
              userId: itemToEdit.userId || user?.uid || 'unknown',
          };

          if (!updatedItem.userId || updatedItem.userId === 'unknown') {
              console.error("Missing or invalid userId in item data for edit:", updatedItem);
              toast({ variant: "destructive", title: "Error", description: "Cannot update item without a valid user association." });
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
           deleteItemMutation.mutate(itemToDelete);
         }
       };

       const handleSignOut = async () => {
        if (!auth) {
            toast({ variant: "destructive", title: "Sign Out Error", description: "Authentication service not available." });
            return;
        }
        try {
          await signOut(auth);
          queryClient.clear();
          toast({ title: "Signed Out", description: "You have been successfully signed out." });
        } catch (error) {
          console.error("Error signing out:", error);
          toast({ variant: "destructive", title: "Sign Out Error", description: "Could not sign you out." });
        }
      };

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

       const isMutating = stockOutMutation.isPending || addStockMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending; // Updated mutation name

      const handleSaveSettings = (settings: { emailNotifications: boolean; pushNotifications: boolean; lowStockThreshold: number }) => {
        console.log("Saving admin settings:", settings);
        // TODO: Implement saving settings to Firestore or backend
        toast({
            title: "Settings Saved",
            description: "Notification preferences have been updated.",
        });
        setIsSettingsDialogOpen(false);
      };

      return (
        <div className="container mx-auto p-4 md:p-8">
           <header className="mb-8 flex justify-between items-center">
               <div>
                   <h1 className="text-3xl font-bold text-primary">StockWatch</h1>
                   <p className="text-muted-foreground">
                        {isAdmin ? 'Admin Dashboard' : 'Your Stock Management Dashboard'}
                        {user && ` (Logged in as ${user.email})`}
                    </p>
               </div>
               <div className="flex items-center space-x-4">
                    <ThemeToggle />
                     {isAdmin && (
                       <Button variant="outline" size="icon" onClick={() => setIsSettingsDialogOpen(true)} aria-label="Admin Settings">
                          <Settings className="h-5 w-5" />
                       </Button>
                     )}
                    <Button variant="outline" onClick={handleSignOut} disabled={isMutating || !user}>
                        <LogOut className="mr-2 h-4 w-4" /> Sign Out
                    </Button>
               </div>
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
                            onEdit={handleEditClick}
                            onDelete={handleDeleteClick}
                            isAdmin={isAdmin}
                         />
                     )}
                  </CardContent>
               </Card>
            </div>

            {/* Right Column: Action Forms (Stock Out / Add Stock) */}
            <div className="lg:col-span-1">
               <Tabs defaultValue="stock-out" className="w-full">
                   <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="stock-out" disabled={isMutating}>Stock Out</TabsTrigger>
                        <TabsTrigger value="add-stock" disabled={isMutating}>Add Stock</TabsTrigger> {/* Changed value and label */}
                    </TabsList>
                  <TabsContent value="stock-out">
                     <Card className="shadow-md">
                       <CardContent className="p-0 pt-0">
                         <StockOutForm
                            items={stockItems} // Pass all user-visible items
                            onSubmit={handleStockOutSubmit}
                            isLoading={stockOutMutation.isPending}
                          />
                       </CardContent>
                     </Card>
                  </TabsContent>
                  <TabsContent value="add-stock"> {/* Changed value */}
                     <Card className="shadow-md">
                        <CardContent className="p-0 pt-0">
                          <AddStockForm // Renamed component
                            onSubmit={handleAddStockSubmit} // Renamed handler
                            isLoading={addStockMutation.isPending} // Updated mutation name
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

             {/* Admin Settings Dialog */}
             {isAdmin && (
                 <AdminSettingsDialog
                    isOpen={isSettingsDialogOpen}
                    onClose={() => setIsSettingsDialogOpen(false)}
                    onSave={handleSaveSettings}
                    currentSettings={{ emailNotifications: true, pushNotifications: false, lowStockThreshold: 10 }}
                  />
             )}
        </div>
      );
    }


    // Wrap the page component with QueryClientProvider and RequireAuth
    export default function Home() {
        return (
            <QueryClientProvider client={queryClient}>
                <RequireAuth>
                     <StockManagementPageContent />
                </RequireAuth>
            </QueryClientProvider>
        );
    }

    
