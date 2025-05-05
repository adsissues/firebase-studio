
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
import { PlusCircle, Loader2 } from 'lucide-react'; // Import Loader2 for loading spinner

interface AddItemFormProps {
  onSubmit: (data: AddItemFormData) => void;
  isLoading?: boolean; // Add isLoading prop
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
  barcode: z.string().max(50).optional().or(z.literal('')), // Allow empty string
  location: z.string().max(50).optional().or(z.literal('')), // Allow empty string
});

export type AddItemFormData = z.infer<typeof formSchema>;

export function AddItemForm({ onSubmit, isLoading = false }: AddItemFormProps) {
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
    // Resetting the form is handled by the parent on successful mutation now
    // form.reset();
  }

  // Reset form if submission is successful (isLoading becomes false after being true)
  React.useEffect(() => {
    if (!isLoading && form.formState.isSubmitSuccessful) {
       form.reset();
    }
  }, [isLoading, form.formState.isSubmitSuccessful, form.reset]);


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
        <fieldset disabled={isLoading} className="space-y-4"> {/* Disable form fields when loading */}
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
                        {/* Ensure value is handled correctly for type=number */}
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ''} // Handle potential null/undefined
                          onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))} // Parse integer
                          />
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
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ''}
                           onChange={e => field.onChange(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                          />
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
        </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
          {isLoading ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
             <PlusCircle className="mr-2 h-4 w-4" />
           )}
          {isLoading ? 'Adding...' : 'Add Item to Stock'}
        </Button>
      </form>
    </Form>
  );
}
