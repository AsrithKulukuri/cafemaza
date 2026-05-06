"use client";

import { motion, useScroll, useSpring } from "framer-motion";

export function ScrollProgressBar() {
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 24, mass: 0.2 });

    return (
        <motion.div
            style={{ scaleX, transformOrigin: "0% 50%" }}
            className="fixed left-0 right-0 top-0 z-[160] h-[2px] bg-gradient-to-r from-[#CFAF63] via-[#FFD78B] to-[#FF6A00]"
        />
    );
}
