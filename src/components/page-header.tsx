
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import type { AppUser } from '@/types';
import { LogOut, Settings, UserCircle } from 'lucide-react';

interface PageHeaderProps {
    user: AppUser | null;
    isAdmin: boolean;
    isLoading?: boolean;
    onSettingsClick: () => void;
    onSignOutClick: () => void;
    lastLogin?: string;
}

export function PageHeader({
    user,
    isAdmin,
    isLoading = false,
    onSettingsClick,
    onSignOutClick,
    lastLogin,
}: PageHeaderProps) {

  const pageTitle = `${isAdmin ? 'Admin Dashboard' : 'Stock Management Dashboard'}`;

  return (
    <header className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
        <div className="text-center sm:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-primary">StockWatch</h1>
            {isLoading ? (
                <Skeleton className="h-5 w-48 mt-1" />
            ) : (
                 <p className="text-md md:text-lg text-muted-foreground">
                     {pageTitle}
                 </p>
             )}
        </div>
       <div className="flex items-center gap-2">
            {isLoading ? (
                <>
                   <Skeleton className="h-8 w-24" />
                   <Skeleton className="h-8 w-8 rounded-full" />
                   <Skeleton className="h-8 w-8 rounded-full" />
                </>
             ) : user ? (
                <>
                     <div className="text-xs text-right text-muted-foreground hidden sm:block">
                        <div className="flex items-center gap-1"> <UserCircle className="h-3 w-3"/> {user.email} ({isAdmin ? 'Admin' : 'User'})</div>
                        {lastLogin && <div>Last login: {lastLogin}</div>}
                     </div>
                     {isAdmin && (
                         <Button
                             variant="outline"
                             size="icon"
                             onClick={onSettingsClick}
                             aria-label="Open Admin Settings"
                             className="h-8 w-8"
                         >
                             <Settings className="h-4 w-4" />
                         </Button>
                     )}
                     <ThemeToggle />
                     <Button
                         variant="outline"
                         size="icon"
                         onClick={onSignOutClick}
                         aria-label="Sign Out"
                         className="h-8 w-8"
                     >
                         <LogOut className="h-4 w-4" />
                     </Button>
                 </>
             ) : (
                 <ThemeToggle /> // Show only theme toggle if logged out
             )}
        </div>
    </header>
  );
}

    