"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function InteractiveLight() {
    const [position, setPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const onMove = (event: MouseEvent) => {
            setPosition({ x: event.clientX, y: event.clientY });
        };

        window.addEventListener("mousemove", onMove);
        return () => window.removeEventListener("mousemove", onMove);
    }, []);

    return (
        <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-[2] hidden md:block"
            animate={{
                background: `radial-gradient(420px circle at ${position.x}px ${position.y}px, rgba(212,175,55,0.12), transparent 48%)`,
            }}
            transition={{ type: "tween", ease: "linear", duration: 0.18 }}
        />
    );
}
