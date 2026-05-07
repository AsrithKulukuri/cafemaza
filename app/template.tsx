"use client";

import { motion } from "framer-motion";

export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.996 }}
            transition={{ duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        >
            {children}
        </motion.div>
    );
}
