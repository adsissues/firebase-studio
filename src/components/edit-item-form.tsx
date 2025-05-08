
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form, // Ensure Form is imported
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Save, Loader2, Camera, MapPin, ScanBarcode, VideoOff, XCircle, DollarSign, Clock, Hash } from 'lucide-react';
import type { StockItem, LocationCoords } from '@/types';
import { scanBarcode } from '@/services/barcode-scanner';
import { captureProductPhoto } from '@/services/camera';
import { getCurrentLocation } from '@/services/location';
import { useToast } from "@/hooks/use-toast";

interface EditItemFormProps {
  item: StockItem; // The item being edited
  onSubmit: (data: EditItemFormData) => void;
  isLoading?: boolean;
  onCancel: () => void; // Function to call when cancelling
}

// Updated schema to include new optional fields
const formSchema = z.object({
  itemName: z.string().min(1, { message: 'Item name is required.' }).max(100),
  currentStock: z.coerce
    .number({ invalid_type_error: 'Current stock must be a number.' })
    .int({ message: 'Current stock must be a whole number.' })
    .nonnegative({ message: 'Current stock cannot be negative.' }),
  minimumStock: z.coerce
    .number({ invalid_type_error: 'Minimum stock must be a number.' })
    .int({ message: 'Minimum stock must be a whole number.' })
    .nonnegative({ message: 'Minimum stock cannot be negative.' })
    .optional(),
  barcode: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.string().max(50).optional().or(z.literal('')),
  supplier: z.string().max(100).optional().or(z.literal('')),
  photoUrl: z.string().url({ message: "Please enter a valid URL or capture a photo." }).optional().or(z.literal('')),
  locationCoords: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  // New optional fields
   costPrice: z.coerce
    .number({ invalid_type_error: 'Cost price must be a number.' })
    .nonnegative({ message: 'Cost price cannot be negative.' })
    .optional(),
  leadTime: z.coerce
    .number({ invalid_type_error: 'Lead time must be a number.' })
    .int({ message: 'Lead time must be a whole number.' })
    .nonnegative({ message: 'Lead time cannot be negative.' })
    .optional(),
  batchNumber: z.string().max(50).optional().or(z.literal('')),
});

// Update EditItemFormData type to reflect the schema change
export type EditItemFormData = Omit<z.infer<typeof formSchema>, 'locationCoords' | 'photoUrl'> & {
    photoUrl?: string;
    locationCoords?: LocationCoords;
    minimumStock?: number;
    costPrice?: number; // Add new optional fields
    leadTime?: number;
    batchNumber?: string;
};


export function EditItemForm({ item, onSubmit, isLoading = false, onCancel }: EditItemFormProps) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = React.useState<string | null>(item.photoUrl || null);
  const [capturedLocation, setCapturedLocation] = React.useState<LocationCoords | null>(item.locationCoords || null);
  const [showCameraFeed, setShowCameraFeed] = React.useState(false);
  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = React.useState(false); // Corrected state name


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: item.itemName,
      currentStock: item.currentStock,
      minimumStock: item.minimumStock ?? undefined,
      barcode: item.barcode || '',
      location: item.location || '',
      description: item.description || '',
      category: item.category || '',
      supplier: item.supplier || '',
      photoUrl: item.photoUrl || '',
      locationCoords: item.locationCoords || undefined,
      costPrice: item.costPrice ?? undefined, // Initialize new fields
      leadTime: item.leadTime ?? undefined,
      batchNumber: item.batchNumber || '',
    },
  });

   React.useEffect(() => {
       let stream: MediaStream | null = null;
       const getCameraPermission = async () => {
           if (!showCameraFeed) {
               if (videoRef.current?.srcObject) {
                   (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                   videoRef.current.srcObject = null;
               }
               setHasCameraPermission(null);
               return;
           }

           try {
               stream = await navigator.mediaDevices.getUserMedia({ video: true });
               setHasCameraPermission(true);
               if (videoRef.current) videoRef.current.srcObject = stream;
           } catch (error) {
               console.error('Error accessing camera:', error);
               setHasCameraPermission(false);
               setShowCameraFeed(false);
               toast({ variant: 'destructive', title: 'Camera Access Denied' });
           }
       };
       getCameraPermission();
       return () => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); };
   }, [showCameraFeed, toast]);

  const handleScanBarcode = async () => {
    setIsScanningBarcode(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
      const result = await scanBarcode();
      form.setValue('barcode', result.barcode, { shouldValidate: true });
      toast({ title: "Barcode Scanned", description: `Barcode: ${result.barcode}` });
    } catch (error) {
      console.error("Barcode scan error:", error);
      toast({ variant: "destructive", title: "Scan Error" });
    } finally {
      setIsScanningBarcode(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission || !videoRef.current || !canvasRef.current) {
        toast({ variant: "destructive", title: "Camera Not Ready" });
        setShowCameraFeed(true); return;
    }
     const video = videoRef.current;
     const canvas = canvasRef.current;
     canvas.width = video.videoWidth;
     canvas.height = video.videoHeight;
     const context = canvas.getContext('2d');
     if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const dataUrl = await captureProductPhoto(canvas);
             if (dataUrl) {
                setCapturedPhotoUrl(dataUrl);
                form.setValue('photoUrl', dataUrl, { shouldValidate: true });
                toast({ title: "Photo Captured" });
                setShowCameraFeed(false);
             } else { throw new Error("Failed to get data URL."); }
        } catch (error) {
            console.error("Error capturing photo:", error);
            toast({ variant: "destructive", title: "Capture Error" });
        }
    } else { toast({ variant: "destructive", title: "Canvas Error" }); }
};

  const handleGetLocation = async () => {
    setIsCapturingLocation(true);
    try {
      const location = await getCurrentLocation();
      setCapturedLocation(location);
      form.setValue('locationCoords', location, { shouldValidate: true });
      toast({ title: "Location Updated", description: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` });
    } catch (error: any) {
      console.error("Location fetch error:", error);
       toast({ variant: "destructive", title: "Location Error", description: error.message || "Could not fetch location." });
       // Revert to original location on error
       setCapturedLocation(item.locationCoords || null);
       form.setValue('locationCoords', item.locationCoords || undefined);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    console.log("Updating Item (Raw Form Values):", values);
     const submitData: EditItemFormData = {
       itemName: values.itemName,
       currentStock: values.currentStock ?? 0,
       minimumStock: values.minimumStock,
       barcode: values.barcode || undefined,
       location: values.location || undefined,
       description: values.description || undefined,
       category: values.category || undefined,
       supplier: values.supplier || undefined,
       photoUrl: capturedPhotoUrl || values.photoUrl || undefined,
       locationCoords: capturedLocation || values.locationCoords || undefined,
       costPrice: values.costPrice, // Include new fields
       leadTime: values.leadTime,
       batchNumber: values.batchNumber || undefined,
     };
     console.log("Data Submitted:", submitData);
    onSubmit(submitData);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4">
        <fieldset disabled={isLoading} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
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
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minimumStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Stock Level</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Optional"
                          {...field}
                          value={field.value ?? ''}
                           onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                          />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            {/* Barcode Section */}
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
                        {/* Placeholder for Batch Scan */}
                        <Button type="button" variant="outline" size="icon" disabled title="Batch Scan (Coming Soon)">
                            <ScanBarcode className="h-4 w-4 opacity-50" />
                        </Button>
                   </div>
                   <FormMessage />
                 </FormItem>
               )}
             />

            {/* Other Optional Fields */}
             <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the item..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="grid grid-cols-2 gap-4">
                 <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Electronics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Acme Corp" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>


            {/* Location Section */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                   <div className="flex gap-2 items-end">
                       <FormControl>
                         <Input placeholder="e.g., Shelf A3, Bin 5" {...field} className="flex-grow" />
                       </FormControl>
                        <Button
                           type="button"
                           variant="outline"
                           size="icon"
                           onClick={handleGetLocation}
                           disabled={isCapturingLocation || isLoading}
                           aria-label="Get Current Location"
                         >
                           {isCapturingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                         </Button>
                    </div>
                  <FormDescription>
                     Manually enter location or {capturedLocation ? `use captured coordinates (Lat: ${capturedLocation.latitude.toFixed(4)}, Lon: ${capturedLocation.longitude.toFixed(4)}).` : 'capture current GPS coordinates.'}
                   </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

             {/* Optional Fields for Future Enhancements */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t mt-4">
                 <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-muted-foreground"><DollarSign className="h-3 w-3"/>Cost Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Optional cost"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                      </FormControl>
                       <FormDescription className="text-xs">Per item cost.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="leadTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3"/>Lead Time (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Optional supplier lead time"
                          {...field}
                          value={field.value ?? ''}
                          onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                          />
                      </FormControl>
                       <FormDescription className="text-xs">Delivery time.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <FormItem>
                       <FormLabel className="flex items-center gap-1 text-muted-foreground"><Hash className="h-3 w-3"/>Batch/Lot Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Optional batch code" {...field} />
                      </FormControl>
                       <FormDescription className="text-xs">For tracking batches.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
             </div>

            {/* Photo Section */}
            <FormItem className="pt-4 border-t mt-4">
               <FormLabel>Product Photo</FormLabel>
               <div className="flex flex-col gap-2">
                    {showCameraFeed && (
                        <div className="space-y-2">
                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                            {hasCameraPermission === false && ( <Alert variant="destructive"><VideoOff className="h-4 w-4" /><AlertTitle>Camera Access Denied</AlertTitle></Alert> )}
                             {hasCameraPermission === null && ( <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertTitle>Accessing Camera</AlertTitle></Alert> )}
                             <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission || isLoading}>
                               <Camera className="mr-2 h-4 w-4" /> Capture New Photo
                           </Button>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                    )}
                     <Button type="button" variant="outline" onClick={() => setShowCameraFeed(prev => !prev)} disabled={isLoading}>
                        <Camera className="mr-2 h-4 w-4" /> {showCameraFeed ? 'Hide Camera' : (capturedPhotoUrl ? 'Replace Photo' : 'Open Camera')}
                    </Button>
                    {capturedPhotoUrl && !showCameraFeed && (
                       <div className="mt-2">
                         <img src={capturedPhotoUrl} alt={item.itemName || 'Product image'} className="rounded-md border max-w-xs max-h-40 object-contain" data-ai-hint="product image" />
                         <Button variant="link" size="sm" onClick={() => { setCapturedPhotoUrl(null); form.setValue('photoUrl', ''); }} className="text-destructive p-0 h-auto mt-1">Remove photo</Button>
                       </div>
                    )}
                    <FormDescription>Optional: Update the photo.</FormDescription>
                     <FormField control={form.control} name="photoUrl" render={({ field }) => <FormMessage />} /> {/* Display potential URL validation errors */}
                 </div>
             </FormItem>
        </fieldset>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
               <XCircle className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || isCapturingLocation || isScanningBarcode}>
                 {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                 Save Changes
               </Button>
         </div>
      </form>
    </Form>
  );
}
