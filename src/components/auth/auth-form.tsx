
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
    console.error(`Sign In Error Details:`, authError);
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
      console.log(`Attempting to sign in with email: ${email}`); // Added console log
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      onSuccess?.();
    } catch (err) {
      handleAuthError(err as AuthError);
    }
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
                       <Input type="text" placeholder="••••••••" {...field} />
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

             {/* Biometric buttons removed */}

           </form>
         </Form>
      </CardContent>
    </Card>
  );
}
