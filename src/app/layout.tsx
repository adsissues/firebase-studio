import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider
import { ThemeProvider } from "@/components/theme-provider"; // Import ThemeProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Update metadata to include PWA properties
export const metadata: Metadata = {
  title: 'StockWatch - Stock Management',
  description: 'Manage your stock efficiently with StockWatch',
  manifest: '/manifest.json', // Link to the manifest file
  themeColor: '#317EFB', // Match the theme color in manifest
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'StockWatch',
    // startupImage: [], // Optional: Add startup images for iOS
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
       {/* Link to manifest directly in head is handled by Metadata API */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
              <AuthProvider> {/* Wrap children with AuthProvider */}
                {children}
              </AuthProvider>
              <Toaster />
          </ThemeProvider>
      </body>
    </html>
  );
}
