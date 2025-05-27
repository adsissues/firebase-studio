
"use client";

import * as React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import type { AppUser } from '@/types';
import { UserCircle } from 'lucide-react'; 

interface PageHeaderProps {
    user: AppUser | null;
    isAdmin: boolean;
    isLoading?: boolean;
    // onSettingsClick and onManageUsersClick are removed as they are handled by TopNavbar
    lastLogin?: string;
}

export function PageHeader({
    user,
    isAdmin,
    isLoading = false,
    lastLogin,
}: PageHeaderProps) {

  const pageTitle = `${isAdmin ? 'Admin Dashboard' : 'Stock Management Dashboard'}`;

  return (
    <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="text-center sm:text-left">
            {isLoading ? (
                <Skeleton className="h-7 w-48 md:w-64 mt-1" /> // Adjusted skeleton size
            ) : (
                 <p className="text-xl md:text-2xl font-semibold text-foreground">
                     {pageTitle}
                 </p>
             )}
             {isLoading ? (
                <Skeleton className="h-4 w-32 mt-1" />
             ) : user && (
                <div className="text-xs text-muted-foreground mt-1">
                    <div className="flex items-center gap-1"> <UserCircle className="h-3 w-3"/> {user.email} ({isAdmin ? 'Admin' : 'User'})</div>
                    {lastLogin && <div>Last login: {lastLogin}</div>}
                </div>
             )}
        </div>
       {/* Action buttons like Admin Settings and User Management are moved to TopNavbar's user dropdown */}
    </header>
  );
}
