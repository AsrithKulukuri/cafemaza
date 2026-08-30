"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Settings,
    Percent,
    ShieldAlert,
    Coins,
    Sparkles,
    Check,
    Save,
    RefreshCw,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type SettingsState = {
    discounts: {
        gold: number;
        platinum: number;
        diamond: number;
        master: number;
    };
    masterRules: {
        minBillAmount: number;
        maxDiscountPerTx: number;
        yearlyDiscountLimit: number;
    };
    referralOptions: {
        availableDiscounts: number[];
        defaultFirstVisitDiscount: number;
    };
    pointsRules: {
        pointsPerNewReferralFirstBill: number;
        pointsPerReferralRepeatVisit: number;
        pointsPerSpendRs100: number;
        pointValueInRs: number;
        minPointsToRedeem: number;
    };
};

export function MembershipSettingsPanel() {
    const [settings, setSettings] = useState<SettingsState | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState("");

    async function loadSettings() {
        setLoading(true);
        try {
            const data = await apiFetch<SettingsState>("/api/membership/settings");
            setSettings(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadSettings();
    }, []);

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        if (!settings) return;
        setSaving(true);
        setSuccessMessage("");

        try {
            await apiFetch("/api/membership/settings", {
                method: "PUT",
                body: JSON.stringify(settings),
            });
            setSuccessMessage("Settings saved successfully!");
            setTimeout(() => setSuccessMessage(""), 3000);
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to save settings");
        } finally {
            setSaving(false);
        }
    }

    if (loading || !settings) {
        return (
            <div className="py-12 text-center text-zinc-500">
                Loading membership configuration settings...
            </div>
        );
    }

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {/* Header & Save Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        <Settings className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Membership & Loyalty Rules Configuration
                        </h2>
                        <p className="text-xs text-zinc-400">
                            Configure dynamic discount rates, Master Card limits, and referral points rewards.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {successMessage && (
                        <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                            <Check className="h-4 w-4" /> {successMessage}
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-xs font-bold text-black shadow-lg hover:opacity-90 disabled:opacity-50 transition"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* 1. Card Discount Percentages */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                        <Percent className="h-5 w-5 text-amber-400" />
                        <h3 className="font-bold text-white text-base">Card Discount Percentages (%)</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-amber-400">Gold Card (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.discounts.gold}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        discounts: { ...settings.discounts, gold: Number(e.target.value) },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-cyan-400">Platinum Card (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.discounts.platinum}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        discounts: { ...settings.discounts, platinum: Number(e.target.value) },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-cyan-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-blue-400">Diamond Card (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.discounts.diamond}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        discounts: { ...settings.discounts, diamond: Number(e.target.value) },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-purple-400">Master Card (%)</label>
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={settings.discounts.master}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        discounts: { ...settings.discounts, master: Number(e.target.value) },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Master Card Rule Limits */}
                <div className="rounded-3xl border border-purple-500/30 bg-purple-950/20 p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-purple-500/30 pb-3">
                        <ShieldAlert className="h-5 w-5 text-purple-400" />
                        <h3 className="font-bold text-white text-base">Master Card Yearly & Transaction Limits</h3>
                    </div>

                    <div className="space-y-3.5">
                        <div>
                            <label className="text-xs font-semibold text-zinc-300">
                                Minimum Bill Amount for Master Discount (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.masterRules.minBillAmount}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        masterRules: {
                                            ...settings.masterRules,
                                            minBillAmount: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-zinc-500 mt-0.5">Bills below this receive ₹0 discount.</p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-300">
                                Max Discount Cap per Transaction (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.masterRules.maxDiscountPerTx}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        masterRules: {
                                            ...settings.masterRules,
                                            maxDiscountPerTx: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-zinc-300">
                                Yearly Total Discount Limit per Member (₹)
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.masterRules.yearlyDiscountLimit}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        masterRules: {
                                            ...settings.masterRules,
                                            yearlyDiscountLimit: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-purple-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-zinc-500 mt-0.5">Resets automatically each calendar year.</p>
                        </div>
                    </div>
                </div>

                {/* 3. Points Engine Rules */}
                <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 space-y-4 md:col-span-2">
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                        <Coins className="h-5 w-5 text-amber-400" />
                        <h3 className="font-bold text-white text-base">Referral & Loyalty Points Rules</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-purple-300">
                                Points for New Referral First Bill
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.pointsRules.pointsPerNewReferralFirstBill}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        pointsRules: {
                                            ...settings.pointsRules,
                                            pointsPerNewReferralFirstBill: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-zinc-500 mt-0.5">Awarded to Master Card referrer.</p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-purple-300">
                                Points for Referral Repeat Visit
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.pointsRules.pointsPerReferralRepeatVisit}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        pointsRules: {
                                            ...settings.pointsRules,
                                            pointsPerReferralRepeatVisit: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-zinc-500 mt-0.5">Awarded on every subsequent visit.</p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-amber-300">
                                Points per ₹100 Customer Spend
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={settings.pointsRules.pointsPerSpendRs100}
                                onChange={(e) =>
                                    setSettings({
                                        ...settings,
                                        pointsRules: {
                                            ...settings.pointsRules,
                                            pointsPerSpendRs100: Number(e.target.value),
                                        },
                                    })
                                }
                                className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white font-mono focus:border-amber-500 focus:outline-none"
                            />
                            <p className="text-[11px] text-zinc-500 mt-0.5">Earned by customer on paid bill.</p>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
