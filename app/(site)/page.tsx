"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DishCard } from "@/components/ui/DishCard";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { LuxuryButton } from "@/components/ui/LuxuryButton";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { featuredDishes, grillFeatures, menuCategories, type Dish } from "@/data/mockData";
import { apiFetch } from "@/lib/api";

const HeroSection = dynamic(() => import("@/components/hero/HeroSection").then((module) => module.HeroSection), {
    ssr: false,
    loading: () => <div className="h-[70vh] min-h-[560px] w-full animate-pulse bg-[#111111]" />,
});

const ScreeningBookingModal = dynamic(() => import("@/components/ui/ScreeningBookingModal").then((module) => module.ScreeningBookingModal), {
    ssr: false,
});

const TestimonialsCarousel = dynamic(() => import("@/components/ui/TestimonialsCarousel").then((module) => module.TestimonialsCarousel), {
    ssr: false,
    loading: () => <div className="h-44 w-full animate-pulse rounded-2xl bg-[#151515]" />,
});

const CTA_ACTIONS = [
    { title: "Reserve a Table", subtitle: "Book your premium dining experience", href: "/reserve-table", icon: "🍽️" },
    { title: "Dine In Now", subtitle: "Walk-in or call for instant seating", href: "/contact", icon: "👥" },
    { title: "Takeaway", subtitle: "Order ahead for quick pickup", href: "/takeaway", icon: "🛍️" },
    { title: "Order Online", subtitle: "Home delivery with premium packaging", href: "/order-online", icon: "📦" },
];

type BackendMenuItem = {
    _id: string;
    name: string;
    category: string;
    price: number;
    image?: string;
    isVeg?: boolean;
    isPopular?: boolean;
    isBestSeller?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

type PromoBanner = {
    _id: string;
    title: string;
    subtitle?: string;
    couponCode?: string;
    image?: string;
    ctaText?: string;
    ctaLink?: string;
};

export default function HomePage() {
    const [showScreeningModal, setShowScreeningModal] = useState(false);
    const [signatureDishes, setSignatureDishes] = useState<Dish[]>(featuredDishes);
    const [isDishesLoading, setIsDishesLoading] = useState(true);
    const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
    const [activePromoIndex, setActivePromoIndex] = useState(0);

    const openScreeningModal = useCallback(() => setShowScreeningModal(true), []);
    const closeScreeningModal = useCallback(() => setShowScreeningModal(false), []);

    useEffect(() => {
        let mounted = true;

        async function loadSignatureDishes() {
            try {
                const items = await apiFetch<BackendMenuItem[]>("/api/menu", { cache: "no-store" });
                if (!items.length || !mounted) return;

                const popularItems = items.filter((item) => Boolean(item.isPopular || item.isBestSeller));
                const featuredPool = popularItems.length > 0 ? popularItems : items;

                const featured = featuredPool
                    .slice(0, 6)
                    .map((item) => ({
                        _id: item._id,
                        name: item.name,
                        price: item.price,
                        image: item.image || "/images/soup.jpg",
                        isVeg: item.isVeg,
                        isBestSeller: item.isBestSeller ?? item.isPopular,
                        isSoldOut: item.isSoldOut,
                        tags: item.tags,
                    } satisfies Dish));

                if (featured.length > 0) {
                    setSignatureDishes(featured);
                }
            } catch {
                // Keep local fallback list when backend is unavailable.
            } finally {
                if (mounted) {
                    setIsDishesLoading(false);
                }
            }
        }

        loadSignatureDishes();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        async function loadPromoBanners() {
            try {
                const result = await apiFetch<PromoBanner[]>(`/api/promo-banners/public?t=${Date.now()}`, { cache: "no-store" });
                if (!mounted) return;
                setPromoBanners(Array.isArray(result) ? result.slice(0, 3) : []);
            } catch {
                if (!mounted) return;
                setPromoBanners([]);
            }
        }

        void loadPromoBanners();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (activePromoIndex < promoBanners.length) {
            return;
        }

        setActivePromoIndex(0);
    }, [activePromoIndex, promoBanners.length]);

    useEffect(() => {
        if (promoBanners.length <= 1) {
            return;
        }

        const timer = setInterval(() => {
            setActivePromoIndex((prev) => (prev + 1) % promoBanners.length);
        }, 4000);

        return () => {
            clearInterval(timer);
        };
    }, [promoBanners]);

    return (
        <div className="space-y-24 pb-20">
            {/* 0. PROMO BANNER */}
            {promoBanners.length ? (
                <SectionReveal direction="up" className="mx-auto max-w-6xl px-6 pt-6 md:px-10">
                    <motion.div
                        key={promoBanners[activePromoIndex]?._id || activePromoIndex}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="relative overflow-hidden rounded-3xl border border-[#CFAF63]/25"
                    >
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{
                                backgroundImage: promoBanners[activePromoIndex]?.image
                                    ? `linear-gradient(90deg, rgba(8,8,8,0.88), rgba(8,8,8,0.65)), url(${promoBanners[activePromoIndex].image})`
                                    : "linear-gradient(90deg, rgba(12,11,8,0.94), rgba(26,20,12,0.9))",
                            }}
                        />
                        <div className="relative z-10 p-6 md:p-10">
                            <p className="text-xs uppercase tracking-[0.18em] text-[#CFAF63]">Today&apos;s Offers</p>
                            <h3 className="mt-2 font-[var(--font-heading)] text-3xl text-[#F5F5F5] md:text-4xl">
                                {promoBanners[activePromoIndex]?.title}
                            </h3>
                            {promoBanners[activePromoIndex]?.subtitle ? (
                                <p className="mt-2 max-w-2xl text-sm text-[#F5F5F5]/80 md:text-base">{promoBanners[activePromoIndex].subtitle}</p>
                            ) : null}
                            {promoBanners[activePromoIndex]?.couponCode ? (
                                <p className="mt-4 inline-flex rounded-full border border-[#CFAF63]/35 bg-[#0f0f0f]/70 px-4 py-1.5 text-sm text-[#F5F5F5]">
                                    Use Code: <span className="ml-2 font-semibold text-[#CFAF63]">{promoBanners[activePromoIndex].couponCode}</span>
                                </p>
                            ) : null}
                            <div className="mt-5 flex items-center gap-3">
                                <Link
                                    href={promoBanners[activePromoIndex]?.ctaLink || "/menu"}
                                    className="rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2.5 text-sm font-semibold text-[#111]"
                                >
                                    {promoBanners[activePromoIndex]?.ctaText || "Explore Offer"}
                                </Link>
                                {promoBanners.length > 1 ? (
                                    <div className="flex items-center gap-2">
                                        {promoBanners.map((banner, index) => (
                                            <button
                                                key={banner._id}
                                                type="button"
                                                onClick={() => setActivePromoIndex(index)}
                                                className={`h-2.5 rounded-full transition ${index === activePromoIndex ? "w-8 bg-[#CFAF63]" : "w-2.5 bg-[#F5F5F5]/50"}`}
                                                aria-label={`Go to promo slide ${index + 1}`}
                                            />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </motion.div>
                </SectionReveal>
            ) : null}

            {/* 1. HERO - Fire & Flame */}
            <HeroSection />

            {/* 2. QUICK ACTIONS */}
            <SectionReveal direction="left" className="mx-auto max-w-6xl px-6 md:px-10 section-glow">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Quick Actions</p>
                <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">Experience Cafe Maza</h2>
                <GoldDivider className="max-w-md" />
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {CTA_ACTIONS.map((action, idx) => (
                        <motion.a
                            key={action.href}
                            href={action.href}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, amount: 0.2 }}
                            transition={{ duration: 0.45, delay: idx * 0.08 }}
                            whileHover={{ y: -8, scale: 1.015 }}
                            className="glass-card smart-card group rounded-2xl border border-[#CFAF63]/20 p-6 hover:shadow-[0_0_40px_rgba(255,106,0,0.35)]"
                        >
                            <div className="text-4xl mb-3">{action.icon}</div>
                            <h3 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">{action.title}</h3>
                            <p className="mt-2 text-sm text-[#F5F5F5]/70">{action.subtitle}</p>
                            <span className="mt-4 inline-block text-xs text-[#FF6A00] font-semibold">Explore →</span>
                        </motion.a>
                    ))}
                </div>
            </SectionReveal>

            {/* 3. SIGNATURE DISHES */}
            <SectionReveal direction="right" className="mx-auto max-w-6xl px-6 md:px-10 section-glow">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Chef Recommended</p>
                    <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">Signature Dishes</h2>
                    <p className="mt-3 text-[#F5F5F5]/70 max-w-lg">Crafted with passion. Perfected over years. Each dish tells our story.</p>
                    <GoldDivider className="max-w-sm" />
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {isDishesLoading
                        ? Array.from({ length: 6 }).map((_, idx) => (
                            <div key={idx} className="h-64 animate-pulse rounded-2xl border border-[#CFAF63]/15 bg-[#121212]" />
                        ))
                        : signatureDishes.map((dish) => (
                            <Link
                                key={dish.name}
                                href={`/menu?item=${encodeURIComponent(dish.name)}`}
                                aria-label={`View ${dish.name} in menu`}
                                className="block"
                            >
                                <DishCard dish={dish} />
                            </Link>
                        ))}
                </div>
            </SectionReveal>

            {/* 4. PRIVATE SCREENING  */}
            <SectionReveal className="mx-auto max-w-6xl px-6 md:px-10">
                <div className="relative overflow-hidden rounded-3xl border border-[#CFAF63]/30 bg-gradient-to-br from-[#0F0D08] via-[#141210] to-[#0B0B0B] p-8 md:p-12 shadow-[0_0_80px_rgba(207,175,99,0.10)]">
                    {/* Ambient glow blobs */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-[#CFAF63]/8 blur-[80px]" />
                        <div className="absolute bottom-0 right-1/4 h-48 w-48 rounded-full bg-[#FF6A00]/10 blur-[60px]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-[#3B82F6]/5 blur-[90px]" />
                    </div>

                    <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
                        {/* Left: copy + features + CTA */}
                        <div>
                            <motion.p
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5 }}
                                className="text-xs uppercase tracking-[0.22em] text-[#CFAF63]"
                            >
                                Exclusive Feature
                            </motion.p>
                            <motion.h2
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.55, delay: 0.06 }}
                                className="mt-2 font-[var(--font-heading)] text-4xl leading-tight text-[#F5F5F5] md:text-5xl"
                            >
                                Private Screening<br />
                                <span className="bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] bg-clip-text text-transparent">
                                    Experience
                                </span>
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.12 }}
                                className="mt-4 text-[#F5F5F5]/70 leading-relaxed max-w-lg"
                            >
                                Enjoy your favorite movies or sports matches on a private screen while dining with our live grill experience.
                            </motion.p>

                            {/* Feature pills */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: 0.18 }}
                                className="mt-6 grid grid-cols-2 gap-3"
                            >
                                {[
                                    { icon: "👥", label: "Private table for up to 4 guests" },
                                    { icon: "🖥️", label: "Large HD screen" },
                                    { icon: "🔥", label: "Live grill dining" },
                                    { icon: "🎂", label: "Perfect for birthdays & celebrations" },
                                ].map((f, idx) => (
                                    <motion.div
                                        key={f.label}
                                        initial={{ opacity: 0, x: -8 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: 0.22 + idx * 0.07 }}
                                        className="flex items-start gap-2 rounded-xl border border-[#CFAF63]/15 bg-[#111]/50 px-3 py-2.5"
                                    >
                                        <span className="text-base flex-shrink-0">{f.icon}</span>
                                        <span className="text-xs text-[#F5F5F5]/75 leading-snug">{f.label}</span>
                                    </motion.div>
                                ))}
                            </motion.div>

                            {/* Content type tags */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.45 }}
                                className="mt-5 flex flex-wrap gap-2"
                            >
                                {[
                                    { label: "🏏 Sports Match", color: "border-[#3B82F6]/30 text-[#6CA3EA]" },
                                    { label: "🎬 Movie", color: "border-[#8B5CF6]/30 text-[#A78BFA]" },
                                    { label: "📺 Custom Content", color: "border-[#FF6A00]/30 text-[#FF6A00]" },
                                ].map((tag) => (
                                    <span key={tag.label} className={`rounded-full border px-3 py-1 text-xs font-medium ${tag.color}`}>
                                        {tag.label}
                                    </span>
                                ))}
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.5 }}
                                className="mt-8"
                            >
                                <motion.button
                                    onClick={openScreeningModal}
                                    whileHover={{ scale: 1.04 }}
                                    whileTap={{ scale: 0.97 }}
                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-8 py-3.5 font-semibold text-[#111] shadow-[0_0_30px_rgba(207,175,99,0.25)] hover:shadow-[0_0_45px_rgba(207,175,99,0.45)] transition"
                                >
                                    🎬 Book Screening
                                </motion.button>
                            </motion.div>
                        </div>

                        {/* Right: stylised room illustration */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.92 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.65, delay: 0.15 }}
                            className="flex items-center justify-center"
                        >
                            <div className="relative w-full max-w-sm">
                                {/* Outer glow ring */}
                                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#CFAF63]/10 to-[#FF6A00]/8 blur-2xl" />
                                <div className="relative rounded-3xl border border-[#CFAF63]/20 bg-[#0A0A0A]/80 p-8 backdrop-blur-sm">
                                    {/* Screen */}
                                    <div className="relative mx-auto mb-3 h-20 w-full rounded-xl border border-[#CFAF63]/50 bg-gradient-to-b from-[#0D1117] to-[#0A0A0A] overflow-hidden flex items-center justify-center shadow-[0_0_40px_rgba(207,175,99,0.45),0_0_60px_rgba(255,106,0,0.25)] group">
                                        <motion.div
                                            className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#CFAF63]/25 via-[#FF6A00]/15 to-transparent"
                                            animate={{ opacity: [0.4, 0.8, 0.4] }}
                                            transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse" }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/15 via-[#8B5CF6]/10 to-transparent" />
                                        <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[#CFAF63]/70 to-transparent" />
                                        <motion.p
                                            animate={{ opacity: [0.6, 1, 0.6], textShadow: ["0_0_5px_rgba(207,175,99,0.3)", "0_0_15px_rgba(207,175,99,0.6)", "0_0_5px_rgba(207,175,99,0.3)"] }}
                                            transition={{ duration: 2.5, repeat: Infinity }}
                                            className="z-10 text-sm tracking-[0.14em] text-[#CFAF63] font-semibold"
                                        >
                                            📽 NOW SCREENING
                                        </motion.p>
                                        {/* Scan line with flicker */}
                                        <motion.div
                                            animate={{ y: [-40, 80], opacity: [0.3, 0.7, 0.3] }}
                                            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                                            className="absolute inset-x-0 h-5 bg-gradient-to-b from-transparent via-white/8 to-transparent pointer-events-none"
                                        />
                                    </div>

                                    {/* Projection trapezoid */}
                                    <div className="mx-auto mb-4 h-4 w-[60%] bg-gradient-to-b from-[#CFAF63]/18 to-transparent" style={{ clipPath: "polygon(15% 0%, 85% 0%, 100% 100%, 0% 100%)" }} />

                                    {/* Table */}
                                    <div className="relative mx-auto w-[80%] rounded-2xl border border-[#CFAF63]/35 bg-gradient-to-b from-[#1A1710] to-[#111]/80 px-4 py-5 shadow-[0_0_20px_rgba(207,175,99,0.08)]">
                                        {/* Top seats */}
                                        <div className="flex justify-around mb-2">
                                            {[0, 1].map((i) => (
                                                <div key={i} className="h-8 w-8 rounded-full border border-[#CFAF63]/40 bg-[#1A1A1A] flex items-center justify-center shadow-inner">
                                                    <div className="h-4 w-4 rounded-full bg-[#CFAF63]/30" />
                                                </div>
                                            ))}
                                        </div>
                                        {/* Table surface */}
                                        <div className="mx-auto my-2 h-12 w-full rounded-xl border border-[#CFAF63]/20 bg-[#0E0C07] flex items-center justify-around px-4">
                                            {["🍖", "🥤", "🍗"].map((e) => (
                                                <span key={e} className="text-sm">{e}</span>
                                            ))}
                                        </div>
                                        {/* Bottom seats */}
                                        <div className="flex justify-around mt-2">
                                            {[0, 1].map((i) => (
                                                <div key={i} className="h-8 w-8 rounded-full border border-[#CFAF63]/40 bg-[#1A1A1A] flex items-center justify-center shadow-inner">
                                                    <div className="h-4 w-4 rounded-full bg-[#CFAF63]/30" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Badge & Tagline */}
                                    <div className="mt-4 space-y-2 text-center">
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            whileInView={{ opacity: 1 }}
                                            transition={{ delay: 0.4 }}
                                            className="text-xs tracking-[0.12em] text-[#CFAF63]/70 font-medium"
                                        >
                                            ✦ Perfect for IPL, Movies & Celebrations ✦
                                        </motion.p>
                                        <span className="block rounded-full border border-[#CFAF63]/25 bg-[#111] px-4 py-1.5 text-[10px] uppercase tracking-[0.18em] text-[#CFAF63]/80">
                                            Private Room · HD Screen · Live Grill
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </SectionReveal>

            {showScreeningModal && <ScreeningBookingModal onClose={closeScreeningModal} />}

            {/* 5. LIVE GRILL EXPERIENCE */}
            <SectionReveal className="mx-auto max-w-6xl px-6 md:px-10">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Grill Experience</p>
                    <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">The Heart of Cafe Maza</h2>
                    <p className="mt-3 text-[#F5F5F5]/70 max-w-lg">Where tradition meets innovation. Every flame tells a story.</p>
                    <GoldDivider className="max-w-md" />
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {grillFeatures.map((feature) => (
                        <motion.article key={feature.title} whileHover={{ y: -6, scale: 1.01 }} className="glass-card smart-card rounded-2xl border border-[#CFAF63]/20 p-5 hover:shadow-[0_0_30px_rgba(255,106,0,0.2)]">
                            <h3 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">{feature.title}</h3>
                            <p className="mt-2 text-sm text-[#F5F5F5]/70">{feature.text}</p>
                        </motion.article>
                    ))}
                </div>
            </SectionReveal>

            <SectionReveal className="mx-auto max-w-6xl px-6 md:px-10 section-glow">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Guest Voices</p>
                <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">Testimonials</h2>
                <GoldDivider className="max-w-sm" />
                <div className="mt-8">
                    <TestimonialsCarousel />
                </div>
            </SectionReveal>

            {/* 7. OUR STORY */}
            <SectionReveal className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:px-10">
                <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Our Story</p>
                    <h2 className="mt-3 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">A Luxury Culinary Destination</h2>
                    <GoldDivider className="max-w-md" />
                    <p className="mt-4 leading-relaxed text-[#F5F5F5]/75">
                        Cafe Maza is a premium dining destination offering live grill experiences, authentic Indian cuisine and
                        signature biryanis. Every table is treated to cinematic ambiance, handcrafted spice blends, and warm family
                        hospitality that turns dinners into memories.
                    </p>
                    <div className="mt-6">
                        <LuxuryButton href="/contact" className="px-6 py-3">
                            Reserve Your Table
                        </LuxuryButton>
                    </div>
                </div>
                <div className="glass-card relative h-80 overflow-hidden rounded-3xl border border-[#CFAF63]/25">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(207,175,99,0.24),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(255,106,0,0.35),transparent_56%),#181818]" />
                    <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_60%)]" />
                    <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-[#CFAF63]/25 bg-black/40 p-5 backdrop-blur-md">
                        <p className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">🔥 Luxury Family Dining</p>
                        <p className="mt-2 text-sm text-[#F5F5F5]/70">Live counters, handcrafted service, and unforgettable evenings.</p>
                    </div>
                </div>
            </SectionReveal>

            {/* 8. MENU PREVIEW */}
            <SectionReveal className="mx-auto max-w-6xl px-6 md:px-10">
                <div className="mb-8">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Interactive Preview</p>
                    <h2 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">Top Picks Across Categories</h2>
                    <GoldDivider className="max-w-md" />
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {menuCategories.slice(0, 3).map((category) => (
                        <motion.article key={category.id} whileHover={{ y: -6 }} className="glass-card smart-card rounded-2xl border border-[#CFAF63]/20 p-5">
                            <h3 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">{category.label}</h3>
                            <ul className="mt-4 space-y-2 text-sm text-[#F5F5F5]/75">
                                {category.items.slice(0, 4).map((item) => (
                                    <li key={item.name} className="flex justify-between border-b border-[#CFAF63]/10 pb-2">
                                        <span>{item.name}</span>
                                        <span className="text-[#CFAF63]">₹{item.price}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.article>
                    ))}
                </div>
            </SectionReveal>
        </div>
    );
}
