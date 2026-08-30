import type { Metadata } from "next";
import Link from "next/link";
import { menuCategories } from "@/data/mockData";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { Phone, MapPin, ShoppingBag } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Takeaway & Parcel Food in Khammam | CafeMaza V.Venkatayapalem",
    description:
        "Order fresh takeaway and parcel food from CafeMaza in V.Venkatayapalem, Khammam. Quick self-pickup for family dinners, party orders, and gatherings.",
    keywords: [
        "Takeaway in Khammam",
        "Parcel food Khammam",
        "Biryani takeaway Khammam",
        "CafeMaza parcel",
        "Food parcel V.Venkatayapalem",
        "Best takeaway near V.Venkatayapalem",
    ],
    alternates: {
        canonical: `${SITE_URL}/takeaway`,
    },
    openGraph: {
        title: "Takeaway & Parcel Food in Khammam | CafeMaza V.Venkatayapalem",
        description:
            "Order fresh takeaway and parcel food from CafeMaza in V.Venkatayapalem, Khammam. Quick self-pickup for family dinners and party orders.",
        url: `${SITE_URL}/takeaway`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "Takeaway and Parcel Food in Khammam - CafeMaza" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Takeaway & Parcel Food in Khammam | CafeMaza",
        description: "Order fresh takeaway and parcel food from CafeMaza in V.Venkatayapalem, Khammam.",
        images: ["/images/og-banner.jpg"],
    },
};

export default function TakeawayPage() {
    return (
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pb-20 md:px-10 space-y-8 sm:space-y-10">
            <SectionReveal className="glass-card rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-5 sm:p-8">
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Takeaway &amp; Parcel Counter</p>
                <h1 className="mt-1.5 font-(--font-heading) text-3xl sm:text-4xl md:text-5xl text-[#F5F5F5]">
                    Fresh Takeaway Food in Khammam
                </h1>
                <p className="mt-3 sm:mt-4 max-w-3xl text-xs sm:text-sm md:text-base text-[#F5F5F5]/75 leading-relaxed">
                    Order ahead for rapid takeaway pickup at CafeMaza, located at 66RG+852, V.Venkatayapalem, Telangana 507318.
                    Enjoy steaming biryani family packs, sizzling tandoori starters, curries, and mocktails packed securely for your home dining.
                </p>

                <div className="mt-5 sm:mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <a
                        href="tel:+919959691599"
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-black hover:opacity-90 transition min-h-[44px]"
                    >
                        <Phone className="h-4 w-4" /> Call for Quick Pickup (+91 99596 91599)
                    </a>
                    <Link
                        href="/order-online"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#CFAF63]/40 bg-zinc-900 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#F5F5F5] hover:border-[#CFAF63] transition min-h-[44px]"
                    >
                        <ShoppingBag className="h-4 w-4" /> Order Online
                    </Link>
                </div>
            </SectionReveal>

            <SectionReveal className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {menuCategories.map((category) => (
                    <article key={category.id} className="glass-card rounded-2xl border border-[#CFAF63]/20 p-4 sm:p-5">
                        <h3 className="font-(--font-heading) text-xl sm:text-2xl text-[#F5F5F5]">{category.label}</h3>
                        <p className="mt-2 text-xs sm:text-sm text-[#F5F5F5]/70 leading-relaxed">{category.items.length} dishes available for fresh parcel &amp; takeaway in Khammam.</p>
                        <Link href={`/menu`} className="mt-3 sm:mt-4 inline-block text-xs font-semibold text-[#CFAF63] hover:underline">
                            View {category.label} Menu →
                        </Link>
                    </article>
                ))}
            </SectionReveal>
        </div>
    );
}
