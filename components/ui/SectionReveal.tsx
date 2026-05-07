"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ReactNode } from "react";
import { revealLeft, revealRight, revealUp } from "@/lib/motionPresets";

type SectionRevealProps = {
    children: ReactNode;
    className?: string;
    direction?: "up" | "left" | "right";
};

export function SectionReveal({ children, className, direction = "up" }: SectionRevealProps) {
    const reduceMotion = useReducedMotion();
    const variants = direction === "left" ? revealLeft : direction === "right" ? revealRight : revealUp;

    if (reduceMotion) {
        return <section className={className}>{children}</section>;
    }

    return (
        <motion.section
            className={className}
            variants={variants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
        >
            {children}
        </motion.section>
    );
}
