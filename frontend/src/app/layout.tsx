import type { Metadata } from "next";
import { Inter, Fira_Code } from "next/font/google";
import { Toaster } from "sonner";
import dynamic from 'next/dynamic';
import AuthProvider from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { NavigationProvider } from "@/providers/NavigationProvider";
import "./globals.css";

// Dynamically import ErrorBoundary with no SSR
const ErrorBoundary = dynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
});

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
    <html lang="en" className={`${inter.variable} ${firaCode.variable}`}>
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <QueryProvider>
              <NavigationProvider>
                {children}
                <Toaster position="top-center" richColors closeButton />
              </NavigationProvider>
            </QueryProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
