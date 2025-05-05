
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
import { PlusCircle } from 'lucide-react';

interface AddItemFormProps {
  onSubmit: (data: AddItemFormData) => void;
}

const formSchema = z.object({
  itemName: z.string().min(1, { message: 'Item name is required.' }).max(100),
  currentStock: z.coerce // Coerce input to number
    .number({ invalid_type_error: 'Current stock must be a number.' })
    .int({ message: 'Current stock must be a whole number.' })
    .nonnegative({ message: 'Current stock cannot be negative.' }),
  minStock: z.coerce // Coerce input to number
    .number({ invalid_type_error: 'Minimum stock must be a number.' })
    .int({ message: 'Minimum stock must be a whole number.' })
    .nonnegative({ message: 'Minimum stock cannot be negative.' }),
  barcode: z.string().max(50).optional(),
  location: z.string().max(50).optional(),
});

export type AddItemFormData = z.infer<typeof formSchema>;

export function AddItemForm({ onSubmit }: AddItemFormProps) {
  const form = useForm<AddItemFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: '',
      currentStock: 0,
      minStock: 0,
      barcode: '',
      location: '',
    },
  });

  function handleFormSubmit(values: AddItemFormData) {
    console.log("Adding Item:", values);
    onSubmit(values);
    form.reset(); // Reset form after successful submission
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-primary mb-4">Add New Item</h2>
        <FormField
          control={form.control}
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name*</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Large Red Box" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
         <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="currentStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Stock*</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min. Stock Level*</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Barcode (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Scan or enter barcode" {...field} />
              </FormControl>
              <FormDescription>
                Enter the item's barcode number.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Shelf A3, Bin 5" {...field} />
              </FormControl>
              <FormDescription>
                Where is this item stored?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Item to Stock
        </Button>
      </form>
    </Form>
  );
}
