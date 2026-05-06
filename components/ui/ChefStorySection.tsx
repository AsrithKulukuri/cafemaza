"use client";

import Image from "next/image";
import { motion } from "framer-motion";

export function ChefStorySection() {
    return (
        <section className="relative overflow-hidden rounded-3xl border border-[#D4AF37]/25 bg-[#111111]/75 p-6 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(212,175,55,0.12),transparent_40%),radial-gradient(circle_at_80%_90%,rgba(255,106,0,0.14),transparent_50%)]" />
            <div className="relative z-10 grid gap-8 md:grid-cols-2 md:items-center">
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-72 overflow-hidden rounded-2xl border border-[#D4AF37]/20"
                >
                    <Image src="/images/gallery-chef.jpg" alt="Chef preparing cuisine" fill className="object-cover" />
                    <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent" />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">Chef and Brand Story</p>
                    <h3 className="mt-2 font-(--font-heading) text-4xl text-[#F5F5F5]">A Flame-Led Philosophy</h3>
                    <p className="mt-4 text-lg italic leading-relaxed text-[#F5F5F5]/85">
                        "Cooking is an art, and fire is our brush"
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[#F5F5F5]/70">
                        At Cafe Maza, every dish is guided by smoke, spice, and precision. Our kitchen blends classic craft with modern luxury to create an unforgettable dining ritual.
                    </p>
                </motion.div>
            </div>
        </section>
    );
}
