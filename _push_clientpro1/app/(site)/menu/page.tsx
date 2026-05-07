"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { DishCard } from "@/components/ui/DishCard";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { usePremiumUI } from "@/components/providers/PremiumUIProvider";
import { menuCategories, type Dish } from "@/data/mockData";
import { MenuCardSkeleton } from "@/components/ui/MenuCardSkeleton";
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

const CATEGORY_ORDER = [
    "Biryanis (Veg & Non-Veg)",
    "Veg Soups",
    "Non Veg Soups",
    "Chinese Starters (Veg & Non-Veg)",
    "Tandoori Starters (Veg & Non-Veg)",
    "Main Course (Veg & Non-Veg)",
    "Indian Breads",
    "Hakka Noodles & Fried Rice",
    "Desserts & Sweets",
    "Mocktails",
    "Cafe Maza Specials",
    "Cafe Maza Sizzlers",
];

const CATEGORY_ORDER_INDEX = new Map(
    CATEGORY_ORDER.map((category, index) => [normalizeCategory(category), index])
);

function normalizeCategory(value: string) {
    return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

function toCategoryId(value: string) {
    return normalizeCategory(value).replace(/\s+/g, "-") || "uncategorized";
}

function sortCategories(categories: MenuCategoryView[]) {
    return [...categories].sort((first, second) => {
        const firstIndex = CATEGORY_ORDER_INDEX.get(normalizeCategory(first.label)) ?? Number.MAX_SAFE_INTEGER;
        const secondIndex = CATEGORY_ORDER_INDEX.get(normalizeCategory(second.label)) ?? Number.MAX_SAFE_INTEGER;

        if (firstIndex !== secondIndex) {
            return firstIndex - secondIndex;
        }

        return first.label.localeCompare(second.label);
    });
}

function mapBackendToCategories(items: BackendMenuItem[]): MenuCategoryView[] {
    const grouped = new Map<string, MenuCategoryView>();

    items.forEach((item) => {
        const label = item.category?.trim() || "Uncategorized";
        const id = toCategoryId(label);
        const category = grouped.get(id) ?? { id, label, items: [] };

        category.items.push({
            _id: item._id,
            name: item.name,
            price: item.price,
            image: item.image || "/images/soup.jpg",
            isVeg: item.isVeg,
            isBestSeller: item.isBestSeller ?? item.isPopular,
            isSoldOut: item.isSoldOut,
            tags: item.tags,
        });
        grouped.set(id, category);
    });

    return sortCategories(Array.from(grouped.values()));
}

const fallbackCategories = sortCategories(menuCategories);

export default function MenuPage() {
    const [categories, setCategories] = useState<MenuCategoryView[]>(fallbackCategories);
    const [active, setActive] = useState(fallbackCategories[0]?.id ?? "");
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
        let cancelled = false;

        async function loadMenu() {
            try {
                const items = await apiFetch<BackendMenuItem[]>("/api/menu");

                if (!items.length || cancelled) {
                    return;
                }

                const mapped = mapBackendToCategories(items);
                setCategories(mapped);
                setActive(mapped[0]?.id ?? "");
            } catch {
                // Keep local mock data as fallback when backend is unavailable.
            } finally {
                if (!cancelled) {
                    setLoadingGrid(false);
                }
            }
        }

        loadMenu();

        return () => {
            cancelled = true;
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
            <div className="mx-auto max-w-7xl px-4 md:px-10">
                <section className="mb-6 section-glow">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Interactive Menu</p>
                    <h1 className="mt-2 font-(--font-heading) text-4xl leading-tight text-[#F5F5F5] sm:text-5xl md:text-6xl">Chef Curated<br />Selections</h1>
                    <GoldDivider className="max-w-md" />
                    <p className="mt-4 text-[#F5F5F5]/70 max-w-lg leading-relaxed">
                        Discover our carefully curated menu featuring authentic Indian flavors, premium grilled specialties,
                        and signature biryanis. Each dish is crafted with passion and perfected over years of culinary excellence.
                    </p>
                </section>
            </div>

            {/* STICKY SEARCH & CATEGORY BAR */}
            <div className="sticky top-0 z-50 w-full bg-black/90 backdrop-blur-xl border-b border-orange-500/20 shadow-lg">
                <div className="px-3 py-3 max-w-7xl mx-auto">
                    {/* Search Input */}
                    <div className="relative">
                        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                        <input
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Search dishes..."
                            className="w-full h-11 rounded-xl bg-zinc-900 border border-zinc-700 pl-10 pr-4 text-sm text-white focus:border-orange-500 outline-none transition-all"
                        />
                    </div>

                    {/* Horizontal Category Pills */}
                    <div className="flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide pt-3 pb-1">
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => scrollToCategory(category.id)}
                                className={`px-4 py-2 rounded-full text-sm flex-shrink-0 border transition-all active:scale-95 ${active === category.id
                                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                        : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                                    }`}
                            >
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pb-24 md:px-10">
                {/* SPACER FOR STICKY HEADER */}
                <div className="pt-4 md:pt-6" aria-hidden="true" />

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
                            >
                                <div className="mb-4 border-b border-[#D4AF37]/18 pb-2 md:mb-5 md:pb-3">
                                    <h2 className="font-(--font-heading) text-3xl text-[#F5F5F5] md:text-4xl">{category.label}</h2>
                                </div>

                                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                    {category.items.map((dish, index) => {
                                        const prioritizeImage = !searchQuery.trim() && filteredCategories[0]?.id === category.id && index < 3;

                                        return (
                                            <div key={`${category.id}-${dish.name}`}>
                                                <DishCard dish={dish} onAdd={addToCart} priority={prioritizeImage} />
                                            </div>
                                        );
                                    })}
                                </div>
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
        </>
    );
}
