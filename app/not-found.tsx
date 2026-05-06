"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function NotFound() {
    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0B0B0B] px-6 text-center">
            {/* ambient blobs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#CFAF63]/8 blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 h-72 w-72 translate-x-1/2 translate-y-1/2 rounded-full bg-[#FF6A00]/10 blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="relative z-10"
            >
                {/* Decorative grill icon */}
                <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-[#CFAF63]/30 bg-gradient-to-br from-[#CFAF63]/10 to-[#FF6A00]/10"
                >
                    <span className="text-5xl">🔥</span>
                </motion.div>

                <p className="text-xs uppercase tracking-[0.28em] text-[#CFAF63] mb-3">404 — Page Not Found</p>
                <h1 className="font-[var(--font-heading)] text-6xl text-[#F5F5F5] md:text-8xl mb-4">
                    Oops.
                </h1>
                <p className="mx-auto max-w-md text-[#F5F5F5]/65 leading-relaxed mb-3">
                    Looks like this table is reserved for someone else.
                    The page you&apos;re looking for doesn&apos;t exist or has moved.
                </p>

                {/* Grill divider */}
                <div className="mx-auto my-8 flex items-center gap-3 max-w-xs">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#CFAF63]/30" />
                    <span className="text-[#CFAF63]/60 text-sm">✦</span>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#CFAF63]/30" />
                </div>

                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-8 py-3.5 font-semibold text-[#111] shadow-[0_0_25px_rgba(207,175,99,0.3)] hover:shadow-[0_0_40px_rgba(207,175,99,0.5)] transition"
                        >
                            🏠 Back to Home
                        </Link>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                        <Link
                            href="/menu"
                            className="inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/30 px-8 py-3.5 font-medium text-[#F5F5F5] hover:border-[#CFAF63] transition"
                        >
                            🍽️ Explore Menu
                        </Link>
                    </motion.div>
                </div>

                {/* Quick links */}
                <div className="mt-10 flex flex-wrap justify-center gap-2">
                    {[
                        { href: "/reserve-table", label: "Reserve Table" },
                        { href: "/order-online", label: "Order Online" },
                        { href: "/gallery", label: "Gallery" },
                        { href: "/contact", label: "Contact" },
                    ].map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-full border border-[#CFAF63]/15 bg-[#111]/60 px-4 py-1.5 text-xs text-[#F5F5F5]/65 hover:border-[#CFAF63]/40 hover:text-[#F5F5F5] transition"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </motion.div>
        </div>
    );
}
