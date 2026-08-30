"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DishCard } from "@/components/ui/DishCard";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { SectionReveal } from "@/components/ui/SectionReveal";
import { usePremiumUI } from "@/components/providers/PremiumUIProvider";
import { menuCategories, type Dish } from "@/data/mockData";
import { MenuCardSkeleton } from "@/components/ui/MenuCardSkeleton";
import { apiFetch } from "@/lib/api";

type BackendMenuItem = {
    _id: string;
    name: string;
    category?: string;
    categories?: string[];
    price?: number;
    variants?: { name: string; price: number }[];
    description?: string;
    image?: string;
    isVeg?: boolean;
    isPopular?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

type MenuCategoryView = {
    id: string;
    label: string;
    items: Dish[];
};

function toCategoryLabel(id: string) {
    if (id === "chinese") return "Chinese";
    if (id === "tandoori") return "Tandoori";
    if (id === "main-course") return "Main Course";
    if (id === "rice-noodles") return "Rice & Noodles";
    if (id === "breads") return "Indian Breads";
    if (id === "drinks") return "Mocktails & Beverages";
    return id
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function getCategoryFallbackImage(categoryId: string, name: string) {
    const value = `${categoryId} ${name}`.toLowerCase();
    if (value.includes("biryani")) return "/images/chicken-dum-biryani.jpg";
    if (value.includes("drink") || value.includes("mocktail") || value.includes("beverage") || value.includes("lassi")) return "/images/virgin-mojito.jpg";
    if (value.includes("tandoori") || value.includes("kebab") || value.includes("tikka")) return "/images/chicken-tikka.jpg";
    if (value.includes("bread") || value.includes("naan") || value.includes("roti")) return "/images/roti.jpg";
    if (value.includes("dessert") || value.includes("sweet")) return "/images/dessert.jpg";
    if (value.includes("chinese") || value.includes("noodles") || value.includes("fried")) return "/images/chilli-chicken.jpg";
    return "/images/soup.jpg";
}

function mapBackendToCategories(items: BackendMenuItem[]): MenuCategoryView[] {
    const grouped = new Map<string, Dish[]>();

    items.forEach((item) => {
        const sourceCategories = Array.isArray(item.categories) && item.categories.length > 0 ? item.categories : item.category ? [item.category] : ["uncategorized"];
        const rawImage = String(item.image || "").trim();
        const image = rawImage && !rawImage.includes("images.pexels.com")
            ? rawImage
            : getCategoryFallbackImage(sourceCategories[0] || "uncategorized", item.name);

        sourceCategories.forEach((sourceCategory) => {
            let cat = String(sourceCategory || "uncategorized").toLowerCase().trim();

            if (cat.includes("tandoori")) cat = "tandoori";
            else if (cat.includes("chinese")) cat = "chinese";
            else if (cat.includes("main course")) cat = "main-course";
            else if (cat.includes("soup") || cat.includes("shorba")) cat = "soups";
            else if (cat.includes("biryani")) cat = "biryani";
            else if (cat.includes("rice") || cat.includes("noodles")) cat = "rice-noodles";
            else if (cat.includes("bread") || cat.includes("roti") || cat.includes("naan") || cat.includes("kulcha")) cat = "breads";
            else if (cat.includes("sizzler")) cat = "sizzlers";
            else if (cat.includes("dessert") || cat.includes("sweet")) cat = "desserts";
            else if (cat.includes("drink") || cat.includes("mocktail") || cat.includes("lassi") || cat.includes("beverage")) cat = "drinks";

            const key = cat.replace(/\s+/g, "-");
            const current = grouped.get(key) ?? [];

            current.push({
                _id: item._id,
                name: item.name,
                price: item.price,
                variants: item.variants,
                image,
                isVeg: item.isVeg,
                isBestSeller: item.isBestSeller ?? item.isPopular,
                isSpecial: item.isSpecial,
                isSoldOut: item.isSoldOut,
                tags: item.tags,
            });
            grouped.set(key, current);
        });
    });

    const categoryOrder = [
        "recommended",
        "soups",
        "tandoori",
        "chinese",
        "main-course",
        "biryani",
        "rice-noodles",
        "breads",
        "sizzlers",
        "desserts",
        "drinks"
    ];

    const orderedCategories = categoryOrder
        .filter(id => grouped.has(id))
        .map(id => ({
            id,
            label: toCategoryLabel(id),
            items: grouped.get(id)!,
        }));

    const extraCategories = Array.from(grouped.entries())
        .filter(([id]) => !categoryOrder.includes(id))
        .map(([id, items]) => ({
            id,
            label: toCategoryLabel(id),
            items,
        }));

    return [...orderedCategories, ...extraCategories];
}

export function MenuClient() {
    const [categories, setCategories] = useState<MenuCategoryView[]>(menuCategories);
    const [active, setActive] = useState(menuCategories[0].id);
    const [searchQuery, setSearchQuery] = useState("");
    const [loadingGrid, setLoadingGrid] = useState(true);
    const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
    const { addToCart: addDishToCart, pushToast } = usePremiumUI();
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
        let cancelled = false;
        const fallbackTimer = window.setTimeout(() => {
            if (!cancelled) {
                setLoadingGrid(false);
            }
        }, 1200);

        async function loadMenu() {
            try {
                const items = await apiFetch<BackendMenuItem[]>("/api/menu", { cache: "no-store" });

                if (!items.length || cancelled) {
                    return;
                }

                const mapped = mapBackendToCategories(items);
                setCategories(mapped);
                setActive(mapped[0]?.id ?? "");
            } catch {
                // Keep local mock data as fallback
            } finally {
                if (!cancelled) {
                    setLoadingGrid(false);
                }
            }
        }

        loadMenu();

        return () => {
            cancelled = true;
            window.clearTimeout(fallbackTimer);
        };
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
        <>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-10">
                <SectionReveal className="mb-4 sm:mb-6 section-glow">
                    <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Food Menu • Khammam</p>
                    <h1 className="mt-1.5 font-(--font-heading) text-3xl leading-tight text-[#F5F5F5] sm:text-5xl md:text-6xl">
                        Chef Curated Selections in Khammam
                    </h1>
                    <GoldDivider className="max-w-md" />
                    <p className="mt-3 text-[#F5F5F5]/70 max-w-2xl leading-relaxed text-xs sm:text-sm md:text-base">
                        Explore biryani, starters, curries, mocktails, and family dining options in Khammam at CafeMaza.
                        Located at 66RG+852, V.Venkatayapalem, each dish is handcrafted with premium spices and served fresh.
                    </p>
                </SectionReveal>
            </div>

            {/* STICKY SEARCH & CATEGORY BAR */}
            <div className="sticky top-[60px] sm:top-[68px] z-40 w-full bg-[#0B0B0B]/95 backdrop-blur-xl border-b border-[#CFAF63]/20 shadow-lg">
                <div className="px-4 py-2.5 sm:py-3 max-w-7xl mx-auto space-y-2">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search dishes (e.g. Biryani, Tikka)..."
                            className="w-full h-10 sm:h-11 rounded-xl bg-zinc-900/90 border border-[#CFAF63]/30 pl-9 sm:pl-10 pr-4 text-xs sm:text-sm text-white focus:border-[#FF6A00] outline-none transition-all"
                        />
                    </div>

                    {/* Horizontal Category Pills */}
                    <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none pt-1 pb-1">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm font-medium flex-shrink-0 border transition-all active:scale-95 cursor-pointer ${active === category.id
                                    ? "bg-gradient-to-r from-[#FF6A00] to-[#CFAF63] border-transparent text-white font-bold shadow-md shadow-orange-500/20"
                                    : "bg-zinc-900/80 border-zinc-700/80 text-zinc-300 hover:border-[#CFAF63]/50"
                                    }`}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-20 md:px-10">
                <div className="pt-4 md:pt-6" aria-hidden="true" />

                {loadingGrid ? (
                    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, idx) => (
                            <MenuCardSkeleton key={idx} />
                        ))}
                    </div>
                ) : filteredCategories.length ? (
                    <div className="space-y-10 sm:space-y-14">
                        {filteredCategories.map((category) => (
                            <section
                                key={category.id}
                                id={`category-${category.id}`}
                                ref={(element) => {
                                    sectionRefs.current[category.id] = element;
                                }}
                                className="scroll-mt-48 sm:scroll-mt-40"
                            >
                                <div className="mb-4 sm:mb-6 flex items-center justify-between border-b border-[#D4AF37]/25 pb-3">
                                    <h2 className="font-(--font-heading) text-2xl sm:text-3xl md:text-4xl text-[#F5F5F5]">{category.label}</h2>
                                    <span className="text-xs sm:text-sm font-medium text-[#CFAF63]/80 tracking-[0.1em]">{category.items.length} Items</span>
                                </div>

                                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {category.items.map((dish, index) => {
                                        const prioritizeImage = !searchQuery.trim() && filteredCategories[0]?.id === category.id && index < 4;

                                        return (
                                            <div key={dish._id ? `${dish._id}-${index}` : `${category.id}-${dish.name}-${index}`}>
                                                <DishCard dish={dish} onAdd={addToCart} priority={prioritizeImage} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#111111]/75 p-6 sm:p-7 text-center text-xs sm:text-sm text-[#F5F5F5]/72">
                        No dishes found for "{searchQuery}".
                    </div>
                )}
            </div>
        </>
    );
}
