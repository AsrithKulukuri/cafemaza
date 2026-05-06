"use client";

import { motion } from "framer-motion";

type AnimatedHeadingProps = {
    lines: string[];
    className?: string;
};

export function AnimatedHeading({ lines, className = "" }: AnimatedHeadingProps) {
    return (
        <div className={className}>
            {lines.map((line, lineIndex) => (
                <div key={lineIndex} className="block overflow-hidden">
                    {line.split("").map((character, index) => (
                        <motion.span
                            key={`${lineIndex}-${index}-${character}`}
                            initial={{ opacity: 0, y: "100%" }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: lineIndex * 0.16 + index * 0.025, ease: [0.22, 1, 0.36, 1] }}
                            className={`inline-block ${character === " " ? "w-[0.32em]" : ""}`}
                        >
                            {character === " " ? "\u00A0" : character}
                        </motion.span>
                    ))}
                </div>
            ))}
        </div>
    );
}
