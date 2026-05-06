"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, Sparkles, X } from "lucide-react";
import type { Dish } from "@/data/mockData";

export type CartItem = Dish & { qty: number };

type CartDrawerProps = {
    open: boolean;
    items: CartItem[];
    onClose: () => void;
    onIncrease: (name: string) => void;
    onDecrease: (name: string) => void;
};

export function CartDrawer({ open, items, onClose, onIncrease, onDecrease }: CartDrawerProps) {
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0);

    return (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.button
                        aria-label="Close cart overlay"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[2px]"
                    />
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed right-0 top-0 z-[130] h-full w-full max-w-md border-l border-[#D4AF37]/30 bg-[#0B0B0B]/72 p-5 shadow-[0_0_70px_rgba(0,0,0,0.75)] backdrop-blur-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-[#CFAF63]/15 pb-3">
                            <h2 className="flex items-center gap-2 font-[var(--font-heading)] text-3xl text-[#F5F5F5]">
                                <ShoppingBag size={22} className="text-[#CFAF63]" />
                                Cart
                            </h2>
                            <button onClick={onClose} className="rounded-full border border-[#CFAF63]/25 p-2 text-[#F5F5F5]/75 hover:text-[#F5F5F5]">
                                <X size={16} />
                            </button>
                        </div>

                        <ul className="mt-4 max-h-[62vh] space-y-3 overflow-auto pr-1 text-sm">
                            {items.length ? (
                                items.map((item) => (
                                    <li key={item.name} className="rounded-xl border border-[#CFAF63]/15 bg-[#141414] p-3 text-[#F5F5F5]/85">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="line-clamp-1 text-sm text-[#F5F5F5]">{item.name}</p>
                                            <p className="text-[#CFAF63]">Rs {item.price * item.qty}</p>
                                        </div>
                                        <div className="mt-3 inline-flex items-center rounded-full border border-[#CFAF63]/25">
                                            <button onClick={() => onDecrease(item.name)} className="px-3 py-1 text-[#F5F5F5]/75 hover:text-[#F5F5F5]">
                                                <Minus size={13} />
                                            </button>
                                            <span className="min-w-8 text-center text-xs text-[#CFAF63]">{item.qty}</span>
                                            <button onClick={() => onIncrease(item.name)} className="px-3 py-1 text-[#F5F5F5]/75 hover:text-[#F5F5F5]">
                                                <Plus size={13} />
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li className="rounded-2xl border border-[#D4AF37]/20 bg-[#131313]/75 p-6 text-center text-[#F5F5F5]/65">
                                    <Sparkles size={20} className="mx-auto mb-3 text-[#D4AF37]" />
                                    <p className="font-(--font-heading) text-xl text-[#F5F5F5]">Your table awaits...</p>
                                    <p className="mt-2 text-sm text-[#F5F5F5]/65">add something delicious</p>
                                </li>
                            )}
                        </ul>

                        <div className="mt-5 border-t border-[#CFAF63]/15 pt-4">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm text-[#F5F5F5]/75">Total</span>
                                <span className="font-[var(--font-heading)] text-2xl text-[#CFAF63]">Rs {total}</span>
                            </div>
                            <Link
                                href="/checkout"
                                onClick={onClose}
                                className="luxury-button w-full px-4 py-3 text-center text-sm"
                            >
                                Checkout
                            </Link>
                        </div>
                    </motion.aside>
                </>
            ) : null}
        </AnimatePresence>
    );
}
