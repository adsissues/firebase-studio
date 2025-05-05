
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
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { PlusCircle, Loader2, Camera, MapPin, ScanBarcode, VideoOff } from 'lucide-react'; // Import Loader2 for loading spinner and new icons
import type { StockItem, LocationCoords } from '@/types'; // Import LocationCoords
import { scanBarcode } from '@/services/barcode-scanner'; // Import barcode scanner service
import { captureProductPhoto } from '@/services/camera'; // Import camera service (will be updated)
import { getCurrentLocation } from '@/services/location'; // Import location service
import { useToast } from "@/hooks/use-toast";

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
  location: z.string().max(100).optional().or(z.literal('')), // Allow empty string, increased max length
  description: z.string().max(500).optional().or(z.literal('')), // Optional description
  category: z.string().max(50).optional().or(z.literal('')), // Optional category
  supplier: z.string().max(100).optional().or(z.literal('')), // Optional supplier
  photoUrl: z.string().url({ message: "Please enter a valid URL or capture a photo." }).optional().or(z.literal('')), // Optional photo URL (will hold data URI)
  locationCoords: z.object({ // Optional location coordinates
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
});

// Omit locationCoords and photoUrl from the type used directly by form fields, manage them separately
export type AddItemFormData = Omit<z.infer<typeof formSchema>, 'locationCoords' | 'photoUrl'> & {
    photoUrl?: string;
    locationCoords?: LocationCoords;
};


export function AddItemForm({ onSubmit, isLoading = false }: AddItemFormProps) {
  const { toast } = useToast();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = React.useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = React.useState(false);
  const [capturedLocation, setCapturedLocation] = React.useState<LocationCoords | null>(null);
  const [showCameraFeed, setShowCameraFeed] = React.useState(false);


  const form = useForm<z.infer<typeof formSchema>>({ // Use inferred type directly for useForm
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: '',
      currentStock: 0,
      minStock: 0,
      barcode: '',
      location: '',
      description: '',
      category: '',
      supplier: '',
      photoUrl: '',
      locationCoords: undefined,
    },
  });

   // Effect to request camera permission when camera feed is shown
   React.useEffect(() => {
       let stream: MediaStream | null = null;
       const getCameraPermission = async () => {
           if (!showCameraFeed) {
               if (videoRef.current?.srcObject) {
                   (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
                   videoRef.current.srcObject = null;
               }
               setHasCameraPermission(null); // Reset permission state when camera is hidden
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
               setShowCameraFeed(false); // Hide feed if permission denied
               toast({
                   variant: 'destructive',
                   title: 'Camera Access Denied',
                   description: 'Please enable camera permissions in your browser settings to use this feature.',
               });
           }
       };

       getCameraPermission();

       // Cleanup function to stop the stream when the component unmounts or camera feed is hidden
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
      // Simulate scanning for now
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
      const result = await scanBarcode(); // Call the (mocked) service
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
            description: "Cannot capture photo. Ensure camera permission is granted and the feed is active.",
        });
        setShowCameraFeed(true); // Attempt to show feed again
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
            const dataUrl = await captureProductPhoto(canvas); // Use updated service
             if (dataUrl) {
                setCapturedPhotoUrl(dataUrl);
                form.setValue('photoUrl', dataUrl, { shouldValidate: true }); // Store data URI in form
                toast({ title: "Photo Captured" });
                setShowCameraFeed(false); // Hide camera feed after capture
             } else {
                 throw new Error("Failed to get data URL from canvas.");
             }

        } catch (error) {
            console.error("Error capturing or processing photo:", error);
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
      setCapturedLocation(location); // Store location object
      form.setValue('locationCoords', location, { shouldValidate: true }); // Store coords in form state
      toast({ title: "Location Captured", description: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` });
    } catch (error: any) {
      console.error("Location fetch error:", error);
       toast({
         variant: "destructive",
         title: "Location Error",
         description: error.message || "Could not fetch current location. Please ensure location services are enabled.",
       });
       // Clear potentially stale location data if fetch fails
       setCapturedLocation(null);
       form.setValue('locationCoords', undefined);
    } finally {
      setIsCapturingLocation(false);
    }
  };


  function handleFormSubmit(values: z.infer<typeof formSchema>) {
    console.log("Adding Item:", values);
    // Prepare data for submission, ensuring optional fields are handled
     const submitData: AddItemFormData = {
       ...values,
       // Ensure optional fields that are empty strings become undefined if needed by backend/DB
       barcode: values.barcode || undefined,
       location: values.location || undefined,
       description: values.description || undefined,
       category: values.category || undefined,
       supplier: values.supplier || undefined,
       photoUrl: capturedPhotoUrl || undefined, // Use captured photo if available
       locationCoords: capturedLocation || undefined, // Use captured location
     };
    onSubmit(submitData);
    // Reset form handled by effect
  }

  // Reset form and captured states if submission is successful
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
                          step="1" // Ensure integer input
                          placeholder="0"
                          {...field}
                          value={field.value ?? ''} // Handle potential null/undefined
                          onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} // Parse integer, allow empty
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
                   <FormDescription>
                     Scan or enter the item's barcode number.
                   </FormDescription>
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
                                    Please allow camera access in your browser settings and refresh.
                                  </AlertDescription>
                                </Alert>
                            )}
                             {hasCameraPermission === null && (
                                <Alert>
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  <AlertTitle>Accessing Camera</AlertTitle>
                                  <AlertDescription>
                                    Waiting for camera permission...
                                  </AlertDescription>
                                </Alert>
                             )}
                            <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission || isLoading}>
                               <Camera className="mr-2 h-4 w-4" /> Capture Photo
                           </Button>
                           {/* Hidden canvas for drawing video frame */}
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
                        <Camera className="mr-2 h-4 w-4" /> {showCameraFeed ? 'Hide Camera' : 'Open Camera'}
                    </Button>

                    {/* Display Captured Photo Preview */}
                    {capturedPhotoUrl && !showCameraFeed && (
                      <div className="mt-2">
                        <img src={capturedPhotoUrl} alt="Captured product" className="rounded-md border max-w-xs max-h-40 object-contain" />
                         <Button variant="link" size="sm" onClick={() => { setCapturedPhotoUrl(null); form.setValue('photoUrl', ''); }} className="text-destructive p-0 h-auto mt-1">
                           Remove photo
                         </Button>
                      </div>
                    )}
                    <FormDescription>
                        Optionally add a photo of the item.
                    </FormDescription>
                     <FormField
                       control={form.control}
                       name="photoUrl"
                       render={({ field }) => <FormMessage />} // Display validation errors for photoUrl if needed
                     />
                 </div>
             </FormItem>


        </fieldset>
        <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading || isCapturingLocation || isScanningBarcode}>
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
