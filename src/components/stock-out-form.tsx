
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
import { MinusCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context'; // Import useAuth

interface StockOutFormProps {
  items: StockItem[]; // Receive all items fetched by parent
  onSubmit: (data: StockOutFormData) => void;
  isLoading?: boolean;
}

// Dynamic schema based on selected item's stock
const createFormSchema = (items: StockItem[]) => z.object({
  itemId: z.string().min(1, { message: 'Please select an item.' }),
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
);


export type StockOutFormData = z.infer<ReturnType<typeof createFormSchema>>;

export function StockOutForm({ items, onSubmit, isLoading = false }: StockOutFormProps) {
   const { user, isAdmin } = useAuth(); // Get user and admin status

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
      itemId: '',
      quantity: 1,
    },
    context: { items: userVisibleItems }, // Pass user-visible items to resolver context
    mode: "onChange",
  });


  function handleFormSubmit(values: StockOutFormData) {
    console.log("Stock Out:", values);
    onSubmit(values);
  }

   React.useEffect(() => {
     if (!isLoading && form.formState.isSubmitSuccessful) {
        form.reset({ itemId: '', quantity: 1 });
     }
   }, [isLoading, form.formState.isSubmitSuccessful, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 p-6">
         <fieldset disabled={isLoading || !user} className="space-y-4"> {/* Disable if loading or not logged in */}
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
                      form.trigger("quantity");
                  }}
                  value={field.value || ''}
                   disabled={!user} // Disable if not logged in
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item to remove stock" />
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
                       disabled={!user || !form.watch('itemId')} // Disable if no item selected or not logged in
                    />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
         </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || !user}>
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
