"use client";

import { useMemo } from "react";

const seed = (n: number) => {
    const raw = Math.sin(n * 12.9898) * 43758.5453;
    return raw - Math.floor(raw);
};

export function AmbientFX() {
    const smoke = useMemo(
        () =>
            Array.from({ length: 8 }).map((_, i) => ({
                id: `s-${i}`,
                left: `${(seed(i + 1) * 100).toFixed(2)}%`,
                size: 80 + seed(i + 10) * 120,
                duration: `${(18 + seed(i + 20) * 14).toFixed(1)}s`,
                delay: `${(seed(i + 30) * 8).toFixed(1)}s`,
            })),
        []
    );

    const embers = useMemo(
        () =>
            Array.from({ length: 12 }).map((_, i) => ({
                id: `e-${i}`,
                left: `${(seed(i + 100) * 100).toFixed(2)}%`,
                size: 1.5 + seed(i + 140) * 2.8,
                duration: `${(4.5 + seed(i + 170) * 4).toFixed(1)}s`,
                delay: `${(seed(i + 200) * 5).toFixed(1)}s`,
                blur: seed(i + 230) > 0.55,
            })),
        []
    );

    const flameOrbs = useMemo(
        () =>
            Array.from({ length: 6 }).map((_, i) => ({
                id: `f-${i}`,
                left: `${(8 + seed(i + 260) * 84).toFixed(2)}%`,
                top: `${(12 + seed(i + 300) * 70).toFixed(2)}%`,
                size: 56 + seed(i + 340) * 84,
                duration: `${(11 + seed(i + 380) * 7).toFixed(1)}s`,
                delay: `${(seed(i + 420) * 5).toFixed(1)}s`,
                driftX: `${(-18 + seed(i + 460) * 36).toFixed(2)}px`,
                driftY: `${(-26 + seed(i + 500) * 42).toFixed(2)}px`,
                opacity: (0.12 + seed(i + 540) * 0.14).toFixed(2),
            })),
        []
    );

    return (
        <>
            <style>{`
                @keyframes ambientSmoke {
                    0%   { transform: translateY(120px); opacity: 0; }
                    15%  { opacity: 0.09; }
                    85%  { opacity: 0.06; }
                    100% { transform: translateY(-340px); opacity: 0; }
                }
                @keyframes ambientEmber {
                    0%   { transform: translateY(40px) scale(0.8); opacity: 0; }
                    20%  { opacity: 0.8; }
                    80%  { opacity: 0.5; }
                    100% { transform: translateY(-280px) scale(0.65); opacity: 0; }
                }
                @keyframes ambientFlameOrb {
                    0% {
                        transform: translate3d(0, 0, 0) scale(0.92);
                        opacity: var(--orb-opacity);
                    }
                    35% {
                        transform: translate3d(var(--orb-drift-x), calc(var(--orb-drift-y) * -0.45), 0) scale(1.05);
                        opacity: calc(var(--orb-opacity) + 0.08);
                    }
                    70% {
                        transform: translate3d(calc(var(--orb-drift-x) * -0.45), var(--orb-drift-y), 0) scale(0.98);
                        opacity: calc(var(--orb-opacity) - 0.03);
                    }
                    100% {
                        transform: translate3d(0, 0, 0) scale(0.92);
                        opacity: var(--orb-opacity);
                    }
                }
            `}</style>
            <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden="true">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,106,0,0.07),transparent_32%),radial-gradient(circle_at_84%_70%,rgba(207,175,99,0.06),transparent_34%)]" />

                {flameOrbs.map((orb) => (
                    <span
                        key={orb.id}
                        style={{
                            left: orb.left,
                            top: orb.top,
                            width: orb.size,
                            height: orb.size,
                            animationDuration: orb.duration,
                            animationDelay: orb.delay,
                            animationName: "ambientFlameOrb",
                            animationTimingFunction: "ease-in-out",
                            animationIterationCount: "infinite",
                            willChange: "transform, opacity",
                            ["--orb-drift-x" as string]: orb.driftX,
                            ["--orb-drift-y" as string]: orb.driftY,
                            ["--orb-opacity" as string]: orb.opacity,
                        }}
                        className="absolute rounded-full bg-[radial-gradient(circle,rgba(255,214,122,0.95)_0%,rgba(255,179,71,0.62)_34%,rgba(255,106,0,0.3)_62%,transparent_78%)] blur-xl mix-blend-screen"
                    />
                ))}

                {smoke.map((p) => (
                    <span
                        key={p.id}
                        style={{
                            left: p.left,
                            width: p.size,
                            height: p.size,
                            bottom: "-6rem",
                            animationDuration: p.duration,
                            animationDelay: p.delay,
                            animationName: "ambientSmoke",
                            animationTimingFunction: "ease-in-out",
                            animationIterationCount: "infinite",
                            willChange: "transform, opacity",
                        }}
                        className="absolute rounded-full bg-gradient-to-b from-white/10 to-transparent blur-2xl"
                    />
                ))}

                {embers.map((p) => (
                    <span
                        key={p.id}
                        style={{
                            left: p.left,
                            width: p.size,
                            height: p.size,
                            bottom: "6%",
                            animationDuration: p.duration,
                            animationDelay: p.delay,
                            animationName: "ambientEmber",
                            animationTimingFunction: "ease-out",
                            animationIterationCount: "infinite",
                            willChange: "transform, opacity",
                        }}
                        className={`absolute rounded-full bg-[#FF6A00] shadow-[0_0_10px_rgba(255,106,0,0.8)] ${p.blur ? "blur-[1px]" : ""}`}
                    />
                ))}
            </div>
        </>
    );
}
