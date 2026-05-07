"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 16 }).map((_, idx) => ({
    id: idx,
    left: `${(idx * 7) % 100}%`,
    delay: idx * 0.35,
    duration: 8 + (idx % 5),
    size: 24 + (idx % 4) * 14,
}));

export function SmokeParticles() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((particle) => (
                <motion.span
                    key={particle.id}
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: -220, opacity: [0, 0.35, 0] }}
                    transition={{
                        duration: particle.duration,
                        delay: particle.delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    style={{ left: particle.left, width: particle.size, height: particle.size }}
                    className="absolute bottom-[-3rem] rounded-full bg-gradient-to-b from-white/25 to-white/0 blur-xl"
                />
            ))}
        </div>
    );
}
