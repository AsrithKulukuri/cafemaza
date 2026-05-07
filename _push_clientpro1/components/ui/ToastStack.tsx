"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export type ToastItem = {
    id: string;
    message: string;
};

type ToastStackProps = {
    toasts: ToastItem[];
};

export function ToastStack({ toasts }: ToastStackProps) {
    return (
        <div className="pointer-events-none fixed right-4 top-20 z-[140] flex w-[min(92vw,360px)] flex-col gap-2">
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, x: 24, y: -8 }}
                        animate={{ opacity: 1, x: 0, y: 0 }}
                        exit={{ opacity: 0, x: 18, y: -8 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="pointer-events-auto flex items-start gap-2 rounded-xl border border-[#00D98E]/35 bg-[#0F1713]/95 px-4 py-3 text-sm text-[#D7FBEA] shadow-[0_0_22px_rgba(0,217,142,0.2)] backdrop-blur-xl"
                    >
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#00D98E]" />
                        <p>{toast.message}</p>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
