"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Minus, Trash2, X, MapPin } from "lucide-react";
import { DishCard } from "@/components/ui/DishCard";
import { menuCategories, type Dish } from "@/data/mockData";
import { apiFetch } from "@/lib/api";

type CartItem = Dish & { qty: number; key: string; selectedVariant?: { name: string; price: number } };

export function OrderOnlineClient() {
    const router = useRouter();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [lastAdded, setLastAdded] = useState<string | null>(null);
    const [dishes, setDishes] = useState<Dish[]>(() => menuCategories.flatMap((category) => category.items).slice(0, 24));

    useEffect(() => {
        let active = true;
        async function fetchDishes() {
            try {
                const items = await apiFetch<Array<{
                    _id: string;
                    name: string;
                    price?: number;
                    variants?: { name: string; price: number }[];
                    image?: string;
                    isVeg?: boolean;
                    isBestSeller?: boolean;
                    isPopular?: boolean;
                    isSoldOut?: boolean;
                    tags?: string[];
                }>>("/api/menu", { cache: "no-store" });

                if (Array.isArray(items) && items.length > 0 && active) {
                    setDishes(items.map((item) => ({
                        _id: item._id,
                        name: item.name,
                        price: item.price,
                        variants: item.variants,
                        image: item.image || "/images/soup.jpg",
                        isVeg: item.isVeg,
                        isBestSeller: item.isBestSeller ?? item.isPopular,
                        isSoldOut: item.isSoldOut,
                        tags: item.tags,
                    })));
                }
            } catch {
                // Keep fallback dishes
            }
        }
        fetchDishes();
        return () => { active = false; };
    }, []);

    const allDishes = dishes;
    const total = useMemo(() => cart.reduce((sum, item) => sum + ((item.selectedVariant?.price ?? item.price ?? 0) * item.qty), 0), [cart]);

    const addToCart = (dish: Dish & { selectedVariant?: { name: string; price: number } }) => {
        setCart((prev) => {
            const key = `${dish._id ?? dish.name}::${dish.selectedVariant?.name ?? ""}`;
            const existing = prev.find((item) => item.key === key);
            if (existing) return prev.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item));
            return [...prev, { ...dish, qty: 1, key, selectedVariant: dish.selectedVariant }];
        });
        setLastAdded(dish.name);
        setCartOpen(true);
        setTimeout(() => setLastAdded(null), 900);
    };

    const increaseQty = (key: string) => {
        setCart((prev) => prev.map((item) => (item.key === key ? { ...item, qty: item.qty + 1 } : item)));
    };

    const decreaseQty = (key: string) => {
        setCart((prev) =>
            prev
                .map((item) => (item.key === key ? { ...item, qty: item.qty - 1 } : item))
                .filter((item) => item.qty > 0)
        );
    };

    const removeItem = (key: string) => {
        setCart((prev) => prev.filter((item) => item.key !== key));
    };

    const goToCheckout = () => {
        localStorage.setItem("cafeMazaCart", JSON.stringify(cart));
        router.push("/checkout");
    };

    return (
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pb-24 md:px-10">
            <div className="mb-8 sm:mb-10">
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Online Food Ordering • Khammam</p>
                <h1 className="mt-1.5 font-[var(--font-heading)] text-3xl sm:text-4xl md:text-6xl text-[#F5F5F5] leading-tight">
                    Order Food Online in Khammam
                </h1>
                <div className="mt-3 h-[2px] w-24 bg-gradient-to-r from-[#CFAF63] to-transparent" />
                <p className="mt-3 sm:mt-4 text-[#F5F5F5]/70 max-w-2xl text-xs sm:text-sm md:text-base leading-relaxed">
                    Order fresh biryani, starters, tandoori platters, and curries online from CafeMaza with doorstep food delivery across V.Venkatayapalem, Raghunadhpalem, and Khammam.
                    Packed with tamper-evident premium insulation to retain smoky flavor and heat.
                </p>
                <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs font-mono text-[#CFAF63]">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> Fast Delivery Zone: Khammam, V.Venkatayapalem (Telangana 507318)
                </div>
            </div>

            <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {allDishes.map((dish, idx) => (
                    <DishCard key={dish._id ? `${dish._id}-${idx}` : `${dish.name}-${idx}`} dish={dish} onAdd={addToCart} />
                ))}
            </div>

            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCartOpen(true)}
                className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/35 bg-[#111]/95 px-4 py-2.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-semibold text-[#F5F5F5] shadow-[0_0_30px_rgba(255,106,0,0.35)] backdrop-blur-xl cursor-pointer min-h-[44px]"
            >
                <ShoppingBag size={16} className="text-[#CFAF63]" />
                Cart ({cart.reduce((sum, item) => sum + item.qty, 0)})
            </motion.button>

            {cartOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCartOpen(false)}
                        className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
                    />
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        className="fixed right-0 top-0 z-50 flex h-full max-h-[100dvh] w-full max-w-md flex-col border-l border-[#CFAF63]/25 bg-[#0C0C0C]/98 p-4 sm:p-6 shadow-[0_0_70px_rgba(0,0,0,0.75)] backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between border-b border-[#CFAF63]/15 pb-3">
                            <h2 className="font-[var(--font-heading)] text-2xl sm:text-3xl text-[#F5F5F5]">Your Cart</h2>
                            <button
                                onClick={() => setCartOpen(false)}
                                aria-label="Close Cart"
                                className="touch-target inline-flex items-center justify-center rounded-full border border-[#CFAF63]/25 p-2 text-[#F5F5F5]/70 hover:text-[#F5F5F5]"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        {lastAdded ? <p className="mt-2 text-xs text-[#00D98E]">Added: {lastAdded}</p> : null}

                        <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 text-sm text-[#F5F5F5]/80 custom-scrollbar">
                            {cart.length ? (
                                cart.map((item) => (
                                    <li key={item.key ?? item.name} className="rounded-xl border border-[#CFAF63]/15 bg-[#141414] p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1 pr-2">
                                                <p className="line-clamp-1 text-sm font-medium text-[#F5F5F5]">{item.name}</p>
                                                <p className="text-xs text-[#999]">₹{item.selectedVariant?.price ?? item.price} each</p>
                                                {item.selectedVariant ? <p className="text-xs text-[#CFAF63]">{item.selectedVariant.name}</p> : null}
                                            </div>
                                            <button
                                                onClick={() => removeItem(item.key)}
                                                aria-label="Remove item"
                                                className="touch-target p-1 text-[#FF6A00] hover:text-[#FF8A3D] shrink-0"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between border-t border-zinc-800/80 pt-2">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => decreaseQty(item.key)}
                                                    aria-label="Decrease quantity"
                                                    className="touch-target rounded-full border border-zinc-700 p-1 hover:border-[#CFAF63]"
                                                >
                                                    <Minus size={13} />
                                                </button>
                                                <span className="min-w-6 text-center text-xs font-semibold text-[#F5F5F5]">{item.qty}</span>
                                                <button
                                                    onClick={() => increaseQty(item.key)}
                                                    aria-label="Increase quantity"
                                                    className="touch-target rounded-full border border-zinc-700 p-1 hover:border-[#CFAF63]"
                                                >
                                                    <Plus size={13} />
                                                </button>
                                            </div>
                                            <span className="text-xs font-bold text-[#CFAF63]">
                                                ₹{(item.selectedVariant?.price ?? item.price ?? 0) * item.qty}
                                            </span>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <p className="mt-8 text-center text-xs sm:text-sm text-[#F5F5F5]/60">Your cart is empty.</p>
                            )}
                        </ul>

                        <div className="mt-auto border-t border-[#CFAF63]/15 pt-4 pb-2">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm font-medium text-[#F5F5F5]/75">Subtotal</span>
                                <span className="font-[var(--font-heading)] text-2xl font-bold text-[#CFAF63]">₹{total}</span>
                            </div>
                            <button
                                onClick={goToCheckout}
                                disabled={!cart.length}
                                className="luxury-button w-full min-h-[44px] px-4 py-3 text-center text-xs sm:text-sm font-bold active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Checkout ({cart.reduce((sum, item) => sum + item.qty, 0)} Items)
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </div>
    );
}
