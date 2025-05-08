
 'use client';

    import * as React from 'react';
    import { ItemSearch } from '@/components/item-search';
    import { StockDashboard } from '@/components/stock-dashboard';
    import { ActivityFeed } from '@/components/activity-feed'; // Changed from StockMovementDashboard
    import { StockOutForm, type StockOutFormDataSubmit } from '@/components/stock-out-form';
    import { AddStockForm, type AddStockFormData } from '@/components/add-stock-form';
    import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form';
    import { ViewItemDialog } from '@/components/view-item-dialog'; // Import ViewItemDialog
    import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'; // Added CardDescription, CardFooter
    import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
    import type { StockItem, AdminSettings, StockMovementLog, LocationCoords } from '@/types'; // Import AdminSettings & StockMovementLog
    import { useState, useEffect } from 'react';
    import { useToast } from "@/hooks/use-toast";
    import { QueryClient, QueryClientProvider, useQuery, useMutation, QueryCache } from '@tanstack/react-query';
    import { db, auth } from '@/lib/firebase/firebase';
    import { collection, getDocs, addDoc, updateDoc, doc, increment, deleteDoc, writeBatch, query, where, runTransaction, setDoc, getDoc, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore'; // Import Timestamp, deleteField
    import { Skeleton } from '@/components/ui/skeleton';
    import { Button } from '@/components/ui/button';
    import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
    import { AlertTriangle, Loader2, Trash2, LogOut, Settings, Camera, XCircle, VideoOff, BarChart2, BrainCircuit, Bot, Settings2 } from 'lucide-react'; // Added new icons
    import { RequireAuth } from '@/components/auth/require-auth';
    import { useAuth } from '@/context/auth-context';
    import { signOut } from 'firebase/auth';
    import { ThemeProvider } from "@/components/theme-provider";
    import { ThemeToggle } from "@/components/theme-toggle";
    import { AdminSettingsDialog } from '@/components/admin-settings-dialog';
    import { searchItemByPhoto, type SearchItemByPhotoInput } from '@/ai/flows/search-item-by-photo-flow';
    import { DashboardKPIs, type KPIData } from '@/components/dashboard-kpis'; // Import KPIs
    import { CategoryChart } from '@/components/charts/category-chart'; // Import charts
    import { LocationChart } from '@/components/charts/location-chart';
    import { MovementTrendChart } from '@/components/charts/movement-trend-chart';
    import { PageHeader } from '@/components/page-header'; // Import PageHeader
    import { ActionsPanel } from '@/components/actions-panel'; // Import ActionsPanel

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

    // Default settings if none are found in Firestore
    const defaultAdminSettings: AdminSettings = {
        emailNotifications: true,
        pushNotifications: false,
        lowStockThreshold: 10,
        workflowApprovalRequired: false, // Default workflow setting
        defaultLeadTime: 7, // Default lead time setting
    };


    function StockManagementPageContent() {
      const { user, isAdmin, loading: authLoading } = useAuth(); // Destructure loading state
      const [searchQuery, setSearchQuery] = useState('');
      const { toast } = useToast();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
      const [isViewDialogOpen, setIsViewDialogOpen] = useState(false); // State for View dialog
      const [itemToView, setItemToView] = useState<StockItem | null>(null); // State for item to view
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
      const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
      const [isPhotoSearchOpen, setIsPhotoSearchOpen] = useState(false);
      const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
      const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
      const videoRef = React.useRef<HTMLVideoElement>(null);
      const canvasRef = React.useRef<HTMLCanvasElement>(null);

        // Fetch Admin Settings (only if user is admin)
        const { data: adminSettings = defaultAdminSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery<AdminSettings>({
            queryKey: ['adminSettings'],
            queryFn: async () => {
                if (!isAdmin || !db) return defaultAdminSettings; // Only fetch if admin and db exists
                console.log("Fetching admin settings from Firestore...");
                const settingsDocRef = doc(db, 'settings', 'admin'); // Assuming a single 'admin' settings doc
                try {
                    const docSnap = await getDoc(settingsDocRef);
                    if (docSnap.exists()) {
                        const fetchedSettings = docSnap.data() as AdminSettings;
                        console.log("Admin settings found:", fetchedSettings);
                        // Merge fetched settings with defaults to ensure all keys exist
                        return { ...defaultAdminSettings, ...fetchedSettings };
                    } else {
                        console.log("No admin settings found, using defaults.");
                        // Optionally create default settings document here if it doesn't exist
                        // await setDoc(settingsDocRef, defaultAdminSettings);
                        return defaultAdminSettings;
                    }
                } catch (error) {
                     console.error("Error fetching admin settings:", error);
                     toast({ variant: "destructive", title: "Error Loading Settings", description: "Could not load admin settings." });
                     return defaultAdminSettings; // Return default on error
                }
            },
            enabled: isAdmin && !!user, // Only enable if user is admin and logged in
            staleTime: 15 * 60 * 1000, // Cache settings for 15 minutes
            refetchOnWindowFocus: false, // Less critical to refetch settings on focus
        });


      // Fetch stock items
      const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch: refetchItems } = useQuery<StockItem[]>({
        queryKey: ['stockItems', user?.uid],
        queryFn: async () => {
           if (!user) return [];
           console.log("Fetching stock items from Firestore for user:", user.uid);
           try {
               const itemsCol = collection(db, 'stockItems');
               const q = isAdmin ? query(itemsCol) : query(itemsCol, where("userId", "==", user.uid)); // Admin sees all items
               const itemSnapshot = await getDocs(q);

               const itemsList = itemSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
              } as StockItem));
              console.log(`Fetched ${itemsList.length} items.`);

              // Add explicit type annotation for the mapped item
              return itemsList.map((item: StockItem) => ({
                  ...item,
                  currentStock: Number(item.currentStock ?? 0),
                  minimumStock: item.minimumStock !== undefined ? Number(item.minimumStock) : undefined, // Keep undefined if not set
                  itemName: item.itemName || 'Unknown Item',
                  barcode: item.barcode || undefined,
                  location: item.location || undefined,
                  description: item.description || undefined,
                  category: item.category || undefined,
                  supplier: item.supplier || undefined,
                  photoUrl: item.photoUrl || undefined,
                  locationCoords: item.locationCoords || undefined,
                  userId: item.userId || user.uid, // Ensure userId is present
                  costPrice: item.costPrice !== undefined ? Number(item.costPrice) : undefined, // Ensure optional fields are typed correctly
                  leadTime: item.leadTime !== undefined ? Number(item.leadTime) : undefined,
                  batchNumber: item.batchNumber || undefined,
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
         enabled: !!user, // Enable only when user is logged in
         staleTime: 5 * 60 * 1000,
         refetchOnWindowFocus: true,
      });

      // Fetch stock movement logs
      const { data: stockMovements = [], isLoading: isLoadingMovements, refetch: refetchMovements } = useQuery<StockMovementLog[]>({
         queryKey: ['stockMovements', user?.uid],
         queryFn: async () => {
             if (!user) return [];
             console.log("Fetching stock movements for user:", user.uid);
             const logsCol = collection(db, 'stockMovements');
             const q = isAdmin ? query(logsCol) : query(logsCol, where("userId", "==", user.uid));
             try {
                const logSnapshot = await getDocs(q);
                 const logsList = logSnapshot.docs.map(doc => ({
                     id: doc.id,
                     ...doc.data(),
                     timestamp: doc.data().timestamp as Timestamp // Ensure timestamp is correctly typed
                 } as StockMovementLog));
                 console.log(`Fetched ${logsList.length} stock movements.`);
                 logsList.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                 return logsList;
             } catch (err) {
                 console.error("Error fetching stock movements:", err);
                 toast({ variant: "destructive", title: "Error Loading Movements", description: "Could not load stock movement history." });
                 throw err;
             }
         },
         enabled: !!user, // Enable only when user is logged in
         staleTime: 2 * 60 * 1000, // Cache for 2 minutes
         refetchOnWindowFocus: true,
      });

      // Helper function to log stock movements
      const logStockMovement = async (item: StockItem, quantityChange: number, newStockLevel: number, type: 'in' | 'out' | 'restock' = quantityChange > 0 ? 'in' : 'out') => {
        if (!user || !db) return;
        try {
            const logData: Omit<StockMovementLog, 'id' | 'timestamp'> & { timestamp: any } = {
                itemId: item.id,
                itemName: item.itemName,
                quantityChange: quantityChange,
                newStockLevel: newStockLevel,
                type: type, // Use provided type
                userId: user.uid,
                userEmail: user.email || undefined,
                timestamp: serverTimestamp(), // Use server timestamp
                batchNumber: item.batchNumber || undefined, // Include batch number if available
            };
            await addDoc(collection(db, 'stockMovements'), logData);
            console.log("Stock movement logged:", logData);
            queryClient.invalidateQueries({ queryKey: ['stockMovements', user?.uid] }); // Invalidate movement logs cache
        } catch (error) {
            console.error("Error logging stock movement:", error);
            toast({ variant: "destructive", title: "Logging Error", description: "Could not log stock movement." });
        }
    };


        // Mutation for adding stock (handles both new items and adding to existing)
        const addStockMutation = useMutation({
            mutationFn: async (formData: AddStockFormData) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");

                const { itemName, quantity, barcode } = formData;
                console.log("Adding stock:", formData);

                // --- Duplicate Barcode Check ---
                if (barcode) {
                    const barcodeQuery = query(collection(db, 'stockItems'), where("barcode", "==", barcode));
                    const barcodeSnapshot = await getDocs(barcodeQuery);
                    if (!barcodeSnapshot.empty) {
                        let isUpdatingExisting = false;
                        if (formData.itemName) {
                             const nameQuery = query(collection(db, 'stockItems'), where("itemName", "==", formData.itemName), where("userId", "==", user.uid));
                             const nameSnapshot = await getDocs(nameQuery);
                             if (!nameSnapshot.empty && nameSnapshot.docs[0].id === barcodeSnapshot.docs[0].id) {
                                 isUpdatingExisting = true;
                             }
                        }
                         if (!isUpdatingExisting) {
                             const existingItem = barcodeSnapshot.docs[0].data();
                              toast({
                                  variant: "destructive",
                                  title: "Duplicate Barcode",
                                  description: `Barcode ${barcode} is already assigned to item "${existingItem.itemName}". Please use a unique barcode or leave it empty.`,
                                  duration: 7000,
                              });
                             throw new Error("Duplicate barcode detected.");
                         }
                    }
                 }
                 // --- End Duplicate Barcode Check ---

                const itemsCol = collection(db, 'stockItems');
                let targetItemQuery;

                const barcodeQueryConstraint = barcode ? [where("barcode", "==", barcode)] : [];
                const nameQueryConstraint = itemName ? [where("itemName", "==", itemName)] : [];
                const baseConstraints = !isAdmin ? [where("userId", "==", user.uid)] : [];
                const queryConstraints = barcode
                    ? [...baseConstraints, ...barcodeQueryConstraint]
                    : [...baseConstraints, ...nameQueryConstraint];

                 if (queryConstraints.length > (isAdmin ? 0 : 1)) {
                     targetItemQuery = query(itemsCol, ...queryConstraints);
                 } else {
                      targetItemQuery = null;
                 }

                 let querySnapshot;
                  if (targetItemQuery) {
                      querySnapshot = await getDocs(targetItemQuery);
                  }

                // Prepare data for update/add, including new optional fields
                 const dataToSave = Object.entries(formData).reduce((acc, [key, value]) => {
                      if (value !== undefined && key !== 'quantity') {
                         if (key === 'minimumStock' && typeof value === 'string') {
                            acc[key as keyof typeof acc] = value === '' ? undefined : Number(value);
                          } else if ((key === 'costPrice' || key === 'leadTime') && typeof value === 'string') {
                             acc[key as keyof typeof acc] = value === '' ? undefined : Number(value);
                          } else {
                             acc[key as keyof typeof acc] = value === '' ? undefined : value;
                          }
                      }
                      return acc;
                  }, {} as Partial<Omit<StockItem, 'id' | 'userId' | 'currentStock'>> & { userId?: string });

                  dataToSave.userId = user.uid;

                 if (querySnapshot && !querySnapshot.empty) {
                     // --- Item exists, update stock ---
                     const existingDoc = querySnapshot.docs[0];
                     const itemDocRef = doc(db, 'stockItems', existingDoc.id);
                     console.log("Item exists, updating stock for ID:", existingDoc.id);
                     let finalStockLevel = 0;
                     let existingItemData: StockItem | null = null;

                      await runTransaction(db, async (transaction) => {
                           const sfDoc = await transaction.get(itemDocRef);
                           if (!sfDoc.exists()) {
                               throw "Document does not exist!";
                           }
                           const currentData = sfDoc.data() as Omit<StockItem, 'id'>;
                           existingItemData = { ...currentData, id: existingDoc.id };
                           const updatedData = { ...dataToSave };

                           // Merge optional fields correctly (keep existing if not provided in form)
                           updatedData.minimumStock = formData.minimumStock ?? currentData.minimumStock;
                           updatedData.costPrice = formData.costPrice ?? currentData.costPrice;
                           updatedData.leadTime = formData.leadTime ?? currentData.leadTime;
                           updatedData.batchNumber = formData.batchNumber ?? currentData.batchNumber;

                            const finalUpdateData = Object.keys(updatedData).reduce((acc, key) => {
                               if (updatedData[key as keyof typeof updatedData] !== undefined) {
                                   acc[key as keyof typeof acc] = updatedData[key as keyof typeof updatedData];
                               } else {
                                   // If the value became undefined, delete the field
                                   acc[key as keyof typeof acc] = deleteField();
                               }
                               return acc;
                           }, {} as Record<string, any>);


                           const newStock = (currentData.currentStock || 0) + quantity;
                           finalStockLevel = newStock;
                           transaction.update(itemDocRef, { ...finalUpdateData, currentStock: newStock });
                       });

                      if (existingItemData) {
                           await logStockMovement(existingItemData, quantity, finalStockLevel, 'in'); // Log as 'in'
                      }

                      const updatedDocSnap = await getDoc(itemDocRef);
                      const resultData = { ...updatedDocSnap.data(), id: updatedDocSnap.id } as StockItem;

                      // Check for low stock after update
                      const effectiveThreshold = resultData.minimumStock ?? adminSettings.lowStockThreshold;
                      if (resultData.currentStock > 0 && resultData.currentStock <= effectiveThreshold) {
                           toast({
                               variant: "default",
                               title: "Low Stock Warning",
                               description: `${resultData.itemName} stock is low (${resultData.currentStock} <= ${effectiveThreshold}). Consider restocking.`,
                               duration: 7000,
                            });
                       }

                     return { ...resultData, quantityAdded: quantity };
                 } else {
                     // --- Item does not exist, add new ---
                     console.log("Item does not exist, adding new item:", itemName);
                     const newItemDataWithStock = {
                         ...dataToSave,
                         currentStock: quantity,
                         userId: user.uid,
                     };

                      const finalNewItemData = Object.entries(newItemDataWithStock).reduce((acc, [key, value]) => {
                          if (value !== undefined) {
                             acc[key as keyof typeof acc] = value;
                          }
                          return acc;
                      }, {} as Partial<StockItem>);


                     const docRef = await addDoc(itemsCol, finalNewItemData);
                     console.log("New item added with ID:", docRef.id);

                     const newItem = { id: docRef.id, ...finalNewItemData } as StockItem;

                     await logStockMovement(newItem, quantity, newItem.currentStock, 'in'); // Log as 'in'

                      const effectiveThreshold = newItem.minimumStock ?? adminSettings.lowStockThreshold;
                      if (newItem.currentStock > 0 && newItem.currentStock <= effectiveThreshold) {
                           toast({
                               variant: "default",
                               title: "Low Stock Warning",
                               description: `${newItem.itemName} stock is low (${newItem.currentStock} <= ${effectiveThreshold}). Consider restocking.`,
                               duration: 7000,
                           });
                       }

                     return { ...newItem, quantityAdded: quantity };
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
                    description: error.message === "Duplicate barcode detected." ? error.message : error.message || "Could not add stock. Please try again.",
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

                 // --- Duplicate Barcode Check (during edit) ---
                 if (itemData.barcode && itemData.barcode.trim() !== '') {
                      const barcodeQuery = query(collection(db, 'stockItems'), where("barcode", "==", itemData.barcode));
                      const barcodeSnapshot = await getDocs(barcodeQuery);
                      if (!barcodeSnapshot.empty && barcodeSnapshot.docs[0].id !== itemData.id) {
                          const existingItem = barcodeSnapshot.docs[0].data();
                          toast({
                               variant: "destructive",
                               title: "Duplicate Barcode",
                               description: `Barcode ${itemData.barcode} is already assigned to item "${existingItem.itemName}". Please use a unique barcode.`,
                               duration: 7000,
                           });
                          throw new Error("Duplicate barcode detected.");
                      }
                  }
                 // --- End Duplicate Barcode Check ---

                console.log("Editing item in Firestore:", itemData);
                 const itemDocRef = doc(db, 'stockItems', itemData.id);
                 const { id, ...updateData } = itemData;

                  let originalStock = 0;
                  try {
                       const currentDoc = await getDoc(itemDocRef);
                       if (currentDoc.exists()) {
                           originalStock = currentDoc.data().currentStock ?? 0;
                       }
                   } catch (e) { console.error("Could not fetch original stock before edit:", e); }

                 // Clean data: remove undefined fields, ensure numbers are numbers
                 const cleanData = Object.entries(updateData).reduce((acc, [key, value]) => {
                      if (value !== undefined) {
                          if (key === 'currentStock' || key === 'minimumStock' || key === 'costPrice' || key === 'leadTime') {
                              acc[key as keyof typeof acc] = value === '' ? undefined : Number(value); // Allow empty string to remove numeric value
                          } else if (key === 'userId') {
                              if (isAdmin || value === user.uid) {
                                  acc[key as keyof typeof acc] = value;
                              }
                          } else {
                                acc[key as keyof typeof acc] = value === '' ? undefined : value;
                          }
                      } else {
                           // Explicitly set to undefined if value is undefined (e.g. from form state)
                           acc[key as keyof typeof acc] = undefined;
                      }
                      return acc;
                  }, {} as Partial<Omit<StockItem, 'id'>>);


                  // Use deleteField() for fields that should be explicitly removed if now undefined
                  const finalUpdateData: Record<string, any> = {};
                  const originalItemForCheck = await getDoc(itemDocRef).then(snap => snap.data() || {}); // Get original data for check

                  for (const key in cleanData) {
                     const typedKey = key as keyof typeof cleanData;
                     const newValue = cleanData[typedKey];
                     const originalValue = originalItemForCheck[typedKey];

                      if (newValue === undefined && originalValue !== undefined) {
                         finalUpdateData[key] = deleteField(); // Use deleteField() to remove the field
                      } else if (newValue !== undefined) {
                          finalUpdateData[key] = newValue;
                      }
                     // If newValue is undefined AND originalValue was undefined, do nothing
                  }


                 if (Object.keys(finalUpdateData).length === 0) {
                     console.log("No changes detected after cleaning data. Skipping update.");
                     return itemData; // Return original data if no changes
                 }
                 console.log("Final cleaned data for update:", finalUpdateData);

                await updateDoc(itemDocRef, finalUpdateData);
                console.log("Item updated successfully:", itemData.id);

                const newStock = finalUpdateData.currentStock;
                 if (newStock !== undefined && newStock !== originalStock) {
                     const quantityChange = newStock - originalStock;
                     const updatedItemForLog: StockItem = { ...itemData, currentStock: newStock };
                     await logStockMovement(updatedItemForLog, quantityChange, newStock); // Type determined by change
                 }

                 const updatedDocSnap = await getDoc(itemDocRef);
                 const updatedItemResult = { id: updatedDocSnap.id, ...updatedDocSnap.data() } as StockItem;

                 const effectiveThreshold = updatedItemResult.minimumStock ?? adminSettings.lowStockThreshold;
                 if (updatedItemResult.currentStock > 0 && updatedItemResult.currentStock <= effectiveThreshold) {
                      toast({
                           variant: "default",
                           title: "Low Stock Warning",
                           description: `${updatedItemResult.itemName} stock is now low (${updatedItemResult.currentStock} <= ${effectiveThreshold}). Consider restocking.`,
                           duration: 7000,
                       });
                  }

                return updatedItemResult;
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
            onError: (error: any, originalItemData) => {
                console.error("Error updating item:", error);
                 if (error.code === 'invalid-argument') {
                     toast({
                         variant: "destructive",
                         title: "Invalid Data Error",
                         description: "There was an issue with the data format provided. Check numeric fields. (Details: " + error.message + ")",
                     });
                 } else if (error.message === "Duplicate barcode detected.") {
                      toast({
                          variant: "destructive",
                          title: "Duplicate Barcode",
                          description: error.message,
                      });
                 }
                 else {
                    toast({
                        variant: "destructive",
                        title: "Error Updating Item",
                        description: error.message || `Could not update ${originalItemData?.itemName || 'item'}.`,
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

                 if (itemToDelete.currentStock > 0) {
                    await logStockMovement(itemToDelete, -itemToDelete.currentStock, 0, 'out'); // Log as 'out'
                 }
                return itemToDelete.id;
            },
            onSuccess: (itemId) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid] });
                 queryClient.invalidateQueries({ queryKey: ['stockMovements', user?.uid] }); // Invalidate movements too
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

                 let updatedStockLevel = 0;
                 await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(itemDocRef);
                    if (!sfDoc.exists()) {
                        throw "Document does not exist!";
                    }
                    const currentStock = sfDoc.data().currentStock || 0;
                    updatedStockLevel = currentStock - data.quantity;
                     if (updatedStockLevel < 0) {
                        throw new Error("Stock out quantity exceeds available stock.");
                    }
                    transaction.update(itemDocRef, { currentStock: increment(-data.quantity) });
                 });


                 console.log("Stock updated successfully for item:", data.itemId);

                  await logStockMovement(itemToUpdate, -data.quantity, updatedStockLevel, 'out'); // Log as 'out'

                 const effectiveThreshold = itemToUpdate.minimumStock ?? adminSettings.lowStockThreshold;
                 if (updatedStockLevel > 0 && updatedStockLevel <= effectiveThreshold) {
                      toast({
                           variant: "default",
                           title: "Low Stock Warning",
                           description: `${itemToUpdate.itemName} stock is now low (${updatedStockLevel} <= ${effectiveThreshold}). Consider restocking.`,
                           duration: 7000,
                       });
                  }

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

         // Mutation for saving admin settings
        const saveSettingsMutation = useMutation({
            mutationFn: async (newSettings: AdminSettings) => {
                if (!isAdmin || !db) throw new Error("Permission denied or DB not available.");
                console.log("Saving admin settings to Firestore:", newSettings);
                const settingsDocRef = doc(db, 'settings', 'admin');
                await setDoc(settingsDocRef, newSettings, { merge: true }); // Use merge to only update provided fields
                return newSettings;
            },
            onSuccess: (savedSettings) => {
                 queryClient.setQueryData(['adminSettings'], (old: AdminSettings | undefined) => ({...defaultAdminSettings, ...old, ...savedSettings})); // Optimistically update cache
                 refetchSettings(); // Also refetch to ensure consistency
                toast({
                    title: "Settings Saved",
                    description: "Admin settings have been updated.",
                });
                setIsSettingsDialogOpen(false);
            },
            onError: (error: any) => {
                console.error("Error saving admin settings:", error);
                toast({
                    variant: "destructive",
                    title: "Error Saving Settings",
                    description: error.message || "Could not save settings.",
                });
            },
        });


        // --- Photo Search ---
        React.useEffect(() => {
            let stream: MediaStream | null = null;
            const getCameraPermission = async () => {
                if (!isPhotoSearchOpen) {
                    if (videoRef.current?.srcObject) {
                        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                        videoRef.current.srcObject = null;
                    }
                    setHasCameraPermission(null);
                    return;
                }

                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    console.error('Error accessing camera for photo search:', error);
                    setHasCameraPermission(false);
                    setIsPhotoSearchOpen(false);
                    toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions for photo search.' });
                }
            };
            getCameraPermission();
            return () => {
                 if (videoRef.current?.srcObject) {
                    (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                    videoRef.current.srcObject = null;
                }
             };
        }, [isPhotoSearchOpen, toast]);

        const handlePhotoSearchCapture = async () => {
             if (!hasCameraPermission || !videoRef.current || !canvasRef.current || photoSearchLoading) {
                 toast({ variant: "destructive", title: "Camera Not Ready or Busy" });
                 return;
             }
              const video = videoRef.current;
              const canvas = canvasRef.current;
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              const context = canvas.getContext('2d');
              if (context) {
                 context.drawImage(video, 0, 0, canvas.width, canvas.height);
                 const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

                 if (dataUrl && dataUrl !== 'data:,') {
                      setPhotoSearchLoading(true);
                     try {
                         const input: SearchItemByPhotoInput = { photoDataUri: dataUrl };
                         console.log("Sending image data URI for search...");
                         const result = await searchItemByPhoto(input);
                         console.log("Photo search result:", result);

                         if (result.itemName) {
                            setSearchQuery(result.itemName);
                            toast({ title: "Item Found by Photo", description: `Searching for "${result.itemName}".` });
                            setIsPhotoSearchOpen(false);
                         } else {
                            toast({ variant: "destructive", title: "Item Not Found", description: "Could not identify an item from the photo." });
                         }
                     } catch (error: any) {
                         console.error("Error searching item by photo:", error);
                         toast({ variant: "destructive", title: "Photo Search Error", description: error.message || "Failed to search by photo." });
                     } finally {
                         setPhotoSearchLoading(false);
                     }
                 } else {
                     toast({ variant: "destructive", title: "Capture Error", description: "Could not capture image data." });
                 }
             } else {
                 toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
             }
         };


      const handleSearchChange = (query: string) => {
        setSearchQuery(query);
      };

      const handleStockOutSubmit = (data: StockOutFormDataSubmit) => {
         stockOutMutation.mutate(data);
       };

      const handleAddStockSubmit = (data: AddStockFormData) => {
           addStockMutation.mutate(data);
      };

      const handleEditItemSubmit = (data: EditItemFormData) => {
          if (!itemToEdit) return;

          // Include optional fields from form data if they exist
          const updatedItem: StockItem = {
              id: itemToEdit.id,
              userId: itemToEdit.userId || user?.uid || 'unknown',
              itemName: data.itemName,
              currentStock: data.currentStock ?? 0,
              minimumStock: data.minimumStock === undefined || data.minimumStock === null ? undefined : Number(data.minimumStock),
              barcode: data.barcode || undefined,
              location: data.location || undefined,
              description: data.description || undefined,
              category: data.category || undefined,
              supplier: data.supplier || undefined,
              photoUrl: data.photoUrl || undefined,
              locationCoords: data.locationCoords || undefined,
              costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
              leadTime: data.leadTime === undefined || data.leadTime === null ? undefined : Number(data.leadTime),
              batchNumber: data.batchNumber || undefined,
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

       const handleViewClick = (item: StockItem) => {
         setItemToView(item);
         setIsViewDialogOpen(true);
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

       const isMutating = stockOutMutation.isPending || addStockMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending || saveSettingsMutation.isPending || photoSearchLoading;
       const isLoading = authLoading || isLoadingItems || isLoadingSettings || isLoadingMovements;


        // Trigger low stock alert checks when items or settings change
        useEffect(() => {
            if (!isLoading && stockItems.length > 0) {
                let lowStockMessages: string[] = [];
                stockItems.forEach(item => {
                    const effectiveThreshold = item.minimumStock !== undefined ? item.minimumStock : adminSettings.lowStockThreshold;
                    if (item.currentStock > 0 && item.currentStock <= effectiveThreshold) {
                         lowStockMessages.push(`${item.itemName} (${item.currentStock})`);
                    }
                });

                if (lowStockMessages.length > 0) {
                    toast({
                        variant: "destructive",
                        title: `Low Stock Alert (${lowStockMessages.length} item${lowStockMessages.length > 1 ? 's' : ''})`,
                        description: `Restock needed for: ${lowStockMessages.join(', ')}.`,
                        duration: 10000,
                    });
                    if (adminSettings.emailNotifications) {
                        console.log("TODO: Send email notification for low stock:", lowStockMessages);
                    }
                     if (adminSettings.pushNotifications) {
                         console.log("TODO: Send push notification for low stock:", lowStockMessages);
                     }
                }
            }
        }, [stockItems, adminSettings, isLoading, toast]);


        const handleSaveSettings = (settings: AdminSettings) => {
            saveSettingsMutation.mutate(settings);
        };


        const handleRetryFetch = () => {
             if (fetchError) refetchItems();
             refetchMovements();
         };

         // Calculate KPIs
         const kpiData: KPIData | null = React.useMemo(() => {
             if (isLoading) return null;

              const totalItems = stockItems.length;
              const lowStockItems = stockItems.filter(item => {
                   const threshold = item.minimumStock ?? adminSettings.lowStockThreshold;
                   return item.currentStock > 0 && item.currentStock <= threshold;
              }).length;
              const outOfStockItems = stockItems.filter(item => item.currentStock === 0).length;

              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date();
              todayEnd.setHours(23, 59, 59, 999);

              const todayMovements = stockMovements.filter(log => {
                   const logDate = log.timestamp.toDate();
                   return logDate >= todayStart && logDate <= todayEnd;
              });

              const todayIn = todayMovements.filter(log => log.type === 'in').length;
              const todayOut = todayMovements.filter(log => log.type === 'out').length;
              const todayRestock = todayMovements.filter(log => log.type === 'restock').length;

              return {
                  totalItems,
                  lowStockItems,
                  outOfStockItems,
                  todayIn,
                  todayOut,
                  todayRestock,
              };
          }, [stockItems, stockMovements, adminSettings, isLoading]);


         // Prepare data for charts
         const categoryChartData = React.useMemo(() => {
              if (isLoading) return [];
              const counts: { [key: string]: number } = {};
              stockItems.forEach(item => {
                  const category = item.category || 'Uncategorized';
                  counts[category] = (counts[category] || 0) + 1;
              });
              return Object.entries(counts).map(([name, value]) => ({ name, value }));
          }, [stockItems, isLoading]);

          const locationChartData = React.useMemo(() => {
              if (isLoading) return [];
              const counts: { [key: string]: number } = {};
              stockItems.forEach(item => {
                   let locationLabel = item.location?.trim();
                   if (!locationLabel && item.locationCoords) {
                       locationLabel = `GPS (${item.locationCoords.latitude.toFixed(2)}, ${item.locationCoords.longitude.toFixed(2)})`;
                   }
                   locationLabel = locationLabel || 'Unknown Location';
                   counts[locationLabel] = (counts[locationLabel] || 0) + item.currentStock;
              });
              return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
          }, [stockItems, isLoading]);

          const movementTrendData = React.useMemo(() => {
              if (isLoadingMovements) return [];
              const weeklyMovements: { [week: string]: { in: number; out: number; restock: number } } = {}; // Added restock
               const now = new Date();
               const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

               stockMovements
                   .filter(log => log.timestamp.toDate() >= oneWeekAgo)
                   .forEach(log => {
                       const date = log.timestamp.toDate();
                       const weekStart = new Date(date);
                       weekStart.setDate(date.getDate() - date.getDay());
                       const weekKey = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;

                       if (!weeklyMovements[weekKey]) {
                           weeklyMovements[weekKey] = { in: 0, out: 0, restock: 0 };
                       }
                       if (log.type === 'in') {
                           weeklyMovements[weekKey].in += log.quantityChange;
                       } else if (log.type === 'out') {
                           weeklyMovements[weekKey].out += Math.abs(log.quantityChange);
                       } else if (log.type === 'restock') {
                            weeklyMovements[weekKey].restock += log.quantityChange; // Assuming restock is positive
                       }
                   });

               return Object.entries(weeklyMovements)
                   .map(([week, data]) => ({ name: week, StockIn: data.in, StockOut: data.out, Restock: data.restock })) // Added Restock
                   .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
          }, [stockMovements, isLoadingMovements]);


      return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
           <PageHeader
             user={user}
             isAdmin={isAdmin}
             isLoading={isLoading}
             onSettingsClick={() => setIsSettingsDialogOpen(true)}
             onSignOutClick={handleSignOut}
             lastLogin={user?.metadata?.lastSignInTime ? new Date(user.metadata.lastSignInTime).toLocaleString() : undefined}
            />

            {/* KPIs */}
            <DashboardKPIs data={kpiData} isLoading={isLoading} />

           {/* Charts */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-6">
               <Card className="shadow-md md:col-span-1">
                  <CardHeader><CardTitle className="text-lg">Items by Category</CardTitle></CardHeader>
                  <CardContent>
                      {isLoading ? <Skeleton className="h-48 w-full" /> : <CategoryChart data={categoryChartData} />}
                  </CardContent>
               </Card>
                <Card className="shadow-md md:col-span-1">
                   <CardHeader><CardTitle className="text-lg">Stock by Location</CardTitle></CardHeader>
                   <CardContent>
                       {isLoading ? <Skeleton className="h-48 w-full" /> : <LocationChart data={locationChartData} />}
                   </CardContent>
                </Card>
               <Card className="shadow-md md:col-span-1">
                  <CardHeader><CardTitle className="text-lg">Weekly Movement Trend</CardTitle></CardHeader>
                  <CardContent>
                     {isLoadingMovements ? <Skeleton className="h-48 w-full" /> : <MovementTrendChart data={movementTrendData} />}
                  </CardContent>
               </Card>
           </div>


           {/* Main Content Area */}
           <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left/Center Column: Stock Table & Forms */}
              <div className="lg:col-span-2 space-y-6">
                 <Card className="shadow-md">
                     <CardHeader>
                         <CardTitle className="text-2xl">Stock Levels {isAdmin && '(Admin View)'}</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                         <ItemSearch
                             searchQuery={searchQuery}
                             onSearchChange={handleSearchChange}
                             placeholder="Search items by name, barcode, category, etc..."
                          />
                         {isLoadingItems && (
                          <div className="space-y-2 pt-4">
                             <Skeleton className="h-8 w-full" />
                             <Skeleton className="h-12 w-full" />
                             <Skeleton className="h-12 w-full" />
                          </div>
                         )}
                         {fetchError && (
                            <Alert variant="destructive" className="mt-4">
                                 <AlertTriangle className="h-4 w-4" />
                                 <AlertTitle>Error Loading Stock</AlertTitle>
                                 <AlertDescription>
                                     Could not load stock items. {(fetchError as Error).message}
                                     <Button onClick={handleRetryFetch} variant="link" className="ml-2 p-0 h-auto text-destructive-foreground underline">Retry</Button>
                                 </AlertDescription>
                             </Alert>
                         )}
                         {!isLoadingItems && !fetchError && (
                             <StockDashboard
                                 items={filteredItems}
                                 onView={handleViewClick}
                                 onEdit={handleEditClick}
                                 onDelete={handleDeleteClick}
                                 isAdmin={isAdmin}
                                 globalLowStockThreshold={adminSettings.lowStockThreshold}
                              />
                          )}
                      </CardContent>
                   </Card>

                    {/* Add/Out Forms */}
                    <Card className="shadow-md">
                         <Tabs defaultValue="add-stock" className="w-full">
                            <CardHeader className="p-4 border-b">
                                 <TabsList className="grid w-full grid-cols-2">
                                     <TabsTrigger value="add-stock">Add/Restock</TabsTrigger>
                                     <TabsTrigger value="stock-out">Stock Out</TabsTrigger>
                                 </TabsList>
                            </CardHeader>
                           <TabsContent value="add-stock">
                              <CardContent className="p-4">
                                 <AddStockForm
                                      onSubmit={handleAddStockSubmit}
                                      isLoading={addStockMutation.isPending}
                                    />
                              </CardContent>
                            </TabsContent>
                           <TabsContent value="stock-out">
                              <CardContent className="p-4">
                                 <StockOutForm
                                      items={stockItems}
                                      onSubmit={handleStockOutSubmit}
                                      isLoading={stockOutMutation.isPending}
                                    />
                              </CardContent>
                            </TabsContent>
                         </Tabs>
                    </Card>
               </div>


              {/* Right Column: Actions, Feed & Advanced Features */}
              <div className="lg:col-span-1 space-y-6 flex flex-col">
                 <ActionsPanel
                    onPhotoSearchClick={() => setIsPhotoSearchOpen(true)}
                    onAddStockClick={() => { /* Consider opening Add Stock Tab directly */ }}
                    onStockOutClick={() => { /* Consider opening Stock Out Tab directly */ }}
                    isLoading={isMutating || hasCameraPermission === false || isLoading}
                    frequentlyUsedItems={[]} // TODO: Populate frequently used items
                    onQuickAction={(action, item) => {
                        // Simple quick actions - consider enhancing logic (e.g., restock template)
                        if (action === 'in') handleAddStockSubmit({ itemName: item.itemName, quantity: 1, barcode: item.barcode });
                        else if (action === 'out') handleStockOutSubmit({ itemId: item.id, quantity: 1 });
                    }}
                  />

                    {/* Activity Feed */}
                   <ActivityFeed
                      movements={stockMovements}
                      isLoading={isLoadingMovements}
                    />

                   {/* Placeholders for Advanced Features */}
                   <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><BarChart2 className="h-5 w-5"/>Advanced Reporting</CardTitle>
                            <CardDescription>Analyze inventory performance.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Inventory Turnover (Coming Soon)</li>
                                <li>Cost Analysis (Coming Soon)</li>
                                <li>Supplier Performance (Coming Soon)</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                             <Button variant="outline" size="sm" disabled>View Reports</Button>
                        </CardFooter>
                   </Card>

                   <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><BrainCircuit className="h-5 w-5"/>Predictive Analytics</CardTitle>
                            <CardDescription>Forecast demand and optimize stock.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Demand Forecasting (Coming Soon)</li>
                                <li>Automatic Reorder Points (Coming Soon)</li>
                             </ul>
                        </CardContent>
                        <CardFooter>
                             <Button variant="outline" size="sm" disabled>View Predictions</Button>
                         </CardFooter>
                   </Card>

                   <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2"><Bot className="h-5 w-5"/>Automated Workflows</CardTitle>
                            <CardDescription>Streamline inventory processes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Auto Purchase Orders (Coming Soon)</li>
                                <li>Movement Approvals (Coming Soon)</li>
                             </ul>
                        </CardContent>
                         <CardFooter>
                             <Button variant="outline" size="sm" disabled>Configure Workflows</Button>
                         </CardFooter>
                   </Card>

                   <Card className="shadow-md">
                       <CardHeader>
                           <CardTitle className="text-lg flex items-center gap-2"><Settings2 className="h-5 w-5"/>Integrations</CardTitle>
                            <CardDescription>Connect with other platforms.</CardDescription>
                       </CardHeader>
                       <CardContent>
                             <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                                <li>Supplier Portals (Coming Soon)</li>
                                <li>Shipping Platforms (Coming Soon)</li>
                                <li>E-commerce (Coming Soon)</li>
                             </ul>
                       </CardContent>
                        <CardFooter>
                            <Button variant="outline" size="sm" disabled>Manage Integrations</Button>
                        </CardFooter>
                   </Card>


               </div>
          </main>


          {/* View Item Dialog */}
           <ViewItemDialog
             isOpen={isViewDialogOpen}
             onClose={() => setIsViewDialogOpen(false)}
             item={itemToView}
           />

          {/* Edit Item Dialog */}
           <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
               <DialogContent className="sm:max-w-lg">
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


           <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {itemToDelete?.itemName}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteItemMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteItem} disabled={deleteItemMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {deleteItemMutation.isPending ? (
                                <> <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                             ) : (
                                <> <Trash2 className="mr-2 h-4 w-4" /> Delete Item</>
                             )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

               {isAdmin && isSettingsDialogOpen && (
                   <AdminSettingsDialog
                      isOpen={isSettingsDialogOpen}
                      onClose={() => setIsSettingsDialogOpen(false)}
                      onSave={handleSaveSettings}
                       currentSettings={adminSettings}
                       isLoading={saveSettingsMutation.isPending}
                   />
               )}

               {/* Photo Search Dialog */}
               <Dialog open={isPhotoSearchOpen} onOpenChange={setIsPhotoSearchOpen}>
                  <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                          <DialogTitle>Search Item by Photo</DialogTitle>
                          <DialogDescription>
                             Center the item in the camera view and capture the photo to search.
                          </DialogDescription>
                      </DialogHeader>
                       <div className="space-y-4 py-4">
                            <div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden">
                                <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                <canvas ref={canvasRef} style={{ display: 'none' }} />

                                 {hasCameraPermission === false && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-destructive-foreground p-4">
                                           <VideoOff className="h-12 w-12 mb-2" />
                                           <p className="text-lg font-semibold">Camera Access Denied</p>
                                           <p className="text-sm text-center">Please allow camera access in your browser settings.</p>
                                       </div>
                                  )}
                                 {hasCameraPermission === null && !photoSearchLoading && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-muted-foreground">
                                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                            <p>Accessing Camera...</p>
                                         </div>
                                  )}

                                {photoSearchLoading && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                        <p>Analyzing Photo...</p>
                                    </div>
                                )}
                            </div>
                            <Button
                                 type="button"
                                 onClick={handlePhotoSearchCapture}
                                 disabled={photoSearchLoading || hasCameraPermission !== true}
                                 className="w-full"
                                 size="lg"
                             >
                                     {photoSearchLoading ? (
                                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                     ) : (
                                         <Camera className="mr-2 h-5 w-5" />
                                     )}
                                     {photoSearchLoading ? 'Searching...' : 'Capture & Search'}
                                </Button>
                         </div>
                         <DialogFooter>
                             <Button variant="outline" onClick={() => setIsPhotoSearchOpen(false)} disabled={photoSearchLoading}>
                                 <XCircle className="mr-2 h-4 w-4"/> Cancel
                             </Button>
                          </DialogFooter>
                   </DialogContent>
               </Dialog>
         </div>
       );
     }


     export default function Home() {
         return (
             <QueryClientProvider client={queryClient}>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                  >
                      <RequireAuth>
                          <StockManagementPageContent />
                      </RequireAuth>
                  </ThemeProvider>
              </QueryClientProvider>
         );
     }


