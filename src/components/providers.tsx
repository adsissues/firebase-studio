
'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider as TanstackQueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';
import { SidebarProvider } from '@/components/ui/sidebar';

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

// To ensure the QueryClient is a singleton on the browser,
// we can store it in a global variable or use React.useState.
// Using React.useState is generally preferred for React components.
let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClientSingleton() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render.
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Use React.useState to ensure the QueryClient is only created once per component instance.
  // getQueryClientSingleton helps ensure it's a singleton on the client-side across potential re-renders.
  const [queryClient] = React.useState(() => getQueryClientSingleton());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TanstackQueryClientProvider client={queryClient}>
        <AuthProvider>
          <SidebarProvider defaultOpen={false}> {/* Set defaultOpen to false */}
            {children}
          </SidebarProvider>
        </AuthProvider>
      </TanstackQueryClientProvider>
    </ThemeProvider>
  );
}
