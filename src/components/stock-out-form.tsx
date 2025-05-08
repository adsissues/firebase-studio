
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
// Removed Textarea import as notes are removed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'; // Import Card components
import type { StockItem, StockMovementLog } from '@/types'; // Import StockMovementLog
import { MinusCircle, Loader2, ScanBarcode } from 'lucide-react'; // Removed unused icons Hash, MessageSquare
import { useAuth } from '@/context/auth-context';
import { scanBarcode } from '@/services/barcode-scanner';
import { useToast } from "@/hooks/use-toast";

interface StockOutFormProps {
  items: StockItem[];
  onSubmit: (data: StockOutFormDataSubmit) => void;
  isLoading?: boolean;
}

// Updated schema - removed optional notes and batch number
const createFormSchema = (items: StockItem[]) => z.object({
  barcode: z.string().optional().or(z.literal('')),
  itemId: z.string().min(1, { message: 'Please select an item or scan a barcode.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity must be greater than zero.' }),
  // Removed batchNumber and notes
}).refine(
  (data) => {
    const selectedItem = items.find(item => item.id === data.itemId);
    if (!selectedItem) return true;
    return data.quantity <= selectedItem.currentStock;
  },
  (data) => {
    const selectedItem = items.find(item => item.id === data.itemId);
    return {
      message: `Quantity cannot exceed available stock (${selectedItem?.currentStock ?? 0}).`,
      path: ['quantity'],
    };
  }
).refine(
    (data) => {
        if (!data.barcode || !data.itemId) return true;
        const selectedItem = items.find(item => item.id === data.itemId);
        return !selectedItem || !selectedItem.barcode || selectedItem.barcode === data.barcode;
    },
    {
        message: "Barcode does not match the selected item.",
        path: ['barcode'],
    }
);


// Type for form state - reflects removed fields
export type StockOutFormData = Omit<z.infer<ReturnType<typeof createFormSchema>>, 'batchNumber' | 'notes'>;
// Type for data submitted - reflects removed fields
export type StockOutFormDataSubmit = Pick<StockOutFormData, 'itemId' | 'quantity'>;

export function StockOutForm({ items, onSubmit, isLoading = false }: StockOutFormProps) {
   const { user, isAdmin } = useAuth();
   const { toast } = useToast();
   const [isScanningBarcode, setIsScanningBarcode] = React.useState(false);

  const userVisibleItems = React.useMemo(() => {
      if (!user) return [];
      if (isAdmin) return items;
      return items.filter(item => item.userId === user.uid);
  }, [items, user, isAdmin]);

   const availableItems = React.useMemo(() => {
       return userVisibleItems.filter(item => item.currentStock > 0);
   }, [userVisibleItems]);

  const formSchema = React.useMemo(() => createFormSchema(userVisibleItems), [userVisibleItems]);

  const form = useForm<StockOutFormData>({ // Use StockOutFormData here
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      itemId: '',
      quantity: 1,
      // Removed batchNumber and notes default values
    },
    context: { items: userVisibleItems },
    mode: "onChange",
  });

    const handleScanBarcode = async () => {
        setIsScanningBarcode(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); // Short delay
            const result = await scanBarcode();
            const scannedBarcode = result.barcode;
            form.setValue('barcode', scannedBarcode, { shouldValidate: true });

            const matchedItem = userVisibleItems.find(item => item.barcode === scannedBarcode);

            if (matchedItem) {
                 if (matchedItem.currentStock > 0) {
                    form.setValue('itemId', matchedItem.id, { shouldValidate: true });
                    // Removed pre-fill for batchNumber
                    toast({ title: "Item Found", description: `${matchedItem.itemName} selected.` });
                 } else {
                     form.setValue('itemId', '', { shouldValidate: true });
                     toast({ variant: "destructive", title: "Out of Stock", description: `${matchedItem.itemName} has no stock available.` });
                 }
            } else {
                form.setValue('itemId', '', { shouldValidate: true });
                toast({ variant: "destructive", title: "Barcode Not Found", description: "No matching item found for this barcode." });
            }
        } catch (error) {
            console.error("Barcode scan error:", error);
            toast({ variant: "destructive", title: "Scan Error", description: "Could not scan barcode." });
             form.setValue('itemId', '', { shouldValidate: true });
        } finally {
            setIsScanningBarcode(false);
        }
    };


  function handleFormSubmit(values: StockOutFormData) {
    console.log("Stock Out:", values);
    // Submit only itemId and quantity
    onSubmit({
        itemId: values.itemId,
        quantity: values.quantity,
    });
  }

   React.useEffect(() => {
     if (!isLoading && form.formState.isSubmitSuccessful) {
        // Reset includes removed fields
        form.reset({ barcode: '', itemId: '', quantity: 1 });
     }
   }, [isLoading, form.formState.isSubmitSuccessful, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
         <fieldset disabled={isLoading || !user} className="space-y-4">
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
                        <Input placeholder="Scan or enter barcode" {...field} className="flex-grow" />
                      </FormControl>
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={handleScanBarcode}
                         disabled={isScanningBarcode || isLoading}
                         aria-label="Scan Barcode"
                       >
                         {isScanningBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
                       </Button>
                        {/* Batch Scan button removed */}
                   </div>
                   <FormDescription>
                     Scan an item's barcode to select it automatically.
                   </FormDescription>
                   <FormMessage />
                 </FormItem>
               )}
             />

          {/* Item Selection */}
          <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {!user ? (
                         <SelectItem value="disabled" disabled>Please log in</SelectItem>
                     ) : availableItems.length === 0 ? (
                       <SelectItem value="disabled" disabled>
                         No items with stock available
                       </SelectItem>
                     ) : (
                       availableItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                           {item.itemName} (Available: {item.currentStock}) {item.barcode ? `[${item.barcode}]` : ''}
                        </SelectItem>
                       ))
                     )}
                   </SelectContent>
                </Select>
                <FormDescription>
                  Select item manually if not using barcode.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Quantity Field */}
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantity*</FormLabel>
                <FormControl>
                  <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Enter quantity"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                      />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

            {/* Optional Batch Number Field Removed */}
            {/* Optional Notes Field Removed */}

         </fieldset>
         <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={isLoading || isScanningBarcode || !user}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MinusCircle className="mr-2 h-4 w-4" />
            )}
             Log Stock Out
        </Button>
      </form>
    </Form>
  );
}
