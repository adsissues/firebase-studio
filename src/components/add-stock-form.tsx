
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
import { PlusCircle, Loader2, Camera, MapPin, ScanBarcode, VideoOff, PackagePlus, Building, User as UserIcon, Phone, Mail as MailIcon, Globe } from 'lucide-react';
import type { StockItem, LocationCoords } from '@/types';
import { scanBarcode } from '@/services/barcode-scanner';
import { captureProductPhoto } from '@/services/camera';
import { getCurrentLocation } from '@/services/location';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/context/auth-context';

interface AddStockFormProps {
  onSubmit: (data: AddStockFormData) => void;
  isLoading?: boolean;
  formId: string;
}

const formSchema = z.object({
  barcode: z.string().max(50).optional().or(z.literal('')),
  itemName: z.string().min(1, { message: 'Item name is required.' }).max(100),
  quantity: z.coerce
    .number({ invalid_type_error: 'Quantity must be a number.' })
    .int({ message: 'Quantity must be a whole number.' })
    .positive({ message: 'Quantity to add must be positive.' }),
  minimumStock: z.coerce
    .number({ invalid_type_error: 'Minimum stock must be a number.' })
    .int({ message: 'Minimum stock must be a whole number.' })
    .nonnegative({ message: 'Minimum stock cannot be negative.' })
    .optional(),
  overstockThreshold: z.coerce
    .number({ invalid_type_error: 'Overstock threshold must be a number.' })
    .int({ message: 'Overstock threshold must be a whole number.' })
    .positive({ message: 'Overstock threshold must be positive.' })
    .optional(),
  location: z.string().max(100).optional().or(z.literal('')),
  supplier: z.string().max(100).optional().or(z.literal('')), // Legacy supplier name
  category: z.string().max(50).optional().or(z.literal('')),
  photoUrl: z.string().url({ message: "Please enter a valid URL or capture a photo." }).optional().or(z.literal('')),
  locationCoords: z.object({ latitude: z.number(), longitude: z.number() }).optional(),
  costPrice: z.coerce.number().nonnegative().optional(),
  supplierName: z.string().max(100).optional().or(z.literal('')),
  supplierContactPerson: z.string().max(100).optional().or(z.literal('')),
  supplierPhone: z.string().max(20).optional().or(z.literal('')),
  supplierEmail: z.string().email({ message: "Invalid email address." }).max(100).optional().or(z.literal('')),
  supplierWebsite: z.string().url({ message: "Please enter a valid URL." }).max(100).optional().or(z.literal('')),
  supplierAddress: z.string().max(200).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
});

export type AddStockFormData = z.infer<typeof formSchema>;

export function AddStockForm({ onSubmit, isLoading = false, formId }: AddStockFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = React.useState<boolean | null>(null);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = React.useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = React.useState(false);
  const [isScanningBarcode, setIsScanningBarcode] = React.useState(false);
  const [capturedLocation, setCapturedLocation] = React.useState<LocationCoords | null>(null);
  const [showCameraFeed, setShowCameraFeed] = React.useState(false);

  const form = useForm<AddStockFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      barcode: '', itemName: '', quantity: 1, minimumStock: undefined, overstockThreshold: undefined,
      location: '', supplier: '', category: '', photoUrl: '', locationCoords: undefined, costPrice: undefined,
      supplierName: '', supplierContactPerson: '', supplierPhone: '', supplierEmail: '', supplierWebsite: '', supplierAddress: '',
      description: '',
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
               setHasCameraPermission(null); return;
           }
           try {
               stream = await navigator.mediaDevices.getUserMedia({ video: true });
               setHasCameraPermission(true);
               if (videoRef.current) videoRef.current.srcObject = stream;
           } catch (error) {
               setHasCameraPermission(false); setShowCameraFeed(false);
               toast({ variant: 'destructive', title: 'Camera Access Denied' });
           }
       };
       getCameraPermission();
       return () => { if (videoRef.current?.srcObject) (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop()); };
   }, [showCameraFeed, toast]);

  const handleScanBarcode = async () => {
    setIsScanningBarcode(true);
    try {
      const result = await scanBarcode();
      if (result.isPlaceholder) {
        toast({
            title: "Manual Barcode Entry",
            description: "Scanner not available. Please type the barcode. Using simulated: " + result.barcode
        });
        if(result.barcode) {
            form.setValue('barcode', result.barcode, { shouldValidate: true });
        }
        form.setFocus('barcode');
      } else if (result.barcode) {
        form.setValue('barcode', result.barcode, { shouldValidate: true });
        toast({ title: "Barcode Scanned", description: `Barcode: ${result.barcode}` });
      } else {
        toast({ variant: "destructive", title: "Scan Unsuccessful", description: "No barcode captured." });
      }
    } catch (error) {
        toast({ variant: "destructive", title: "Scan Error", description: "Could not initialize scanner." });
    } finally {
        setIsScanningBarcode(false);
    }
  };

  const handleCapturePhoto = async () => {
    if (!hasCameraPermission || !videoRef.current || !canvasRef.current) {
        toast({ variant: "destructive", title: "Camera Not Ready" }); setShowCameraFeed(true); return;
    }
     const video = videoRef.current; const canvas = canvasRef.current;
     canvas.width = video.videoWidth; canvas.height = video.videoHeight;
     const context = canvas.getContext('2d');
     if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
            const dataUrl = await captureProductPhoto(canvas);
             if (dataUrl) {
                setCapturedPhotoUrl(dataUrl); form.setValue('photoUrl', dataUrl, { shouldValidate: true });
                toast({ title: "Photo Captured" }); setShowCameraFeed(false);
             } else { throw new Error("Failed to get data URL."); }
        } catch (error) { toast({ variant: "destructive", title: "Capture Error" }); }
    } else { toast({ variant: "destructive", title: "Canvas Error" }); }
};

  const handleGetLocation = async () => {
    setIsCapturingLocation(true);
    try {
      const location = await getCurrentLocation();
      setCapturedLocation(location); form.setValue('locationCoords', location, { shouldValidate: true });
      toast({ title: "Location Captured", description: `Lat: ${location.latitude.toFixed(4)}, Lon: ${location.longitude.toFixed(4)}` });
    } catch (error: any) {
       toast({ variant: "destructive", title: "Location Error", description: error.message || "Could not fetch location." });
       setCapturedLocation(null); form.setValue('locationCoords', undefined);
    } finally { setIsCapturingLocation(false); }
  };

  function handleFormSubmit(values: AddStockFormData) {
     const submitData: AddStockFormData = {
       ...values,
       photoUrl: capturedPhotoUrl || values.photoUrl || undefined,
       locationCoords: capturedLocation || values.locationCoords || undefined,
     };
    onSubmit(submitData);
  }

  React.useEffect(() => {
    if (!isLoading && form.formState.isSubmitSuccessful) {
       form.reset(); setCapturedPhotoUrl(null); setCapturedLocation(null); setShowCameraFeed(false);
       if (videoRef.current?.srcObject) {
          (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
       }
    }
  }, [isLoading, form.formState.isSubmitSuccessful, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} id={formId} className="space-y-4 rounded-lg p-1">
        <fieldset disabled={isLoading || !user} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="itemName" render={({ field }) => (<FormItem><FormLabel>Item Name*</FormLabel><FormControl><Input placeholder="e.g., Large Red Box" {...field} className="input-uppercase" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="barcode" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Barcode</FormLabel>
                   <div className="flex gap-2">
                      <FormControl><Input placeholder="Scan or enter barcode" {...field} className="flex-grow input-uppercase" /></FormControl>
                       <Button type="button" variant="outline" size="icon" onClick={handleScanBarcode} disabled={isScanningBarcode || isLoading} aria-label="Scan Barcode">{isScanningBarcode ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanBarcode className="h-4 w-4" />}</Button>
                   </div>
                   <FormMessage />
                 </FormItem>
               )} />
            </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (<FormItem><FormLabel>Quantity to Add*</FormLabel><FormControl><Input type="number" min="1" step="1" placeholder="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="minimumStock" render={({ field }) => (<FormItem><FormLabel>Min. Stock Level</FormLabel><FormControl><Input type="number" min="0" step="1" placeholder="Alert level" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="overstockThreshold" render={({ field }) => (<FormItem><FormLabel>Overstock Threshold</FormLabel><FormControl><Input type="number" min="0" step="1" placeholder="Max quantity" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Detailed description of the item..." {...field} /></FormControl><FormMessage /></FormItem>)} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g., Electronics, Food" {...field} className="input-uppercase" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="costPrice" render={({ field }) => (<FormItem><FormLabel>Cost Price (per unit)</FormLabel><FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))} /></FormControl><FormMessage /></FormItem>)} />
            </div>

            <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Storage Location</FormLabel>
                   <div className="flex gap-2 items-end">
                       <FormControl><Input placeholder="e.g., Shelf A3, Bin 5" {...field} className="input-uppercase" /></FormControl>
                        <Button type="button" variant="outline" size="icon" onClick={handleGetLocation} disabled={isCapturingLocation || isLoading} aria-label="Get Current Location">{isCapturingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}</Button>
                    </div>
                  <FormDescription>{capturedLocation ? `(Using GPS: ${capturedLocation.latitude.toFixed(4)}, ${capturedLocation.longitude.toFixed(4)})` : 'Where is this item stored?'}</FormDescription>
                  <FormMessage />
                </FormItem>
              )} />

            <div className="pt-4 border-t mt-4 col-span-full">
                <h4 className="text-lg font-semibold text-primary mb-3">Supplier Details (Optional)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="supplierName" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><Building className="h-4 w-4 text-muted-foreground" />Company Name</FormLabel><FormControl><Input placeholder="Supplier Company Name" {...field} className="input-uppercase" /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="supplierContactPerson" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><UserIcon className="h-4 w-4 text-muted-foreground" />Contact Person</FormLabel><FormControl><Input placeholder="Contact Person's Name" {...field} className="input-uppercase" /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="supplierPhone" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><Phone className="h-4 w-4 text-muted-foreground" />Phone</FormLabel><FormControl><Input type="tel" placeholder="Supplier Phone Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="supplierEmail" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><MailIcon className="h-4 w-4 text-muted-foreground" />Email</FormLabel><FormControl><Input type="email" placeholder="Supplier Email Address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="supplierWebsite" render={({ field }) => (<FormItem><FormLabel className="flex items-center gap-1"><Globe className="h-4 w-4 text-muted-foreground" />Website</FormLabel><FormControl><Input placeholder="https://supplier.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                     <FormField control={form.control} name="supplierAddress" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" />Address</FormLabel><FormControl><Textarea placeholder="Supplier Full Address" {...field} className="input-uppercase" /></FormControl><FormMessage /></FormItem>)} />
                </div>
            </div>

            <FormItem className="pt-4 border-t mt-4 col-span-full">
               <FormLabel>Product Photo (Optional)</FormLabel>
               <div className="flex flex-col gap-2">
                    {showCameraFeed && (
                        <div className="space-y-2">
                            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                            {hasCameraPermission === false && (<Alert variant="destructive"><VideoOff className="h-4 w-4" /><AlertTitle>Camera Access Denied</AlertTitle></Alert>)}
                             {hasCameraPermission === null && ( <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertTitle>Accessing Camera</AlertTitle></Alert> )}
                            <Button type="button" onClick={handleCapturePhoto} disabled={!hasCameraPermission || isLoading}><Camera className="mr-2 h-4 w-4" /> Capture Photo</Button>
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>
                    )}
                    <Button type="button" variant="outline" onClick={() => setShowCameraFeed(prev => !prev)} disabled={isLoading}><Camera className="mr-2 h-4 w-4" /> {showCameraFeed ? 'Hide Camera' : 'Open Camera'}</Button>
                    {capturedPhotoUrl && !showCameraFeed && (
                      <div className="mt-2">
                        <img src={capturedPhotoUrl} alt="Captured product" className="rounded-md border max-w-xs max-h-40 object-contain" data-ai-hint="product photo" />
                         <Button variant="link" size="sm" onClick={() => { setCapturedPhotoUrl(null); form.setValue('photoUrl', ''); }} className="text-destructive p-0 h-auto mt-1">Remove photo</Button>
                      </div>
                    )}
                     <FormField control={form.control} name="photoUrl" render={({ field }) => <FormMessage />} />
                 </div>
             </FormItem>
        </fieldset>
      </form>
    </Form>
  );
}

    