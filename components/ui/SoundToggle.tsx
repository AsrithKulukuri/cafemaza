"use client";

import { motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";

type SoundToggleProps = {
    enabled: boolean;
    onToggle: () => void;
};

export function SoundToggle({ enabled, onToggle }: SoundToggleProps) {
    return (
        <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={onToggle}
            aria-label="Toggle sound"
            className="fixed bottom-24 right-4 z-[120] hidden h-11 w-11 items-center justify-center rounded-full border border-[#CFAF63]/28 bg-[#101010]/85 text-[#F5F5F5] shadow-[0_0_24px_rgba(207,175,99,0.2)] backdrop-blur-xl sm:flex"
        >
            {enabled ? <Volume2 size={17} className="text-[#CFAF63]" /> : <VolumeX size={17} className="text-[#F5F5F5]/75" />}
        </motion.button>
    );
}
