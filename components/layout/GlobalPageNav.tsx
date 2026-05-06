"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Compass, Home } from "lucide-react";

const SITE_ROUTES = new Set([
    "/",
    "/menu",
    "/contact",
    "/gallery",
    "/live-grill",
    "/order-online",
    "/reserve-table",
    "/screening",
    "/takeaway",
]);

function formatSegment(segment: string) {
    return segment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function GlobalPageNav() {
    const pathname = usePathname();
    const router = useRouter();

    const isHidden = useMemo(() => {
        if (!pathname) return true;
        if (pathname.startsWith("/api")) return true;
        if (SITE_ROUTES.has(pathname)) return true;
        return false;
    }, [pathname]);

    const currentTitle = useMemo(() => {
        if (!pathname || pathname === "/") return "Home";
        const segments = pathname.split("/").filter(Boolean);
        return formatSegment(segments[segments.length - 1] || "Dashboard");
    }, [pathname]);

    const handleBack = () => {
        if (typeof window !== "undefined" && window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/");
    };

    if (isHidden) {
        return null;
    }

    return (
        <header className="sticky top-0 z-70 border-b border-[#CFAF63]/20 bg-[#0B0B0B]/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleBack}
                        className="inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/35 px-3 py-2 text-xs font-semibold text-[#F5F5F5] hover:border-[#FF6A00] hover:text-[#FF6A00]"
                    >
                        <ArrowLeft size={14} />
                        Back
                    </button>
                    <div className="hidden items-center gap-2 md:flex">
                        <Compass size={14} className="text-[#CFAF63]" />
                        <p className="text-sm text-[#F5F5F5]/90">{currentTitle}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        href="/portals"
                        className="rounded-full border border-[#CFAF63]/35 px-3 py-2 text-xs font-semibold text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00]"
                    >
                        Portals
                    </Link>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-3 py-2 text-xs font-semibold text-[#111]"
                    >
                        <Home size={14} />
                        Home
                    </Link>
                </div>
            </div>
        </header>
    );
}
