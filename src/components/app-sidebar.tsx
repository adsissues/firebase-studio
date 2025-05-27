
"use client";

import * as React from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/auth-context";
import { LayoutDashboard, Settings, Users, LogOut, PackageSearch, ListOrdered } from "lucide-react"; // Added ListOrdered
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/firebase'; // Ensure db is imported if queryClient.clear() needs it indirectly
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "./theme-toggle";
import { useQueryClient } from '@tanstack/react-query';

export function AppSidebar() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    if (!auth) {
      toast({ variant: "destructive", title: "Sign Out Error", description: "Auth service not available." });
      return;
    }
    try {
      await signOut(auth);
      queryClient.clear(); // Clear react-query cache on sign out
      toast({ title: "Signed Out" });
      // Potentially redirect to login page or refresh to reflect signed-out state
      // window.location.href = '/login'; // Example redirect
    } catch (error) {
      toast({ variant: "destructive", title: "Sign Out Error", description: (error as Error).message });
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'user'] },
    { href: "/#stock-levels", label: "Stock Management", icon: PackageSearch, roles: ['admin', 'user'] },
    { href: "/inventory", label: "Full Inventory", icon: ListOrdered, roles: ['admin'] }, // New link for admins
    // Placeholder routes, actual pages would need to be created
    // { href: "/admin/settings", label: "Admin Settings", icon: Settings, roles: ['admin'] },
    // { href: "/admin/users", label: "User Management", icon: Users, roles: ['admin'] },
  ];

  if (authLoading) {
    return (
      <Sidebar collapsible="icon" className="border-r p-2">
        <SidebarHeader className="p-2 flex items-center justify-between">
          <div className="text-lg font-semibold text-primary px-2 group-data-[collapsible=icon]:hidden">StockWatch</div>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="p-2 space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse"></div>
          ))}
        </SidebarContent>
      </Sidebar>
    );
  }


  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-2 flex items-center justify-between h-14"> {/* Consistent height */}
        <Link href="/" className="text-lg font-semibold text-primary px-2 group-data-[collapsible=icon]:hidden whitespace-nowrap">
          StockWatch
        </Link>
        <SidebarTrigger />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems
            .filter(item => user && item.roles.includes(isAdmin ? 'admin' : 'user'))
            .map(item => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href || (item.href.startsWith("/#") && pathname === "/" && typeof window !== "undefined" && window.location.hash === item.href.substring(1) )}
                  tooltip={item.label}
                  aria-label={item.label}
                >
                  <Link href={item.href}>
                    {/* Wrap icon and span in a single div */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sidebar-menu-item-gap, 0.5rem)' }} className="group-data-[collapsible=icon]:justify-center">
                      <item.icon />
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2 mt-auto border-t">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-2">
          <ThemeToggle />
          {user && (
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="text-muted-foreground hover:text-destructive" title="Sign Out">
              <LogOut />
              <span className="sr-only">Sign Out</span>
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

