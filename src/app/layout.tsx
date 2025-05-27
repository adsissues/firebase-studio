
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AppProviders } from '@/components/providers'; // Import the new providers component
import { TopNavbar } from '@/components/top-navbar'; // Import the new TopNavbar

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>
          <div className="flex min-h-screen flex-col bg-background">
            <TopNavbar /> {/* Add TopNavbar here */}
            <main className="flex-1 flex flex-col overflow-y-auto"> {/* Main content area */}
              {children}
            </main>
          </div>
          <Toaster />
        </AppProviders>
      </body>
    </html>
  );
}
