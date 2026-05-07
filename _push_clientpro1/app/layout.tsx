import type { Metadata, Viewport } from "next";
import { GlobalPageNav } from "@/components/layout/GlobalPageNav";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const viewport: Viewport = {
  themeColor: "#E0781E",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Café Maza | Ultra-Premium Live Grill Restaurant — Hyderabad",
    template: "%s | Café Maza",
  },
  description:
    "Café Maza is Hyderabad's premier live grill dining destination. Experience authentic tandoori cuisine, Hyderabadi dum biryani, private screening dining, and cinematic luxury ambiance.",
  keywords: [
    "Cafe Maza",
    "live grill restaurant",
    "Hyderabad restaurant",
    "tandoori",
    "biryani",
    "private dining",
    "luxury restaurant",
    "film dining",
    "private screening dining",
  ],
  authors: [{ name: "Café Maza" }],
  creator: "Café Maza",
  publisher: "Café Maza",
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "Café Maza",
    title: "Café Maza | Ultra-Premium Live Grill Restaurant",
    description:
      "Hyderabad's finest live grill dining — authentic tandoori, dum biryani, private screening tables and cinematic ambiance.",
    images: [
      {
        url: "/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "Café Maza — Live Grill Restaurant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Café Maza | Ultra-Premium Live Grill Restaurant",
    description: "Authentic tandoori, dum biryani & private screening dining in Hyderabad.",
    images: ["/images/og-banner.jpg"],
  },
  icons: {
    icon: [
      { url: "/logoo.jpeg", type: "image/jpeg" },
      { url: "/favicon.ico" },
      { url: "/logoo.jpeg", sizes: "192x192", type: "image/jpeg" },
    ],
    apple: "/logoo.jpeg",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className="antialiased bg-[#0B0B0B] text-[#F5F5F5]">
        <GlobalPageNav />
        {children}
      </body>
    </html>
  );
}
