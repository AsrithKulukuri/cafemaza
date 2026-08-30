"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    CreditCard,
    Sparkles,
    Coins,
    Gift,
    Copy,
    Check,
    Calendar,
    Award,
    ShieldCheck,
    Share2,
    LogOut,
} from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser, setAuthSession } from "@/lib/authToken";

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
            headers: {
                Accept: "application/json",
            },
        },
    );

    if (!response.ok) {
        throw new Error("Unable to fetch address from current location");
    }

    const body = (await response.json()) as { display_name?: string };
    return body.display_name?.trim() || "";
}

function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported in this browser"));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
        });
    });
}

type ProfileUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    savedAddress?: string;
    savedLocation?: {
        latitude: number;
        longitude: number;
        updatedAt?: string;
    } | null;
    role: "customer" | "staff" | "bearer" | "kitchen" | "manager" | "delivery" | "admin";
};

type MembershipDetails = {
    cardCode: string;
    cardType: "gold" | "platinum" | "diamond" | "master";
    status: string;
    discountPercent: number;
    pointsBalance: number;
    referralCode?: string;
    referredByMasterCardCode?: string;
    referralFirstVisitDiscountPercent?: number;
    referralFirstVisitUsed?: boolean;
    totalVisits: number;
    totalSpend: number;
    totalDiscountClaimed: number;
    yearlyDiscountLimit?: number;
    yearlyDiscountUsed?: number;
    currentYear?: number;
};

export default function ProfilePage() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [savedAddress, setSavedAddress] = useState("");
    const [savedLocation, setSavedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locatingAddress, setLocatingAddress] = useState(false);
    const [info, setInfo] = useState("");
    const [error, setError] = useState("");

    // Membership State
    const [membership, setMembership] = useState<MembershipDetails | null>(null);
    const [copiedRef, setCopiedRef] = useState(false);

    useEffect(() => {
        const token = getAuthToken();
        const cached = getAuthUser();

        if (!token) {
            router.replace("/login");
            return;
        }

        if (cached) {
            setName(cached.name || "");
            setEmail(cached.email || "");
            setPhone(cached.phone || "");
            setSavedAddress(cached.savedAddress || "");
            setSavedLocation(
                cached.savedLocation && typeof cached.savedLocation.latitude === "number" && typeof cached.savedLocation.longitude === "number"
                    ? {
                        latitude: cached.savedLocation.latitude,
                        longitude: cached.savedLocation.longitude,
                    }
                    : null,
            );
        }

        async function loadProfile() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (response.status === 401) {
                    clearAuthSession();
                    router.replace("/login");
                    return;
                }

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message ?? "Failed to load profile");
                }

                const user = result.user as ProfileUser;
                setName(user.name || "");
                setEmail(user.email || "");
                setPhone(user.phone || "");
                setSavedAddress(user.savedAddress || "");
                setSavedLocation(
                    user.savedLocation && typeof user.savedLocation.latitude === "number" && typeof user.savedLocation.longitude === "number"
                        ? {
                            latitude: user.savedLocation.latitude,
                            longitude: user.savedLocation.longitude,
                        }
                        : null,
                );

                if (result.membership) {
                    setMembership(result.membership as MembershipDetails);
                }
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }

        void loadProfile();
    }, [router]);

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const token = getAuthToken();
        if (!token) {
            router.replace("/login");
            return;
        }

        setBusy(true);
        setInfo("");
        setError("");

        try {
            const normalizedAddress = savedAddress.trim();
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    email,
                    savedAddress: normalizedAddress,
                    savedLocation: normalizedAddress ? savedLocation : null,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message ?? "Failed to update profile");
            }

            setAuthSession(result.token, result.user as ProfileUser);
            setInfo("Profile updated successfully.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update profile");
        } finally {
            setBusy(false);
        }
    }

    async function handleUseCurrentLocation() {
        setLocatingAddress(true);
        setInfo("");
        setError("");

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;

            let address = "";
            try {
                address = await reverseGeocode(latitude, longitude);
            } catch {
                address = "";
            }

            const resolvedAddress = address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setSavedAddress(resolvedAddress);
            setSavedLocation({ latitude, longitude });
            setInfo("Current location captured. Save profile to keep it for delivery.");
        } catch (locationError) {
            setError(locationError instanceof Error ? locationError.message : "Could not read your current location");
        } finally {
            setLocatingAddress(false);
        }
    }

    function handleCopyReferral() {
        if (!membership?.referralCode) return;
        navigator.clipboard.writeText(membership.referralCode);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2500);
    }

    if (loading) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-28 text-[#F5F5F5]">
                <p className="animate-pulse text-[#CFAF63]">Loading your profile and membership details...</p>
            </main>
        );
    }

    // Card Theme Colors
    const cardThemes = {
        gold: {
            border: "border-amber-500/50",
            bg: "from-[#2A1D07] via-[#1A1205] to-black",
            badge: "bg-amber-500/20 text-amber-300 border-amber-500/40",
            accent: "text-amber-400",
            title: "Gold Privilege Member",
        },
        platinum: {
            border: "border-cyan-500/50",
            bg: "from-[#08202E] via-[#05141D] to-black",
            badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
            accent: "text-cyan-400",
            title: "Platinum Elite Member",
        },
        diamond: {
            border: "border-blue-500/50",
            bg: "from-[#0B1530] via-[#070D1F] to-black",
            badge: "bg-blue-500/20 text-blue-300 border-blue-500/40",
            accent: "text-blue-400",
            title: "Diamond Royal Member",
        },
        master: {
            border: "border-purple-500/60 shadow-[0_0_40px_rgba(168,85,247,0.25)]",
            bg: "from-[#2C0B42] via-[#160624] to-[#09020F]",
            badge: "bg-purple-500/20 text-purple-300 border-purple-500/40",
            accent: "text-purple-400",
            title: "Master Exclusive Member",
        },
    };

    const currentTheme = membership ? cardThemes[membership.cardType] : null;

    return (
        <main className="mx-auto max-w-3xl px-4 py-28 text-[#F5F5F5] space-y-8">
            {/* 1. DIGITAL MEMBERSHIP CARD (If Assigned) */}
            {membership && currentTheme ? (
                <motion.section
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-[#CFAF63]" />
                            <h2 className="font-[var(--font-heading)] text-2xl text-white">
                                Your Membership & Loyalty Pass
                            </h2>
                        </div>
                        <span className={`rounded-full border px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${currentTheme.badge}`}>
                            {membership.status}
                        </span>
                    </div>

                    {/* Luxury Physical-Style Card Widget */}
                    <div className={`relative overflow-hidden rounded-3xl border ${currentTheme.border} bg-gradient-to-br ${currentTheme.bg} p-6 sm:p-8 shadow-2xl space-y-6`}>
                        {/* Background Luxury Glow */}
                        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-[#CFAF63]/10 blur-3xl" />

                        {/* Top Card Bar */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 relative z-10">
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#CFAF63]">
                                    Café Maza Privilege Club
                                </p>
                                <h3 className="font-[var(--font-heading)] text-2xl sm:text-3xl text-white mt-1">
                                    {currentTheme.title}
                                </h3>
                            </div>
                            <span className="self-start sm:self-auto font-mono text-lg sm:text-2xl font-black text-white tracking-widest bg-black/40 px-3.5 py-1.5 rounded-xl border border-white/10">
                                {membership.cardCode}
                            </span>
                        </div>

                        {/* Middle Stats Bar */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 relative z-10">
                            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                <p className="text-[10px] uppercase text-zinc-400">Discount</p>
                                <p className="text-xl font-bold text-white font-mono">{membership.discountPercent}% Off</p>
                            </div>
                            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3">
                                <p className="text-[10px] uppercase text-amber-400 flex items-center gap-1">
                                    <Coins className="h-3 w-3" /> Loyalty Points
                                </p>
                                <p className="text-xl font-bold text-amber-300 font-mono">{membership.pointsBalance}</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-black/40 p-3">
                                <p className="text-[10px] uppercase text-zinc-400">Total Visits</p>
                                <p className="text-xl font-bold text-white font-mono">{membership.totalVisits}</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                                <p className="text-[10px] uppercase text-emerald-400">Savings</p>
                                <p className="text-xl font-bold text-emerald-300 font-mono">₹{membership.totalDiscountClaimed}</p>
                            </div>
                        </div>

                        {/* Master Card Yearly Credit Pool Meter */}
                        {membership.cardType === "master" && (
                            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/30 p-4 space-y-2.5 relative z-10">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-semibold text-purple-300 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                                        1-Year Free Credit Pool (₹3,000)
                                    </span>
                                    <span className="font-bold text-white font-mono">
                                        ₹{(membership.yearlyDiscountLimit || 3000) - (membership.yearlyDiscountUsed || 0)} / ₹{membership.yearlyDiscountLimit || 3000} Available
                                    </span>
                                </div>
                                <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-900">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-[#CFAF63] transition-all duration-500"
                                        style={{
                                            width: `${Math.max(0, Math.min(100, (((membership.yearlyDiscountLimit || 3000) - (membership.yearlyDiscountUsed || 0)) / (membership.yearlyDiscountLimit || 3000)) * 100))}%`,
                                        }}
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-zinc-400 gap-1">
                                    <span>
                                        Used: <strong className="text-zinc-300">₹{membership.yearlyDiscountUsed || 0}</strong>
                                    </span>
                                    <span className="text-purple-300">
                                        ⚡ At checkout: Choose <strong>₹500 Off</strong> from credit pool or <strong>15% Discount</strong>
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Master Card Referral Share Code */}
                        {membership.referralCode && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-purple-500/40 bg-purple-950/40 p-4 relative z-10">
                                <div>
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                                        <Gift className="h-4 w-4" /> Share Your Master Referral Code
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                        Friends get up to 15% off on first visit, and you earn 100 points!
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded-xl border border-purple-500/50 bg-black/60 px-3.5 py-1.5 font-mono text-sm font-bold text-white">
                                        {membership.referralCode}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={handleCopyReferral}
                                        className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition"
                                    >
                                        {copiedRef ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                        {copiedRef ? "Copied" : "Copy"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Card Barcode Footer */}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10 relative z-10">
                            <div>
                                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Cardholder</p>
                                <p className="font-bold text-white text-sm">{name || "Valued Member"}</p>
                            </div>

                            {/* 1D Barcode Pattern Visualizer */}
                            <div className="flex flex-col items-end">
                                <div className="flex h-7 items-stretch gap-[2px] bg-white/90 p-1 rounded">
                                    {[2, 4, 1, 3, 2, 5, 1, 4, 2, 3, 5, 1, 3, 2, 4, 1, 3, 2, 5, 2, 1, 4, 2].map((w, i) => (
                                        <span
                                            key={i}
                                            className="bg-black inline-block rounded-xs"
                                            style={{ width: `${w}px` }}
                                        />
                                    ))}
                                </div>
                                <span className="font-mono text-[9px] text-zinc-400 mt-0.5 tracking-widest">
                                    {membership.cardCode}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.section>
            ) : null}

            {/* 2. PROFILE SETTINGS & DELIVERY ADDRESS */}
            <div className="rounded-3xl border border-[#CFAF63]/25 bg-[#111]/70 p-6 md:p-8">
                <h1 className="font-(--font-heading) text-3xl">My Profile</h1>
                <p className="mt-2 text-sm text-[#F5F5F5]/70">Update your details and save a default delivery address for faster checkout. Phone number is locked after verification.</p>

                <form onSubmit={handleSave} className="mt-6 space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Name</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="Your name"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Phone</span>
                        <input
                            value={phone}
                            readOnly
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#171717] px-4 py-3 text-[#F5F5F5]/70 font-mono"
                            placeholder="+919876543210 or 9876543210"
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="block text-xs uppercase tracking-wide text-[#CFAF63]">Saved Delivery Address</span>
                            <button
                                type="button"
                                onClick={() => void handleUseCurrentLocation()}
                                disabled={locatingAddress}
                                className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-[11px] text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00] disabled:opacity-60"
                            >
                                {locatingAddress ? "Detecting..." : "Use Current Location"}
                            </button>
                        </div>
                        <textarea
                            rows={3}
                            value={savedAddress}
                            onChange={(event) => setSavedAddress(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="House no, street, landmark"
                        />
                        {savedLocation ? (
                            <p className="mt-2 text-xs text-[#F5F5F5]/65">
                                Coordinates: {savedLocation.latitude.toFixed(6)}, {savedLocation.longitude.toFixed(6)}
                            </p>
                        ) : null}
                    </label>

                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-70"
                    >
                        {busy ? "Saving..." : "Save Profile"}
                    </button>
                </form>

                {info ? <p className="mt-4 text-sm text-emerald-300">{info}</p> : null}
                {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            </div>
        </main>
    );
}
