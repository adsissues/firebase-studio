
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StockItem, AppUser } from '@/types'; 
import { MinusCircle, Loader2, ScanBarcode } from 'lucide-react'; 
// Removed useAuth import as user info will be passed via props
import { scanBarcode } from '@/services/barcode-scanner';
import { useToast } from "@/hooks/use-toast";

interface StockOutFormProps {
  items: StockItem[]; // This list is pre-filtered by the parent
  onSubmit: (data: StockOutFormDataSubmit) => void;
  isLoading?: boolean;
  currentUser: AppUser | null; // Pass current user for disable checks
}

const createFormSchema = (items: StockItem[]) => z.object({
  barcode: z.string().optional().or(z.literal('')),
  itemId: z.string().min(1, { message: 'Please select an item or scan a barcode.' }),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity must be greater than zero.' }),
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

export type StockOutFormData = z.infer<ReturnType<typeof createFormSchema>>;
export type StockOutFormDataSubmit = Pick<StockOutFormData, 'itemId' | 'quantity'>;

export function StockOutForm({ items, onSubmit, isLoading = false, currentUser }: StockOutFormProps) {
   const { toast } = useToast();
   const [isScanningBarcode, setIsScanningBarcode] = React.useState(false);

   // The `items` prop is now assumed to be pre-filtered by the parent component (page.tsx)
   // based on user role and assigned locations.
   // `availableItems` filters this pre-scoped list for items with stock > 0.
   const availableItems = React.useMemo(() => {
       return items.filter(item => item.currentStock > 0);
   }, [items]);

  const formSchema = React.useMemo(() => createFormSchema(items), [items]); // Use `items` prop directly

  const form = useForm<StockOutFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      itemId: '',
      quantity: 1,
    },
    context: { items }, // For refine context, using the passed `items`
    mode: "onChange", 
  });

    const handleScanBarcode = async () => {
        setIsScanningBarcode(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 100)); 
            const result = await scanBarcode();
            const scannedBarcode = result.barcode;
            form.setValue('barcode', scannedBarcode, { shouldValidate: true });

            // Search within the `items` prop (which is already user-accessible)
            const matchedItem = items.find(item => item.barcode === scannedBarcode);

            if (matchedItem) {
                 if (matchedItem.currentStock > 0) {
                    form.setValue('itemId', matchedItem.id, { shouldValidate: true });
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
    onSubmit({
        itemId: values.itemId,
        quantity: values.quantity,
    });
  }

   React.useEffect(() => {
     if (!isLoading && form.formState.isSubmitSuccessful) {
        form.reset({ barcode: '', itemId: '', quantity: 1 });
     }
   }, [isLoading, form.formState.isSubmitSuccessful, form]); // form.reset added to dependency array


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
         <fieldset disabled={isLoading || !currentUser} className="space-y-4">
            <h2 className="text-lg font-semibold text-primary mb-4">Log Stock Out</h2>

             <FormField
               control={form.control}
               name="barcode"
               render={({ field }) => (
                 <FormItem>
                   <FormLabel>Barcode (Optional)</FormLabel>
                   <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Scan or enter barcode" {...field} className="flex-grow" />
                      </FormControl>
                       <Button
                         type="button"
                         variant="outline"
                         size="icon"
                         onClick={handleScanBarcode}
                         disabled={isScanningBarcode || isLoading || !currentUser}
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
                <FormLabel>Item*</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || !currentUser}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {!currentUser ? (
                         <SelectItem value="disabled-login" disabled>Please log in</SelectItem>
                     ) : availableItems.length === 0 ? (
                       <SelectItem value="disabled-no-items" disabled>
                         No items with stock available for you
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
                  Select item manually if not using barcode. Only items you can access with stock are shown.
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
         </fieldset>
         <Button type="submit" className="w-full bg-destructive hover:bg-destructive/90" disabled={isLoading || isScanningBarcode || !currentUser}>
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
