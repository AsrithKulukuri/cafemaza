import type { Metadata } from "next";
import { ReserveTableClient } from "@/components/reserve-table/ReserveTableClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Table Reservation in Khammam | Book Dining — CafeMaza",
    description:
        "Book a table at CafeMaza in V.Venkatayapalem, Khammam. Enjoy luxury family dining, live grill tables, and cozy ambiance for birthdays and anniversaries.",
    keywords: [
        "Table reservation Khammam",
        "Book restaurant table Khammam",
        "Family dining Khammam",
        "CafeMaza reservation",
        "Birthday celebration restaurant Khammam",
        "Best restaurant near V.Venkatayapalem",
    ],
    alternates: {
        canonical: `${SITE_URL}/reserve-table`,
    },
    openGraph: {
        title: "Table Reservation in Khammam | Book Dining — CafeMaza",
        description:
            "Book a table at CafeMaza in V.Venkatayapalem, Khammam. Enjoy luxury family dining and live grill tables.",
        url: `${SITE_URL}/reserve-table`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "Table Reservation in Khammam - CafeMaza" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Table Reservation in Khammam | CafeMaza",
        description: "Book a table at CafeMaza in V.Venkatayapalem, Khammam for family dining & celebrations.",
        images: ["/images/og-banner.jpg"],
    },
};

const tables = Array.from({ length: 12 }).map((_, idx) => ({
    id: idx + 1,
    seats: idx % 3 === 0 ? 6 : 4,
}));

export default function ReserveTablePage() {
    return <ReserveTableClient tables={tables} />;
}
