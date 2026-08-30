"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Sparkles,
    Gift,
    Users,
    CreditCard,
    Coins,
    CheckCircle2,
    Clock,
    RefreshCw,
    Search,
    ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type MasterMemberSummary = {
    _id: string;
    name: string;
    phone: string;
    cardCode: string;
    referralCode?: string;
    pointsBalance: number;
    totalSpend: number;
    yearlyDiscountUsed?: number;
    yearlyDiscountLimit?: number;
};

type ReferralItem = {
    _id: string;
    masterCustomerId: string;
    masterCardCode: string;
    referredCustomerPhone: string;
    firstVisitCompleted: boolean;
    firstVisitDiscountPercent: number;
    totalRepeatVisits: number;
    totalPointsAwardedToMaster: number;
    createdAt: string;
    referredCustomerId?: {
        _id: string;
        name: string;
        phone: string;
        totalVisits: number;
        totalSpend: number;
    };
};

export function ReferralsPointsPanel() {
    const [masterMembers, setMasterMembers] = useState<MasterMemberSummary[]>([]);
    const [selectedMaster, setSelectedMaster] = useState<MasterMemberSummary | null>(null);
    const [referrals, setReferrals] = useState<ReferralItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTree, setLoadingTree] = useState(false);

    async function loadMasterMembers() {
        setLoading(true);
        try {
            const res = await apiFetch<{ customers: MasterMemberSummary[] }>("/api/membership/customers?cardType=master&limit=50");
            if (res?.customers) {
                setMasterMembers(res.customers);
                if (res.customers.length > 0 && !selectedMaster) {
                    selectMaster(res.customers[0]);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function selectMaster(master: MasterMemberSummary) {
        setSelectedMaster(master);
        setLoadingTree(true);
        try {
            const profile = await apiFetch<any>(`/api/membership/customers/${master._id}`);
            if (profile?.referrals) {
                setReferrals(profile.referrals);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingTree(false);
        }
    }

    useEffect(() => {
        loadMasterMembers();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <div className="rounded-3xl border border-purple-500/30 bg-linear-to-r from-purple-950/40 via-[#180d24] to-black p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        <Gift className="h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Master Card Referral & Points Engine
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Master Card holders earn points on new referral first bills and subsequent repeat visits.
                        </p>
                    </div>
                </div>

                <button
                    onClick={loadMasterMembers}
                    className="flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 self-start sm:self-auto"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh Tree
                </button>
            </div>

            {/* Main Tree Grid: Left Master Cards | Right Referred Tree & Points */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Column: Master Card Members List (4 Cols) */}
                <div className="space-y-3 lg:col-span-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-1">
                        Master Card Holders ({masterMembers.length})
                    </h3>

                    {loading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-900 border border-zinc-800" />
                            ))}
                        </div>
                    ) : masterMembers.length === 0 ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-center text-xs text-zinc-500">
                            No active Master Card members assigned yet.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {masterMembers.map((master) => {
                                const isSelected = selectedMaster?._id === master._id;
                                return (
                                    <button
                                        key={master._id}
                                        type="button"
                                        onClick={() => selectMaster(master)}
                                        className={`w-full text-left rounded-2xl border p-4 transition-all duration-200 ${isSelected
                                                ? "border-purple-500/80 bg-purple-950/30 shadow-lg"
                                                : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <span className="font-mono text-xs font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-full">
                                                    {master.cardCode}
                                                </span>
                                                <h4 className="font-bold text-white text-sm mt-2">{master.name}</h4>
                                                <p className="font-mono text-xs text-zinc-400">📞 {master.phone}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                                                    <Coins className="h-3 w-3" /> {master.pointsBalance} pts
                                                </span>
                                                <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                                                    {master.referralCode}
                                                </p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Column: Referral Tree for Selected Master Member (8 Cols) */}
                <div className="space-y-4 lg:col-span-8">
                    {selectedMaster ? (
                        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-5">
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="rounded-full bg-purple-500/20 px-2.5 py-0.5 font-mono text-xs font-bold text-purple-300 border border-purple-500/40">
                                            {selectedMaster.cardCode}
                                        </span>
                                        <h3 className="font-bold text-white text-lg">{selectedMaster.name}&apos;s Referral Network</h3>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-1">
                                        Referral Code: <strong className="text-white font-mono">{selectedMaster.referralCode}</strong>
                                    </p>
                                </div>

                                <div className="text-right font-mono">
                                    <div className="text-xs text-zinc-400">Accumulated Points:</div>
                                    <div className="text-2xl font-black text-amber-400">
                                        ⭐ {selectedMaster.pointsBalance}
                                    </div>
                                </div>
                            </div>

                            {/* Referral Tree List */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                                    Referred Customers ({referrals.length})
                                </h4>

                                {loadingTree ? (
                                    <div className="py-12 text-center text-zinc-500">Loading referral tree...</div>
                                ) : referrals.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                                        No customers have registered using {selectedMaster.name}&apos;s referral code yet.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {referrals.map((ref) => (
                                            <div
                                                key={ref._id}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-black/40 p-4"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-white text-sm">
                                                            {ref.referredCustomerId?.name || "Customer Member"}
                                                        </h5>
                                                        {ref.firstVisitCompleted ? (
                                                            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                                                1st Visit Done
                                                            </span>
                                                        ) : (
                                                            <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                                                Pending 1st Visit
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-mono text-zinc-400 mt-0.5">
                                                        📞 {ref.referredCustomerPhone} · Joined {new Date(ref.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs font-mono">
                                                    <div className="text-right">
                                                        <p className="text-zinc-400">Repeat Visits</p>
                                                        <p className="font-bold text-white">{ref.totalRepeatVisits || 0}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-purple-300">Points Awarded</p>
                                                        <p className="font-bold text-amber-400">+{ref.totalPointsAwardedToMaster || 0} pts</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center text-xs text-zinc-500">
                            Select a Master Card holder on the left to inspect their referral network.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
