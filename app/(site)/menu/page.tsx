"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { DishCard } from "@/components/ui/DishCard";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { usePremiumUI } from "@/components/providers/PremiumUIProvider";
import { menuCategories, type Dish } from "@/data/mockData";
import { MenuCardSkeleton } from "@/components/ui/MenuCardSkeleton";
import { staggerChildren } from "@/lib/motionPresets";
import { apiFetch } from "@/lib/api";

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

type MenuCategoryView = {
    id: string;
    label: string;
    items: Dish[];
};

function toCategoryLabel(id: string) {
    return id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function mapBackendToCategories(items: BackendMenuItem[]): MenuCategoryView[] {
    const grouped = new Map<string, Dish[]>();

    items.forEach((item) => {
        const key = (item.category || "uncategorized").toLowerCase().trim().replace(/\s+/g, "-");
        const current = grouped.get(key) ?? [];
        current.push({
            _id: item._id,
            name: item.name,
            price: item.price,
            image: item.image || "/images/soup.jpg",
            isVeg: item.isVeg,
            isBestSeller: item.isBestSeller ?? item.isPopular,
            isSoldOut: item.isSoldOut,
            tags: item.tags,
        });
        grouped.set(key, current);
    });

    return Array.from(grouped.entries()).map(([id, categoryItems]) => ({
        id,
        label: toCategoryLabel(id),
        items: categoryItems,
    }));
}

export default function MenuPage() {
    const [categories, setCategories] = useState<MenuCategoryView[]>(menuCategories);
    const [active, setActive] = useState(menuCategories[0].id);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingGrid, setLoadingGrid] = useState(true);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const { addToCart: addDishToCart, cartCount, cartTotal, openCart, pushToast } = usePremiumUI();
    const deferredSearchQuery = useDeferredValue(searchQuery);

    const filteredCategories = useMemo(() => {
        const query = deferredSearchQuery.trim().toLowerCase();
        if (!query) return categories;

        return categories
            .map((category) => ({
                ...category,
                items: category.items.filter((item) => item.name.toLowerCase().includes(query)),
            }))
            .filter((category) => category.items.length > 0);
    }, [categories, deferredSearchQuery]);

    useEffect(() => {
        async function loadMenu() {
            try {
                const items = await apiFetch<BackendMenuItem[]>("/api/menu");

                if (!items.length) {
                    return;
                }

                const mapped = mapBackendToCategories(items);
                setCategories(mapped);
                setActive(mapped[0]?.id ?? "");
            } catch {
                // Keep local mock data as fallback when backend is unavailable.
            }
        }

        loadMenu();
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => setLoadingGrid(false), 650);
        return () => window.clearTimeout(timer);
    }, []);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries.find((entry) => entry.isIntersecting);
                if (!visible) return;
                setActive(visible.target.id.replace("category-", ""));
            },
            { rootMargin: "-35% 0px -50% 0px", threshold: 0.1 }
        );

        Object.entries(sectionRefs.current).forEach(([id, element]) => {
            if (element && filteredCategories.some((category) => category.id === id)) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [filteredCategories]);

    const addToCart = (dish: Dish) => {
        if (dish.isSoldOut) {
            pushToast(`${dish.name} is sold out right now`);
            return;
        }

        addDishToCart(dish);
    };

    const scrollToCategory = (id: string) => {
        setActive(id);
        sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <div className="mx-auto max-w-7xl px-6 pb-20 md:px-10">
            <SectionReveal className="mb-6 section-glow">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Interactive Menu</p>
                <h1 className="mt-2 font-(--font-heading) text-6xl text-[#F5F5F5] leading-tight">Chef Curated<br />Selections</h1>
                <GoldDivider className="max-w-md" />
                <p className="mt-4 text-[#F5F5F5]/70 max-w-lg leading-relaxed">
                    Discover our carefully curated menu featuring authentic Indian flavors, premium grilled specialties,
                    and signature biryanis. Each dish is crafted with passion and perfected over years of culinary excellence.
                </p>
            </SectionReveal>

            <div className="fixed left-1/2 top-20 z-30 w-[calc(100%-3rem)] max-w-304 -translate-x-1/2 rounded-2xl border border-[#D4AF37]/18 bg-[#101010]/70 p-3 backdrop-blur-xl md:top-22">
                <div className="relative mb-3">
                    <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]/75" />
                    <input
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search dishes"
                        className="w-full rounded-xl border border-[#D4AF37]/20 bg-[#0E0E0E]/85 py-2.5 pl-9 pr-3 text-sm text-[#F5F5F5] outline-none transition focus:border-[#D4AF37]"
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {categories.map((category) => (
                        <button
                            key={category.id}
                            onClick={() => scrollToCategory(category.id)}
                            className={`shrink-0 rounded-full border px-4 py-2 text-xs transition ${active === category.id
                                ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#F5F5F5]"
                                : "border-[#D4AF37]/25 bg-[#151515]/85 text-[#F5F5F5]/75 hover:border-[#D4AF37]/55 hover:text-[#D4AF37]"
                                }`}
                        >
                            {category.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mb-4 h-29.5 md:mb-8 md:h-31.5" aria-hidden="true" />

            {loadingGrid ? (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                        <MenuCardSkeleton key={idx} />
                    ))}
                </div>
            ) : filteredCategories.length ? (
                <div className="space-y-8 md:space-y-12">
                    {filteredCategories.map((category) => (
                        <section
                            key={category.id}
                            id={`category-${category.id}`}
                            ref={(element) => {
                                sectionRefs.current[category.id] = element;
                            }}
                            className="scroll-mt-52 md:scroll-mt-36"
                            style={{ contentVisibility: "auto", containIntrinsicSize: "900px" }}
                        >
                            <div className="mb-4 border-b border-[#D4AF37]/18 pb-2 md:mb-5 md:pb-3">
                                <h2 className="font-(--font-heading) text-3xl text-[#F5F5F5] md:text-4xl">{category.label}</h2>
                            </div>

                            <motion.div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3" variants={staggerChildren} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}>
                                {category.items.map((dish, index) => {
                                    const prioritizeImage = !searchQuery.trim() && filteredCategories[0]?.id === category.id && index < 3;

                                    return (
                                        <motion.div key={`${category.id}-${dish.name}`} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}>
                                            <DishCard dish={dish} onAdd={addToCart} priority={prioritizeImage} />
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </section>
                    ))}
                </div>
            ) : (
                <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111]/75 p-7 text-center text-[#F5F5F5]/72">
                    No dishes found for "{searchQuery}".
                </div>
            )}

            {cartCount > 0 ? (
                <div className="fixed bottom-20 left-1/2 z-40 w-[min(94%,680px)] -translate-x-1/2 rounded-2xl border border-[#CFAF63]/35 bg-[#101010]/95 px-4 py-3 backdrop-blur-xl lg:bottom-5">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.12em] text-[#999]">Cart Ready</p>
                            <p className="text-sm text-[#F5F5F5]">{cartCount} items • ₹{cartTotal}</p>
                        </div>
                        <button onClick={openCart} className="luxury-button px-5 py-2 text-xs md:text-sm">Open Cart</button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
