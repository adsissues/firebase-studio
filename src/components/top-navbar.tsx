
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from './theme-toggle';
import { AdminSettingsDialog } from '@/components/admin-settings-dialog';
import { UserManagementDialog } from '@/components/user-management-dialog';
import type { AdminSettings, StockItem } from '@/types';
import { Menu, LayoutDashboard, PackageSearch, ListOrdered, Bell, UserCircle, LogOut, Settings, Users, Loader2, Briefcase } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton'; // Import the global Skeleton component
import { cn } from '@/lib/utils'; // Import cn if TopNavbar itself uses it, though not strictly needed for Skeleton anymore

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'user'] },
  { href: "/#stock-levels", label: "Stock Management", icon: PackageSearch, roles: ['admin', 'user'] },
  { href: "/inventory", label: "Full Inventory", icon: ListOrdered, roles: ['admin', 'user'] },
];

const defaultAdminSettings: AdminSettings = {
    emailNotifications: true,
    pushNotifications: false,
    lowStockThreshold: 10,
    overstockThresholdPercentage: 200,
    inactivityAlertDays: 30,
};


export function TopNavbar() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false);
  const [isUserManagementDialogOpen, setIsUserManagementDialogOpen] = React.useState(false);

  const { data: adminSettings = defaultAdminSettings } = useQueryClient().getQueryData<AdminSettings>(['adminSettings']) ?? { data: defaultAdminSettings };
  const { data: stockItems = [] } = useQueryClient().getQueryData<StockItem[]>(['allStockItems', user?.uid, isAdmin, user?.assignedLocations]) ?? { data: [] };


  const handleSignOut = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Sign Out Error", description: "Auth service not available." });
      return;
    }
    try {
      await signOut(auth);
      queryClient.clear();
      toast({ title: "Signed Out" });
      router.push('/'); 
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Error", description: (error as Error).message });
    }
  };

  const saveSettingsMutation = { 
    isPending: false,
    mutate: (settings: AdminSettings) => {
        console.log("Saving admin settings (placeholder):", settings);
        
        const currentAdminSettings = queryClient.getQueryData<AdminSettings>(['adminSettings']) || defaultAdminSettings;
        const updatedSettings = { ...currentAdminSettings, ...settings };
        
        queryClient.setQueryData(['adminSettings'], updatedSettings);
        queryClient.invalidateQueries({ queryKey: ['systemAlerts'] }); // Invalidate alerts if settings change
        
        toast({ title: "Settings Saved", description: "Admin settings have been updated locally. Backend save needs implementation."});
        setIsSettingsDialogOpen(false);
    }
  };
  const handleSaveSettings = (settings: AdminSettings) => saveSettingsMutation.mutate(settings);


  if (authLoading) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>
                    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-primary" onClick={() => setIsSheetOpen(false)}>
                        <Briefcase className="h-6 w-6" /> StockWatch
                    </Link>
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 p-4">
                {navItems
                  .filter(item => user && item.roles.includes(isAdmin ? 'admin' : 'user'))
                  .map(item => (
                    <SidebarMenuButton // Assuming SidebarMenuButton is now Link compatible
                        key={item.label}
                        asChild
                        className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent",
                        (pathname === item.href || (item.href.startsWith("/#") && pathname === "/" && typeof window !== "undefined" && window.location.hash === item.href.substring(1))) && "bg-accent text-primary font-medium"
                        )}
                        onClick={() => setIsSheetOpen(false)} // onClick on Button, not Link for sheet closing
                    >
                        <Link href={item.href} legacyBehavior={false}>
                             <div className="flex items-center gap-3 w-full"> {/* Ensure icon and label are wrapped */}
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </div>
                        </Link>
                    </SidebarMenuButton>
                  ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link href="/" className="mr-6 hidden md:flex items-center gap-2 text-lg font-semibold text-primary">
            <Briefcase className="h-6 w-6" />
            StockWatch
          </Link>
          
           <nav className="hidden md:flex items-center space-x-1">
             {navItems
                .filter(item => user && item.roles.includes(isAdmin ? 'admin' : 'user'))
                .slice(0, 2) 
                .map((item) => (
                <Button
                    key={item.label}
                    variant="ghost"
                    asChild
                    className={cn(
                    "px-3 py-2 text-sm font-medium",
                    (pathname === item.href || (item.href.startsWith("/#") && pathname === "/" && typeof window !== "undefined" && window.location.hash === item.href.substring(1)))
                        ? "text-primary bg-accent"
                        : "text-muted-foreground hover:text-primary hover:bg-accent/50"
                    )}
                >
                    <Link href={item.href} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4"/>
                        {item.label}
                    </Link>
                </Button>
                ))}
                {navItems.length > 2 && user && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent/50">More</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                        {navItems
                            .filter(item => user && item.roles.includes(isAdmin ? 'admin' : 'user'))
                            .slice(2).map(item => (
                            <DropdownMenuItem key={item.label} asChild className={cn((pathname === item.href || (item.href.startsWith("/#") && pathname === "/" && typeof window !== "undefined" && window.location.hash === item.href.substring(1))) && "bg-accent")}>
                                <Link href={item.href} className="flex items-center gap-2 w-full">
                                    <item.icon className="h-4 w-4"/> {item.label}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
           </nav>


          <div className="flex flex-1 items-center justify-end space-x-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={() => toast({ title: "Notifications", description: "Notifications panel coming soon!"})}>
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notifications</span>
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {user.photoURL ? <img src={user.photoURL} alt="User" className="h-7 w-7 rounded-full" data-ai-hint="user avatar" /> : <UserCircle className="h-6 w-6" />}
                    <span className="sr-only">User Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.displayName || user.email?.split('@')[0]}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                        <Settings className="mr-2 h-4 w-4" /> Admin Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsUserManagementDialogOpen(true)}>
                        <Users className="mr-2 h-4 w-4" /> Manage Users
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => router.push('/')} variant="outline" size="sm">Sign In</Button>
            )}
          </div>
        </div>
      </header>
      
        {isAdmin && isSettingsDialogOpen && (
            <AdminSettingsDialog
            isOpen={isSettingsDialogOpen}
            onClose={() => setIsSettingsDialogOpen(false)}
            onSave={handleSaveSettings}
            currentSettings={adminSettings}
            isLoading={saveSettingsMutation.isPending}
            />
        )}
        {isAdmin && isUserManagementDialogOpen && (
            <UserManagementDialog
            isOpen={isUserManagementDialogOpen}
            onClose={() => setIsUserManagementDialogOpen(false)}
            allStockItems={stockItems || []} 
            />
        )}
    </>
  );
}

// Removed local Skeleton component definition
// function Skeleton({ className }: { className?: string }) {
//   return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
// }

// Assuming SidebarMenuButton is either a standard button or Link compatible
// This is a placeholder if SidebarMenuButton is a custom component that needs specific Link integration
const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild, children, ...props }, ref) => {
  if (asChild) {
    return React.cloneElement(children as React.ReactElement, { ref, className, ...props });
  }
  return (
    <button ref={ref} className={className} {...props}>
      {children}
    </button>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";
