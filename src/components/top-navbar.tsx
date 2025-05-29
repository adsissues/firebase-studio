
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase'; // Import db
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import setDoc and getDoc
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query'; // Import useQuery
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
import { Menu, LayoutDashboard, PackageSearch, ListOrdered, Bell, UserCircle, LogOut, Settings, Users, Loader2, Briefcase, EyeIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

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

  const { data: adminSettings = defaultAdminSettings, isLoading: isLoadingAdminSettings } = useQuery<AdminSettings>({
    queryKey: ['adminSettings'],
    queryFn: async () => {
        if (!db || !isAdmin) return defaultAdminSettings; // Check db and isAdmin
        const settingsDocRef = doc(db, 'settings', 'admin');
        const docSnap = await getDoc(settingsDocRef);
        return docSnap.exists() ? { ...defaultAdminSettings, ...docSnap.data() } : defaultAdminSettings;
    },
    enabled: isAdmin && !!user, // Fetch only if admin and user is loaded
  });

  const { data: stockItems = [] } = useQuery<StockItem[]>({
    queryKey: ['allStockItems', user?.uid, isAdmin, user?.assignedLocations],
    queryFn: async () => { // Basic fetch, can be more specific if needed or rely on page.tsx's fetch
        if (!db || !user) return [];
        // This is a simplified fetch. For a complete list, it might be better to rely on the
        // data fetched by the main page if this navbar doesn't strictly need all items.
        // For now, we'll keep it minimal to avoid duplicating complex queries.
        return []; // Or implement a targeted fetch if needed for UserManagementDialog
    },
    enabled: isAdmin && !!user && isUserManagementDialogOpen, // Only fetch if dialog is open and user is admin
});


  const handleSignOut = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Sign Out Error", description: "Auth service not available." });
      return;
    }
    try {
      await signOut(auth);
      queryClient.clear(); 
      toast({ title: "Signed Out", description: "You have been successfully signed out." });
      router.push('/'); 
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Error", description: (error as Error).message });
    }
  };

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: AdminSettings) => {
        if (!db) throw new Error("Firestore is not available.");
        if (!isAdmin) throw new Error("Permission denied.");
        const settingsDocRef = doc(db, 'settings', 'admin');
        await setDoc(settingsDocRef, settings, { merge: true }); 
        return settings;
    },
    onSuccess: (savedSettings) => {
        queryClient.invalidateQueries({ queryKey: ['adminSettings'] });
        queryClient.invalidateQueries({ queryKey: ['systemAlerts'] }); 
        toast({ title: "Settings Saved", description: "Admin settings have been saved successfully."});
        setIsSettingsDialogOpen(false);
    },
    onError: (error: any) => {
        toast({ variant: "destructive", title: "Save Error", description: `Could not save admin settings: ${error.message}`});
    }
  });

  const handleSaveSettings = (settings: AdminSettings) => {
    saveSettingsMutation.mutate(settings);
  };


  if (authLoading || (isAdmin && isLoadingAdminSettings)) {
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
                    <SidebarMenuButton
                        key={item.label}
                        asChild
                        className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-accent",
                        (pathname === item.href || (item.href.startsWith("/#") && pathname === "/" && typeof window !== "undefined" && window.location.hash === item.href.substring(1))) && "bg-accent text-primary font-medium"
                        )}
                        onClick={() => setIsSheetOpen(false)}
                    >
                         <Link href={item.href}>
                           <div className="flex items-center gap-3 w-full">
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

// Assuming SidebarMenuButton is either a standard button or Link compatible
const SidebarMenuButton = React.forwardRef<
  HTMLElement, 
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean } 
>(({ className, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? 'div' : 'button'; 
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      // @ts-ignore
      ref, 
      className: cn(className, children.props.className), 
      ...props, 
    });
  }
  return (
    // @ts-ignore
    <Comp ref={ref} className={className} {...props}>
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";
