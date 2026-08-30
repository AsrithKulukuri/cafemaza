import type { Metadata } from "next";
import { ScreeningClient } from "./ScreeningClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Private Cinema & Film Dining in Khammam | CafeMaza",
    description:
        "Book a private movie screening and dining theater at CafeMaza in Khammam. Perfect for birthday parties, private film screenings, and celebrations.",
    keywords: [
        "Private screening Khammam",
        "Film dining restaurant Khammam",
        "Private movie theater restaurant Khammam",
        "Birthday celebration room Khammam",
        "CafeMaza screening",
        "Best cafe near V.Venkatayapalem",
    ],
    alternates: {
        canonical: `${SITE_URL}/screening`,
    },
    openGraph: {
        title: "Private Cinema & Film Dining in Khammam | CafeMaza",
        description:
            "Book a private movie screening and dining theater at CafeMaza in Khammam. Perfect for birthdays and family celebrations.",
        url: `${SITE_URL}/screening`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "Private Screening Dining in Khammam - CafeMaza" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Private Screening Dining in Khammam | CafeMaza",
        description: "Private screen dining theater for birthdays and movies at CafeMaza, Khammam.",
        images: ["/images/og-banner.jpg"],
    },
};

export default function ScreeningPage() {
    return <ScreeningClient />;
}
