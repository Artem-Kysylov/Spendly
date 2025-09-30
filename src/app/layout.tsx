import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { AuthContextProvider } from "@/context/AuthContext";
import { QueryProvider } from "@/context/QueryProvider";
import { ToastProvider } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { AIAssistantProvider } from '@/components/ai-assistant'

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap", // Use 'swap' to avoid FOIT
});

export const metadata: Metadata = {
  title: "Spendly - Personal Finance Manager",
  description: "Track your expenses, manage budgets, and take control of your finances with Spendly",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["finance", "budget", "expenses", "money", "tracking", "personal finance"],
  authors: [
    { name: "Spendly Team" }
  ],
  creator: "Spendly",
  publisher: "Spendly",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://spendly.app"),
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: '/icons/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/icons/icon-192x192.png',
        color: '#3b82f6',
      },
    ],
  },
  openGraph: {
    type: "website",
    siteName: "Spendly",
    title: {
      default: "Spendly - Personal Finance Manager",
      template: "%s | Spendly"
    },
    description: "Track your expenses, manage budgets, and take control of your finances with Spendly",
  },
  twitter: {
    card: "summary",
    title: {
      default: "Spendly - Personal Finance Manager",
      template: "%s | Spendly"
    },
    description: "Track your expenses, manage budgets, and take control of your finances with Spendly",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Spendly",
  },
  verification: {
    google: "google-site-verification-token",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e40af" }
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Also supported by less commonly used
  // interactiveWidget: 'resizes-visual',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Spendly" />
        <meta name="application-name" content="Spendly" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
      </head>
      <body className={montserrat.className}>
        <QueryProvider>
          <ToastProvider>
            <AuthContextProvider>
              {children}
              {/* AI Assistant Floating Button */}
              <AIAssistantProvider />
            </AuthContextProvider>
            {/* Global pop-up notifications */}
            <Toaster />
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
