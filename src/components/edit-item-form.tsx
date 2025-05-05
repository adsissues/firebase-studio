

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
import { Save, Loader2, Camera, MapPin, ScanBarcode, VideoOff, XCircle } from 'lucide-react';
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

// Schema is very similar to AddItemForm, but all fields are potentially being updated
const formSchema = z.object({
  itemName: z.string().min(1, { message: 'Item name is required.' }).max(100),
  currentStock: z.coerce
    .number({ invalid_type_error: 'Current stock must be a number.' })
    .int({ message: 'Current stock must be a whole number.' })
    .nonnegative({ message: 'Current stock cannot be negative.' }),
  minStock: z.coerce
    .number({ invalid_type_error: 'Minimum stock must be a number.' })
    .int({ message: 'Minimum stock must be a whole number.' })
    .nonnegative({ message: 'Minimum stock cannot be negative.' }),
  barcode: z.string().max(50).optional().or(z.literal('')),
  location: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  category: z.string().max(50).optional().or(z.literal('')),
  supplier: z.string().max(100).optional().or(z.literal('')),
  photoUrl: z.string().url({ message: "Please enter a valid URL or capture a photo." }).optional().or(z.literal('')), // Store data URI or existing URL
  locationCoords: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

// Type for the form data - identical to AddItemFormData essentially
// Make sure this type aligns with what the mutation expects
export type EditItemFormData = Omit<z.infer<typeof formSchema>, 'locationCoords' | 'photoUrl'> & {
    photoUrl?: string;
    locationCoords?: LocationCoords;
};


export function EditItemForm({ item, onSubmit, isLoading = false, onCancel }: EditItemFormProps) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  // Initialize state with item's values, falling back to null/undefined if not present
  const [capturedPhotoUrl, setCapturedPhotoUrl] = React.useState<string | null>(item.photoUrl || null);
  const [capturedLocation, setCapturedLocation] = React.useState<LocationCoords | null>(item.locationCoords || null);
  const [showCameraFeed, setShowCameraFeed] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({ // Use inferred type directly for useForm
    resolver: zodResolver(formSchema),
    defaultValues: { // Populate with existing item data
      itemName: item.itemName,
      currentStock: item.currentStock,
      minStock: item.minStock,
      barcode: item.barcode || '',
      location: item.location || '',
      description: item.description || '',
      category: item.category || '',
      supplier: item.supplier || '',
      photoUrl: item.photoUrl || '', // Use existing URL/data URI or empty string
      locationCoords: item.locationCoords || undefined, // Use existing or undefined
    },
  });

   // Effect to request camera permission when camera feed is shown (same as AddItemForm)
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

               if (videoRef.current) {
                   videoRef.current.srcObject = stream;
               }
           } catch (error) {
               console.error('Error accessing camera:', error);
               setHasCameraPermission(false);
               setShowCameraFeed(false);
               toast({
                   variant: 'destructive',
                   title: 'Camera Access Denied',
                   description: 'Please enable camera permissions in your browser settings.',
               });
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

   // --- Handlers for Barcode, Photo, Location (Mostly same as AddItemForm) ---

  const handleScanBarcode = async () => {
    setIsScanningBarcode(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const result = await scanBarcode();
      form.setValue('barcode', result.barcode, { shouldValidate: true });
      toast({ title: "Barcode Scanned", description: `Barcode: ${result.barcode}` });
    } catch (error) {
      console.error("Barcode scan error:", error);
      toast({ variant: "destructive", title: "Scan Error", description: "Could not scan barcode." });
    } finally {
      setIsScanningBarcode(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission || !videoRef.current || !canvasRef.current) {
        toast({
            variant: "destructive",
            title: "Camera Not Ready",
            description: "Cannot capture photo. Ensure camera permission is granted.",
        });
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
                setCapturedPhotoUrl(dataUrl); // Update state
                form.setValue('photoUrl', dataUrl, { shouldValidate: true }); // Update form value
                toast({ title: "Photo Captured" });
                setShowCameraFeed(false);
             } else {
                 throw new Error("Failed to get data URL from canvas.");
             }
        } catch (error) {
            console.error("Error capturing photo:", error);
            toast({ variant: "destructive", title: "Capture Error", description: "Could not capture photo." });
        }
    } else {
         toast({ variant: "destructive", title: "Canvas Error", description: "Could not get canvas context." });
    }
};

  const handleGetLocation = async () => {
    setIsCapturingLocation(true);
    try {
      const location = await getCurrentLocation();
      setCapturedLocation(location); // Update state
      form.setValue('locationCoords', location, { shouldValidate: true }); // Update form value
      toast({ title: "Location Updated", description: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` });
    } catch (error: any) {
      console.error("Location fetch error:", error);
       toast({
         variant: "destructive",
         title: "Location Error",
         description: error.message || "Could not fetch location.",
       });
       // Revert state and form value to original if fetch fails
       setCapturedLocation(item.locationCoords || null);
       form.setValue('locationCoords', item.locationCoords || undefined);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  // --- Form Submission ---

  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    console.log("Updating Item (Raw Form Values):", values);
     // Prepare data, using captured state values for photo and location
     // Ensure optional fields are explicitly set to undefined if empty/falsy
     const submitData: EditItemFormData = {
       itemName: values.itemName,
       currentStock: values.currentStock ?? 0,
       minStock: values.minStock ?? 0,
       // Set to undefined if falsy (empty string, null, etc.)
       barcode: values.barcode || undefined,
       location: values.location || undefined,
       description: values.description || undefined,
       category: values.category || undefined,
       supplier: values.supplier || undefined,
       // Use state values, ensuring they are null/undefined correctly
       photoUrl: capturedPhotoUrl || undefined,
       locationCoords: capturedLocation || undefined,
     };
     console.log("Data Submitted:", submitData);
     // Pass only the form data fields to the onSubmit handler
    onSubmit(submitData);
    // Don't reset form here, parent component closes dialog on success
  }

  return (
    <Form {...form}>
      {/* No outer border/shadow needed as it's inside a Dialog */}
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 pt-4"> {/* Add padding top */}
        <fieldset disabled={isLoading} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2"> {/* Enable scrolling */}
            {/* --- Form Fields (Identical structure to AddItemForm) --- */}
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
                  name="minStock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min. Stock Level*</FormLabel>
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

            {/* Photo Section */}
            <FormItem>
               <FormLabel>Product Photo</FormLabel>
               <div className="flex flex-col gap-2">
                    {/* Camera Feed and Capture Button */}
                    {showCameraFeed && (
                        <div className="space-y-2">
                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                            {hasCameraPermission === false && (
                                <Alert variant="destructive">
                                  <VideoOff className="h-4 w-4" />
                                  <AlertTitle>Camera Access Denied</AlertTitle>
                                  <AlertDescription>
                                    Allow access in browser settings.
                                  </AlertDescription>
                                </Alert>
                            )}
                             {hasCameraPermission === null && (
                                <Alert>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <AlertTitle>Accessing Camera</AlertTitle>
                                </Alert>
                             )}
                            <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission || isLoading}>
                               <Camera className="mr-2 h-4 w-4" /> Capture New Photo
                           </Button>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                    )}

                    {/* Button to toggle camera feed */}
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCameraFeed(prev => !prev)}
                        disabled={isLoading}
                    >
                        <Camera className="mr-2 h-4 w-4" /> {showCameraFeed ? 'Hide Camera' : 'Open Camera to Replace'}
                    </Button>

                    {/* Display Current/Captured Photo Preview */}
                    {capturedPhotoUrl && !showCameraFeed && (
                      <div className="mt-2">
                        <img src={capturedPhotoUrl} alt="Product" className="rounded-md border max-w-xs max-h-40 object-contain" data-ai-hint="product image" />
                         <Button variant="link" size="sm" onClick={() => { setCapturedPhotoUrl(null); form.setValue('photoUrl', ''); }} className="text-destructive p-0 h-auto mt-1">
                           Remove photo
                         </Button>
                      </div>
                    )}
                    <FormDescription>
                        Optionally update the photo for the item.
                    </FormDescription>
                     <FormField
                       control={form.control}
                       name="photoUrl"
                       render={({ field }) => <FormMessage />}
                     />
                 </div>
             </FormItem>
             {/* --- End of Form Fields --- */}
        </fieldset>

        {/* Form Actions (Save/Cancel) */}
        <div className="flex justify-end gap-2 pt-4 border-t">
             <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                 Cancel
             </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={isLoading || isCapturingLocation || isScanningBarcode}>
              {isLoading ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
               ) : (
                 <Save className="mr-2 h-4 w-4" />
               )}
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
         </div>
      </form>
    </Form>
  );
}

