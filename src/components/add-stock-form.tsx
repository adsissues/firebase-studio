
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
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PlusCircle, Loader2, Camera, MapPin, ScanBarcode, VideoOff, PackagePlus, DollarSign, Clock, Hash } from 'lucide-react'; // Added new icons
import type { StockItem, LocationCoords } from '@/types';
import { scanBarcode } from '@/services/barcode-scanner';
import { captureProductPhoto } from '@/services/camera';
import { getCurrentLocation } from '@/services/location';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';

interface AddStockFormProps {
  onSubmit: (data: AddStockFormData) => void;
  isLoading?: boolean;
}

// Updated schema for Add Stock form including new optional fields
const formSchema = z.object({
  barcode: z.string().max(50).optional().or(z.literal('')),
  itemName: z.string().min(1, { message: 'Item name is required.' }).max(100),
  quantity: z.coerce // Quantity to add
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity to add must be positive.' }),
  minimumStock: z.coerce
    .number({ invalid_type_error: 'Minimum stock must be a number.' })
    .int({ message: 'Minimum stock must be a whole number.' })
    .nonnegative({ message: 'Minimum stock cannot be negative.' })
    .optional(),
  location: z.string().max(100).optional().or(z.literal('')),
  supplier: z.string().max(100).optional().or(z.literal('')),
  category: z.string().max(50).optional().or(z.literal('')),
  photoUrl: z.string().url({ message: "Please enter a valid URL or capture a photo." }).optional().or(z.literal('')),
  locationCoords: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  // New optional fields for future enhancements
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

// Type for data submitted from this form includes new fields
export type AddStockFormData = z.infer<typeof formSchema>;

export function AddStockForm({ onSubmit, isLoading = false }: AddStockFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = React.useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = React.useState(false); // Fixed initialization
  const [capturedLocation, setCapturedLocation] = React.useState<LocationCoords | null>(null);
  const [showCameraFeed, setShowCameraFeed] = React.useState(false);

  const form = useForm<AddStockFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '',
      itemName: '',
      quantity: 1,
      minimumStock: undefined,
      location: '',
      supplier: '',
      category: '',
      photoUrl: '',
      locationCoords: undefined,
      costPrice: undefined,
      leadTime: undefined,
      batchNumber: '',
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
               toast({ variant: 'destructive', title: 'Camera Access Denied', description: 'Please enable camera permissions.' });
           }
       };
       getCameraPermission();
       return () => {
            if (videoRef.current?.srcObject) {
               (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
               videoRef.current.srcObject = null;
           }
        };
   }, [showCameraFeed, toast]);

  const handleScanBarcode = async () => {
    setIsScanningBarcode(true);
    try {
      // Simulate delay and call service
      await new Promise(resolve => setTimeout(resolve, 100)); // Reduced delay
      const result = await scanBarcode();
      form.setValue('barcode', result.barcode, { shouldValidate: true });
      toast({ title: "Barcode Scanned", description: `Barcode: ${result.barcode}` });
      // TODO: Optionally fetch item details based on barcode from DB
      // const existingItem = await fetchItemByBarcode(result.barcode);
      // if (existingItem) { form.reset({...existingItem, quantity: 1}); }
    } catch (error) {
      console.error("Barcode scan error:", error);
      toast({ variant: "destructive", title: "Scan Error", description: "Could not scan barcode." });
    } finally {
      setIsScanningBarcode(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission || !videoRef.current || !canvasRef.current) {
        toast({ variant: "destructive", title: "Camera Not Ready" });
        setShowCameraFeed(true);
        return;
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
      toast({ title: "Location Captured", description: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` });
    } catch (error: any) {
      console.error("Location fetch error:", error);
       toast({ variant: "destructive", title: "Location Error", description: error.message || "Could not fetch location." });
       setCapturedLocation(null);
       form.setValue('locationCoords', undefined);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  function handleFormSubmit(values: AddStockFormData) {
    console.log("Adding Stock (Raw Form Values):", values);
     const submitData: AddStockFormData = {
       ...values,
       photoUrl: capturedPhotoUrl || values.photoUrl || undefined,
       locationCoords: capturedLocation || values.locationCoords || undefined,
     };
     console.log("Data Submitted:", submitData);
    onSubmit(submitData);
  }

  React.useEffect(() => {
    if (!isLoading && form.formState.isSubmitSuccessful) {
       form.reset();
       setCapturedPhotoUrl(null);
       setCapturedLocation(null);
       setShowCameraFeed(false);
       if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
       }
    }
  }, [isLoading, form.formState.isSubmitSuccessful, form.reset]); // form.reset added as dependency

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 rounded-lg border p-6 shadow-sm">
        <fieldset disabled={isLoading || !user} className="space-y-4">
            <h2 className="text-lg font-semibold text-primary mb-4">Add Stock / Restock Item</h2>

            {/* Barcode Field */}
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
                         disabled={isScanningBarcode || isLoading}
                         aria-label="Scan Barcode"
                       >
                         {isScanningBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}
                       </Button>
                        {/* Placeholder for Batch Scan Button */}
                        <Button type="button" variant="outline" size="icon" disabled title="Batch Scan (Coming Soon)">
                            <ScanBarcode className="h-4 w-4 opacity-50" /> {/* Differentiate visually */}
                        </Button>
                   </div>
                   <FormDescription>
                     Scan barcode to auto-fill or identify existing items. Batch Scan coming soon.
                   </FormDescription>
                   <FormMessage />
                 </FormItem>
               )}
             />

            {/* Item Name Field */}
            <FormField
              control={form.control}
              name="itemName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Large Red Box" {...field} />
                  </FormControl>
                  <FormDescription>
                     Name of the item being added or restocked.
                   </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quantity and Minimum Stock Fields */}
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity to Add*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="1"
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
                   control={form.control} name="minimumStock"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Minimum Stock</FormLabel>
                       <FormControl>
                         <Input
                           type="number"
                           min="0"
                           step="1"
                           placeholder="Optional min level"
                           {...field}
                           value={field.value ?? ''}
                           onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                           />
                       </FormControl>
                       <FormDescription>Min quantity alert.</FormDescription>
                       <FormMessage />
                     </FormItem>
                   )}
                  />
            </div>

             {/* Category and Supplier Fields */}
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Electronics, Food" {...field} />
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

            {/* Location Field */}
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
                     Where is this item stored? {capturedLocation ? `(Using GPS: ${capturedLocation.latitude.toFixed(4)}, ${capturedLocation.longitude.toFixed(4)})` : ''}
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
                            {hasCameraPermission === false && (
                                <Alert variant="destructive">
                                  <VideoOff className="h-4 w-4" />
                                  <AlertTitle>Camera Access Denied</AlertTitle>
                                </Alert>
                            )}
                             {hasCameraPermission === null && ( <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertTitle>Accessing Camera</AlertTitle></Alert> )}
                            <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission || isLoading}>
                               <Camera className="mr-2 h-4 w-4" /> Capture Photo
                           </Button>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                    )}
                    <Button type="button" variant="outline" onClick={() => setShowCameraFeed(prev => !prev)} disabled={isLoading}>
                        <Camera className="mr-2 h-4 w-4" /> {showCameraFeed ? 'Hide Camera' : 'Open Camera'}
                    </Button>
                    {capturedPhotoUrl && !showCameraFeed && (
                      <div className="mt-2">
                        <img src={capturedPhotoUrl} alt="Captured product" className="rounded-md border max-w-xs max-h-40 object-contain" data-ai-hint="product image" />
                         <Button variant="link" size="sm" onClick={() => { setCapturedPhotoUrl(null); form.setValue('photoUrl', ''); }} className="text-destructive p-0 h-auto mt-1">Remove photo</Button>
                      </div>
                    )}
                    <FormDescription>Optional: Add a photo.</FormDescription>
                     <FormField control={form.control} name="photoUrl" render={({ field }) => <FormMessage />} />
                 </div>
             </FormItem>

        </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || isCapturingLocation || isScanningBarcode || !user}>
          {isLoading ? (
             <Loader2 className="mr-2 h-4 w-4 animate-spin" />
           ) : (
             <PackagePlus className="mr-2 h-4 w-4" />
           )}
          {isLoading ? 'Adding...' : 'Add Stock / Restock'}
        </Button>
      </form>
    </Form>
  );
}


