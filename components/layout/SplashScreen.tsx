"use client";

import { motion } from "framer-motion";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SmokeParticles } from "@/components/ui/SmokeParticles";

type SplashScreenProps = {
    onDone: () => void;
};

export function SplashScreen({ onDone }: SplashScreenProps) {
    return (
        <motion.div
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.6, delay: 2.4 }}
            onAnimationComplete={onDone}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#141414]"
        >
            <SmokeParticles />
            <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-6 text-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.84 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.7 }}
                    className="relative"
                >
                    <BrandLogo className="h-24 w-24 text-6xl" />
                    <motion.span
                        initial={{ x: "-140%", opacity: 0 }}
                        animate={{ x: "140%", opacity: [0, 1, 0] }}
                        transition={{ duration: 1.1, delay: 0.8 }}
                        className="absolute inset-y-0 w-8 -skew-x-12 bg-gradient-to-r from-transparent via-[#FFD78B]/70 to-transparent blur-sm"
                    />
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.6 }}
                    className="mt-6 font-[var(--font-heading)] text-4xl tracking-[0.25em] text-[#F5F5F5]"
                >
                    CAFE MAZA
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                    className="mt-2 text-sm tracking-[0.2em] text-[#CFAF63]"
                >
                    Live Grill Dining Experience
                </motion.p>

                <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0B0B]">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 2.2, delay: 0.4, ease: "easeInOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-[#CFAF63] via-[#FFD78B] to-[#FF6A00]"
                    />
                </div>
            </div>
        </motion.div>
    );
}
