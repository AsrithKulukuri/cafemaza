"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { GrillScene } from "@/components/hero/GrillScene";
import { LuxuryButton } from "@/components/ui/LuxuryButton";
import { AnimatedHeading } from "@/components/ui/AnimatedHeading";

function stableValue(index: number, multiplier: number, offset: number = 0) {
    const raw = Math.sin(index * multiplier + offset) * 43758.5453;
    return raw - Math.floor(raw);
}

function formatPercent(value: number) {
    return `${value.toFixed(4)}%`;
}

function formatPixels(value: number) {
    return `${value.toFixed(5)}px`;
}

export function HeroSection() {
    const sectionRef = useRef<HTMLElement>(null);
    const reduceMotion = useReducedMotion();
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });

    useEffect(() => {
        const updateViewport = () => {
            setIsMobileViewport(window.innerWidth < 768);
        };

        updateViewport();
        window.addEventListener("resize", updateViewport);
        return () => {
            window.removeEventListener("resize", updateViewport);
        };
    }, []);

    const grillY = useTransform(scrollYProgress, [0, 1], [0, 120]);
    const contentY = useTransform(scrollYProgress, [0, 1], [0, -50]);
    const contentOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.78]);
    const shouldRenderScene = !reduceMotion && !isMobileViewport;

    const emberParticles = useMemo(
        () =>
            Array.from({ length: shouldRenderScene ? 12 : 6 }).map((_, idx) => ({
                left: formatPercent(10 + stableValue(idx, 12.9898) * 80),
                delay: stableValue(idx, 78.233) * 4,
                duration: 4 + stableValue(idx, 39.425, 1.3) * 4,
                size: formatPixels(2 + stableValue(idx, 17.719, 2.1) * 3),
                blur: stableValue(idx, 91.113, 0.7) > 0.5,
            })),
        [shouldRenderScene]
    );
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

    return (
        <section ref={sectionRef} className="relative isolate min-h-[100dvh] sm:min-h-[760px] overflow-hidden section-fade-edge flex items-center justify-center">
            {/* Static gradient - no JS animation on background-position */}
            <motion.div
                className="absolute inset-0"
                animate={{ scale: [1, 1.035, 1] }}
                transition={{ duration: 18, ease: "easeInOut", repeat: Infinity }}
                style={{
                    backgroundImage:
                        "radial-gradient(circle at 20% 18%, rgba(255,106,0,0.24), transparent 42%), radial-gradient(circle at 82% 72%, rgba(207,175,99,0.2), transparent 46%), linear-gradient(140deg, #0B0B0B 0%, #141414 60%, #0B0B0B 100%)",
                }}
            />

            <motion.div style={{ y: grillY, willChange: "transform" }} className="absolute inset-x-0 bottom-[-6%] top-[18%] md:top-[14%]">
                {shouldRenderScene ? <GrillScene /> : <div className="h-full w-full bg-[radial-gradient(circle_at_50%_40%,rgba(255,106,0,0.16),transparent_44%),linear-gradient(140deg,#0B0B0B_0%,#141414_60%,#0B0B0B_100%)]" />}
            </motion.div>

            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_22%,rgba(0,0,0,0.74)_78%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/36 via-transparent to-black/86" />

            <div className="pointer-events-none absolute inset-0">
                {emberParticles.map((particle, idx) => (
                    <motion.span
                        key={idx}
                        className={`absolute rounded-full bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.8)] ${particle.blur ? "blur-[1px]" : ""}`}
                        style={{
                            left: particle.left,
                            bottom: "8%",
                            width: particle.size,
                            height: particle.size,
                        }}
                        animate={{ y: [-10, -260], opacity: [0, 0.95, 0], scale: [0.6, 1, 0.7] }}
                        transition={reduceMotion ? undefined : { duration: particle.duration, delay: particle.delay, repeat: Infinity, ease: "easeOut", type: "tween" }}
                    />
                ))}
            </div>

            <motion.div
                style={{ y: contentY, opacity: contentOpacity, willChange: "transform, opacity" }}
                className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center px-4 sm:px-6 py-20 text-center"
            >
                <motion.p initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="mb-4 sm:mb-5 rounded-full border border-[#D4AF37]/20 bg-[#111111]/55 px-3.5 py-1.5 sm:px-4 sm:py-2 text-[11px] sm:text-xs tracking-[0.2em] sm:tracking-[0.24em] text-[#D4AF37] backdrop-blur-md">
                    {greeting} • CafeMaza Khammam
                </motion.p>

                <AnimatedHeading
                    as="h1"
                    lines={["Where Fire", "Meets Flavor"]}
                    className="max-w-4xl font-(--font-heading) text-4xl sm:text-6xl md:text-7xl leading-[1.12] tracking-[0.03em] shimmer-text"
                />

                <motion.p
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.95, delay: 0.2, ease: "easeOut" }}
                    className="mt-4 sm:mt-6 max-w-2xl text-xs sm:text-base md:text-lg tracking-[0.04em] sm:tracking-[0.08em] text-[#F5F5F5]/85 leading-relaxed"
                >
                    An immersive live grill &amp; authentic biryani dining experience in V.Venkatayapalem, Khammam
                </motion.p>

                <div className="relative mt-8 sm:mt-12 flex w-full max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center sm:gap-5">
                    <div className="pointer-events-none absolute inset-0 -z-10 mx-auto h-32 w-80 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.55),transparent_68%)] blur-3xl animate-pulse" />
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-full sm:w-auto"
                        animate={{ boxShadow: ["0_0_14px_rgba(255,106,0,0.16)", "0_0_32px_rgba(255,106,0,0.38)", "0_0_14px_rgba(255,106,0,0.16)"] }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.5 }}
                    >
                        <LuxuryButton href="/reserve-table" className="w-full sm:min-w-[185px] px-6 sm:px-8 py-3 text-xs sm:text-sm md:text-base">
                            Reserve Experience
                        </LuxuryButton>
                    </motion.div>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-full sm:w-auto"
                        animate={{ boxShadow: ["0_0_20px_rgba(207,175,99,0.2)", "0_0_40px_rgba(207,175,99,0.35)", "0_0_20px_rgba(207,175,99,0.2)"] }}
                        transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", repeatDelay: 1.5, delay: 0.2 }}
                    >
                        <LuxuryButton href="/menu" className="w-full sm:min-w-[185px] px-6 sm:px-8 py-3 text-xs sm:text-sm md:text-base bg-gradient-to-r from-[#CFAF63]/80 to-[#CFAF63]">
                            Explore Menu
                        </LuxuryButton>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div
                className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center gap-1 text-[#F5F5F5]/78"
                animate={{ y: [0, 7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
                <ChevronDown size={20} className="text-[#CFAF63]" />
                <span className="text-xs tracking-[0.14em]">Scroll to explore</span>
            </motion.div>
        </section>
    );
}
