"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ShoppingBag, Plus, Minus, Trash2, X } from "lucide-react";
import { DishCard } from "@/components/ui/DishCard";
import { menuCategories, type Dish } from "@/data/mockData";

type CartItem = Dish & { qty: number };

export default function OrderOnlinePage() {
    const router = useRouter();
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [lastAdded, setLastAdded] = useState<string | null>(null);

    const allDishes = menuCategories.flatMap((category) => category.items).slice(0, 18);
    const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

    const addToCart = (dish: Dish) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.name === dish.name);
            if (existing) return prev.map((item) => (item.name === dish.name ? { ...item, qty: item.qty + 1 } : item));
            return [...prev, { ...dish, qty: 1 }];
        });
        setLastAdded(dish.name);
        setCartOpen(true);
        setTimeout(() => setLastAdded(null), 900);
    };

    const increaseQty = (name: string) => {
        setCart((prev) => prev.map((item) => (item.name === name ? { ...item, qty: item.qty + 1 } : item)));
    };

    const decreaseQty = (name: string) => {
        setCart((prev) =>
            prev
                .map((item) => (item.name === name ? { ...item, qty: item.qty - 1 } : item))
                .filter((item) => item.qty > 0)
        );
    };

    const removeItem = (name: string) => {
        setCart((prev) => prev.filter((item) => item.name !== name));
    };

    const goToCheckout = () => {
        localStorage.setItem("cafeMazaCart", JSON.stringify(cart));
        router.push("/checkout");
    };

    return (
        <div className="relative mx-auto max-w-7xl px-6 pb-20 md:px-10">
            <div className="mb-10">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Order Online</p>
                <h1 className="mt-2 font-[var(--font-heading)] text-6xl text-[#F5F5F5] leading-tight">Luxury Delivery<br />Experience</h1>
                <div className="mt-3 h-[2px] w-24 bg-gradient-to-r from-[#CFAF63] to-transparent" />
                <p className="mt-4 text-[#F5F5F5]/70 max-w-lg leading-relaxed">
                    Enjoy authentic Cafe Maza cuisine from the comfort of your home with premium packaging and
                    professional delivery service. Same taste, same luxury, delivered fresh.
                </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {allDishes.map((dish) => (
                    <DishCard key={dish.name} dish={dish} onAdd={addToCart} />
                ))}
            </div>

            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCartOpen(true)}
                className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/35 bg-[#111]/90 px-5 py-3 text-sm font-semibold text-[#F5F5F5] shadow-[0_0_30px_rgba(255,106,0,0.3)] backdrop-blur-xl"
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
                        className="fixed right-0 top-0 z-50 h-full w-full max-w-md border-l border-[#CFAF63]/25 bg-[#0C0C0C]/96 p-6 shadow-[0_0_70px_rgba(0,0,0,0.75)] backdrop-blur-xl"
                    >
                        <div className="flex items-center justify-between">
                            <h2 className="font-[var(--font-heading)] text-3xl text-[#F5F5F5]">Your Cart</h2>
                            <button onClick={() => setCartOpen(false)} className="rounded-full border border-[#CFAF63]/25 p-2 text-[#F5F5F5]/70 hover:text-[#F5F5F5]">
                                <X size={16} />
                            </button>
                        </div>
                        {lastAdded ? <p className="mt-2 text-xs text-[#00D98E]">Added: {lastAdded}</p> : null}

                        <ul className="mt-6 max-h-[60vh] space-y-3 overflow-auto pr-1 text-sm text-[#F5F5F5]/80">
                            {cart.length ? (
                                cart.map((item) => (
                                    <li key={item.name} className="rounded-xl border border-[#CFAF63]/15 bg-[#141414] p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm text-[#F5F5F5]">{item.name}</p>
                                                <p className="text-xs text-[#999]">₹{item.price} each</p>
                                            </div>
                                            <button onClick={() => removeItem(item.name)} className="text-[#FF6A00] hover:text-[#FF8A3D]">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="mt-3 flex items-center justify-between">
                                            <div className="inline-flex items-center rounded-full border border-[#CFAF63]/25">
                                                <button onClick={() => decreaseQty(item.name)} className="px-3 py-1 text-[#F5F5F5]/75 hover:text-[#F5F5F5]"><Minus size={13} /></button>
                                                <span className="min-w-8 text-center text-xs text-[#CFAF63]">{item.qty}</span>
                                                <button onClick={() => increaseQty(item.name)} className="px-3 py-1 text-[#F5F5F5]/75 hover:text-[#F5F5F5]"><Plus size={13} /></button>
                                            </div>
                                            <span className="text-sm text-[#CFAF63]">₹{item.price * item.qty}</span>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="rounded-xl border border-[#CFAF63]/15 bg-[#131313] p-4 text-[#F5F5F5]/60">No items added yet.</li>
                            )}
                        </ul>

                        <div className="mt-6 border-t border-[#CFAF63]/15 pt-4">
                            <div className="mb-4 flex items-center justify-between text-sm">
                                <span className="text-[#F5F5F5]/75">Total</span>
                                <span className="text-xl text-[#CFAF63]">₹{total}</span>
                            </div>
                            <button
                                disabled={!cart.length}
                                onClick={goToCheckout}
                                className="w-full rounded-full bg-gradient-to-r from-[#CFAF63] via-[#FFD78B] to-[#FF6A00] px-4 py-3 text-sm font-semibold text-[#111] disabled:opacity-50"
                            >
                                Proceed to Checkout
                            </button>
                        </div>
                    </motion.aside>
                </>
            )}
        </div>
    );
}
