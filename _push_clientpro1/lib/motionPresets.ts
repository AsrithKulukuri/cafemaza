import type { Variants } from "framer-motion";

export const revealUp: Variants = {
    hidden: { opacity: 0, y: 34, scale: 0.985 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
    },
};

export const revealLeft: Variants = {
    hidden: { opacity: 0, x: -40 },
    show: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
    },
};

export const revealRight: Variants = {
    hidden: { opacity: 0, x: 40 },
    show: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
    },
};

export const staggerChildren: Variants = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.12,
            delayChildren: 0.08,
        },
    },
};

export const cardHover = {
    whileHover: { y: -6, scale: 1.01 },
    transition: { duration: 0.24, ease: "easeOut" },
};
