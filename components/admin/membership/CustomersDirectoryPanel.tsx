"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    Search,
    User,
    CreditCard,
    Coins,
    Calendar,
    Clock,
    X,
    Receipt,
    Plus,
    Minus,
    Sparkles,
    Shield,
    Gift,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type CustomerItem = {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    cardCode?: string;
    cardType?: string;
    referralCode?: string;
    referredByMasterCardCode?: string;
    totalVisits: number;
    totalSpend: number;
    totalDiscountClaimed: number;
    pointsBalance: number;
    createdAt: string;
    updatedAt: string;
};

type DeepCustomerProfile = {
    customer: CustomerItem;
    visits: Array<{
        _id: string;
        billNumber: string;
        billAmount: number;
        discountAmount: number;
        netPaid: number;
        visitDate: string;
    }>;
    bills: Array<{
        _id: string;
        billNumber: string;
        subtotal: number;
        discountAmount: number;
        netTotal: number;
        paymentMethod: string;
        createdAt: string;
    }>;
    pointsLedger: Array<{
        _id: string;
        points: number;
        type: string;
        balanceAfter: number;
        description: string;
        createdAt: string;
    }>;
    referrals: Array<{
        _id: string;
        referredCustomerPhone: string;
        firstVisitCompleted: boolean;
        totalRepeatVisits: number;
        totalPointsAwardedToMaster: number;
        createdAt: string;
        referredCustomerId?: {
            name: string;
            phone: string;
            totalVisits: number;
            totalSpend: number;
        };
    }>;
};

export function CustomersDirectoryPanel() {
    const [customers, setCustomers] = useState<CustomerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [cardFilter, setCardFilter] = useState("all");

    // Modal state for viewing profile
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [profile, setProfile] = useState<DeepCustomerProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);

    // Points adjustment modal
    const [pointsDelta, setPointsDelta] = useState("50");
    const [pointsDesc, setPointsDesc] = useState("Complimentary loyalty bonus");
    const [adjustingPoints, setAdjustingPoints] = useState(false);

    async function loadCustomers() {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams();
            if (search) queryParams.set("search", search);
            if (cardFilter !== "all") queryParams.set("cardType", cardFilter);
            queryParams.set("limit", "100");

            const res = await apiFetch<{ customers: CustomerItem[] }>(`/api/membership/customers?${queryParams.toString()}`);
            if (res?.customers) {
                setCustomers(res.customers);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = setTimeout(loadCustomers, 250);
        return () => clearTimeout(timer);
    }, [search, cardFilter]);

    async function openCustomerProfile(id: string) {
        setSelectedCustomerId(id);
        setLoadingProfile(true);
        try {
            const data = await apiFetch<DeepCustomerProfile>(`/api/membership/customers/${id}`);
            setProfile(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingProfile(false);
        }
    }

    async function handlePointsAdjust(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedCustomerId) return;
        setAdjustingPoints(true);

        try {
            await apiFetch(`/api/membership/customers/${selectedCustomerId}/adjust-points`, {
                method: "POST",
                body: JSON.stringify({
                    points: Number(pointsDelta),
                    description: pointsDesc,
                }),
            });
            await openCustomerProfile(selectedCustomerId);
            await loadCustomers();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Points adjustment failed");
        } finally {
            setAdjustingPoints(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Search member by name, phone, card code, or referral code..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <select
                        value={cardFilter}
                        onChange={(e) => setCardFilter(e.target.value)}
                        className="rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:outline-none"
                    >
                        <option value="all">All Members</option>
                        <option value="gold">Gold Card</option>
                        <option value="platinum">Platinum Card</option>
                        <option value="diamond">Diamond Card</option>
                        <option value="master">Master Card</option>
                    </select>
                </div>
            </div>

            {/* Mobile Customer Cards View */}
            <div className="block md:hidden space-y-3">
                {loading ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-500">
                        Loading customer directory...
                    </div>
                ) : customers.length === 0 ? (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-8 text-center text-zinc-500">
                        No customer records found.
                    </div>
                ) : (
                    customers.map((c) => (
                        <div key={c._id} className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3 shadow-md">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-white text-base">{c.name}</h4>
                                    <p className="font-mono text-xs text-zinc-400">📞 {c.phone}</p>
                                </div>
                                {c.cardCode ? (
                                    <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-amber-300">
                                        {c.cardCode}
                                    </span>
                                ) : (
                                    <span className="text-[11px] text-zinc-500 italic">No Card</span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-black/40 p-2.5 text-xs">
                                <div>
                                    <span className="text-[10px] text-zinc-400 uppercase">Visits / Spend</span>
                                    <p className="font-mono font-bold text-white">{c.totalVisits} visits · ₹{c.totalSpend}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-400 uppercase">Points Balance</span>
                                    <p className="font-mono font-bold text-amber-400">⭐ {c.pointsBalance} pts</p>
                                </div>
                            </div>

                            <button
                                onClick={() => openCustomerProfile(c._id)}
                                className="touch-target min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition flex items-center justify-center cursor-pointer"
                            >
                                View Complete Profile & History
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Customers Table */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-zinc-300">
                        <thead className="border-b border-zinc-800 bg-zinc-950/80 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            <tr>
                                <th className="py-3.5 px-4">Customer</th>
                                <th className="py-3.5 px-4">Card Linked</th>
                                <th className="py-3.5 px-4">Visits</th>
                                <th className="py-3.5 px-4">Total Spend</th>
                                <th className="py-3.5 px-4">Discount Used</th>
                                <th className="py-3.5 px-4">Points</th>
                                <th className="py-3.5 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                                        Loading customer directory...
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                                        No customer records found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((c) => (
                                    <tr key={c._id} className="hover:bg-white/[0.02] transition">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-white text-sm">{c.name}</div>
                                            <div className="font-mono text-zinc-400 text-xs">📞 {c.phone}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {c.cardCode ? (
                                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-xs font-bold uppercase text-amber-300">
                                                    {c.cardCode} ({c.cardType})
                                                </span>
                                            ) : (
                                                <span className="text-zinc-500 italic">No Card</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 font-mono">{c.totalVisits}</td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-white">₹{c.totalSpend}</td>
                                        <td className="py-3.5 px-4 font-mono text-emerald-400">₹{c.totalDiscountClaimed}</td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                                            ⭐ {c.pointsBalance}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <button
                                                onClick={() => openCustomerProfile(c._id)}
                                                className="rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                                            >
                                                View Profile
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Deep Customer Profile Modal */}
            {selectedCustomerId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-6"
                    >
                        <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">
                                    {profile?.customer.name || "Loading..."}
                                </h3>
                                <p className="text-xs font-mono text-zinc-400">
                                    📞 {profile?.customer.phone} · Joined {profile?.customer.createdAt ? new Date(profile.customer.createdAt).toLocaleDateString() : ""}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedCustomerId(null);
                                    setProfile(null);
                                }}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {loadingProfile ? (
                            <div className="py-12 text-center text-zinc-500">Loading member details...</div>
                        ) : profile ? (
                            <div className="space-y-6">
                                {/* Top Stats */}
                                <div className="grid grid-cols-4 gap-3 text-center">
                                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                                        <p className="text-[10px] uppercase text-zinc-400">Total Visits</p>
                                        <p className="text-xl font-bold text-white">{profile.customer.totalVisits}</p>
                                    </div>
                                    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
                                        <p className="text-[10px] uppercase text-zinc-400">Total Spend</p>
                                        <p className="text-xl font-bold text-white">₹{profile.customer.totalSpend}</p>
                                    </div>
                                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-3">
                                        <p className="text-[10px] uppercase text-emerald-400">Discounts Saved</p>
                                        <p className="text-xl font-bold text-emerald-300">₹{profile.customer.totalDiscountClaimed}</p>
                                    </div>
                                    <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-3">
                                        <p className="text-[10px] uppercase text-amber-400">Points Balance</p>
                                        <p className="text-xl font-bold text-amber-300">{profile.customer.pointsBalance}</p>
                                    </div>
                                </div>

                                {/* Manual Points Adjustment */}
                                <form onSubmit={handlePointsAdjust} className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-3.5">
                                    <div className="flex-1">
                                        <label className="text-[11px] font-semibold text-amber-300">Adjust Loyalty Points (+ or -)</label>
                                        <div className="mt-1 flex gap-2">
                                            <input
                                                type="number"
                                                required
                                                value={pointsDelta}
                                                onChange={(e) => setPointsDelta(e.target.value)}
                                                className="w-28 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none font-mono"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Reason for adjustment..."
                                                value={pointsDesc}
                                                onChange={(e) => setPointsDesc(e.target.value)}
                                                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={adjustingPoints}
                                        className="mt-4 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                                    >
                                        {adjustingPoints ? "Updating..." : "Update Points"}
                                    </button>
                                </form>

                                {/* Visit & Bill History */}
                                <div>
                                    <h4 className="font-bold text-white text-sm mb-3">Recent Visits & Bills</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {profile.bills.length === 0 ? (
                                            <p className="text-xs text-zinc-500 italic">No bill transactions on record yet.</p>
                                        ) : (
                                            profile.bills.map((bill) => (
                                                <div
                                                    key={bill._id}
                                                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs"
                                                >
                                                    <div>
                                                        <span className="font-mono font-bold text-white">#{bill.billNumber}</span>
                                                        <span className="ml-2 text-zinc-400">
                                                            {new Date(bill.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-3 font-mono">
                                                        <span className="text-zinc-400">Subtotal: ₹{bill.subtotal}</span>
                                                        <span className="text-emerald-400">Discount: -₹{bill.discountAmount}</span>
                                                        <span className="font-bold text-white">Net: ₹{bill.netTotal}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Points Ledger */}
                                <div>
                                    <h4 className="font-bold text-white text-sm mb-3">Points Ledger History</h4>
                                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                        {profile.pointsLedger.length === 0 ? (
                                            <p className="text-xs text-zinc-500 italic">No points history entries.</p>
                                        ) : (
                                            profile.pointsLedger.map((entry) => (
                                                <div
                                                    key={entry._id}
                                                    className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 text-xs"
                                                >
                                                    <div className="text-zinc-300">{entry.description}</div>
                                                    <div className="flex items-center gap-3 font-mono">
                                                        <span className={`font-bold ${entry.points > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                                            {entry.points > 0 ? `+${entry.points}` : entry.points} pts
                                                        </span>
                                                        <span className="text-zinc-500">Bal: {entry.balanceAfter}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
