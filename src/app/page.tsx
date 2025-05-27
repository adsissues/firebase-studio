
 'use client';

    import * as React from 'react';
    import { ItemSearch } from '@/components/item-search';
    import { StockDashboard } from '@/components/stock-dashboard';
    import { ActivityFeed } from '@/components/activity-feed';
    import { StockOutForm, type StockOutFormDataSubmit } from '@/components/stock-out-form';
    import { AddStockForm, type AddStockFormData } from '@/components/add-stock-form';
    import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form';
    import { ViewItemDialog } from '@/components/view-item-dialog';
    import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
    import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter as ShadDialogFooter } from '@/components/ui/dialog';
    import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { Label } from "@/components/ui/label";
    import type { StockItem, AdminSettings, StockMovementLog, AlertType } from '@/types';
    import { useState, useEffect, useCallback, useRef } from 'react';
    import { useToast } from "@/hooks/use-toast";
    import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
    import { db, auth } from '@/lib/firebase/firebase';
    import { collection, getDocs, addDoc, updateDoc, doc, increment, deleteDoc, writeBatch, query, where, runTransaction, setDoc, getDoc, serverTimestamp, Timestamp, deleteField, or } from 'firebase/firestore';
    import { Skeleton } from '@/components/ui/skeleton';
    import { Button } from '@/components/ui/button';
    import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
    import { AlertTriangle, Loader2, Trash2, Settings, Camera, XCircle, VideoOff, BarChart2, BrainCircuit, Bot, Settings2, ListFilter, PoundSterling, Package, TrendingUp, TrendingDown, Clock, ShoppingCart, Building, Phone, Mail as MailIcon, UserCircle as UserIconLucide, Globe, Users, FileText, Map as MapIcon, Barcode, MapPin, ExternalLink, PlusCircle, MinusCircle, PackagePlus, EyeIcon } from 'lucide-react';
    import { RequireAuth } from '@/components/auth/require-auth';
    import { useAuth } from '@/context/auth-context';
    import { AdminSettingsDialog } from '@/components/admin-settings-dialog';
    import { UserManagementDialog } from '@/components/user-management-dialog';
    import { searchItemByPhoto, type SearchItemByPhotoInput } from '@/ai/flows/search-item-by-photo-flow';
    import { DashboardKPIs, type KPIData } from '@/components/dashboard-kpis';
    import { PageHeader } from '@/components/page-header';
    import { ActionsPanel } from '@/components/actions-panel';
    import { Separator } from '@/components/ui/separator';
    import { Badge } from "@/components/ui/badge";
    import { formatDistanceToNow } from 'date-fns';
    import { AlertsPanel } from '@/components/alerts-panel';
    import { ExportReportsButton } from '@/components/export-reports-button';
    import { getItemStatusInfo } from '@/components/stock-dashboard';
    import { useRouter } from 'next/navigation';


    const defaultAdminSettings: AdminSettings = {
        emailNotifications: true,
        pushNotifications: false,
        lowStockThreshold: 10,
        overstockThresholdPercentage: 200,
        inactivityAlertDays: 30,
    };


    function StockManagementPageContent() {
      const { user, isAdmin, loading: authLoading, assignedLocations } = useAuth();
      const [searchQuery, setSearchQuery] = useState('');
      const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
      const [filterLocation, setFilterLocation] = useState<string | undefined>(undefined);
      const [filterSupplier, setFilterSupplier] = useState<string | undefined>(undefined);
      const [filterStockStatus, setFilterStockStatus] = useState<string | undefined>(undefined);
      const { toast } = useToast();
      const router = useRouter();
      const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
      const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
      const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
      const [itemToView, setItemToView] = useState<StockItem | null>(null);
      const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
      const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);
      const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
      const [isUserManagementDialogOpen, setIsUserManagementDialogOpen] = useState(false);
      const [isPhotoSearchOpen, setIsPhotoSearchOpen] = useState(false);
      const [photoSearchLoading, setPhotoSearchLoading] = useState(false);
      const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
      const videoRef = React.useRef<HTMLVideoElement>(null);
      const canvasRef = React.useRef<HTMLCanvasElement>(null);
      const [systemAlerts, setSystemAlerts] = React.useState<AlertType[]>([]);
      const [lastDataFetchTime, setLastDataFetchTime] = React.useState<Date | null>(null);
      const toastedAlertIds = useRef(new Set<string>());
      const queryClient = useQueryClient();

      const [isAddStockDialogOpen, setIsAddStockDialogOpen] = useState(false);
      const [isStockOutDialogOpen, setIsStockOutDialogOpen] = useState(false);


        const { data: adminSettings = defaultAdminSettings, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery<AdminSettings>({
            queryKey: ['adminSettings'],
            queryFn: async () => {
                if (!isAdmin || !db) return defaultAdminSettings;
                const settingsDocRef = doc(db, 'settings', 'admin');
                try {
                    const docSnap = await getDoc(settingsDocRef);
                    if (docSnap.exists()) {
                        const fetchedSettings = docSnap.data() as AdminSettings;
                        return { ...defaultAdminSettings, ...fetchedSettings };
                    }
                    return defaultAdminSettings;
                } catch (error) {
                     console.error("Error fetching admin settings:", error);
                     toast({ variant: "destructive", title: "Error Loading Settings", description: "Could not load admin settings." });
                     return defaultAdminSettings;
                }
            },
            enabled: isAdmin && !!user,
            staleTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
        });


      const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch: refetchItems } = useQuery<StockItem[]>({
        queryKey: ['stockItems', user?.uid, isAdmin, assignedLocations],
        queryFn: async () => {
           if (!user) return [];
           const itemsCol = collection(db, 'stockItems');
           let q;
           if (isAdmin) {
               q = query(itemsCol);
           } else {
               const ownerCondition = where("userId", "==", user.uid);
               if (assignedLocations && assignedLocations.length > 0) {
                  const locationCondition = where("location", "in", assignedLocations);
                  q = query(itemsCol, or(ownerCondition, locationCondition));
               } else {
                  q = query(itemsCol, ownerCondition);
               }
           }

           try {
               const itemSnapshot = await getDocs(q);
               const itemsList = itemSnapshot.docs.map(docSnap => ({ // Renamed doc to docSnap
                  id: docSnap.id,
                  ...docSnap.data(),
              } as StockItem));
              setLastDataFetchTime(new Date());

              return itemsList.map((item: StockItem) => ({
                  ...item,
                  currentStock: Number(item.currentStock ?? 0),
                  minimumStock: item.minimumStock !== undefined ? Number(item.minimumStock) : undefined,
                  overstockThreshold: item.overstockThreshold !== undefined ? Number(item.overstockThreshold) : undefined,
                  itemName: item.itemName || 'Unknown Item',
                  barcode: item.barcode || undefined,
                  location: item.location || undefined,
                  description: item.description || undefined,
                  category: item.category || undefined,
                  supplier: item.supplier || undefined,
                  photoUrl: item.photoUrl || undefined,
                  locationCoords: item.locationCoords || undefined,
                  userId: item.userId || user.uid,
                  costPrice: item.costPrice !== undefined ? Number(item.costPrice) : undefined,
                  lastMovementDate: item.lastMovementDate,
                  supplierName: item.supplierName || undefined,
                  supplierContactPerson: item.supplierContactPerson || undefined,
                  supplierPhone: item.supplierPhone || undefined,
                  supplierEmail: item.supplierEmail || undefined,
                  supplierWebsite: item.supplierWebsite || undefined,
                  supplierAddress: item.supplierAddress || undefined,
              }));
          } catch (err) {
              console.error("Error fetching stock items:", err);
               if ((err as any)?.code === 'permission-denied') {
                  toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to view stock items." });
               } else if ((err as any)?.code === 'unauthenticated') {
                    toast({ variant: "destructive", title: "Authentication Required", description: "Please log in to view stock items." });
               } else if ((err as any)?.code === 'failed-precondition' && (err as Error).message.includes('query requires an index')) {
                   toast({ variant: "destructive", title: "Database Index Required", description: "A database index is needed for this query. Please check Firestore console or server logs.", duration: 10000});
               }
              throw err;
          }
        },
         enabled: !!user,
         staleTime: 5 * 60 * 1000,
         refetchOnWindowFocus: true,
      });

      const { data: stockMovements = [], isLoading: isLoadingMovements, refetch: refetchMovements } = useQuery<StockMovementLog[]>({
         queryKey: ['stockMovements', user?.uid, isAdmin, assignedLocations],
         queryFn: async () => {
             if (!user) return [];
             const logsCol = collection(db, 'stockMovements');
             let q;
              if (isAdmin) {
                 q = query(logsCol);
              } else {
                  const userInitiatedCondition = where("userId", "==", user.uid);
                  if (assignedLocations && assignedLocations.length > 0) {
                    const accessibleItemsQuery = query(collection(db, 'stockItems'), where("location", "in", assignedLocations));
                    const accessibleItemsSnap = await getDocs(accessibleItemsQuery);
                    const accessibleItemIds = accessibleItemsSnap.docs.map(d => d.id);

                    if (accessibleItemIds.length > 0) {
                        const itemIdsChunks = [];
                        for (let i = 0; i < accessibleItemIds.length; i += 30) { 
                            itemIdsChunks.push(accessibleItemIds.slice(i, i + 30));
                        }
                        const movementQueries = itemIdsChunks.map(chunk => 
                            query(logsCol, where("itemId", "in", chunk))
                        );
                        const userLogsQuery = query(logsCol, userInitiatedCondition);
                        movementQueries.push(userLogsQuery); // Add user's own logs query

                        const allSnapshots = await Promise.all(movementQueries.map(innerQ => getDocs(innerQ))); // Renamed q to innerQ
                        const logsSet = new Map<string, StockMovementLog>();
                        allSnapshots.forEach(snapshot => {
                            snapshot.docs.forEach(docSnap => { // Renamed doc to docSnap
                                if (!logsSet.has(docSnap.id)) {
                                    logsSet.set(docSnap.id, {
                                        id: docSnap.id,
                                        ...docSnap.data(),
                                        timestamp: docSnap.data().timestamp as Timestamp
                                    } as StockMovementLog);
                                }
                            });
                        });
                        const combinedLogs = Array.from(logsSet.values());
                        combinedLogs.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                        return combinedLogs;
                    } else {
                         q = query(logsCol, userInitiatedCondition); 
                    }
                  } else {
                     q = query(logsCol, userInitiatedCondition); 
                  }
              }
             try {
                const logSnapshot = await getDocs(q);
                 const logsList = logSnapshot.docs.map(docSnap => ({ // Renamed doc to docSnap
                     id: docSnap.id,
                     ...docSnap.data(),
                     timestamp: docSnap.data().timestamp as Timestamp
                 } as StockMovementLog));
                 logsList.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
                 return logsList;
             } catch (err) {
                 console.error("Error fetching stock movements:", err);
                 toast({ variant: "destructive", title: "Error Loading Movements", description: "Could not load stock movement history." });
                 throw err;
             }
         },
         enabled: !!user,
         staleTime: 2 * 60 * 1000,
         refetchOnWindowFocus: true,
      });

      const logStockMovementAndUpdateItem = async (itemRef: any, itemData: StockItem, quantityChange: number, newStockLevel: number, type: 'in' | 'out' | 'restock', transaction?: any) => {
        if (!user || !db) return;
        const updateFn = transaction ? transaction.update : updateDoc;
        await updateFn(itemRef, { lastMovementDate: serverTimestamp() });

        const logData: Omit<StockMovementLog, 'id' | 'timestamp'> & { timestamp: any } = {
            itemId: itemData.id,
            itemName: itemData.itemName,
            quantityChange: quantityChange,
            newStockLevel: newStockLevel,
            type: type,
            userId: user.uid,
            userEmail: user.email || undefined,
            timestamp: serverTimestamp(),
        };
        await addDoc(collection(db, 'stockMovements'), logData);
        queryClient.invalidateQueries({ queryKey: ['stockMovements', user?.uid, isAdmin, assignedLocations] });
    };


        const addStockMutation = useMutation({
            mutationFn: async (formData: AddStockFormData) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");

                const { itemName, quantity, barcode } = formData;

                if (barcode) {
                    const barcodeQuery = query(collection(db, 'stockItems'), where("barcode", "==", barcode));
                    const barcodeSnapshot = await getDocs(barcodeQuery);
                    if (!barcodeSnapshot.empty) {
                        let isUpdatingExistingPermitted = false;
                        const existingDoc = barcodeSnapshot.docs[0];
                        if (formData.itemName && existingDoc.data().itemName === formData.itemName) {
                            if (isAdmin || existingDoc.data().userId === user.uid) {
                                isUpdatingExistingPermitted = true;
                            }
                        }

                         if (!isUpdatingExistingPermitted) {
                             const existingItem = existingDoc.data();
                              toast({
                                  variant: "destructive",
                                  title: "Duplicate Barcode",
                                  description: `Barcode ${barcode} is already assigned to item "${existingItem.itemName}". Please use a unique barcode.`,
                                  duration: 7000,
                              });
                             throw new Error("Duplicate barcode detected.");
                         }
                    }
                 }

                const itemsCol = collection(db, 'stockItems');
                let targetItemQuery;

                const barcodeQueryConstraint = barcode ? [where("barcode", "==", barcode)] : [];
                const nameQueryConstraint = itemName ? [where("itemName", "==", itemName)] : [];

                let baseConstraints = [];
                if(!isAdmin) {
                    baseConstraints.push(where("userId", "==", user.uid));
                    if (assignedLocations && assignedLocations.length > 0 && formData.location && assignedLocations.includes(formData.location)) {
                       // Non-admin can update existing item in their assigned location if they also own it (or rules allow)
                    } else if (formData.location && (!assignedLocations || !assignedLocations.includes(formData.location))) {
                         throw new Error("You do not have permission to add stock to this location.");
                    }
                }


                const queryConstraints = barcode
                    ? [...baseConstraints, ...barcodeQueryConstraint]
                    : [...baseConstraints, ...nameQueryConstraint];

                 if (queryConstraints.length > (isAdmin ? 0 : (baseConstraints.length > 0 ? 1: 0) )) {
                     targetItemQuery = query(itemsCol, ...queryConstraints);
                 } else {
                      targetItemQuery = null;
                 }

                 let querySnapshot;
                  if (targetItemQuery) {
                      querySnapshot = await getDocs(targetItemQuery);
                  }

                 const dataToSave = Object.entries(formData).reduce((acc, [key, value]) => {
                      if (value !== undefined && key !== 'quantity') {
                         if ((key === 'minimumStock' || key === 'overstockThreshold' || key === 'costPrice') && typeof value === 'string') {
                            acc[key as keyof typeof acc] = value === '' ? undefined : Number(value);
                          } else {
                             acc[key as keyof typeof acc] = value === '' ? undefined : value;
                          }
                      }
                      return acc;
                  }, {} as Partial<Omit<StockItem, 'id' | 'userId' | 'currentStock' | 'lastMovementDate'>> & { userId?: string });

                  dataToSave.userId = user.uid;


                 if (querySnapshot && !querySnapshot.empty) {
                     const existingDoc = querySnapshot.docs[0];
                     const itemDocRef = doc(db, 'stockItems', existingDoc.id);
                     let finalStockLevel = 0;
                     let existingItemData: StockItem | null = null;

                      await runTransaction(db, async (transaction) => {
                           const sfDoc = await transaction.get(itemDocRef);
                           if (!sfDoc.exists()) throw "Document does not exist!";
                           const currentData = sfDoc.data() as Omit<StockItem, 'id'>;
                           existingItemData = { ...currentData, id: existingDoc.id };
                           const updatedData = { ...dataToSave };

                           updatedData.minimumStock = formData.minimumStock ?? currentData.minimumStock;
                           updatedData.overstockThreshold = formData.overstockThreshold ?? currentData.overstockThreshold;
                           updatedData.costPrice = formData.costPrice ?? currentData.costPrice;
                            updatedData.supplierName = formData.supplierName ?? currentData.supplierName;
                            updatedData.supplierContactPerson = formData.supplierContactPerson ?? currentData.supplierContactPerson;
                            updatedData.supplierPhone = formData.supplierPhone ?? currentData.supplierPhone;
                            updatedData.supplierEmail = formData.supplierEmail ?? currentData.supplierEmail;
                            updatedData.supplierWebsite = formData.supplierWebsite ?? currentData.supplierWebsite;
                            updatedData.supplierAddress = formData.supplierAddress ?? currentData.supplierAddress;


                           const finalUpdateData = Object.keys(updatedData).reduce((acc, key) => {
                               if (updatedData[key as keyof typeof updatedData] !== undefined) {
                                   acc[key as keyof typeof acc] = updatedData[key as keyof typeof updatedData];
                               } else {
                                   acc[key as keyof typeof acc] = deleteField();
                               }
                               return acc;
                           }, {} as Record<string, any>);


                           const newStock = (currentData.currentStock || 0) + quantity;
                           finalStockLevel = newStock;
                           transaction.update(itemDocRef, { ...finalUpdateData, currentStock: newStock, lastMovementDate: serverTimestamp() });
                       });

                      if (existingItemData) {
                           await logStockMovementAndUpdateItem(doc(db, 'stockItems', existingDoc.id), existingItemData, quantity, finalStockLevel, 'restock');
                      }
                      const updatedDocSnap = await getDoc(itemDocRef);
                      return { ...updatedDocSnap.data(), id: updatedDocSnap.id, quantityAdded: quantity } as StockItem & {quantityAdded: number};
                 } else {
                     const newItemDataWithStock: Partial<StockItem> & {currentStock: number, userId: string, lastMovementDate: any} = {
                         ...dataToSave,
                         currentStock: quantity,
                         userId: user.uid,
                         costPrice: formData.costPrice,
                         lastMovementDate: serverTimestamp(),
                         supplierName: formData.supplierName,
                         supplierContactPerson: formData.supplierContactPerson,
                         supplierPhone: formData.supplierPhone,
                         supplierEmail: formData.supplierEmail,
                         supplierWebsite: formData.supplierWebsite,
                         supplierAddress: formData.supplierAddress,
                     };
                     const finalNewItemData = Object.entries(newItemDataWithStock).reduce((acc, [key, value]) => {
                          if (value !== undefined) acc[key as keyof typeof acc] = value;
                          return acc;
                      }, {} as Partial<StockItem>);

                     const newDocRef = await addDoc(itemsCol, finalNewItemData); // Renamed docRef to newDocRef
                     const newItem = { id: newDocRef.id, ...finalNewItemData } as StockItem;
                     await logStockMovementAndUpdateItem(newDocRef, newItem, quantity, newItem.currentStock, 'in');
                     return { ...newItem, quantityAdded: quantity };
                 }
             },
             onSuccess: (result) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid, isAdmin, assignedLocations] });
                 queryClient.invalidateQueries({ queryKey: ['systemAlerts'] });
                 toast({
                     variant: "default",
                     title: "Stock Added/Restocked",
                     description: `${result.quantityAdded} units of ${result.itemName} processed successfully.`,
                 });
             },
             onError: (error: any) => {
                 console.error("Error adding/restocking stock:", error);
                 toast({
                    variant: "destructive",
                    title: "Error Processing Stock",
                    description: error.message === "Duplicate barcode detected." ? error.message : error.message || "Could not process stock. Please try again.",
                 });
             },
        });


        const editItemMutation = useMutation({
            mutationFn: async (itemData: StockItem) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");
                 if (!isAdmin && itemData.userId !== user.uid && (!itemData.location || !assignedLocations.includes(itemData.location)) ) {
                     throw new Error("Permission denied: You can only edit your own items or items in your assigned locations.");
                 }

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

                 const itemDocRef = doc(db, 'stockItems', itemData.id);
                 const { id, ...updateDataFromForm } = itemData;

                 let originalStock = 0;
                 const currentDocSnap = await getDoc(itemDocRef);
                  if (currentDocSnap.exists()) {
                      originalStock = currentDocSnap.data().currentStock ?? 0;
                  }

                  const finalUpdateData: Record<string, any> = {};
                  const originalItemData = currentDocSnap.data() || {};

                  for (const key in updateDataFromForm) {
                      const typedKey = key as keyof StockItem;
                      let formValue = updateDataFromForm[typedKey];
                      const originalValue = originalItemData[typedKey];

                      if (key === 'currentStock' || key === 'minimumStock' || key === 'overstockThreshold' || key === 'costPrice') {
                          formValue = (formValue === '' || formValue === null || formValue === undefined) ? undefined : Number(formValue);
                      }


                      if (formValue === undefined && originalValue !== undefined) {
                          finalUpdateData[key] = deleteField();
                      } else if (formValue !== undefined && formValue !== originalValue) {
                          finalUpdateData[key] = formValue;
                      }
                  }


                 if (Object.keys(finalUpdateData).length === 0) {
                     console.log("No changes detected. Skipping update.");
                     return itemData;
                 }
                 finalUpdateData.lastMovementDate = serverTimestamp();

                await updateDoc(itemDocRef, finalUpdateData);

                const newStock = finalUpdateData.currentStock;
                 if (newStock !== undefined && newStock !== originalStock) {
                     const quantityChange = newStock - originalStock;
                     const updatedItemForLog: StockItem = { ...itemData, currentStock: newStock };
                     await logStockMovementAndUpdateItem(itemDocRef, updatedItemForLog, quantityChange, newStock, newStock > originalStock ? 'restock' : 'out');
                 } else if (Object.keys(finalUpdateData).length > 0) {
                    await updateDoc(itemDocRef, { lastMovementDate: serverTimestamp() });
                 }

                 const updatedDocSnapAfter = await getDoc(itemDocRef);
                 return { id: updatedDocSnapAfter.id, ...updatedDocSnapAfter.data() } as StockItem;
            },
            onSuccess: (updatedItem) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid, isAdmin, assignedLocations] });
                 queryClient.invalidateQueries({ queryKey: ['systemAlerts'] });
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
                      toast({ variant: "destructive", title: "Duplicate Barcode", description: error.message });
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

        const deleteItemMutation = useMutation({
            mutationFn: async (itemToDelete: StockItem) => {
                if (!user || !db) throw new Error("User not authenticated or DB not available");
                 if (!isAdmin && itemToDelete.userId !== user.uid && (!itemToDelete.location || !assignedLocations.includes(itemToDelete.location)) ) {
                     throw new Error("Permission denied: You can only delete your own items or items in your assigned locations.");
                 }
                const itemDocRef = doc(db, 'stockItems', itemToDelete.id);
                await deleteDoc(itemDocRef);

                 if (itemToDelete.currentStock > 0) {
                    await logStockMovementAndUpdateItem(itemDocRef, itemToDelete, -itemToDelete.currentStock, 0, 'out');
                 }
                return itemToDelete.id;
            },
            onSuccess: (itemId) => {
                 queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid, isAdmin, assignedLocations] });
                 queryClient.invalidateQueries({ queryKey: ['stockMovements', user?.uid, isAdmin, assignedLocations] });
                 queryClient.invalidateQueries({ queryKey: ['systemAlerts'] });
                 setIsDeleteDialogOpen(false);
                 const deletedItemName = itemToDelete?.itemName || 'Item';
                 setItemToDelete(null);
                 toast({ variant: "default", title: "Item Deleted", description: `${deletedItemName} has been removed.` });
            },
            onError: (error: any, itemBeingDeleted) => {
                 const deletedItemName = itemBeingDeleted?.itemName || 'Item';
                 toast({ variant: "destructive", title: "Error Deleting Item", description: error.message || `Could not delete ${deletedItemName}.`});
                  setIsDeleteDialogOpen(false);
                  setItemToDelete(null);
            },
        });


       const stockOutMutation = useMutation({
            mutationFn: async (data: StockOutFormDataSubmit) => {
                 if (!user || !db) throw new Error("User not authenticated or DB not available");
                  const itemToUpdate = stockItems.find(item => item.id === data.itemId);
                 if (!itemToUpdate) throw new Error("Item not found.");
                 if (!isAdmin && itemToUpdate.userId !== user.uid && (!itemToUpdate.location || !assignedLocations.includes(itemToUpdate.location)) ) {
                     throw new Error("Permission denied: Cannot modify stock for this item.");
                 }
                 const itemDocRef = doc(db, 'stockItems', data.itemId);
                 let updatedStockLevel = 0;

                 await runTransaction(db, async (transaction) => {
                    const sfDoc = await transaction.get(itemDocRef);
                    if (!sfDoc.exists()) throw "Document does not exist!";
                    const currentStock = sfDoc.data().currentStock || 0;
                    updatedStockLevel = currentStock - data.quantity;
                     if (updatedStockLevel < 0) throw new Error("Stock out quantity exceeds available stock.");
                    transaction.update(itemDocRef, { currentStock: increment(-data.quantity), lastMovementDate: serverTimestamp() });
                 });
                 await logStockMovementAndUpdateItem(itemDocRef, itemToUpdate, -data.quantity, updatedStockLevel, 'out');
                 return { ...data, itemName: itemToUpdate.itemName };
             },
            onSuccess: (data) => {
                queryClient.invalidateQueries({ queryKey: ['stockItems', user?.uid, isAdmin, assignedLocations] });
                queryClient.invalidateQueries({ queryKey: ['systemAlerts'] });
                toast({ variant: "default", title: "Stock Updated", description: `${data.quantity} units of ${data.itemName || 'item'} removed.`});
            },
            onError: (error: any, data) => {
                const failedItem = stockItems.find(item => item.id === data.itemId);
                toast({ variant: "destructive", title: "Error Updating Stock", description: error.message || `Could not remove stock for ${failedItem?.itemName || 'item'}.`});
            },
        });

         const saveSettingsMutation = useMutation({
            mutationFn: async (newSettings: AdminSettings) => {
                if (!isAdmin || !db) throw new Error("Permission denied or DB not available.");
                const settingsDocRef = doc(db, 'settings', 'admin');
                await setDoc(settingsDocRef, newSettings, { merge: true });
                return newSettings;
            },
            onSuccess: (savedSettings) => {
                 queryClient.setQueryData(['adminSettings'], (old: AdminSettings | undefined) => ({...defaultAdminSettings, ...old, ...savedSettings}));
                 queryClient.invalidateQueries({ queryKey: ['systemAlerts'] });
                 refetchSettings();
                toast({ title: "Settings Saved", description: "Admin settings have been updated." });
                setIsSettingsDialogOpen(false);
            },
            onError: (error: any) => {
                toast({ variant: "destructive", title: "Error Saving Settings", description: error.message || "Could not save settings."});
            },
        });


        React.useEffect(() => {
            let stream: MediaStream | null = null;
            const getCameraPermission = async () => {
                if (!isPhotoSearchOpen) {
                    if (videoRef.current?.srcObject) {
                        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                        videoRef.current.srcObject = null;
                    }
                    setHasCameraPermission(null); return;
                }
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setHasCameraPermission(true);
                    if (videoRef.current) videoRef.current.srcObject = stream;
                } catch (error) {
                    setHasCameraPermission(false); setIsPhotoSearchOpen(false);
                    toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
                }
            };
            getCameraPermission();
            return () => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); };
        }, [isPhotoSearchOpen, toast]);

        const handlePhotoSearchCapture = async () => {
             if (!hasCameraPermission || !videoRef.current || !canvasRef.current || photoSearchLoading) {
                 toast({ variant: "destructive", title: "Camera Not Ready or Busy" }); return;
             }
              const video = videoRef.current; const canvas = canvasRef.current;
              canvas.width = video.videoWidth; canvas.height = video.videoHeight;
              const context = canvas.getContext('2d');
              if (context) {
                 context.drawImage(video, 0, 0, canvas.width, canvas.height);
                 const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                 if (dataUrl && dataUrl !== 'data:,') {
                      setPhotoSearchLoading(true);
                     try {
                         const input: SearchItemByPhotoInput = { photoDataUri: dataUrl };
                         const result = await searchItemByPhoto(input);
                         if (result.itemName) {
                            setSearchQuery(result.itemName);
                            toast({ title: "Item Found by Photo", description: `Searching for "${result.itemName}".` });
                            setIsPhotoSearchOpen(false);
                         } else {
                            toast({ variant: "destructive", title: "Item Not Found", description: "Could not identify item from photo." });
                         }
                     } catch (error: any) {
                         toast({ variant: "destructive", title: "Photo Search Error", description: error.message || "Failed to search by photo." });
                     } finally { setPhotoSearchLoading(false); }
                 } else { toast({ variant: "destructive", title: "Capture Error", description: "Could not capture image data." }); }
             } else { toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." }); }
         };


      const handleSearchChange = (query: string) => setSearchQuery(query);
      const handleStockOutSubmit = (data: StockOutFormDataSubmit) => stockOutMutation.mutate(data);
      const handleAddStockSubmit = (data: AddStockFormData) => addStockMutation.mutate(data);

      const handleEditItemSubmit = (data: EditItemFormData) => {
          if (!itemToEdit || !user) return;
          const updatedItem: StockItem = {
              id: itemToEdit.id,
              userId: itemToEdit.userId || user.uid,
              itemName: data.itemName,
              currentStock: data.currentStock ?? 0,
              minimumStock: data.minimumStock === undefined || data.minimumStock === null ? undefined : Number(data.minimumStock),
              overstockThreshold: data.overstockThreshold === undefined || data.overstockThreshold === null ? undefined : Number(data.overstockThreshold),
              barcode: data.barcode || undefined,
              location: data.location || undefined,
              description: data.description || undefined,
              category: data.category || undefined,
              supplier: data.supplier || undefined,
              photoUrl: data.photoUrl || undefined,
              locationCoords: data.locationCoords || undefined,
              costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
              lastMovementDate: itemToEdit.lastMovementDate,
              supplierName: data.supplierName || undefined,
              supplierContactPerson: data.supplierContactPerson || undefined,
              supplierPhone: data.supplierPhone || undefined,
              supplierEmail: data.supplierEmail || undefined,
              supplierWebsite: data.supplierWebsite || undefined,
              supplierAddress: data.supplierAddress || undefined,
          };
          if (!updatedItem.userId) {
              toast({ variant: "destructive", title: "Error", description: "User ID missing. Cannot update item." });
              return;
          }
          editItemMutation.mutate(updatedItem);
      };

       const handleEditClick = (item: StockItem) => { setItemToEdit(item); setIsEditDialogOpen(true); };
       const handleViewClick = (item: StockItem) => { setItemToView(item); setIsViewDialogOpen(true); };
       const handleDeleteClick = (item: StockItem) => { setItemToDelete(item); setIsDeleteDialogOpen(true); };
       const confirmDeleteItem = () => { if (itemToDelete) deleteItemMutation.mutate(itemToDelete);};

        const filteredItems = React.useMemo(() => {
             return stockItems.filter((item) => {
                const queryLower = searchQuery.trim().toLowerCase();
                const categoryFilterMatch = !filterCategory || filterCategory === 'all' || (item.category && item.category.toLowerCase() === filterCategory.toLowerCase());
                const locationFilterMatch = !filterLocation || filterLocation === 'all' || (item.location && item.location.toLowerCase() === filterLocation.toLowerCase());
                const supplierFilterMatch = !filterSupplier || filterSupplier === 'all' || ((item.supplier && item.supplier.toLowerCase() === filterSupplier.toLowerCase()) || (item.supplierName && item.supplierName.toLowerCase() === filterSupplier.toLowerCase())); 

                let statusFilterMatch = true;
                if (filterStockStatus && filterStockStatus !== 'all') {
                    const itemStatusInfo = getItemStatusInfo(item, adminSettings.lowStockThreshold, { inactivityAlertDays: adminSettings.inactivityAlertDays, overstockThresholdPercentage: adminSettings.overstockThresholdPercentage});
                    statusFilterMatch = itemStatusInfo.label.toLowerCase().replace(' ', '') === filterStockStatus.toLowerCase();
                }

                const textSearchMatch = (
                    (item.itemName || '').toLowerCase().includes(queryLower) ||
                    (item.barcode && (item.barcode || '').toLowerCase().includes(queryLower)) ||
                    (item.description && (item.description || '').toLowerCase().includes(queryLower))
                );
                return categoryFilterMatch && locationFilterMatch && supplierFilterMatch && statusFilterMatch && textSearchMatch;
            });
        }, [stockItems, searchQuery, filterCategory, filterLocation, filterSupplier, filterStockStatus, adminSettings]);


       const isMutating = stockOutMutation.isPending || addStockMutation.isPending || editItemMutation.isPending || deleteItemMutation.isPending || saveSettingsMutation.isPending || photoSearchLoading;
       const isLoading = authLoading || isLoadingItems || isLoadingSettings || isLoadingMovements;


        useEffect(() => {
            if (isLoading || !adminSettings) {
                 return;
            }

            const currentAlertsMap = new Map(systemAlerts.map(alert => [alert.id, alert]));
            const newAlertsMap = new Map<string, AlertType>();
            let alertsChanged = false;

            stockItems.forEach(item => {
                const effectiveMinThreshold = item.minimumStock ?? adminSettings.lowStockThreshold;
                if (item.currentStock > 0 && item.currentStock <= effectiveMinThreshold) {
                    let lowStockMessage = `${item.itemName} stock is low (${item.currentStock}/${effectiveMinThreshold}).`;
                    if(item.supplierName || item.supplierEmail || item.supplierPhone){
                        lowStockMessage += ` Contact ${item.supplierName || 'supplier'} at ${item.supplierEmail || item.supplierPhone || 'N/A'}.`;
                    }
                    const alertId = `low-${item.id}`;
                    if (!currentAlertsMap.has(alertId) || currentAlertsMap.get(alertId)?.message !== lowStockMessage) alertsChanged = true;
                    newAlertsMap.set(alertId, {id: alertId, type: "low_stock", title: "Low Stock Alert", message: lowStockMessage, variant: "destructive", item, timestamp: new Date()});
                }

                const minStockForOverstock = item.minimumStock ?? adminSettings.lowStockThreshold;
                const overstockQtyThreshold = item.overstockThreshold ?? (minStockForOverstock * ( (adminSettings.overstockThresholdPercentage ?? 200) / 100));
                if (item.currentStock > overstockQtyThreshold && overstockQtyThreshold > 0) {
                     const alertId = `overstock-${item.id}`;
                     const message = `${item.itemName} is overstocked (${item.currentStock} > ${overstockQtyThreshold.toFixed(0)}). Consider reducing stock.`;
                     if (!currentAlertsMap.has(alertId) || currentAlertsMap.get(alertId)?.message !== message) alertsChanged = true;
                     newAlertsMap.set(alertId, {id: alertId, type: "overstock", title: "Overstock Alert", message, variant: "warning", item, timestamp: new Date()});
                }

                if (adminSettings.inactivityAlertDays && item.lastMovementDate) {
                    const lastMovement = item.lastMovementDate.toDate();
                    const daysSinceMovement = (new Date().getTime() - lastMovement.getTime()) / (1000 * 3600 * 24);
                    if (daysSinceMovement > adminSettings.inactivityAlertDays) {
                         const alertId = `inactive-${item.id}`;
                         const message = `${item.itemName} has not moved in ${Math.floor(daysSinceMovement)} days (since ${lastMovement.toLocaleDateString()}).`;
                         if (!currentAlertsMap.has(alertId) || currentAlertsMap.get(alertId)?.message !== message) alertsChanged = true;
                         newAlertsMap.set(alertId, {id: alertId, type: "inactivity", title: "Inactivity Alert", message, variant: "info", item, timestamp: new Date()});
                    }
                }
            });

            if (newAlertsMap.size !== currentAlertsMap.size) alertsChanged = true;

            if (alertsChanged) {
                const newAlertsArray = Array.from(newAlertsMap.values()).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());
                setSystemAlerts(newAlertsArray);
                queryClient.setQueryData(['systemAlerts'], newAlertsArray);
            }

            const currentNewAlertIds = new Set(newAlertsMap.keys());
            toastedAlertIds.current.forEach(alertId => {
                if (!currentNewAlertIds.has(alertId)) {
                    toastedAlertIds.current.delete(alertId);
                }
            });

            if (Array.from(newAlertsMap.values()).length > 0 && adminSettings.emailNotifications) {
                const criticalNewAlertsToToast = Array.from(newAlertsMap.values()).filter(a => a.variant === 'destructive' && !toastedAlertIds.current.has(a.id));

                if (criticalNewAlertsToToast.length > 0) {
                    console.log("SIMULATED EMAIL ALERTS (simplified logic):", criticalNewAlertsToToast.map(a => `${a.title}: ${a.message}`).join('\n'));
                    criticalNewAlertsToToast.forEach(alertDetail => {
                         toast({
                             variant: alertDetail.variant || "default",
                             title: alertDetail.title,
                             description: alertDetail.message,
                             duration: 10000,
                         });
                         toastedAlertIds.current.add(alertDetail.id);
                     });
                }
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [stockItems, adminSettings, isLoading, toast, isAdmin, queryClient ]);


        const handleSaveSettings = (settings: AdminSettings) => saveSettingsMutation.mutate(settings);
        const handleRetryFetch = () => { if (fetchError) refetchItems(); refetchMovements(); };

         const kpiData: KPIData | null = React.useMemo(() => {
             if (isLoading) return null;
              const totalItems = stockItems.length;
              const lowStockItemsCount = stockItems.filter(item => {
                   const threshold = item.minimumStock ?? adminSettings.lowStockThreshold;
                   return item.currentStock > 0 && item.currentStock <= threshold;
              }).length;
              const outOfStockItemsCount = stockItems.filter(item => item.currentStock === 0).length;
              const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
              const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
              const todayMovements = stockMovements.filter(log => log.timestamp.toDate() >= todayStart && log.timestamp.toDate() <= todayEnd);
              const todayIn = todayMovements.filter(log => log.type === 'in').length;
              const todayOut = todayMovements.filter(log => log.type === 'out').length;
              const todayRestock = todayMovements.filter(log => log.type === 'restock').length;
              const totalInventoryValue = stockItems.reduce((sum, item) => sum + (item.currentStock * (item.costPrice ?? 0)), 0);
              return { totalItems, lowStockItems: lowStockItemsCount, outOfStockItems: outOfStockItemsCount, todayIn, todayOut, todayRestock, totalInventoryValue: stockItems.some(item => item.costPrice !== undefined) ? totalInventoryValue : undefined };
          }, [stockItems, stockMovements, adminSettings, isLoading]);

         const uniqueCategories = React.useMemo(() => Array.from(new Set(stockItems.map(item => item.category).filter(Boolean) as string[])).sort(), [stockItems]);
         const uniqueLocations = React.useMemo(() => Array.from(new Set(stockItems.map(item => item.location).filter(Boolean) as string[])).sort(), [stockItems]);
         const uniqueSuppliers = React.useMemo(() => Array.from(new Set(stockItems.map(item => item.supplierName || item.supplier).filter(Boolean) as string[])).sort(), [stockItems]);
         const uniqueStockStatuses = ['all', 'Good', 'LowStock', 'OutOfStock', 'Overstock', 'Inactive'];


          const locationChartData = React.useMemo(() => {
              if (isLoading) return [];
              const counts: { [key: string]: number } = {};
              stockItems.forEach(item => {
                   let locationLabel = item.location?.trim();
                   if (!locationLabel && item.locationCoords) locationLabel = `GPS (${item.locationCoords.latitude.toFixed(2)}, ${item.locationCoords.longitude.toFixed(2)})`;
                   locationLabel = locationLabel || 'Unknown Location';
                   counts[locationLabel] = (counts[locationLabel] || 0) + item.currentStock;
              });
              return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
          }, [stockItems, isLoading]);

          const movementTrendData = React.useMemo(() => {
              if (isLoadingMovements) return [];
              const weeklyMovements: { [week: string]: { in: number; out: number; restock: number } } = {};
               const now = new Date(); const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
               stockMovements.filter(log => log.timestamp.toDate() >= oneWeekAgo).forEach(log => {
                       const date = log.timestamp.toDate(); const weekStart = new Date(date);
                       weekStart.setDate(date.getDate() - date.getDay());
                       const weekKey = `${weekStart.getFullYear()}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`;
                       if (!weeklyMovements[weekKey]) weeklyMovements[weekKey] = { in: 0, out: 0, restock: 0 };
                       if (log.type === 'in') weeklyMovements[weekKey].in += log.quantityChange;
                       else if (log.type === 'out') weeklyMovements[weekKey].out += Math.abs(log.quantityChange);
                       else if (log.type === 'restock') weeklyMovements[weekKey].restock += log.quantityChange;
                   });
               return Object.entries(weeklyMovements).map(([week, data]) => ({ name: week, StockIn: data.in, StockOut: data.out, Restock: data.restock }))
                   .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
          }, [stockMovements, isLoadingMovements]);

            const topMovingItems = React.useMemo(() => {
                if (isLoadingMovements || isLoadingItems) return [];
                const movementCounts: { [itemId: string]: { name: string, count: number, totalMoved: number } } = {};
                stockMovements.forEach(log => {
                    const item = stockItems.find(i => i.id === log.itemId);
                    if (item) {
                        if (!movementCounts[log.itemId]) {
                            movementCounts[log.itemId] = { name: item.itemName, count: 0, totalMoved: 0 };
                        }
                        movementCounts[log.itemId].count++;
                        movementCounts[log.itemId].totalMoved += Math.abs(log.quantityChange);
                    } else {
                        if (!movementCounts[log.itemId]) {
                             movementCounts[log.itemId] = { name: log.itemName || "Unknown Item (Deleted?)", count: 0, totalMoved: 0 };
                        }
                         movementCounts[log.itemId].count++;
                         movementCounts[log.itemId].totalMoved += Math.abs(log.quantityChange);
                    }
                });
                return Object.values(movementCounts).sort((a, b) => b.totalMoved - a.totalMoved || b.count - a.count).slice(0, 10);
            }, [stockMovements, stockItems, isLoadingMovements, isLoadingItems]);

            const itemsNotMoving = React.useMemo(() => {
                if (isLoadingMovements || isLoadingItems) return [];
                const daysThreshold = adminSettings.inactivityAlertDays || 30;
                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
                const recentlyMovedItemIds = new Set(stockMovements.filter(log => log.timestamp.toDate() >= thresholdDate).map(log => log.itemId));
                return stockItems.filter(item => !recentlyMovedItemIds.has(item.id) && item.currentStock > 0).slice(0, 5);
            }, [stockItems, stockMovements, isLoadingMovements, isLoadingItems, adminSettings.inactivityAlertDays]);


            const handleReorderClick = (item: StockItem) => {
                const supplierInfo = [
                    item.supplierName,
                    item.supplierContactPerson,
                    item.supplierEmail,
                    item.supplierPhone,
                ].filter(Boolean).join(', ');

                if (item.supplierEmail) {
                    const subject = `Reorder Request for ${item.itemName}`;
                    const body = `Hello ${item.supplierName || 'Supplier'},%0D%0A%0D%0APlease reorder ${item.itemName} (ID: ${item.id}).%0D%0A%0D%0ACurrent Stock: ${item.currentStock}%0D%0AMinimum Stock: ${item.minimumStock ?? adminSettings.lowStockThreshold}%0D%0A%0D%0AThank you.`;
                    window.location.href = `mailto:${item.supplierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    toast({ title: "Reorder Email Initiated", description: `Drafting email to ${item.supplierEmail} for ${item.itemName}.` });
                } else if (item.supplierPhone) {
                     toast({ title: "Reorder Action", description: `Please call ${item.supplierName || 'supplier'} at ${item.supplierPhone} to reorder ${item.itemName}.`, duration: 10000 });
                } else {
                    toast({ variant: "destructive", title: "Supplier Contact Missing", description: `No email or phone found for ${item.supplierName || item.itemName} to initiate reorder.` });
                }
            };

            const lastUpdatedString = lastDataFetchTime
                ? `Last updated ${formatDistanceToNow(lastDataFetchTime, { addSuffix: true })}`
                : 'Updating...';

      const handleFilterCategoryChange = useCallback((value: string) => {
        setFilterCategory(value === 'all' ? undefined : value);
      }, []);

      const handleFilterLocationChange = useCallback((value: string) => {
        setFilterLocation(value === 'all' ? undefined : value);
      }, []);

      const handleFilterSupplierChange = useCallback((value: string) => {
        setFilterSupplier(value === 'all' ? undefined : value);
      }, []);

      const handleFilterStockStatusChange = useCallback((value: string) => {
        setFilterStockStatus(value === 'all' ? undefined : value);
      }, []);


      // USER DASHBOARD VIEW
      if (!isAdmin && user) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader user={user} isAdmin={false} isLoading={isLoading} onSettingsClick={() => {}} onManageUsersClick={() => {}} />
                 <p className="text-sm text-muted-foreground mb-4 text-right">{lastUpdatedString}</p>
                 <Card className="shadow-lg mb-6">
                     <CardHeader>
                         <CardTitle>Search Stock</CardTitle>
                         <CardDescription>Find items by name, barcode, or description. You can view items you own or items in your assigned locations: {assignedLocations.join(', ') || 'None'}</CardDescription>
                     </CardHeader>
                     <CardContent>
                         <ItemSearch searchQuery={searchQuery} onSearchChange={handleSearchChange} placeholder="Search for items..." />
                     </CardContent>
                 </Card>

                 {isLoadingItems && <div className="space-y-2 pt-4"><Skeleton className="h-12 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div>}
                 {fetchError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><ShadAlertTitle>Error</ShadAlertTitle><ShadAlertDescription>Could not load stock items. {(fetchError as Error).message.includes('index required') ? 'A database index is required for this query. Admins, please check Firestore console.' : (fetchError as Error).message}</ShadAlertDescription></Alert>}

                 {!isLoadingItems && !fetchError && (
                    <>
                        {filteredItems.length === 0 && searchQuery === '' && stockItems.length === 0 && (
                            <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No stock items are currently assigned to you or available for your access. Please add stock or contact an administrator if you believe this is an error.</p></CardContent></Card>
                        )}
                        {filteredItems.length === 0 && searchQuery !== '' && (
                            <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No items match your search: "{searchQuery}".</p></CardContent></Card>
                        )}
                         {filteredItems.length === 0 && searchQuery === '' && stockItems.length > 0 && (
                            <Card><CardContent className="pt-6"><p className="text-center text-muted-foreground">No items match your current filters. Try adjusting search or filter criteria.</p></CardContent></Card>
                        )}
                    </>
                 )}

                 {!isLoadingItems && !fetchError && filteredItems.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(item => (
                            <Card key={item.id} className="shadow-md hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <CardTitle className="flex justify-between items-start">
                                        {item.itemName}
                                        {getItemStatusInfo(item, adminSettings.lowStockThreshold, adminSettings).label !== 'Good' && (
                                          <Badge variant={getItemStatusInfo(item, adminSettings.lowStockThreshold, adminSettings).variant} className="ml-2 text-xs">
                                            {getItemStatusInfo(item, adminSettings.lowStockThreshold, adminSettings).label}
                                          </Badge>
                                        )}
                                    </CardTitle>
                                     <CardDescription>{item.category}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {item.photoUrl && <img data-ai-hint="product photo" src={item.photoUrl} alt={item.itemName} className="rounded-md max-h-40 w-full object-contain mb-2"/>}
                                    <p className="text-lg font-semibold">Quantity: {item.currentStock}</p>
                                    {item.location && <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-4 w-4" /> {item.location}</p>}
                                    {item.locationCoords && <p className="text-xs text-muted-foreground">Lat: {item.locationCoords.latitude.toFixed(4)}, Lon: {item.locationCoords.longitude.toFixed(4)}</p>}
                                    {item.barcode && <p className="text-sm text-muted-foreground flex items-center gap-1"><Barcode className="h-4 w-4" /> {item.barcode}</p>}
                                    {item.description && <p className="text-sm text-muted-foreground truncate" title={item.description}>{item.description}</p>}
                                </CardContent>
                                <CardFooter>
                                    <Button className="w-full" onClick={() => { setItemToView(item); setIsViewDialogOpen(true); }}><ExternalLink className="mr-2 h-4 w-4"/>View Details</Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                 )}

                <div className="mt-6">
                    <Button onClick={() => setIsStockOutDialogOpen(true)} className="w-full sm:w-auto">
                        <MinusCircle className="mr-2 h-4 w-4" /> Log Stock Out
                    </Button>
                </div>

                <div className="mt-6">
                    <ActivityFeed movements={stockMovements} isLoading={isLoadingMovements} />
                </div>

             </div>
        );
      }


      // ADMIN DASHBOARD VIEW
      return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
           <PageHeader
             user={user}
             isAdmin={isAdmin}
             isLoading={isLoading}
             onSettingsClick={() => setIsSettingsDialogOpen(true)}
             onManageUsersClick={() => setIsUserManagementDialogOpen(true)}
             lastLogin={user?.metadata?.lastSignInTime ? formatDistanceToNow(new Date(user.metadata.lastSignInTime), {addSuffix: true}) : undefined}
           />
           <p className="text-sm text-muted-foreground mb-4 text-right">{lastUpdatedString}</p>
            <DashboardKPIs data={kpiData} isLoading={isLoading} />
            <AlertsPanel alerts={systemAlerts} onDismissAlert={(id) => {
                setSystemAlerts(prev => prev.filter(a => a.id !== id));
                toastedAlertIds.current.delete(id);
            }} onItemAction={handleReorderClick}/>


           <div className="grid grid-cols-1 md:grid-cols-1 gap-4 my-6">

           </div>

           <main className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="stock-levels">
              <div className="lg:col-span-2 space-y-6">
                 <Card className="shadow-md">
                     <CardHeader><CardTitle className="text-2xl">Stock Levels {isAdmin && '(Admin View)'}</CardTitle><CardDescription>Manage and view current inventory. <ExportReportsButton items={filteredItems} movements={stockMovements} /></CardDescription></CardHeader>
                     <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex-grow"><ItemSearch searchQuery={searchQuery} onSearchChange={handleSearchChange} placeholder="Search by name, barcode, description..." /></div>
                             <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                                 <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                                     <Label htmlFor="filter-category" className="sr-only">Filter by Category</Label>
                                     <Select value={filterCategory} onValueChange={handleFilterCategoryChange}><SelectTrigger id="filter-category" className="h-10"><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All Categories</SelectItem>{uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent></Select>
                                 </div>
                                 <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                                     <Label htmlFor="filter-location" className="sr-only">Filter by Location</Label>
                                     <Select value={filterLocation} onValueChange={handleFilterLocationChange}><SelectTrigger id="filter-location" className="h-10"><SelectValue placeholder="Location" /></SelectTrigger><SelectContent><SelectItem value="all">All Locations</SelectItem>{uniqueLocations.map(loc => <SelectItem key={loc} value={loc}>{loc}</SelectItem>)}</SelectContent></Select>
                                 </div>
                                 <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                                     <Label htmlFor="filter-supplier" className="sr-only">Filter by Supplier</Label>
                                     <Select value={filterSupplier} onValueChange={handleFilterSupplierChange}><SelectTrigger id="filter-supplier" className="h-10"><SelectValue placeholder="Supplier" /></SelectTrigger><SelectContent><SelectItem value="all">All Suppliers</SelectItem>{uniqueSuppliers.map(sup => <SelectItem key={sup} value={sup}>{sup}</SelectItem>)}</SelectContent></Select>
                                 </div>
                                  <div className="min-w-[150px] flex-grow sm:flex-grow-0">
                                     <Label htmlFor="filter-stock-status" className="sr-only">Filter by Stock Status</Label>
                                     <Select value={filterStockStatus} onValueChange={handleFilterStockStatusChange}><SelectTrigger id="filter-stock-status" className="h-10"><SelectValue placeholder="Stock Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Statuses</SelectItem>{uniqueStockStatuses.map(status => <SelectItem key={status} value={status}>{status.replace(/([A-Z])/g, ' $1').trim()}</SelectItem>)}</SelectContent></Select>
                                 </div>
                             </div>
                         </div>
                         {isLoadingItems && (<div className="space-y-2 pt-4"><Skeleton className="h-8 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>)}
                         {fetchError && (<Alert variant="destructive" className="mt-4"><AlertTriangle className="h-4 w-4" /><ShadAlertTitle>Error Loading Stock</ShadAlertTitle><ShadAlertDescription>Could not load stock items. {(fetchError as Error).message.includes('index required') ? 'A database index is required for this query. Admins, please check Firestore console.' : (fetchError as Error).message}<Button onClick={handleRetryFetch} variant="link" className="ml-2 p-0 h-auto text-destructive-foreground underline">Retry</Button></ShadAlertDescription></Alert>)}
                         {!isLoadingItems && !fetchError && (
                            <>
                             <StockDashboard items={filteredItems.slice(0, 5)} onView={handleViewClick} onEdit={handleEditClick} onDelete={handleDeleteClick} onReorder={handleReorderClick} isAdmin={isAdmin} globalLowStockThreshold={adminSettings.lowStockThreshold} adminSettings={adminSettings}/>
                             {filteredItems.length > 5 && (
                                <div className="mt-4 text-center">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            console.log('View All Stock Items button clicked! Navigating to /inventory');
                                            router.push('/inventory');
                                        }}
                                    >
                                        <EyeIcon className="mr-2 h-4 w-4" /> View All Stock Items ({filteredItems.length})
                                    </Button>
                                </div>
                            )}
                            </>
                          )}
                      </CardContent>
                   </Card>
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle>Stock Actions</CardTitle>
                            <CardDescription>Manage your inventory by adding, restocking, or logging out items.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row gap-4">
                            <Button onClick={() => setIsAddStockDialogOpen(true)} className="flex-1">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add / Restock Item
                            </Button>
                            <Button onClick={() => setIsStockOutDialogOpen(true)} variant="outline" className="flex-1">
                                <MinusCircle className="mr-2 h-4 w-4" /> Log Stock Out
                            </Button>
                        </CardContent>
                    </Card>
               </div>
              <div className="lg:col-span-1 space-y-6 flex flex-col">
                 <ActionsPanel onPhotoSearchClick={() => setIsPhotoSearchOpen(true)} isLoading={isMutating || hasCameraPermission === false || isLoading} frequentlyUsedItems={stockItems.filter(item => item.currentStock < (item.minimumStock ?? adminSettings.lowStockThreshold) && item.currentStock > 0).slice(0,5)} onQuickAction={(action, item) => {
                        if (action === 'in') handleAddStockSubmit({ itemName: item.itemName, quantity: 1, barcode: item.barcode, category: item.category, supplier: item.supplier, location: item.location, supplierName: item.supplierName, formId: 'addStockFormDialog' }); 
                        else if (action === 'restock') handleAddStockSubmit({ itemName: item.itemName, quantity: 10, barcode: item.barcode, category: item.category, supplier: item.supplier, location: item.location, supplierName: item.supplierName, formId: 'addStockFormDialog' }); 
                        else if (action === 'out') handleStockOutSubmit({ itemId: item.id, quantity: 1 });
                    }} />
                   <ActivityFeed movements={stockMovements} isLoading={isLoadingMovements} />
                <Card className="shadow-md"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-primary"/>Upcoming Deliveries</CardTitle><CardDescription>Track expected incoming stock.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Feature coming soon.</p></CardContent></Card>
               </div>
          </main>
            <section className="mt-12">
                <h2 className="text-2xl font-semibold mb-4 text-primary">Reports</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-blue-500" />Top 10 Moving Items</CardTitle><CardDescription>Most frequently transacted items (by units).</CardDescription></CardHeader><CardContent>{isLoadingMovements || isLoadingItems ? <Skeleton className="h-20 w-full" /> : topMovingItems.length > 0 ? (<ul className="space-y-1 text-sm">{topMovingItems.map(item => (<li key={item.name} className="flex justify-between"><span>{item.name}</span><Badge variant="secondary">{item.totalMoved} units</Badge></li>))}</ul>) : <p className="text-sm text-muted-foreground">No movement data.</p>}</CardContent></Card>
                    <Card><CardHeader><CardTitle className="text-lg flex items-center gap-2"><TrendingDown className="h-5 w-5 text-orange-500" />Items Not Moving</CardTitle><CardDescription>Items with no movement in last {adminSettings.inactivityAlertDays || 30} days.</CardDescription></CardHeader><CardContent>{isLoadingItems || isLoadingMovements ? <Skeleton className="h-20 w-full" /> : itemsNotMoving.length > 0 ? (<ul className="space-y-1 text-sm">{itemsNotMoving.map(item => (<li key={item.id} className="flex justify-between"><span>{item.itemName}</span><Badge variant="outline">Qty: {item.currentStock}</Badge></li>))}</ul>) : <p className="text-sm text-muted-foreground">All items have recent activity or are out of stock.</p>}</CardContent></Card>
                </div>
                <Separator className="my-6"/><p className="text-sm text-muted-foreground text-center">More reports and analytics coming soon.</p>
            </section>

           {/* Dialogs for Add/Restock and Stock Out */}
            <Dialog open={isAddStockDialogOpen} onOpenChange={setIsAddStockDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Add/Restock Item</DialogTitle>
                        <DialogDescription>Enter details to add new stock or restock an existing item.</DialogDescription>
                    </DialogHeader>
                    <div className="flex-grow overflow-y-auto pr-2"> {}
                        <AddStockForm
                            formId="addStockFormDialog" 
                            onSubmit={(data) => {
                                handleAddStockSubmit(data);
                                setIsAddStockDialogOpen(false);
                            }}
                            isLoading={addStockMutation.isPending}
                        />
                    </div>
                    <ShadDialogFooter className="mt-auto pt-4 border-t">
                        <Button variant="outline" onClick={() => setIsAddStockDialogOpen(false)} disabled={addStockMutation.isPending}><XCircle className="mr-2 h-4 w-4"/>Cancel</Button>
                        <Button
                            type="submit"
                            form="addStockFormDialog" 
                            className="bg-primary hover:bg-primary/90"
                            disabled={addStockMutation.isPending}
                        >
                            {addStockMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<PackagePlus className="mr-2 h-4 w-4" />)}
                            {addStockMutation.isPending ? 'Processing...' : 'Add Stock / Restock'}
                        </Button>
                    </ShadDialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isStockOutDialogOpen} onOpenChange={setIsStockOutDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Log Stock Out</DialogTitle>
                        <DialogDescription>Select an item and quantity to log stock out.</DialogDescription>
                    </DialogHeader>
                    <StockOutForm
                        items={stockItems.filter(item => item.currentStock > 0)}
                        onSubmit={(data) => {
                            handleStockOutSubmit(data);
                            setIsStockOutDialogOpen(false);
                        }}
                        isLoading={stockOutMutation.isPending}
                        currentUser={user}
                    />
                </DialogContent>
            </Dialog>


           <ViewItemDialog isOpen={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} item={itemToView} />
           <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}><DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col"><DialogHeader><DialogTitle>Edit Item: {itemToEdit?.itemName}</DialogTitle><DialogDescription>Make changes to the item details below. Click save when done.</DialogDescription></DialogHeader><div className="flex-grow overflow-y-auto pr-2">{itemToEdit && (<EditItemForm item={itemToEdit} onSubmit={handleEditItemSubmit} isLoading={editItemMutation.isPending} onCancel={() => setIsEditDialogOpen(false)} />)}</div></DialogContent></Dialog>
           <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete {itemToDelete?.itemName}. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDeleteItem} disabled={deleteItemMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{deleteItemMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>) : (<><Trash2 className="mr-2 h-4 w-4" /> Delete Item</>)}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
               {isAdmin && isSettingsDialogOpen && (<AdminSettingsDialog isOpen={isSettingsDialogOpen} onClose={() => setIsSettingsDialogOpen(false)} onSave={handleSaveSettings} currentSettings={adminSettings} isLoading={saveSettingsMutation.isPending} />)}
               {isAdmin && isUserManagementDialogOpen && (<UserManagementDialog isOpen={isUserManagementDialogOpen} onClose={() => setIsUserManagementDialogOpen(false)} allStockItems={stockItems} />)}
               <Dialog open={isPhotoSearchOpen} onOpenChange={setIsPhotoSearchOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Search Item by Photo</DialogTitle><DialogDescription>Center the item in the camera view and capture to search.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="relative aspect-video w-full bg-muted rounded-md overflow-hidden"><video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline /><canvas ref={canvasRef} style={{ display: 'none' }} />{hasCameraPermission === false && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-destructive-foreground p-4"><VideoOff className="h-12 w-12 mb-2" /><p className="text-lg font-semibold">Camera Access Denied</p><p className="text-sm text-center">Please allow camera access in your browser settings.</p></div>)}{hasCameraPermission === null && !photoSearchLoading && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-muted-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Accessing Camera...</p></div>)}{photoSearchLoading && (<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-primary-foreground"><Loader2 className="h-8 w-8 animate-spin mb-2" /><p>Analyzing Photo...</p></div>)}</div><Button type="button" onClick={handlePhotoSearchCapture} disabled={photoSearchLoading || hasCameraPermission !== true} className="w-full" size="lg">{photoSearchLoading ? (<Loader2 className="mr-2 h-5 w-5 animate-spin" />) : (<Camera className="mr-2 h-5 w-5" />)}{photoSearchLoading ? 'Searching...' : 'Capture & Search'}</Button></div><ShadDialogFooter><Button variant="outline" onClick={() => setIsPhotoSearchOpen(false)} disabled={photoSearchLoading}><XCircle className="mr-2 h-4 w-4"/> Cancel</Button></ShadDialogFooter></DialogContent></Dialog>
         </div>
       );
     }

     export default function Home() {
         return (<RequireAuth><StockManagementPageContent /></RequireAuth>);
     }

