import type { Metadata, Viewport } from "next";
import Script from "next/script";
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
    default: "CafeMaza Khammam | Family Restaurant, Cafe & Food Delivery",
    template: "%s | CafeMaza Khammam",
  },
  description:
    "Visit CafeMaza in V.Venkatayapalem, Khammam for fresh food, biryani, cafe drinks, family dining, takeaway, table reservations, and online food ordering.",
  keywords: [
    "CafeMaza Khammam",
    "Cafe Maza",
    "Restaurant in Khammam",
    "Cafe in Khammam",
    "Food delivery in Khammam",
    "Biryani in Khammam",
    "Family restaurant in Khammam",
    "Best cafe near V.Venkatayapalem",
    "Live grill Khammam",
    "Takeaway Khammam",
    "Table reservation Khammam",
    "Private screening dining Khammam",
    "V.Venkatayapalem restaurant",
    "Telangana 507318 restaurant",
  ],
  authors: [{ name: "CafeMaza" }],
  creator: "CafeMaza",
  publisher: "CafeMaza",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: "CafeMaza Khammam",
    title: "CafeMaza Khammam | Family Restaurant, Cafe & Food Delivery",
    description:
      "Visit CafeMaza in V.Venkatayapalem, Khammam for fresh food, authentic biryani, sizzling live grills, family dining, and online ordering.",
    images: [
      {
        url: "/images/og-banner.jpg",
        width: 1200,
        height: 630,
        alt: "CafeMaza — Family Restaurant & Live Grill in Khammam",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CafeMaza Khammam | Family Restaurant & Live Grill",
    description:
      "Visit CafeMaza in V.Venkatayapalem, Khammam for biryani, live grills, family dining & fast food delivery.",
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

const restaurantSchema = {
  "@context": "https://schema.org",
  "@type": ["Restaurant", "CafeOrCoffeeShop"],
  name: "CafeMaza",
  alternateName: "Cafe Maza Khammam",
  description:
    "Visit CafeMaza in V.Venkatayapalem, Khammam for fresh food, biryani, cafe drinks, family dining, takeaway, table reservations, and online food ordering.",
  image: `${SITE_URL}/images/og-banner.jpg`,
  logo: `${SITE_URL}/logoo.jpeg`,
  url: SITE_URL,
  telephone: "+919959691599",
  priceRange: "₹₹",
  servesCuisine: [
    "Indian",
    "Biryani",
    "Cafe",
    "Family Dining",
    "Chinese",
    "Tandoori",
    "Live Grill",
    "Barbecue",
  ],
  address: {
    "@type": "PostalAddress",
    streetAddress: "66RG+852, V.Venkatayapalem",
    addressLocality: "V.Venkatayapalem",
    addressRegion: "Telangana",
    postalCode: "507318",
    addressCountry: "IN",
  },
  areaServed: [
    {
      "@type": "AdministrativeArea",
      name: "Khammam",
    },
    {
      "@type": "Place",
      name: "V.Venkatayapalem",
    },
    {
      "@type": "Place",
      name: "Raghunadhpalem",
    },
    {
      "@type": "AdministrativeArea",
      name: "Telangana",
    },
  ],
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      opens: "12:00",
      closes: "23:30",
    },
  ],
  hasMenu: `${SITE_URL}/menu`,
  acceptsReservations: true,
  potentialAction: [
    {
      "@type": "ReserveAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/reserve-table`,
        inLanguage: "en-IN",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      result: {
        "@type": "FoodEstablishmentReservation",
        name: "Table Reservation",
      },
    },
    {
      "@type": "OrderAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/order-online`,
        inLanguage: "en-IN",
        actionPlatform: [
          "http://schema.org/DesktopWebPlatform",
          "http://schema.org/MobileWebPlatform",
        ],
      },
      deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet",
    },
  ],
  sameAs: [
    "https://www.instagram.com/cafe_maza",
    "https://maps.app.goo.gl/nGPrhuvSoBKp45LV7",
    "https://www.google.com/search?sca_esv=d0a1e93f4488cb4c&hl=en-US&gl=us&output=search&kgmid=%2Fg%2F11ykvs1cf3&q=Cafe%20Maza",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          id="restaurant-structured-data"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(restaurantSchema) }}
        />
      </head>
      <body suppressHydrationWarning className="antialiased bg-[#0B0B0B] text-[#F5F5F5]">
        <GlobalPageNav />
        {children}
      </body>
    </html>
  );
}
