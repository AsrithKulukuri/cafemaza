"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function CustomCursor() {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [active, setActive] = useState(false);

    useEffect(() => {
        const onMove = (event: MouseEvent) => {
            setPosition({ x: event.clientX, y: event.clientY });
            const target = event.target as HTMLElement | null;
            setActive(Boolean(target?.closest("a, button, input, textarea, select, [data-cursor='interactive']")));
        };

        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    return (
        <>
            <motion.span
                className="pointer-events-none fixed left-0 top-0 z-[200] hidden h-3 w-3 rounded-full bg-[#D4AF37] shadow-[0_0_18px_rgba(212,175,55,0.75)] mix-blend-screen md:block"
                animate={{ x: position.x - 6, y: position.y - 6, scale: active ? 1.6 : 1 }}
                transition={{ type: "spring", stiffness: 700, damping: 40, mass: 0.2 }}
            />
            <motion.span
                className="pointer-events-none fixed left-0 top-0 z-[199] hidden rounded-full border border-[#D4AF37]/35 md:block"
                animate={{ x: position.x - (active ? 24 : 18), y: position.y - (active ? 24 : 18), width: active ? 48 : 36, height: active ? 48 : 36, opacity: active ? 0.75 : 0.35 }}
                transition={{ type: "spring", stiffness: 350, damping: 32, mass: 0.35 }}
            />
        </>
    );
}
