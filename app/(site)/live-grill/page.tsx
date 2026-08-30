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
        <div className="mx-auto max-w-6xl space-y-10 px-6 pb-20 md:px-10">
            <SectionReveal className="glass-card rounded-3xl border border-[#CFAF63]/20 p-8 md:p-12">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Grill Dining • Khammam</p>
                <h1 className="mt-3 font-[var(--font-heading)] text-4xl md:text-5xl text-[#F5F5F5]">
                    Cinematic Fire. Premium Taste in Khammam.
                </h1>
                <p className="mt-4 max-w-3xl text-sm md:text-base text-[#F5F5F5]/75 leading-relaxed">
                    Watch flames rise as your chicken tikka, paneer tikka, and lamb chops are prepared live. At CafeMaza in V.Venkatayapalem,
                    every table gets a front-row seat to our signature live barbecue and sizzling grill experience.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                    <LuxuryButton href="/reserve-table" className="px-8 py-3.5">
                        Book a Live Grill Table
                    </LuxuryButton>
                    <LuxuryButton href="/menu" className="px-8 py-3.5 bg-gradient-to-r from-[#CFAF63]/80 to-[#CFAF63]">
                        View Grill Menu
                    </LuxuryButton>
                </div>
            </SectionReveal>

            <SectionReveal className="grid gap-6 md:grid-cols-3">
                {[
                    { name: "Chicken Tikka Skewers", desc: "Tender chicken chunks charred over aromatic coals, brushed with secret CafeMaza spice marinade." },
                    { name: "Paneer Tikka & Veg BBQ", desc: "Fresh cottage cheese, bell peppers, and mushrooms smoked to golden perfection on your table." },
                    { name: "Mutton Seekh & Chops", desc: "Succulent minced mutton kebabs seasoned with fresh royal spices, served piping hot with mint chutney." },
                ].map((item) => (
                    <article key={item.name} className="glass-card rounded-2xl border border-[#CFAF63]/20 p-6">
                        <h2 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">{item.name}</h2>
                        <p className="mt-3 text-sm text-[#F5F5F5]/70 leading-relaxed">{item.desc}</p>
                    </article>
                ))}
            </SectionReveal>
        </div>
    );
}
