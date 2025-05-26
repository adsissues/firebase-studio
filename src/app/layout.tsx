
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
// Removed AuthProvider, ThemeProvider, SidebarProvider, TanstackQueryClientProvider, QueryClient imports
// They are now handled by AppProviders
import { AppProviders } from '@/components/providers'; // Import the new providers component
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarInset } from "@/components/ui/sidebar";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'StockWatch - Stock Management',
  description: 'Manage your stock efficiently with StockWatch',
  manifest: '/manifest.json',
  themeColor: '#4A90E2', // Calm Blue from your theme
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StockWatch',
  },
};

// QueryClient instance is now created within AppProviders
// const queryClient = new QueryClient(); // REMOVE THIS

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders> {/* Use the new AppProviders component to wrap everything */}
          <div className="flex min-h-screen bg-background">
            <AppSidebar />
            <SidebarInset className="flex-1 flex flex-col overflow-y-auto">
              {children}
            </SidebarInset>
          </div>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
