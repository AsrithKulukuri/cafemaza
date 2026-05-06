"use client";

import { motion } from "framer-motion";
import { CalendarRange, ShoppingBag } from "lucide-react";

type FloatingActionButtonsProps = {
    cartCount: number;
    onCart: () => void;
    onBook: () => void;
};

export function FloatingActionButtons({ cartCount, onCart, onBook }: FloatingActionButtonsProps) {
    return (
        <div className="fixed bottom-24 right-4 z-[125] flex flex-col gap-3 lg:hidden">
            <motion.button
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                onClick={onBook}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#111111]/88 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] backdrop-blur-xl"
            >
                <CalendarRange size={18} />
            </motion.button>
            <motion.button
                whileHover={{ y: -2, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                onClick={onCart}
                className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/35 bg-[#111111]/88 text-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.25)] backdrop-blur-xl"
            >
                <ShoppingBag size={18} />
                {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF6A00] px-1 text-[10px] font-semibold text-white">
                        {cartCount}
                    </span>
                ) : null}
            </motion.button>
        </div>
    );
}
