
'use client';

import * as React from 'react';
import { ItemSearch } from '@/components/item-search';
import { StockDashboard } from '@/components/stock-dashboard';
import { EditItemForm, type EditItemFormData } from '@/components/edit-item-form';
import { ViewItemDialog } from '@/components/view-item-dialog';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { StockItem, AdminSettings, AppUser } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, auth } from '@/lib/firebase/firebase';
import { collection, getDocs, updateDoc, doc, deleteDoc, writeBatch, query, where, runTransaction, getDoc, serverTimestamp, Timestamp, deleteField, or } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Trash2, ArrowLeft, Settings2, ListFilter, EyeIcon } from 'lucide-react';
import { RequireAuth } from '@/components/auth/require-auth';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/page-header';
import { useRouter } from 'next/navigation';
import { getItemStatusInfo } from '@/components/stock-dashboard'; // Assuming this is exported

const defaultAdminSettings: AdminSettings = {
    emailNotifications: true,
    pushNotifications: false,
    lowStockThreshold: 10,
    overstockThresholdPercentage: 200,
    inactivityAlertDays: 30,
};

function InventoryPageContent() {
  const { user, isAdmin, loading: authLoading, assignedLocations } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<StockItem | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [itemToView, setItemToView] = useState<StockItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  const { data: adminSettings = defaultAdminSettings, isLoading: isLoadingSettings } = useQuery<AdminSettings>({
    queryKey: ['adminSettings'],
    queryFn: async () => {
        if (!isAdmin || !db) return defaultAdminSettings;
        const settingsDocRef = doc(db, 'settings', 'admin');
        const docSnap = await getDoc(settingsDocRef);
        return docSnap.exists() ? { ...defaultAdminSettings, ...docSnap.data() } : defaultAdminSettings;
    },
    enabled: isAdmin && !!user,
  });

  const { data: stockItems = [], isLoading: isLoadingItems, error: fetchError, refetch: refetchItems } = useQuery<StockItem[]>({
    queryKey: ['allStockItems', user?.uid, isAdmin, assignedLocations], // Different query key for all items
    queryFn: async () => {
       if (!user) return [];
       const itemsCol = collection(db, 'stockItems');
       
        let itemsList: StockItem[] = [];
        if (isAdmin) {
            const q = query(itemsCol);
            const itemSnapshot = await getDocs(q);
            itemsList = itemSnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as StockItem));
        } else {
            // Fetch items owned by the user
            const ownerQuery = query(itemsCol, where("userId", "==", user.uid));
            const ownerSnapshot = await getDocs(ownerQuery);
            const ownedItems = ownerSnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data(),
            } as StockItem));

            let locationItems: StockItem[] = [];
            // Fetch items in assigned locations, if any
            if (assignedLocations && assignedLocations.length > 0) {
                // Firestore 'in' query supports up to 30 elements per query.
                // We chunk the assignedLocations array to handle more than 30 locations safely.
                const locationChunks: string[][] = [];
                for (let i = 0; i < assignedLocations.length; i += 30) {
                    locationChunks.push(assignedLocations.slice(i, i + 30));
                }

                const locationPromises = locationChunks.map(chunk => {
                    const locationQuery = query(itemsCol, where("location", "in", chunk));
                    return getDocs(locationQuery);
                });

                const locationSnapshots = await Promise.all(locationPromises);
                locationItems = locationSnapshots.flatMap(snapshot => 
                    snapshot.docs.map(docSnap => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    } as StockItem))
                );
            }
            
            // Combine and remove duplicates using a Map
            const combinedItems = new Map<string, StockItem>();
            [...ownedItems, ...locationItems].forEach(item => {
                combinedItems.set(item.id, item);
            });
            itemsList = Array.from(combinedItems.values());
        }

       return itemsList.map((item: StockItem) => ({
          ...item,
          currentStock: Number(item.currentStock ?? 0),
          minimumStock: item.minimumStock !== undefined ? Number(item.minimumStock) : undefined,
          itemName: item.itemName || 'Unknown Item',
          rack: item.rack || undefined,
          shelf: item.shelf || undefined,
      }));
    },
    enabled: !!user,
  });

  const editItemMutation = useMutation({
    mutationFn: async (itemData: StockItem) => {
        if (!user || !db) throw new Error("User not authenticated or DB not available");
        if (!isAdmin && itemData.userId !== user.uid && (!itemData.location || !assignedLocations.includes(itemData.location))) {
            throw new Error("Permission denied: You can only edit your own items or items in your assigned locations.");
        }
        const itemDocRef = doc(db, 'stockItems', itemData.id);
        const { id, ...updateDataFromForm } = itemData;

        const finalUpdateData: Record<string, any> = {};
        const currentDocSnap = await getDoc(itemDocRef);
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
        if (Object.keys(finalUpdateData).length > 0) {
            finalUpdateData.lastMovementDate = serverTimestamp();
            await updateDoc(itemDocRef, finalUpdateData);
        }
        const updatedDocSnapAfter = await getDoc(itemDocRef);
        return { id: updatedDocSnapAfter.id, ...updatedDocSnapAfter.data() } as StockItem;
    },
    onSuccess: (updatedItem) => {
        queryClient.invalidateQueries({ queryKey: ['allStockItems', user?.uid, isAdmin, assignedLocations] });
        setIsEditDialogOpen(false);
        setItemToEdit(null);
        toast({ title: "Item Updated", description: `${updatedItem.itemName} has been updated.` });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error Updating Item", description: error.message });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemToDelete: StockItem) => {
        if (!user || !db) throw new Error("User not authenticated or DB not available");
        if (!isAdmin && itemToDelete.userId !== user.uid && (!itemToDelete.location || !assignedLocations.includes(itemToDelete.location))) {
            throw new Error("Permission denied.");
        }
        const itemDocRef = doc(db, 'stockItems', itemToDelete.id);
        await deleteDoc(itemDocRef);
        return itemToDelete.id;
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['allStockItems', user?.uid, isAdmin, assignedLocations] });
        setIsDeleteDialogOpen(false);
        toast({ title: "Item Deleted" });
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Error Deleting Item", description: error.message });
    },
  });

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
        rack: data.rack || undefined,
        shelf: data.shelf || undefined,
        description: data.description || undefined,
        category: data.category || undefined,
        supplier: data.supplier || undefined,
        photoUrl: data.photoUrl || undefined,
        locationCoords: data.locationCoords || undefined,
        costPrice: data.costPrice === undefined || data.costPrice === null ? undefined : Number(data.costPrice),
        lastMovementDate: itemToEdit.lastMovementDate, // Preserve last movement date from original
        supplierName: data.supplierName || undefined,
        supplierContactPerson: data.supplierContactPerson || undefined,
        supplierPhone: data.supplierPhone || undefined,
        supplierEmail: data.supplierEmail || undefined,
        supplierWebsite: data.supplierWebsite || undefined,
        supplierAddress: data.supplierAddress || undefined,
    };
    editItemMutation.mutate(updatedItem);
  };

  const handleEditClick = (item: StockItem) => { setItemToEdit(item); setIsEditDialogOpen(true); };
  const handleViewClick = (item: StockItem) => { setItemToView(item); setIsViewDialogOpen(true); };
  const handleDeleteClick = (item: StockItem) => { setItemToDelete(item); setIsDeleteDialogOpen(true); };
  const confirmDeleteItem = () => { if (itemToDelete) deleteItemMutation.mutate(itemToDelete); };
  
  const handleReorderClick = (item: StockItem) => {
    const supplierInfo = [item.supplierName, item.supplierContactPerson, item.supplierEmail, item.supplierPhone].filter(Boolean).join(', ');
    if (item.supplierEmail) {
        const subject = `Reorder Request for ${item.itemName}`;
        const body = `Hello ${item.supplierName || 'Supplier'},\n\nPlease reorder ${item.itemName} (ID: ${item.id}).\n\nCurrent Stock: ${item.currentStock}\nMinimum Stock: ${item.minimumStock ?? adminSettings.lowStockThreshold}\n\nThank you.`;
        window.location.href = `mailto:${item.supplierEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else if (item.supplierPhone) {
        toast({ title: "Reorder Action", description: `Please call ${item.supplierName || 'supplier'} at ${item.supplierPhone} to reorder ${item.itemName}.`, duration: 10000 });
    } else {
        toast({ variant: "destructive", title: "Supplier Contact Missing", description: `No email or phone found for ${item.supplierName || item.itemName}.` });
    }
  };

  const filteredItems = React.useMemo(() => {
    return stockItems.filter((item) =>
      (item.itemName || '').toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (item.barcode && (item.barcode || '').toLowerCase().includes(searchQuery.trim().toLowerCase())) ||
      (item.description && (item.description || '').toLowerCase().includes(searchQuery.trim().toLowerCase()))
    );
  }, [stockItems, searchQuery]);

  const isLoading = authLoading || isLoadingItems || isLoadingSettings;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Full Inventory</h1>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>

      <Card className="shadow-md mb-6">
        <CardHeader>
          <CardTitle>Search Full Inventory</CardTitle>
          <CardDescription>Find items by name, barcode, or description.</CardDescription>
        </CardHeader>
        <CardContent>
          <ItemSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} placeholder="Search all items..." />
        </CardContent>
      </Card>

      {isLoading && (
        <div className="space-y-2 pt-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {fetchError && (
        <Alert variant="destructive" className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <ShadAlertTitle>Error Loading Stock</ShadAlertTitle>
          <ShadAlertDescription>Could not load stock items. {(fetchError as Error).message}</ShadAlertDescription>
        </Alert>
      )}

      {!isLoading && !fetchError && (
        <StockDashboard
          items={filteredItems}
          onView={handleViewClick}
          onEdit={handleEditClick}
          onDelete={handleDeleteClick}
          onReorder={handleReorderClick}
          isAdmin={isAdmin}
          globalLowStockThreshold={adminSettings.lowStockThreshold}
          adminSettings={adminSettings}
        />
      )}
      
      {filteredItems.length === 0 && !isLoading && !fetchError && searchQuery && (
        <Card className="mt-6"><CardContent className="pt-6"><p className="text-center text-muted-foreground">No items match your search: "{searchQuery}".</p></CardContent></Card>
      )}
      {filteredItems.length === 0 && !isLoading && !fetchError && !searchQuery && stockItems.length > 0 && (
        <Card className="mt-6"><CardContent className="pt-6"><p className="text-center text-muted-foreground">No items to display.</p></CardContent></Card>
      )}


      <ViewItemDialog isOpen={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} item={itemToView} />
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Item: {itemToEdit?.itemName}</DialogTitle>
            <DialogDescription>Make changes to the item details below. Click save when done.</DialogDescription>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-2">
            {itemToEdit && (
              <EditItemForm
                item={itemToEdit}
                onSubmit={handleEditItemSubmit}
                isLoading={editItemMutation.isPending}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete {itemToDelete?.itemName}. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)} disabled={deleteItemMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteItem} disabled={deleteItemMutation.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {deleteItemMutation.isPending ? (<Loader2 className="mr-2 h-4 w-4 animate-spin" />) : (<Trash2 className="mr-2 h-4 w-4" />)}
              {deleteItemMutation.isPending ? 'Deleting...' : 'Delete Item'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function InventoryPage() {
  return (<RequireAuth><InventoryPageContent /></RequireAuth>);
}

    
