
'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
// SidebarProvider is removed as sidebar is replaced by TopNavbar

// Helper function to create a QueryClient instance
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClientSingleton() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => getQueryClientSingleton());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TanstackQueryClientProvider client={queryClient}>
        <AuthProvider>
          {/* SidebarProvider removed */}
          {children}
        </AuthProvider>
      </TanstackQueryClientProvider>
    </ThemeProvider>
  );
}
