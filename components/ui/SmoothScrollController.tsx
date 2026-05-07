"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScrollController() {
    useEffect(() => {
        const lenis = new Lenis({
            duration: 1.2,
            smoothWheel: true,
            touchMultiplier: 1.1,
        });

        let frameId = 0;
        const raf = (time: number) => {
            lenis.raf(time);
            frameId = window.requestAnimationFrame(raf);
        };

        frameId = window.requestAnimationFrame(raf);

        return () => {
            window.cancelAnimationFrame(frameId);
            lenis.destroy();
        };
    }, []);

    return null;
}
