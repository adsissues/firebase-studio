
"use client";

import * as React from 'react';
import { useAuth } from '@/context/auth-context';
import { AuthForm } from '@/components/auth/auth-form'; // Import the AuthForm
import { Skeleton } from '@/components/ui/skeleton'; // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert, LogIn } from 'lucide-react'; // Icons

interface RequireAuthProps {
  children: React.ReactNode;
  /** Role required to access the children. If undefined, only authentication is required. */
  requiredRole?: 'admin' | 'user';
}

/**
 * A component that wraps its children and only renders them if the user
 * is authenticated and (optionally) has the required role.
 * Otherwise, it renders a loading indicator or the AuthForm/access denied message.
 */
export function RequireAuth({ children, requiredRole }: RequireAuthProps) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    // Show a loading state while checking authentication
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="space-y-4 p-8 max-w-md w-full">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full mt-4" />
        </div>
      </div>
    );
  }

  if (!user) {
    // User is not authenticated, render the AuthForm
    return (
       <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
          <AuthForm />
       </div>
    );
  }

  // User is authenticated, check role if required
  if (requiredRole) {
    const hasRequiredRole = requiredRole === 'admin' ? isAdmin : true; // All authenticated users have 'user' role implicitly or explicitly
    if (!hasRequiredRole) {
      // User does not have the required role
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
           <Alert variant="destructive" className="max-w-md">
              <ShieldAlert className="h-5 w-5" />
              <AlertTitle>Access Denied</AlertTitle>
              <AlertDescription>
                You do not have the necessary permissions ({requiredRole} role required) to access this page.
                Please contact an administrator if you believe this is an error.
              </AlertDescription>
           </Alert>
        </div>
      );
    }
  }

  // User is authenticated and has the required role (if specified)
  return <>{children}</>;
}
