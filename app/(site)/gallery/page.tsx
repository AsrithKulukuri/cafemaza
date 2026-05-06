"use client";

import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { galleryImages } from "@/data/mockData";

export default function GalleryPage() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    const prevImage = () => {
        if (activeIndex === null) return;
        setActiveIndex((activeIndex - 1 + galleryImages.length) % galleryImages.length);
    };

    const nextImage = () => {
        if (activeIndex === null) return;
        setActiveIndex((activeIndex + 1) % galleryImages.length);
    };

    return (
        <div className="mx-auto max-w-6xl px-6 pb-20 md:px-10">
            <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Gallery</p>
            <h1 className="mt-2 font-[var(--font-heading)] text-5xl text-[#F5F5F5]">Inside Cafe Maza</h1>

            <div className="mt-10 columns-1 gap-5 space-y-5 md:columns-2 lg:columns-3">
                {galleryImages.map((image, idx) => (
                    <figure key={image.alt + idx} className="glass-card break-inside-avoid overflow-hidden rounded-2xl border border-[#CFAF63]/20">
                        <button onClick={() => setActiveIndex(idx)} className="relative block h-48 w-full overflow-hidden">
                            <Image src={image.src} alt={image.alt} fill className="object-cover transition duration-500 hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        </button>
                        <figcaption className="px-4 py-3 text-sm text-[#F5F5F5]/80">{image.alt}</figcaption>
                    </figure>
                ))}
            </div>

            <AnimatePresence>
                {activeIndex !== null ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[120] bg-black/90 p-4"
                    >
                        <button onClick={() => setActiveIndex(null)} className="absolute right-5 top-5 rounded-full border border-[#CFAF63]/35 p-2 text-[#F5F5F5]">
                            <X size={18} />
                        </button>

                        <button onClick={prevImage} className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-[#CFAF63]/35 p-2 text-[#F5F5F5]">
                            <ChevronLeft size={20} />
                        </button>

                        <button onClick={nextImage} className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-[#CFAF63]/35 p-2 text-[#F5F5F5]">
                            <ChevronRight size={20} />
                        </button>

                        <div className="mx-auto flex h-full max-w-5xl items-center justify-center">
                            <motion.div
                                key={activeIndex}
                                initial={{ opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.96 }}
                                className="relative h-[70vh] w-full overflow-hidden rounded-2xl border border-[#CFAF63]/30"
                            >
                                <Image src={galleryImages[activeIndex].src} alt={galleryImages[activeIndex].alt} fill className="object-cover" />
                            </motion.div>
                        </div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
