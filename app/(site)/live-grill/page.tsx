import type { Metadata } from "next";
import Link from "next/link";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { LuxuryButton } from "@/components/ui/LuxuryButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Live Grill & Barbecue Dining in Khammam | CafeMaza",
    description:
        "Experience premier table-side live grill dining in Khammam at CafeMaza, V.Venkatayapalem. Freshly marinated skewers, kebabs, and smoky delights.",
    keywords: [
        "Live grill Khammam",
        "Barbecue restaurant Khammam",
        "Table grill dining V.Venkatayapalem",
        "Tandoori tikka Khammam",
        "CafeMaza live grill",
        "Best restaurant in Khammam",
    ],
    alternates: {
        canonical: `${SITE_URL}/live-grill`,
    },
    openGraph: {
        title: "Live Grill & Barbecue Dining in Khammam | CafeMaza",
        description:
            "Experience premier table-side live grill dining in Khammam at CafeMaza, V.Venkatayapalem. Fresh skewers and smoky delights.",
        url: `${SITE_URL}/live-grill`,
        type: "website",
        images: [{ url: "/images/og-banner.jpg", width: 1200, height: 630, alt: "Live Grill Experience in Khammam - CafeMaza" }],
    },
    twitter: {
        card: "summary_large_image",
        title: "Live Grill Dining in Khammam | CafeMaza",
        description: "Table-side live grill and barbecue dining at CafeMaza in V.Venkatayapalem, Khammam.",
        images: ["/images/og-banner.jpg"],
    },
};

export default function LiveGrillPage() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10 px-4 sm:px-6 pb-20 md:px-10">
            <SectionReveal className="glass-card rounded-2xl sm:rounded-3xl border border-[#CFAF63]/20 p-5 sm:p-8 md:p-12">
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Grill Dining • Khammam</p>
                <h1 className="mt-2 sm:mt-3 font-[var(--font-heading)] text-3xl sm:text-4xl md:text-5xl text-[#F5F5F5]">
                    Cinematic Fire. Premium Taste in Khammam.
                </h1>
                <p className="mt-3 sm:mt-4 max-w-3xl text-xs sm:text-sm md:text-base text-[#F5F5F5]/75 leading-relaxed">
                    Watch flames rise as your chicken tikka, paneer tikka, and lamb chops are prepared live. At CafeMaza in V.Venkatayapalem,
                    every table gets a front-row seat to our signature live barbecue and sizzling grill experience.
                </p>
                <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <LuxuryButton href="/reserve-table" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm min-h-[44px]">
                        Book a Live Grill Table
                    </LuxuryButton>
                    <LuxuryButton href="/menu" className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm bg-gradient-to-r from-[#CFAF63]/80 to-[#CFAF63] min-h-[44px]">
                        View Grill Menu
                    </LuxuryButton>
                </div>
            </SectionReveal>

            <SectionReveal className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                {[
                    { name: "Chicken Tikka Skewers", desc: "Tender chicken chunks charred over aromatic coals, brushed with secret CafeMaza spice marinade." },
                    { name: "Paneer Tikka & Veg BBQ", desc: "Fresh cottage cheese, bell peppers, and mushrooms smoked to golden perfection on your table." },
                    { name: "Mutton Seekh & Chops", desc: "Succulent minced mutton kebabs seasoned with fresh royal spices, served piping hot with mint chutney." },
                ].map((item) => (
                    <article key={item.name} className="glass-card rounded-2xl border border-[#CFAF63]/20 p-4 sm:p-6">
                        <h2 className="font-[var(--font-heading)] text-xl sm:text-2xl text-[#F5F5F5]">{item.name}</h2>
                        <p className="mt-2 text-xs sm:text-sm text-[#F5F5F5]/70 leading-relaxed">{item.desc}</p>
                    </article>
                ))}
            </SectionReveal>
        </div>
    );
}
