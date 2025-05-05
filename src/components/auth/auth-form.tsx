
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';
// Removed createUserWithEmailAndPassword and Firestore imports as Sign Up is removed
import { auth } from '@/lib/firebase/firebase';
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
// Removed Tabs imports as they are no longer used
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, LogIn } from 'lucide-react'; // Removed UserPlus icon

// Schema remains the same for sign-in
const authSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long.' }),
});

type AuthFormData = z.infer<typeof authSchema>;

interface AuthFormProps {
   onSuccess?: () => void; // Optional callback on successful authentication
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  // Removed activeTab state

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
      case 'auth/api-key-not-valid': // Handle variations
      case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.': // Handle variations
        message = 'Firebase API Key is invalid. Please ensure it is configured correctly in the application setup (.env.local).';
        break;
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        message = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
      case 'auth/invalid-credential': // Combined for simplicity in sign-in only context
        message = 'Invalid credentials. Please check your email and password.';
         break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      // Removed Sign Up specific errors like 'auth/email-already-in-use', 'auth/weak-password'
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
      // Only handle sign-in
      await signInWithEmailAndPassword(auth, email, password);
      console.log('User signed in successfully');
      onSuccess?.(); // Call success callback
    } catch (err) {
      handleAuthError(err as AuthError);
    }
     // Set loading to false only on error or completion (handled implicitly by component unmount/redirect on success)
     // If onSuccess doesn't cause unmount, add setIsLoading(false) in try block after onSuccess()
     // Keep isLoading true on success if redirecting, otherwise set to false
     // For safety, ensure it's set to false on error path handled by handleAuthError
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to StockWatch</CardTitle>
        <CardDescription>
           Sign in to manage your inventory {/* Updated description */}
        </CardDescription>
      </CardHeader>
      <CardContent>
         {/* Removed Tabs component */}
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
                 <LogIn className="mr-2 h-4 w-4" /> // Always show LogIn icon
               )}
               {isLoading ? 'Signing In...' : 'Sign In'} {/* Updated button text */}
             </Button>
           </form>
         </Form>
      </CardContent>
    </Card>
  );
}
