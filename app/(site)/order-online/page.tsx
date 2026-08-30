import type { Metadata } from "next";
import { OrderOnlineClient } from "./OrderOnlineClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Order Food Online in Khammam | Fast Delivery — CafeMaza",
    description:
        "Order delicious biryani, starters, tandoori, and curries online from CafeMaza with fast doorstep food delivery across Khammam and V.Venkatayapalem.",
    keywords: [
        "Food delivery in Khammam",
        "Order food online Khammam",
        "Online biryani order Khammam",
        "CafeMaza delivery",
        "Restaurant delivery V.Venkatayapalem",
        "Doorstep food delivery Khammam",
    ],
    alternates: {
        canonical: `${SITE_URL}/order-online`,
    },
    openGraph: {
        title: "Order Food Online in Khammam | Fast Delivery — CafeMaza",
        description:
            "Order delicious biryani, starters, and curries online from CafeMaza with fast doorstep delivery across Khammam.",
        url: `${SITE_URL}/order-online`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "Online Food Delivery Khammam - CafeMaza" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Order Food Online in Khammam | CafeMaza",
        description: "Fast doorstep food delivery across Khammam and V.Venkatayapalem.",
        images: ["/images/og-banner.jpg"],
    },
};

export default function OrderOnlinePage() {
    return <OrderOnlineClient />;
}
