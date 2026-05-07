"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ReactNode, useRef, useState } from "react";

type LuxuryButtonProps = {
    href?: string;
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    type?: "button" | "submit";
};

export function LuxuryButton({ href, children, className = "", onClick, type = "button" }: LuxuryButtonProps) {
    const classes = `luxury-button ${className}`;
    const buttonRef = useRef<HTMLDivElement | HTMLButtonElement | null>(null);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    const handleMove = (event: React.MouseEvent<HTMLElement>) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
        const y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 10;
        setOffset({ x, y });
    };

    const resetOffset = () => setOffset({ x: 0, y: 0 });

    if (href) {
        return (
            <motion.div ref={buttonRef as React.RefObject<HTMLDivElement>} whileHover={{ x: offset.x, y: offset.y - 2 }} whileTap={{ scale: 0.98 }} onMouseMove={handleMove} onMouseLeave={resetOffset} data-cursor="interactive">
                <Link href={href} className={classes}>
                    {children}
                </Link>
            </motion.div>
        );
    }

    return (
        <motion.button whileHover={{ x: offset.x, y: offset.y - 2 }} whileTap={{ scale: 0.98 }} className={classes} onClick={onClick} type={type} onMouseMove={handleMove} onMouseLeave={resetOffset} data-cursor="interactive">
            {children}
        </motion.button>
    );
}
