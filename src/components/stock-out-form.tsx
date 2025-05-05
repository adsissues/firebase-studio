
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
import { MinusCircle, Loader2 } from 'lucide-react'; // Import Loader2

interface StockOutFormProps {
  items: StockItem[];
  onSubmit: (data: StockOutFormData) => void;
  isLoading?: boolean; // Add isLoading prop
}

// Dynamic schema based on selected item's stock
const createFormSchema = (items: StockItem[]) => z.object({
  itemId: z.string().min(1, { message: 'Please select an item.' }),
  quantity: z.coerce // Coerce input to number
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
      path: ['quantity'], // Apply error to quantity field
    };
  }
);


export type StockOutFormData = z.infer<ReturnType<typeof createFormSchema>>;

export function StockOutForm({ items, onSubmit, isLoading = false }: StockOutFormProps) {
  // Recreate schema when items change
  const formSchema = React.useMemo(() => createFormSchema(items), [items]);

  const form = useForm<StockOutFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
    context: { items }, // Pass items to resolver context if needed
    mode: "onChange", // Validate on change for better UX
  });

   // Filter out items with 0 stock for the dropdown
   const availableItems = items.filter(item => item.currentStock > 0);


  function handleFormSubmit(values: StockOutFormData) {
    // Validation is now handled by Zod resolver including the refine check
    console.log("Stock Out:", values);
    onSubmit(values);
    // Resetting is handled by parent now
    // form.resetField("quantity", { defaultValue: 1 });
    // form.resetField("itemId", { defaultValue: '' });
  }

   // Reset form if submission is successful (isLoading becomes false after being true)
   React.useEffect(() => {
     if (!isLoading && form.formState.isSubmitSuccessful) {
        form.reset({ itemId: '', quantity: 1 }); // Reset with default values
     }
   }, [isLoading, form.formState.isSubmitSuccessful, form.reset]);


  return (
    <Form {...form}>
      {/* Removed redundant border and shadow, added padding to match card */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6">
         <fieldset disabled={isLoading} className="space-y-4"> {/* Disable form fields when loading */}
           <h2 className="text-lg font-semibold text-primary mb-4">Log Stock Out</h2>
          <FormField
            control={form.control}
            name="itemId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Item</FormLabel>
                <Select
                  onValueChange={(value) => {
                      field.onChange(value);
                      form.trigger("quantity"); // Re-validate quantity when item changes
                  }}
                  value={field.value || ''}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item to remove stock" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     {availableItems.length === 0 ? (
                       <SelectItem value="no-items" disabled>
                         No items with stock available
                       </SelectItem>
                     ) : (
                       availableItems.map((item) => (
                         <SelectItem key={item.id} value={item.id}>
                           {item.itemName} (Available: {item.currentStock})
                         </SelectItem>
                       ))
                     )}
                   </SelectContent>
                </Select>
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
                      type="number"
                      min="1"
                      placeholder="Enter quantity"
                      {...field}
                      value={field.value ?? ''}
                      onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
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

