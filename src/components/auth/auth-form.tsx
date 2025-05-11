"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase'; // Added db
import { doc, setDoc } from 'firebase/firestore'; // Added setDoc for potential WebAuthn credential storage
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, LogIn, Fingerprint, UserPlus } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Schema remains the same for email/password sign-in
const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthFormProps {
   onSuccess?: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthError = (authError: AuthError) => {
    console.error(`Sign In Error:`, authError);
    let message = 'An unexpected error occurred. Please try again.';
    switch (authError.code) {
      case 'auth/invalid-api-key':
      case 'auth/api-key-not-valid':
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
        message = 'Firebase API Key is invalid. Please ensure it is configured correctly in the application setup (.env.local).';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        message = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential': 
        message = 'Invalid credentials. Please check your email and password.';
         break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
    }
    setError(message);
    setIsLoading(false);
  };

  const onSubmit = async (values: AuthFormData) => {
    if (!auth) {
        setError("Firebase Authentication is not configured correctly. Check console for details.");
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    const { email, password } = values;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      onSuccess?.();
    } catch (err) {
      handleAuthError(err as AuthError);
    }
  };

  const handleBiometricRegister = async () => {
    toast({
      title: "Biometric Registration (Simulated)",
      description: "This would typically involve: 1. User being logged in. 2. Calling navigator.credentials.create() to generate a new public key credential. 3. Sending the public key to the server to be stored with the user's account. Full WebAuthn implementation needed.",
      duration: 10000,
    });
    // Placeholder for actual WebAuthn registration logic
    // Example (highly simplified and incomplete):
    // if (navigator.credentials && navigator.credentials.create) {
    //   try {
    //     const publicKeyCredentialCreationOptions = { /* ... challenge from server ... */ };
    //     const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
    //     // Send credential to server for storage
    //     console.log("Biometric credential created (simulated):", credential);
    //   } catch (err) {
    //     console.error("Biometric registration error (simulated):", err);
    //     toast({ variant: "destructive", title: "Biometric Registration Failed (Simulated)"});
    //   }
    // } else {
    //   toast({ variant: "destructive", title: "WebAuthn Not Supported (Simulated)"});
    // }
  };

  const handleBiometricSignIn = async () => {
    toast({
      title: "Biometric Sign-In (Simulated)",
      description: "This would typically involve: 1. Fetching a challenge from the server. 2. Calling navigator.credentials.get() with the challenge. 3. Sending the assertion to the server for verification. Full WebAuthn implementation needed.",
      duration: 10000,
    });
    // Placeholder for actual WebAuthn sign-in logic
    // Example (highly simplified and incomplete):
    // if (navigator.credentials && navigator.credentials.get) {
    //   try {
    //     const publicKeyCredentialRequestOptions = { /* ... challenge from server ... */ };
    //     const assertion = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });
    //     // Send assertion to server for verification
    //     console.log("Biometric assertion received (simulated):", assertion);
    //     // If server verifies, call onSuccess?.();
    //   } catch (err) {
    //     console.error("Biometric sign-in error (simulated):", err);
    //     toast({ variant: "destructive", title: "Biometric Sign-In Failed (Simulated)"});
    //   }
    // } else {
    //   toast({ variant: "destructive", title: "WebAuthn Not Supported (Simulated)"});
    // }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to StockWatch</CardTitle>
        <CardDescription>
           Sign in to manage your inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
         <Form {...form}>
           <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
             {error && (
               <Alert variant="destructive">
                 <AlertTriangle className="h-4 w-4" />
                 <AlertTitle>Authentication Failed</AlertTitle>
                 <AlertDescription>{error}</AlertDescription>
               </Alert>
             )}
             <fieldset disabled={isLoading} className="space-y-4">
               <FormField
                 control={form.control}
                 name="email"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Email</FormLabel>
                     <FormControl>
                       <Input type="email" placeholder="you@example.com" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
               <FormField
                 control={form.control}
                 name="password"
                 render={({ field }) => (
                   <FormItem>
                     <FormLabel>Password</FormLabel>
                     <FormControl>
                       <Input type="password" placeholder="••••••••" {...field} />
                     </FormControl>
                     <FormMessage />
                   </FormItem>
                 )}
               />
             </fieldset>
             <Button type="submit" className="w-full" disabled={isLoading}>
               {isLoading ? (
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
               ) : (
                 <LogIn className="mr-2 h-4 w-4" />
               )}
               {isLoading ? 'Signing In...' : 'Sign In with Email'}
             </Button>
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                    </span>
                </div>
            </div>
             <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleBiometricSignIn}
                disabled={isLoading}
              >
                <Fingerprint className="mr-2 h-4 w-4" />
                Sign In with Biometrics (Simulated)
             </Button>
             <Button 
                type="button" 
                variant="outline" 
                className="w-full" 
                onClick={handleBiometricRegister}
                disabled={isLoading}
                title="Typically done after initial login, on a profile/settings page."
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Register Biometrics (Simulated)
             </Button>
             <p className="px-2 text-center text-xs text-muted-foreground">
                Full biometric authentication requires server-side WebAuthn setup. These buttons are for demonstration.
             </p>
           </form>
         </Form>
      </CardContent>
    </Card>
  );
}
