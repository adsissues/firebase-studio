'use client'; // Required because we'll use useState and useEffect for the splash screen

// import type { Metadata } from 'next'; // Removed as metadata object is removed
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/providers';
import { TopNavbar } from '@/components/top-navbar';
import { SplashScreen } from '@/components/splash-screen'; // Import SplashScreen
import { useState, useEffect } from 'react'; // Import useState and useEffect

const inter = Inter({ subsets: ['latin'] });

// Metadata export removed as it's not allowed in client components.
// PWA-related tags are manually added in the <head> below.
// For page-specific titles and descriptions, define metadata in individual page.tsx files.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // Simulate app loading for a short period to show the splash screen
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 1500); // Adjust duration as needed (e.g., 1.5 seconds)

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Add PWA related meta tags here */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4A90E2" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="StockWatch" />
        {/* For a default title and description if not set by pages, you can add:
        <title>StockWatch - Stock Management</title>
        <meta name="description" content="Manage your stock efficiently with StockWatch" />
        However, it's better to let pages control these for SEO. */}
      </head>
      <body className={inter.className}>
        {/* Conditionally render SplashScreen or AppProviders based on appLoading state */}
        {appLoading ? (
          <SplashScreen isLoading={appLoading} />
        ) : (
          <AppProviders>
            <div className={`app-content ${!appLoading ? 'loaded' : ''}`}>
              <div className="flex min-h-screen flex-col bg-background">
                <TopNavbar />
                <main className="flex-1 flex flex-col overflow-y-auto">
                  {children}
                </main>
              </div>
              <Toaster />
            </div>
          </AppProviders>
        )}
      </body>
    </html>
  );
}
