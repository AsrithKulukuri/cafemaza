"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import type { User } from "@supabase/supabase-js";
import { navLinks } from "@/data/mockData";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ChevronDown, Menu, ShoppingBag, X } from "lucide-react";
import { usePremiumUI } from "@/components/providers/PremiumUIProvider";
import { clearAuthSession, getAuthUser, type AppUser } from "@/lib/authToken";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const [portalsMenuOpen, setPortalsMenuOpen] = useState(false);
    const [user, setUser] = useState<AppUser | null>(null);
    const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
    const accountMenuRef = useRef<HTMLDivElement | null>(null);
    const portalsMenuRef = useRef<HTMLDivElement | null>(null);
    const pathname = usePathname();
    const { cartCount, openCart, openBooking } = usePremiumUI();
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        const syncUser = () => {
            setUser(getAuthUser());
        };

        syncUser();

        window.addEventListener("storage", syncUser);
        return () => window.removeEventListener("storage", syncUser);
    }, []);

    useEffect(() => {
        setUser(getAuthUser());
    }, [pathname]);

    useEffect(() => {
        setAccountMenuOpen(false);
        setPortalsMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target as Node;

            if (accountMenuRef.current && !accountMenuRef.current.contains(target)) {
                setAccountMenuOpen(false);
            }

            if (portalsMenuRef.current && !portalsMenuRef.current.contains(target)) {
                setPortalsMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleDocumentClick);
        return () => document.removeEventListener("mousedown", handleDocumentClick);
    }, []);

    useEffect(() => {
        let mounted = true;

        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (mounted) {
                    setSupabaseUser(data.session?.user ?? null);
                }
            })
            .catch(() => {
                if (mounted) {
                    setSupabaseUser(null);
                }
            });

        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setSupabaseUser(session?.user ?? null);
        });

        return () => {
            mounted = false;
            data.subscription.unsubscribe();
        };
    }, [supabase]);

    const handleLogout = async () => {
        clearAuthSession();
        setUser(null);

        if (supabaseUser) {
            await supabase.auth.signOut({ scope: "local" });
            setSupabaseUser(null);
        }
    };

    const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);
    const supabaseName =
        (supabaseUser?.user_metadata?.full_name as string | undefined) ||
        (supabaseUser?.user_metadata?.name as string | undefined) ||
        supabaseUser?.email?.split("@")[0] ||
        null;
    const displayName = user?.name || supabaseName;
    const displayRole = user?.role || (supabaseUser ? "customer" : null);
    const shortName = (displayName || "Account").split(" ")[0];

    return (
        <header
            className={`fixed top-0 z-50 w-full border-b border-[#CFAF63]/20 transition-all duration-300 ${scrolled ? "bg-[#0B0B0B]/95 backdrop-blur-xl" : "bg-transparent"
                }`}
        >
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
                <Link href="/" className="flex items-center gap-3">
                    <BrandLogo />
                    <span className="font-(--font-heading) text-lg tracking-[0.22em] text-[#F5F5F5]">CAFE MAZA</span>
                </Link>

                <ul className="hidden items-center gap-4 lg:flex">
                    {navLinks.map((item) => (
                        <li key={item.href}>
                            <Link href={item.href} className="group relative text-sm tracking-wide text-[#F5F5F5]/88">
                                {item.label}
                                <span className="absolute -bottom-1 left-0 h-px w-0 bg-linear-to-r from-[#CFAF63] to-[#FF6A00] transition-all duration-300 group-hover:w-full" />
                            </Link>
                        </li>
                    ))}
                </ul>

                <div className="flex items-center gap-2">
                    <button
                        onClick={openBooking}
                        className="hidden rounded-full border border-[#CFAF63]/40 px-4 py-2 text-xs text-[#F5F5F5] transition hover:border-[#FF6A00] xl:block"
                    >
                        Book Table
                    </button>
                    <button
                        onClick={openCart}
                        className="relative rounded-full border border-[#CFAF63]/30 p-2 text-[#F5F5F5] transition hover:border-[#FF6A00]"
                        aria-label="Open cart"
                    >
                        <ShoppingBag size={16} />
                        {cartCount > 0 ? (
                            <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#FF6A00] px-1 text-[10px] font-semibold text-white">
                                {cartCount}
                            </span>
                        ) : null}
                    </button>
                    {displayName && displayRole ? (
                        <div ref={accountMenuRef} className="relative hidden lg:block">
                            <button
                                type="button"
                                onClick={() => {
                                    setAccountMenuOpen((prev) => !prev);
                                    setPortalsMenuOpen(false);
                                }}
                                className="inline-flex items-center gap-2 rounded-full border border-[#00D98E]/35 px-4 py-2 text-xs text-[#00D98E] transition hover:border-[#00D98E]"
                            >
                                Hi, {shortName}
                                <ChevronDown size={14} className={`transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} />
                            </button>

                            {accountMenuOpen ? (
                                <div className="absolute right-0 mt-2 w-44 rounded-2xl border border-[#CFAF63]/20 bg-[#101010]/95 p-2 backdrop-blur-xl">
                                    <p className="px-3 py-2 text-[11px] text-[#00D98E]">
                                        {displayName} ({formatRole(displayRole)})
                                    </p>
                                    <Link
                                        href="/my-orders"
                                        className="block rounded-lg px-3 py-2 text-sm text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                    >
                                        My Orders
                                    </Link>
                                    <Link
                                        href="/profile"
                                        className="block rounded-lg px-3 py-2 text-sm text-[#6CA3EA] hover:bg-[#6CA3EA]/10"
                                    >
                                        Profile
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            void handleLogout();
                                            setAccountMenuOpen(false);
                                        }}
                                        className="block w-full rounded-lg px-3 py-2 text-left text-sm text-[#FF6A00] hover:bg-[#FF6A00]/10"
                                    >
                                        Logout
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <motion.div whileHover={{ y: -2 }} className="hidden lg:block">
                            <Link href="/login" className="rounded-full border border-[#CFAF63]/40 px-4 py-2 text-xs text-[#F5F5F5]">
                                Login
                            </Link>
                        </motion.div>
                    )}
                    <div ref={portalsMenuRef} className="relative hidden lg:block">
                        <button
                            type="button"
                            onClick={() => {
                                setPortalsMenuOpen((prev) => !prev);
                                setAccountMenuOpen(false);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-[#CFAF63]/35 px-4 py-2 text-xs text-[#CFAF63] transition hover:border-[#FF6A00] hover:text-[#FF6A00]"
                        >
                            Portals
                            <ChevronDown size={14} className={`transition-transform ${portalsMenuOpen ? "rotate-180" : ""}`} />
                        </button>

                        {portalsMenuOpen ? (
                            <div className="absolute right-0 mt-2 w-40 rounded-2xl border border-[#CFAF63]/20 bg-[#101010]/95 p-2 backdrop-blur-xl">
                                <Link
                                    href="/staff-login"
                                    className="block rounded-lg px-3 py-2 text-sm text-[#F5F5F5] hover:bg-[#CFAF63]/10"
                                >
                                    Staff
                                </Link>
                                <Link
                                    href="/delivery-login"
                                    className="block rounded-lg px-3 py-2 text-sm text-[#6CA3EA] hover:bg-[#6CA3EA]/10"
                                >
                                    Delivery
                                </Link>
                                <Link
                                    href="/admin-login"
                                    className="block rounded-lg px-3 py-2 text-sm text-[#FF6A00] hover:bg-[#FF6A00]/10"
                                >
                                    Admin
                                </Link>
                            </div>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen((prev) => !prev)}
                        aria-label="Toggle navigation menu"
                        aria-expanded={mobileMenuOpen}
                        className="touch-target lg:hidden p-2 text-[#F5F5F5] hover:text-[#CFAF63] transition rounded-full cursor-pointer"
                    >
                        {mobileMenuOpen ? <X size={24} className="text-[#CFAF63]" /> : <Menu size={24} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation Drawer */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="lg:hidden border-t border-[#CFAF63]/25 bg-[#0D0D0D]/98 shadow-2xl backdrop-blur-2xl max-h-[85vh] overflow-y-auto"
                    >
                        <div className="flex flex-col px-5 py-4 space-y-3 divide-y divide-[#2A2A2A]">
                            {/* Main Navigation Links */}
                            <ul className="flex flex-col space-y-1">
                                {navLinks.map((item) => (
                                    <li key={item.href}>
                                        <Link
                                            href={item.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center justify-between py-2.5 text-sm font-medium text-[#F5F5F5] hover:text-[#CFAF63] transition"
                                        >
                                            <span>{item.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Quick Action Buttons */}
                            <div className="pt-3 flex flex-col gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        openBooking();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#CFAF63] to-[#E5C378] py-2.5 text-xs font-bold text-[#111] shadow-lg shadow-[#CFAF63]/20 hover:opacity-90 transition cursor-pointer"
                                >
                                    Book a VIP Table
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        openCart();
                                    }}
                                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#CFAF63]/30 bg-[#161616] py-2.5 text-xs font-semibold text-[#F5F5F5] hover:border-[#CFAF63] transition cursor-pointer"
                                >
                                    <ShoppingBag size={14} className="text-[#CFAF63]" />
                                    View Cart ({cartCount})
                                </button>
                            </div>

                            {/* Account Status / Login */}
                            <div className="pt-3">
                                {displayName && displayRole ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-xs text-[#00D98E] font-semibold">
                                                ● {displayName}
                                            </span>
                                            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#00D98E]/15 text-[#00D98E] border border-[#00D98E]/30">
                                                {formatRole(displayRole)}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            <Link
                                                href="/my-orders"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block rounded-lg bg-[#161616] px-3 py-2 text-center text-xs font-medium text-[#CFAF63] border border-[#CFAF63]/20"
                                            >
                                                My Orders
                                            </Link>
                                            <Link
                                                href="/profile"
                                                onClick={() => setMobileMenuOpen(false)}
                                                className="block rounded-lg bg-[#161616] px-3 py-2 text-center text-xs font-medium text-[#6CA3EA] border border-[#6CA3EA]/20"
                                            >
                                                Profile
                                            </Link>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                void handleLogout();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full mt-1 rounded-lg bg-rose-500/10 border border-rose-500/20 py-2 text-center text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                                        >
                                            Log Out
                                        </button>
                                    </div>
                                ) : (
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block w-full rounded-xl bg-linear-to-r from-[#CFAF63]/20 to-[#FF6A00]/20 border border-[#CFAF63]/30 py-2.5 text-center text-xs font-bold text-[#F5F5F5] hover:border-[#CFAF63] transition"
                                    >
                                        Customer Login
                                    </Link>
                                )}
                            </div>

                            {/* Portals Section */}
                            <div className="pt-3">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-[#888] mb-2">Staff & Management Portals</p>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <Link
                                        href="/staff-login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-lg bg-[#161616] border border-[#2A2A2A] py-2 text-[#F5F5F5] hover:border-[#CFAF63] transition"
                                    >
                                        Staff
                                    </Link>
                                    <Link
                                        href="/delivery-login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-lg bg-[#161616] border border-[#2A2A2A] py-2 text-[#6CA3EA] hover:border-[#6CA3EA] transition"
                                    >
                                        Delivery
                                    </Link>
                                    <Link
                                        href="/admin-login"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="rounded-lg bg-[#161616] border border-[#2A2A2A] py-2 text-[#FF6A00] hover:border-[#FF6A00] transition"
                                    >
                                        Admin
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
}
