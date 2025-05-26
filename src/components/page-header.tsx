
"use client";

import * as React from 'react';
import { Button } from "@/components/ui/button";
// ThemeToggle is now in AppSidebar's footer
// import { ThemeToggle } from "@/components/theme-toggle"; 
import { Skeleton } from "@/components/ui/skeleton";
import type { AppUser } from '@/types';
// LogOut is now in AppSidebar's footer
// Settings, Users icons are for AppSidebar
import { UserCircle } from 'lucide-react'; 

interface PageHeaderProps {
    user: AppUser | null;
    isAdmin: boolean;
    isLoading?: boolean;
    onSettingsClick: () => void; // Retain for admin settings dialog trigger
    onManageUsersClick: () => void; // Retain for user management dialog trigger
    // onSignOutClick is handled by AppSidebar
    lastLogin?: string;
}

export function PageHeader({
    user,
    isAdmin,
    isLoading = false,
    onSettingsClick, // Keep this prop
    onManageUsersClick, // Keep this prop
    lastLogin,
}: PageHeaderProps) {

  const pageTitle = `${isAdmin ? 'Admin Dashboard' : 'Stock Management Dashboard'}`;

  return (
    <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
        <div className="text-center sm:text-left">
            {/* StockWatch title is now in SidebarHeader, can be removed or kept here as well */}
            {/* <h1 className="text-2xl md:text-3xl font-bold text-primary">StockWatch</h1> */}
            {isLoading ? (
                <Skeleton className="h-5 w-48 mt-1" />
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
       <div className="flex items-center gap-2 self-center sm:self-auto">
            {/* SidebarTrigger, ThemeToggle, SignOut button are moved to AppSidebar */}
            {/* Admin-specific buttons can remain here or be part of a dedicated admin actions area */}
            {/* For now, keeping settings/user management triggers here if desired for PageHeader */}
            {/*
            {isAdmin && !isLoading && (
                <>
                 <Button
                     variant="outline"
                     size="icon"
                     onClick={onSettingsClick}
                     aria-label="Open Admin Settings"
                     className="h-8 w-8"
                     title="Admin Settings"
                 >
                     <Settings className="h-4 w-4" />
                 </Button>
                 <Button
                     variant="outline"
                     size="icon"
                     onClick={onManageUsersClick}
                     aria-label="Manage Users"
                     className="h-8 w-8"
                     title="Manage Users"
                   >
                     <Users className="h-4 w-4" />
                 </Button>
                </>
            )}
            */}
        </div>
    </header>
  );
}
