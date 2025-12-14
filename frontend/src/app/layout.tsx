import type { Metadata } from "next";
import { Toaster } from "sonner";
import dynamic from 'next/dynamic';
import AuthProvider from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import PinGuard from "@/components/PinGuard";
import "./globals.css";

// Dynamically import ErrorBoundary with no SSR
const ErrorBoundary = dynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: "Kardex Ticket Management",
  description: "Kardex Ticket Management System",
  icons: {
    icon: [
      { url: "/favicon-circle-simple.svg", sizes: "any", type: "image/svg+xml" },
      { url: "/favicon-circle.svg", sizes: "64x64", type: "image/svg+xml" },
      { url: "/logo.png", sizes: "48x48", type: "image/png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "16x16", type: "image/png" }
    ],
    shortcut: "/favicon-circle-simple.svg",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <NavigationProvider>
                <PinGuard>
                  {children}
                </PinGuard>
                <Toaster 
                  position="top-center" 
                  closeButton
                  theme="light"
                />
              </NavigationProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
