import type { Metadata } from "next";
import { MenuClient } from "./MenuClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Menu & Prices | CafeMaza Khammam — Biryani, Grills & Starters",
    description:
        "Explore the authentic food menu at CafeMaza in Khammam. From live grills, sizzling starters, and Hyderabadi dum biryani to mocktails and desserts in V.Venkatayapalem.",
    keywords: [
        "CafeMaza menu",
        "Restaurant menu Khammam",
        "Biryani in Khammam",
        "Cafe in Khammam",
        "Tandoori chicken Khammam",
        "Chinese starters Khammam",
        "Best cafe near V.Venkatayapalem",
    ],
    alternates: {
        canonical: `${SITE_URL}/menu`,
    },
    openGraph: {
        title: "Menu & Prices | CafeMaza Khammam — Biryani, Grills & Starters",
        description:
            "Explore the authentic food menu at CafeMaza in Khammam. From live grills and biryani to sizzling starters in V.Venkatayapalem.",
        url: `${SITE_URL}/menu`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "CafeMaza Food Menu Khammam" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Menu & Prices | CafeMaza Khammam",
        description: "Explore the authentic food menu at CafeMaza in V.Venkatayapalem, Khammam.",
        images: ["/images/og-banner.jpg"],
    },
};

export default function MenuPage() {
    return <MenuClient />;
}
