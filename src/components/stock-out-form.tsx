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
import { MinusCircle } from 'lucide-react';

interface StockOutFormProps {
  items: StockItem[];
  onSubmit: (data: StockOutFormData) => void;
}

const formSchema = z.object({
  itemId: z.string().min(1, { message: 'Please select an item.' }),
  quantity: z.coerce // Coerce input to number
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity must be greater than zero.' }),
});

export type StockOutFormData = z.infer<typeof formSchema>;

export function StockOutForm({ items, onSubmit }: StockOutFormProps) {
  const form = useForm<StockOutFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  function handleFormSubmit(values: StockOutFormData) {
    // Find the selected item to validate quantity against current stock
    const selectedItem = items.find(item => item.id === values.itemId);
    if (!selectedItem) {
        form.setError("itemId", { type: "manual", message: "Selected item not found." });
        return;
    }
    if (values.quantity > selectedItem.currentStock) {
        form.setError("quantity", { type: "manual", message: `Quantity cannot exceed available stock (${selectedItem.currentStock}).` });
        return;
    }
    console.log("Stock Out:", values); // Placeholder for actual submission logic
    onSubmit(values);
    // Optionally reset the form after successful submission
    // form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
         <h2 className="text-lg font-semibold text-primary mb-4">Log Stock Out</h2>
        <FormField
          control={form.control}
          name="itemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an item to remove stock" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                      {item.itemName} (Available: {item.currentStock})
                    </SelectItem>
                  ))}
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
                <Input type="number" min="1" placeholder="Enter quantity" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
          <MinusCircle className="mr-2 h-4 w-4" />
          Log Stock Out
        </Button>
      </form>
    </Form>
  );
}
