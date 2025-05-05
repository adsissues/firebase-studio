"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription, // Import FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StockItem } from '@/types';
import { MinusCircle, Loader2, ScanBarcode } from 'lucide-react'; // Added ScanBarcode
import { useAuth } from '@/context/auth-context';
import { scanBarcode } from '@/services/barcode-scanner'; // Import barcode scanner service
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface StockOutFormProps {
  items: StockItem[]; // Receive all items fetched by parent
  onSubmit: (data: StockOutFormDataSubmit) => void; // Use specific submit type
  isLoading?: boolean;
}

// Dynamic schema based on selected item's stock
const createFormSchema = (items: StockItem[]) => z.object({
  barcode: z.string().optional().or(z.literal('')), // Add optional barcode field
  itemId: z.string().min(1, { message: 'Please select an item or scan a barcode.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity must be greater than zero.' }),
}).refine(
  (data) => {
    const selectedItem = items.find(item => item.id === data.itemId);
    if (!selectedItem) return true; // Let itemId validation handle this
    return data.quantity <= selectedItem.currentStock;
  },
  (data) => {
    const selectedItem = items.find(item => item.id === data.itemId);
    return {
      message: `Quantity cannot exceed available stock (${selectedItem?.currentStock ?? 0}).`,
      path: ['quantity'],
    };
  }
).refine( // Add refinement to check barcode against selected item
    (data) => {
        if (!data.barcode || !data.itemId) return true; // Skip if barcode or item not set
        const selectedItem = items.find(item => item.id === data.itemId);
        // Barcode is optional on item, so allow if item has no barcode
        return !selectedItem || !selectedItem.barcode || selectedItem.barcode === data.barcode;
    },
    {
        message: "Barcode does not match the selected item.",
        path: ['barcode'], // Or potentially 'itemId' if you want to clear the item
    }
);


// Type for form state, includes barcode
export type StockOutFormData = z.infer<ReturnType<typeof createFormSchema>>;
// Type for data submitted, only requires itemId and quantity
export type StockOutFormDataSubmit = Pick<StockOutFormData, 'itemId' | 'quantity'>;

export function StockOutForm({ items, onSubmit, isLoading = false }: StockOutFormProps) {
   const { user, isAdmin } = useAuth(); // Get user and admin status
   const { toast } = useToast();
   const [isScanningBarcode, setIsScanningBarcode] = React.useState(false);

  // Filter items based on user ownership or admin status *before* creating schema/form
  const userVisibleItems = React.useMemo(() => {
      if (!user) return []; // No items visible if not logged in
      if (isAdmin) return items; // Admin sees all items
      return items.filter(item => item.userId === user.uid); // User sees only their items
  }, [items, user, isAdmin]);

   // Filter out items with 0 stock from the user-visible items
   const availableItems = React.useMemo(() => {
       return userVisibleItems.filter(item => item.currentStock > 0);
   }, [userVisibleItems]);


  // Recreate schema based on *all* user-visible items (validation needs access to original stock)
  const formSchema = React.useMemo(() => createFormSchema(userVisibleItems), [userVisibleItems]);

  const form = useForm<StockOutFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      itemId: '',
      quantity: 1,
    },
    context: { items: userVisibleItems }, // Pass user-visible items to resolver context
    mode: "onChange", // Validate on change for better feedback
  });

    const handleScanBarcode = async () => {
        setIsScanningBarcode(true);
        try {
            const result = await scanBarcode(); // Call the service
            const scannedBarcode = result.barcode;
            form.setValue('barcode', scannedBarcode, { shouldValidate: true });

            // Find item matching the scanned barcode among *user visible* items
            const matchedItem = userVisibleItems.find(item => item.barcode === scannedBarcode);

            if (matchedItem) {
                 if (matchedItem.currentStock > 0) {
                    form.setValue('itemId', matchedItem.id, { shouldValidate: true });
                    toast({ title: "Item Found", description: `${matchedItem.itemName} selected.` });
                    // Optionally focus quantity field
                    // document.getElementById('quantity-input-id')?.focus();
                 } else {
                     form.setValue('itemId', '', { shouldValidate: true }); // Clear item selection if out of stock
                     toast({ variant: "destructive", title: "Out of Stock", description: `${matchedItem.itemName} has no stock available.` });
                 }
            } else {
                form.setValue('itemId', '', { shouldValidate: true }); // Clear item selection if not found
                toast({ variant: "destructive", title: "Barcode Not Found", description: "No matching item found for this barcode." });
            }
        } catch (error) {
            console.error("Barcode scan error:", error);
            toast({ variant: "destructive", title: "Scan Error", description: "Could not scan barcode." });
             form.setValue('itemId', '', { shouldValidate: true }); // Clear item on scan error
        } finally {
            setIsScanningBarcode(false);
        }
    };


  function handleFormSubmit(values: StockOutFormData) {
    console.log("Stock Out:", values);
    // Submit only the required data (itemId, quantity)
    onSubmit({ itemId: values.itemId, quantity: values.quantity });
  }

   React.useEffect(() => {
     if (!isLoading && form.formState.isSubmitSuccessful) {
        form.reset({ barcode: '', itemId: '', quantity: 1 });
     }
   }, [isLoading, form.formState.isSubmitSuccessful, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6">
         <fieldset disabled={isLoading || !user || isScanningBarcode} className="space-y-4"> {/* Disable if loading, scanning or not logged in */}
           <h2 className="text-lg font-semibold text-primary mb-4">Log Stock Out</h2>

            {/* Barcode Field */}
            <FormField
              control={form.control}
              name="barcode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Barcode</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Scan or enter barcode"
                        {...field}
                        className="flex-grow"
                        onChange={(e) => {
                            field.onChange(e);
                            // Optional: Find item when barcode is manually typed
                            // const typedBarcode = e.target.value;
                            // const matchedItem = userVisibleItems.find(item => item.barcode === typedBarcode);
                            // if (matchedItem && matchedItem.currentStock > 0) {
                            //     form.setValue('itemId', matchedItem.id, { shouldValidate: true });
                            // } else if (typedBarcode === '') {
                            //     // Optional: clear item if barcode is cleared
                            //     // form.setValue('itemId', '', { shouldValidate: true });
                            // }
                            // form.trigger(['itemId', 'barcode']); // Re-validate both
                        }}
                        />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleScanBarcode}
                      disabled={isScanningBarcode || isLoading || !user}
                      aria-label="Scan Barcode"
                    >
                      {isScanningBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
                    </Button>
                  </div>
                   <FormDescription>
                     Scan an item's barcode to select it automatically.
                   </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

          <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item</FormLabel>
                <Select
                  onValueChange={(value) => {
                      field.onChange(value);
                      // Find the selected item and update barcode field if manual selection happens
                      const selectedItem = userVisibleItems.find(item => item.id === value);
                      form.setValue('barcode', selectedItem?.barcode || '', { shouldValidate: true });
                      form.trigger("quantity"); // Re-validate quantity based on new item's stock
                  }}
                  value={field.value || ''}
                  disabled={!user} // Disable if not logged in
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {!user ? (
                         <SelectItem value="login-required" disabled>Please log in</SelectItem>
                     ) : availableItems.length === 0 ? (
                       <SelectItem value="no-items" disabled>
                         No items with stock available
                       </SelectItem>
                     ) : (
                       // Show all *available* items (stock > 0) for manual selection
                       availableItems.map((item) => (
                         <SelectItem key={item.id} value={item.id}>
                           {item.itemName} (Available: {item.currentStock}) {item.barcode ? `[${item.barcode}]` : ''}
                         </SelectItem>
                       ))
                     )}
                   </SelectContent>
                </Select>
                 <FormDescription>
                   Select an item manually if not using barcode scanner.
                 </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity</FormLabel>
                <FormControl>
                  <Input
                      id="quantity-input-id" // Added ID for potential focus() call
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                       disabled={!user || !form.watch('itemId')} // Disable if no item selected or not logged in
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || !user || isScanningBarcode}>
           {isLoading ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
             <MinusCircle className="mr-2 h-4 w-4" />
           )}
           {isLoading ? 'Logging...' : 'Log Stock Out'}
        </Button>
      </form>
    </Form>
  );
}
