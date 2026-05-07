"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { memo, useEffect, useMemo, useState } from "react";
import type { Dish } from "@/data/mockData";

type DishCardProps = {
    dish: Dish;
    onAdd?: (dish: Dish) => void;
    priority?: boolean;
};

function getOptimizedImageSrc(src: string) {
    if (!src) {
        return src;
    }

    if (src.includes(".supabase.co/storage/v1/object/public/")) {
        const separator = src.includes("?") ? "&" : "?";
        return `${src}${separator}width=640&quality=55`;
    }

    if (src.includes("unsplash.com/photos/")) {
        return "/images/soup.jpg";
    }

    if (src.includes("images.unsplash.com")) {
        const separator = src.includes("?") ? "&" : "?";
        return `${src}${separator}auto=format&fit=crop&w=640&q=55`;
    }

    return src;
}

const getDefaultImage = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("biryani")) return "/images/chicken-dum-biryani.jpg";
    if (lower.includes("soup") || lower.includes("shorba")) return "/images/soup.jpg";
    if (lower.includes("drink") || lower.includes("mojito") || lower.includes("soda") || lower.includes("lassi") || lower.includes("shake") || lower.includes("beverage")) return "/images/virgin-mojito.jpg";
    if (lower.includes("roti") || lower.includes("naan") || lower.includes("bread") || lower.includes("kulcha") || lower.includes("paratha")) return "/images/roti.jpg";
    if (lower.includes("tikka") || lower.includes("kabab") || lower.includes("tandoor") || lower.includes("tangdi") || lower.includes("lollipop")) return "/images/chicken-tikka.jpg";
    if (lower.includes("butter") || lower.includes("masala") || lower.includes("paneer") || lower.includes("rogan") || lower.includes("curry") || lower.includes("nalli")) return "/images/butter-chicken.jpg";
    if (lower.includes("manchurian") || lower.includes("chilli") || lower.includes("noodles") || lower.includes("rice") || lower.includes("fried")) return "/images/chilli-chicken.jpg";
    if (lower.includes("sizzler")) return "/images/sizzler.jpg";
    if (lower.includes("dessert") || lower.includes("meetha") || lower.includes("jamun") || lower.includes("apricot")) return "/images/dessert.jpg";
    return "/images/soup.jpg";
};

export const DishCard = memo(function DishCard({ dish, onAdd, priority = false }: DishCardProps) {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [addPulse, setAddPulse] = useState(false);
    const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

    // Reset selected variant whenever dish changes (strict rule: default to first variant)
    useEffect(() => {
        setSelectedVariantIndex(0);
    }, [dish._id, dish.variants]);

    const hasVariants = Array.isArray(dish.variants) && dish.variants.length > 0;

    // Strict variant selection rules:
    // - default selected variant is the first variant
    // - always render variant buttons if variants exist
    // - always show a variant price (prefer selected variant, else first positive variant)
    const selectedVariant = hasVariants ? dish.variants![selectedVariantIndex] : undefined;
    const firstPositiveVariant = hasVariants ? dish.variants!.find((v) => Number(v.price) > 0) : undefined;

    // For variant items, prefer selected variant price; if invalid or <=0, fall back to the first positive variant, else fall back to the first variant price.
    const displayVariantPrice = hasVariants
        ? (Number(selectedVariant?.price) > 0 ? Number(selectedVariant!.price) : firstPositiveVariant ? Number(firstPositiveVariant.price) : Number(dish.variants![0].price))
        : undefined;

    const basePrice = !hasVariants && (typeof dish.price === "string" || typeof dish.price === "number") ? Number(dish.price) : undefined;

    // Final displayed price (always a number or undefined only when neither price nor variants exist)
    const displayPrice = hasVariants ? displayVariantPrice : basePrice;

    const lower = dish.name.toLowerCase();
    const imageSrc = useMemo(() => getOptimizedImageSrc(dish.image), [dish.image]);
    const [currentImageSrc, setCurrentImageSrc] = useState(imageSrc);
    const isRemoteImage = /^https?:\/\//i.test(currentImageSrc);
    const isVeg = dish.isVeg ?? !["chicken", "mutton", "lamb", "fish", "murgh"].some((token) => lower.includes(token));
    const popular = dish.isBestSeller ?? dish.isSpecial ?? ["chicken tikka", "butter chicken", "biryani", "paneer butter masala"].some((token) => lower.includes(token));
    const isSoldOut = Boolean(dish.isSoldOut);

    useEffect(() => {
        setCurrentImageSrc(imageSrc);
        setImageLoaded(false);
    }, [imageSrc]);

    return (
        <motion.article
            whileHover={{ y: -6, scale: 1.01 }}
            transition={{ duration: 0.25, type: "tween" }}
            style={{ willChange: "transform" }}
            className="group overflow-hidden rounded-2xl border border-[#CFAF63]/30 bg-linear-to-br from-[#1A1816] to-[#0F0D0B] backdrop-blur-sm"
        >
            <div className="relative h-48 overflow-hidden bg-black/40 sm:h-56">
                {!imageLoaded ? <div className="skeleton-shimmer absolute inset-0" /> : null}
                <Image
                    src={currentImageSrc}
                    alt={dish.name}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    quality={75}
                    priority={priority}
                    loading={priority ? "eager" : "lazy"}
                    fetchPriority={priority ? "high" : "low"}
                    unoptimized={isRemoteImage}
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                        const fallback = getDefaultImage(dish.name);
                        if (currentImageSrc !== fallback) {
                            setCurrentImageSrc(fallback);
                            return;
                        }
                        setImageLoaded(true);
                    }}
                    className="object-cover transition duration-700 group-hover:scale-125"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute inset-0 bg-linear-to-t from-[#FF6A00]/35 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />

                <motion.div
                    className="absolute top-4 right-4 rounded-full border border-[#CFAF63]/50 bg-black/60 backdrop-blur px-3 py-1 text-xs uppercase tracking-[0.2em] text-[#CFAF63]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                >
                    {dish.isSpecial ? "⭐ Chef Special" : popular ? "🔥 Most Selling" : "Recommended"}
                </motion.div>

                {isSoldOut ? (
                    <div className="absolute left-4 top-4 rounded-full border border-rose-300/50 bg-rose-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-rose-200">
                        Sold Out
                    </div>
                ) : null}
            </div>

            <div className="space-y-4 p-4 transition-shadow duration-500 group-hover:shadow-[0_0_60px_rgba(255,106,0,0.25)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <h3 className="font-(--font-heading) text-xl leading-tight text-[#F5F5F5] sm:text-2xl">{dish.name}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <motion.span
                                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold transition ${isVeg ? "bg-[#00D98E]/25 text-[#4FE0A6]" : "bg-[#FF6A00]/25 text-[#FF8533]"
                                    }`}
                                whileHover={{ scale: 1.08 }}
                            >
                                <span className="inline-block h-2.5 w-2.5 rounded-full bg-current" />
                                {isVeg ? "Veg" : "Non-Veg"}
                            </motion.span>

                            {hasVariants && (
                                <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#CFAF63]/30 p-1 bg-black/40">
                                    {dish.variants!.map((variant, idx) => (
                                        <button
                                            key={variant.name}
                                            onClick={() => setSelectedVariantIndex(idx)}
                                            className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-lg transition-all duration-300 ${selectedVariantIndex === idx
                                                ? "bg-linear-to-r from-[#FF6A00] to-[#CFAF63] text-white font-bold shadow-lg"
                                                : "text-[#F5F5F5]/60 hover:text-[#CFAF63] hover:bg-white/5"}`}
                                        >
                                            {variant.name} ₹{variant.price}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <span className="whitespace-nowrap text-lg font-(--font-heading) text-[#CFAF63] sm:text-xl">
                        {displayPrice ? `₹${displayPrice}` : ""}
                    </span>
                </div>

                {dish.description ? (
                    <p className="text-sm text-[#F5F5F5]/65 leading-relaxed line-clamp-2">{dish.description}</p>
                ) : null}

                {onAdd ? (
                    <motion.button
                        onClick={() => {
                            if (isSoldOut) {
                                return;
                            }
                            const variantName = hasVariants ? dish.variants![selectedVariantIndex].name : "";
                            const variantObj = hasVariants ? dish.variants![selectedVariantIndex] : undefined;
                            const selectedDish = {
                                ...dish,
                                price: hasVariants ? Number(variantObj?.price ?? displayVariantPrice ?? 0) : Number(dish.price ?? 0),
                                selectedVariant: hasVariants ? { name: variantObj?.name ?? dish.variants![0].name, price: Number(variantObj?.price ?? displayVariantPrice ?? dish.variants![0].price) } : undefined,
                                name: `${dish.name}${variantName ? ` (${variantName})` : ""}`
                            };
                            onAdd(selectedDish);
                            setAddPulse(true);
                            window.setTimeout(() => setAddPulse(false), 260);
                        }}
                        disabled={isSoldOut}
                        whileHover={{ scale: 1.02, boxShadow: "0_0_30px_rgba(255,106,0,0.4)" }}
                        whileTap={{ scale: 0.98 }}
                        animate={addPulse ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                        transition={{ duration: 0.28 }}
                        className={`w-full rounded-lg border px-4 py-3 text-sm font-semibold text-[#F5F5F5] transition md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 ${isSoldOut
                            ? "cursor-not-allowed border-rose-400/40 bg-rose-500/15 text-rose-200/90"
                            : "border-[#FF6A00]/50 bg-linear-to-r from-[#FF6A00]/20 to-[#CFAF63]/20 hover:border-[#FF6A00] hover:from-[#FF6A00]/35 hover:to-[#CFAF63]/35"
                            }`}
                    >
                        {isSoldOut ? "Currently Unavailable" : "+ Add to Cart"}
                    </motion.button>
                ) : null}
            </div>
        </motion.article>
    );
});
