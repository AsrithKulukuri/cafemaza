"use client";

import { ReactNode, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SplashScreen } from "@/components/layout/SplashScreen";
import { AmbientFX } from "@/components/ui/AmbientFX";
import { PremiumUIProvider } from "@/components/providers/PremiumUIProvider";
import { SmoothScrollController } from "@/components/ui/SmoothScrollController";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { InteractiveLight } from "@/components/ui/InteractiveLight";

type SiteLayoutShellProps = {
    children: ReactNode;
};

export function SiteLayoutShell({ children }: SiteLayoutShellProps) {
    const [showSplash, setShowSplash] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        const seen = window.sessionStorage.getItem("cafe-maza-splash");
        if (seen) setShowSplash(false);
    }, []);

    const handleSplashDone = () => {
        window.sessionStorage.setItem("cafe-maza-splash", "1");
        setShowSplash(false);
    };

    return (
        <>
            <AnimatePresence mode="wait">{showSplash && <SplashScreen key="splash" onDone={handleSplashDone} />}</AnimatePresence>
            <PremiumUIProvider>
                <div className="relative min-h-screen bg-[#0B0B0B] pb-24 text-[#F5F5F5] lg:pb-0" style={{ contain: "paint" }}>
                    <SmoothScrollController />
                    <AmbientFX />
                    <InteractiveLight />
                    <CustomCursor />
                    <div className="relative z-10" style={{ willChange: "auto" }}>
                        <Navbar />
                        <main key={pathname} className="pt-24">{children}</main>
                        <Footer />
                    </div>
                </div>
            </PremiumUIProvider>
        </>
    );
}
