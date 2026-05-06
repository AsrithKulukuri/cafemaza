"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    { name: "Rhea Kapoor", review: "Every course arrived like a performance. The smoky finish and service were impeccable.", avatar: "RK" },
    { name: "Arjun Mehta", review: "A true luxury grill experience. Warm ambiance, refined plating, and bold flavors.", avatar: "AM" },
    { name: "Sana Iqbal", review: "From cocktails to biryani, everything felt premium and beautifully curated.", avatar: "SI" },
    { name: "Vikram Rao", review: "Perfect for celebrations. The fire-grill theatrics made the evening unforgettable.", avatar: "VR" },
];

export function TestimonialsCarousel() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = window.setInterval(() => {
            setIndex((prev) => (prev + 1) % testimonials.length);
        }, 3800);

        return () => window.clearInterval(timer);
    }, []);

    const visible = [0, 1, 2].map((offset) => testimonials[(index + offset) % testimonials.length]);

    return (
        <div className="grid gap-4 md:grid-cols-3">
            {visible.map((item, idx) => (
                <motion.article
                    key={`${item.name}-${idx}`}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.9, delay: idx * 0.12, ease: [0.22, 1, 0.36, 1] }}
                    className="glass-card rounded-2xl border border-[#D4AF37]/20 bg-[#121212]/75 p-5"
                >
                    <div className="mb-4 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-full border border-[#D4AF37]/35 bg-[#1D1A14] text-sm text-[#D4AF37]">
                            {item.avatar}
                        </div>
                        <div>
                            <p className="font-semibold text-[#F5F5F5]">{item.name}</p>
                            <div className="mt-1 flex items-center gap-1 text-[#D4AF37]">
                                {Array.from({ length: 5 }).map((_, starIdx) => (
                                    <Star key={starIdx} size={12} fill="currentColor" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <p className="text-sm leading-relaxed text-[#F5F5F5]/72">{item.review}</p>
                </motion.article>
            ))}
        </div>
    );
}
