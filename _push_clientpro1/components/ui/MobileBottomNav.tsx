"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Menu, ShoppingBag, CalendarRange } from "lucide-react";

type MobileBottomNavProps = {
    onCartOpen: () => void;
    onBookOpen: () => void;
};

export function MobileBottomNav({ onCartOpen, onBookOpen }: MobileBottomNavProps) {
    const pathname = usePathname();

    const links = [
        { label: "Home", href: "/", icon: Home },
        { label: "Menu", href: "/menu", icon: Menu },
    ];

    return (
        <nav className="fixed bottom-3 left-1/2 z-[120] w-[min(95vw,420px)] -translate-x-1/2 rounded-2xl border border-[#CFAF63]/20 bg-[#0D0D0D]/90 px-3 py-2 backdrop-blur-xl lg:hidden">
            <ul className="grid grid-cols-4 gap-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const active = pathname === link.href;

                    return (
                        <li key={link.href}>
                            <Link
                                href={link.href}
                                className={`flex min-h-12 flex-col items-center justify-center rounded-xl text-[11px] ${active ? "bg-[#CFAF63]/20 text-[#F5F5F5]" : "text-[#F5F5F5]/75"}`}
                            >
                                <Icon size={16} />
                                <span className="mt-1">{link.label}</span>
                            </Link>
                        </li>
                    );
                })}
                <li>
                    <button onClick={onCartOpen} className="flex min-h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] text-[#F5F5F5]/75">
                        <ShoppingBag size={16} />
                        <span className="mt-1">Cart</span>
                    </button>
                </li>
                <li>
                    <button onClick={onBookOpen} className="flex min-h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] text-[#F5F5F5]/75">
                        <CalendarRange size={16} />
                        <span className="mt-1">Book</span>
                    </button>
                </li>
            </ul>
        </nav>
    );
}
