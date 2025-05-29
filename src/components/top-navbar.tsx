
"use client";

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase'; // Import db
import { doc, setDoc, getDoc } from 'firebase/firestore'; // Import setDoc and getDoc
import { useToast } from '@/hooks/use-toast';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert as ShadAlert, AlertDescription as ShadAlertDescription, AlertTitle as ShadAlertTitle } from "@/components/ui/alert";
import { ThemeToggle } from './theme-toggle';
import { AdminSettingsDialog } from '@/components/admin-settings-dialog';
import { UserManagementDialog } from '@/components/user-management-dialog';
import type { AdminSettings, StockItem, AlertType } from '@/types';
import { Menu, LayoutDashboard, PackageSearch, ListOrdered, Bell, UserCircle, LogOut, Settings, Users, Loader2, Briefcase, EyeIcon, AlertTriangle, Info, BellRing as BellRingIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'user'] },
  { href: "/#stock-levels", label: "Stock Management", icon: PackageSearch, roles: ['admin'] }, // Admin only
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
  const { user, isAdmin, loading: authLoading, assignedLocations } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = React.useState(false);
  const [isUserManagementDialogOpen, setIsUserManagementDialogOpen] = React.useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = React.useState(false);

  const { data: adminSettings = defaultAdminSettings, isLoading: isLoadingAdminSettings } = useQuery<AdminSettings>({
    queryKey: ['adminSettings'],
    queryFn: async () => {
        if (!db || !isAdmin) return defaultAdminSettings;
        const settingsDocRef = doc(db, 'settings', 'admin');
        const docSnap = await getDoc(settingsDocRef);
        return docSnap.exists() ? { ...defaultAdminSettings, ...docSnap.data() } : defaultAdminSettings;
    },
    enabled: isAdmin && !!user,
  });

  const { data: stockItems = [], isLoading: isLoadingStockItemsForNav } = useQuery<StockItem[]>({
    queryKey: ['allStockItemsForNav', user?.uid, isAdmin, assignedLocations],
    queryFn: async () => {
       if (!user || !isAdmin) return []; // Only fetch for admin for now for notification popover
       const itemsCol = collection(db, 'stockItems');
       const itemSnapshot = await getDocs(itemsCol); // Admin sees all items
       return itemSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data(),
       } as StockItem));
    },
    enabled: !!user && isAdmin && isNotificationsOpen, // Fetch only if admin and notifications popover is open
  });


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

  const generatedAlerts = React.useMemo(() => {
    if (!isAdmin || isLoadingAdminSettings || isLoadingStockItemsForNav || !isNotificationsOpen) return [];
    const alerts: AlertType[] = [];
    stockItems.forEach(item => {
        const effectiveMinThreshold = item.minimumStock ?? adminSettings.lowStockThreshold;
        if (item.currentStock > 0 && item.currentStock <= effectiveMinThreshold) {
            alerts.push({id: `low-${item.id}`, type: "low_stock", title: "Low Stock", message: `${item.itemName} is low (${item.currentStock}/${effectiveMinThreshold}).`, variant: "destructive", item, timestamp: new Date()});
        }
        const minStockForOverstock = item.minimumStock ?? adminSettings.lowStockThreshold;
        const overstockQtyThreshold = item.overstockThreshold ?? (minStockForOverstock * ( (adminSettings.overstockThresholdPercentage ?? 200) / 100));
        if (item.currentStock > overstockQtyThreshold && overstockQtyThreshold > 0) {
             alerts.push({id: `overstock-${item.id}`, type: "overstock", title: "Overstock", message: `${item.itemName} is overstocked (${item.currentStock} > ${overstockQtyThreshold.toFixed(0)}).`, variant: "warning", item, timestamp: new Date()});
        }
        if (adminSettings.inactivityAlertDays && item.lastMovementDate) {
            const lastMovement = item.lastMovementDate.toDate();
            const daysSinceMovement = (new Date().getTime() - lastMovement.getTime()) / (1000 * 3600 * 24);
            if (daysSinceMovement > adminSettings.inactivityAlertDays) {
                 alerts.push({id: `inactive-${item.id}`, type: "inactivity", title: "Inactivity", message: `${item.itemName} has not moved in ${Math.floor(daysSinceMovement)} days.`, variant: "info", item, timestamp: new Date()});
            }
        }
    });
    return alerts.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5); // Show latest 5
  }, [isAdmin, stockItems, adminSettings, isLoadingAdminSettings, isLoadingStockItemsForNav, isNotificationsOpen]);

  const getAlertIcon = (variant?: AlertType['variant']) => {
    switch (variant) {
      case 'destructive': return <AlertTriangle className="h-4 w-4" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning-foreground" />; // Adjusted for warning variant text color
      case 'info': return <Info className="h-4 w-4 text-info-foreground" />; // Adjusted for info variant text color
      default: return <BellRingIcon className="h-4 w-4" />;
    }
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
                {navItems.filter(item => user && item.roles.includes(isAdmin ? 'admin' : 'user')).length > 2 && (
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
             <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Bell className="h-5 w-5" />
                        {generatedAlerts.length > 0 && (
                            <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                        )}
                        <span className="sr-only">Notifications</span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                        <h4 className="font-medium leading-none text-sm">Notifications</h4>
                    </div>
                    <ScrollArea className="h-72">
                        <div className="p-4 space-y-3">
                        {isLoadingStockItemsForNav && <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/></div>}
                        {!isLoadingStockItemsForNav && generatedAlerts.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No new notifications.</p>
                        )}
                        {!isLoadingStockItemsForNav && generatedAlerts.map((alert) => (
                            <ShadAlert key={alert.id} variant={alert.variant} className="relative text-xs p-3">
                                {getAlertIcon(alert.variant)}
                                <ShadAlertTitle className="font-semibold text-xs mb-0.5">{alert.title}</ShadAlertTitle>
                                <ShadAlertDescription className="text-xs">
                                {alert.message}
                                <span className="block text-muted-foreground mt-0.5 text-[10px]">
                                    {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                                </span>
                                </ShadAlertDescription>
                            </ShadAlert>
                        ))}
                        </div>
                    </ScrollArea>
                     {generatedAlerts.length > 0 && (
                        <div className="p-2 border-t text-center">
                            <Button variant="link" size="sm" className="text-xs" onClick={() => { setIsNotificationsOpen(false); router.push('/#alerts-panel'); }}>
                                View All Alerts
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    {user.photoURL ? <img src={user.photoURL} alt="User" className="h-7 w-7 rounded-full" data-ai-hint="user avatar"/> : <UserCircle className="h-6 w-6" />}
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

// Using a forwardRef for button that can be a Link
const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, asChild = false, children, ...props }, ref) => {
  const Comp = asChild ? 'div' : 'button';
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      ref,
      className: cn(className, (children as React.ReactElement).props.className),
      ...props,
    });
  }
  return (
    <Comp ref={ref} className={className} {...props}>
      {children}
    </Comp>
  );
});
SidebarMenuButton.displayName = "SidebarMenuButton";

export default TopNavbar;
