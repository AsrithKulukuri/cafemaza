import { motion } from "framer-motion";

export default function Loading() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B]">
            <div className="flex flex-col items-center gap-5">
                {/* Animated fire ring */}
                <div className="relative h-16 w-16">
                    <div className="absolute inset-0 rounded-full border-2 border-[#CFAF63]/20" />
                    <div
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#CFAF63] border-r-[#FF6A00] animate-spin"
                        style={{ animationDuration: "0.9s" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🔥</div>
                </div>
                <div className="flex flex-col items-center gap-1">
                    <p className="font-[var(--font-heading)] text-xl text-[#F5F5F5]">Café Maza</p>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#CFAF63]/70">Loading…</p>
                </div>
            </div>
        </div>
    );
}
