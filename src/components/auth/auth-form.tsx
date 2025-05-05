
"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Import Firestore functions
import { auth, db } from '@/lib/firebase/firebase';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, UserPlus, LogIn } from 'lucide-react';

// Schema for both sign-in and sign-up
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
  const [activeTab, setActiveTab] = React.useState<'signin' | 'signup'>('signin');

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleAuthError = (authError: AuthError) => {
    console.error(`${activeTab === 'signin' ? 'Sign In' : 'Sign Up'} Error:`, authError);
    let message = 'An unexpected error occurred. Please try again.';
    switch (authError.code) {
      case 'auth/invalid-email':
        message = 'Invalid email address format.';
        break;
      case 'auth/user-disabled':
        message = 'This user account has been disabled.';
        break;
      case 'auth/user-not-found':
        message = 'No user found with this email.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/email-already-in-use':
        message = 'This email address is already in use.';
        break;
      case 'auth/weak-password':
        message = 'Password is too weak. Please use a stronger password.';
        break;
      case 'auth/invalid-credential': // Common for wrong email/password combo
        message = 'Invalid credentials. Please check your email and password.';
         break;
      // Add other specific error codes as needed
    }
    setError(message);
    setIsLoading(false);
  };

  const onSubmit = async (values: AuthFormData) => {
    setIsLoading(true);
    setError(null);
    const { email, password } = values;

    try {
      if (activeTab === 'signin') {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('User signed in successfully');
        onSuccess?.(); // Call success callback
      } else {
        // Sign up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User signed up successfully:', userCredential.user.uid);

        // Create a corresponding user document in Firestore with default role 'user'
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          email: userCredential.user.email,
          role: 'user', // Assign default role
          createdAt: new Date(), // Optional: timestamp
        });
        console.log('User document created in Firestore');
        onSuccess?.(); // Call success callback
      }
    } catch (err) {
      handleAuthError(err as AuthError);
    }
    // No need for finally setIsLoading(false) here, handleAuthError does it on error
     // and successful sign-in/up will trigger AuthProvider state change which unmounts/hides this form.
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome to StockWatch</CardTitle>
        <CardDescription>
           {activeTab === 'signin' ? 'Sign in to manage your inventory' : 'Create an account to get started'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'signin' | 'signup')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" disabled={isLoading}>Sign In</TabsTrigger>
            <TabsTrigger value="signup" disabled={isLoading}>Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab}> {/* Only render the active tab's content */}
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
                      activeTab === 'signin' ? <LogIn className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />
                   )}
                   {isLoading ? 'Processing...' : (activeTab === 'signin' ? 'Sign In' : 'Sign Up')}
                 </Button>
               </form>
             </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
