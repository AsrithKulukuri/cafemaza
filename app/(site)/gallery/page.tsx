import type { Metadata } from "next";
import Image from "next/image";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { LuxuryButton } from "@/components/ui/LuxuryButton";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export const metadata: Metadata = {
    title: "Culinary & Dining Gallery | CafeMaza Khammam",
    description: "Explore the visual ambiance, live flame counters, signature dum biryanis, and cozy family dining at CafeMaza in V.Venkatayapalem, Khammam.",
    alternates: {
        canonical: `${SITE_URL}/gallery`,
    },
};

const GALLERY_ITEMS = [
    { title: "Table-Side Live Grill", category: "Live Counters", src: "/images/gallery-grill.jpg", span: "sm:col-span-2 sm:row-span-2" },
    { title: "Authentic Dum Biryani", category: "Signature Mains", src: "/images/chicken-dum-biryani.jpg", span: "sm:col-span-1" },
    { title: "Tandoori Chicken Tikka", category: "Charcoal Starters", src: "/images/chicken-tikka.jpg", span: "sm:col-span-1" },
    { title: "Smoky Fire Kitchen", category: "Chef's Theater", src: "/images/gallery-fire.jpg", span: "sm:col-span-1" },
    { title: "Butter Chicken & Naan", category: "Curries & Breads", src: "/images/butter-chicken.jpg", span: "sm:col-span-1" },
    { title: "Family & Celebration Hall", category: "Ambiance", src: "/images/gallery-family.jpg", span: "sm:col-span-2" },
    { title: "Paneer Tikka Platter", category: "Vegetarian Specialties", src: "/images/paneer-tikka.jpg", span: "sm:col-span-1" },
    { title: "Refreshing Virgin Mojito", category: "Beverages", src: "/images/virgin-mojito.jpg", span: "sm:col-span-1" },
];

export default function GalleryPage() {
    return (
        <div className="mx-auto max-w-6xl space-y-8 sm:space-y-10 px-4 sm:px-6 pb-20 md:px-10">
            <SectionReveal className="text-center">
                <p className="text-xs uppercase tracking-[0.24em] text-[#CFAF63]">Visual Feast • Khammam</p>
                <h1 className="mt-1.5 font-(--font-heading) text-3xl sm:text-4xl text-[#F5F5F5] md:text-5xl">
                    Moments at CafeMaza
                </h1>
                <GoldDivider className="max-w-xs mx-auto" />
                <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-[#F5F5F5]/70 md:text-base leading-relaxed">
                    A glimpse into the live flame grilling, handcrafted dishes, and warm family moments that define the CafeMaza experience in V.Venkatayapalem.
                </p>
            </SectionReveal>

            <SectionReveal className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
                {GALLERY_ITEMS.map((item) => (
                    <div
                        key={item.title}
                        className={`group relative overflow-hidden rounded-2xl border border-[#CFAF63]/25 bg-[#121212] min-h-[220px] sm:min-h-[260px] ${item.span}`}
                    >
                        <Image
                            src={item.src}
                            alt={item.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-3 sm:bottom-4 left-3 sm:left-4 right-3 sm:right-4">
                            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-[#CFAF63]">
                                {item.category}
                            </span>
                            <h3 className="font-(--font-heading) text-base sm:text-xl text-[#F5F5F5] leading-tight mt-0.5">
                                {item.title}
                            </h3>
                        </div>
                    </div>
                ))}
            </SectionReveal>

            <SectionReveal className="glass-card rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-5 sm:p-8 text-center space-y-4">
                <h2 className="font-(--font-heading) text-2xl sm:text-3xl text-[#F5F5F5]">Experience It in Person</h2>
                <p className="text-xs sm:text-sm text-[#F5F5F5]/70 max-w-lg mx-auto">
                    Book your table today and join us for dinner, live barbecues, and celebrations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-2">
                    <LuxuryButton href="/reserve-table" className="w-full sm:w-auto px-6 sm:px-8 py-3 text-xs sm:text-sm min-h-[44px]">
                        Reserve a Table
                    </LuxuryButton>
                    <LuxuryButton href="/order-online" className="w-full sm:w-auto px-6 sm:px-8 py-3 text-xs sm:text-sm bg-gradient-to-r from-[#CFAF63]/80 to-[#CFAF63] min-h-[44px]">
                        Order Online Food
                    </LuxuryButton>
                </div>
            </SectionReveal>
        </div>
    );
}
