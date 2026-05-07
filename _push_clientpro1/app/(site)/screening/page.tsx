"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScreeningBookingModal } from "@/components/ui/ScreeningBookingModal";
import { GoldDivider } from "@/components/ui/GoldDivider";

export default function ScreeningPage() {
    const [open, setOpen] = useState(false);

    return (
        <div className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
            <section className="relative overflow-hidden rounded-3xl border border-[#CFAF63]/28 bg-gradient-to-br from-[#0E0C08] via-[#13110F] to-[#0B0B0B] p-8 md:p-12">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#CFAF63]/8 blur-[80px]" />
                    <div className="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-[#FF6A00]/10 blur-[72px]" />
                </div>

                <div className="relative z-10 grid gap-10 lg:grid-cols-2 lg:items-center">
                    <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#CFAF63]">Private Screening Experience</p>
                        <h1 className="mt-3 font-[var(--font-heading)] text-5xl text-[#F5F5F5] leading-tight">
                            Dine. Watch. Celebrate.
                        </h1>
                        <GoldDivider className="max-w-md" />
                        <p className="mt-4 max-w-xl text-[#F5F5F5]/72">
                            Watch movies or sports on a private screen while enjoying our live grill dining.
                            Perfect for intimate celebrations in a premium cinematic atmosphere.
                        </p>

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {[
                                "Private table for up to 4 guests",
                                "Large HD screen",
                                "Live grill dining service",
                                "Perfect for birthdays and celebrations",
                            ].map((feature) => (
                                <div key={feature} className="rounded-xl border border-[#CFAF63]/18 bg-[#111]/55 px-4 py-2.5 text-sm text-[#F5F5F5]/78">
                                    ✦ {feature}
                                </div>
                            ))}
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setOpen(true)}
                            className="mt-8 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-8 py-3.5 font-semibold text-[#111] shadow-[0_0_32px_rgba(207,175,99,0.3)]"
                        >
                            Book Screening
                        </motion.button>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55 }}
                        className="rounded-3xl border border-[#CFAF63]/20 bg-[#0D0D0D]/90 p-6"
                    >
                        <p className="text-xs uppercase tracking-[0.16em] text-[#CFAF63]">Room Preview</p>
                        <div className="mt-4 rounded-2xl border border-[#CFAF63]/16 bg-[#131313] p-5">
                            <div className="mx-auto mb-3 h-16 w-full rounded-lg border border-[#CFAF63]/36 bg-gradient-to-b from-[#181A27] to-[#0F1017]" />
                            <div className="mx-auto mb-4 h-3 w-2/3 bg-gradient-to-b from-[#CFAF63]/15 to-transparent [clip-path:polygon(15%_0%,85%_0%,100%_100%,0%_100%)]" />
                            <div className="mx-auto w-4/5 rounded-xl border border-[#CFAF63]/30 bg-[#100E0A] p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-8 rounded-full border border-[#CFAF63]/28 bg-[#1A1A1A]" />
                                    <div className="h-8 rounded-full border border-[#CFAF63]/28 bg-[#1A1A1A]" />
                                </div>
                                <div className="my-3 h-12 rounded-lg border border-[#CFAF63]/20 bg-[#0D0C08]" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="h-8 rounded-full border border-[#CFAF63]/28 bg-[#1A1A1A]" />
                                    <div className="h-8 rounded-full border border-[#CFAF63]/28 bg-[#1A1A1A]" />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {open ? <ScreeningBookingModal onClose={() => setOpen(false)} /> : null}
        </div>
    );
}
