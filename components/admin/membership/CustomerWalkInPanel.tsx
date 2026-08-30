"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    UserPlus,
    Clock,
    Calendar,
    Search,
    CheckCircle2,
    Plus,
    X,
    Sparkles,
    CreditCard,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

export type WalkInItem = {
    _id: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    tableNumber: string;
    serviceType: "dine-in" | "takeaway" | "live-grill" | "screening";
    cardCode?: string;
    cardType?: string;
    totalVisits?: number;
    status: "seated" | "billed" | "completed" | "cancelled";
    arrivalDate: string;
    billedAmount?: number;
    notes?: string;
    loggedBy?: string;
};

interface CustomerWalkInPanelProps {
    onSelectWalkInForBilling?: (walkIn: WalkInItem) => void;
    refreshTrigger?: number;
}

export function CustomerWalkInPanel({ onSelectWalkInForBilling, refreshTrigger }: CustomerWalkInPanelProps) {
    const [walkIns, setWalkIns] = useState<WalkInItem[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [summary, setSummary] = useState({
        totalWalkIns: 0,
        totalGuests: 0,
        activeSeated: 0,
        billed: 0,
    });
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [logging, setLogging] = useState(false);

    // Form inputs
    const [formName, setFormName] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formPartySize, setFormPartySize] = useState<number>(2);
    const [formTable, setFormTable] = useState("T-01");
    const [formServiceType, setFormServiceType] = useState<"dine-in" | "takeaway" | "live-grill" | "screening">("dine-in");
    const [formCardCode, setFormCardCode] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formError, setFormError] = useState("");

    async function loadWalkIns() {
        try {
            const res = await apiFetch<{
                summary: { totalWalkIns: number; totalGuests: number; activeSeated: number; billed: number };
                list: WalkInItem[];
            }>("/api/membership/walkins");
            setWalkIns(res.list || []);
            setSummary(
                res.summary || {
                    totalWalkIns: 0,
                    totalGuests: 0,
                    activeSeated: 0,
                    billed: 0,
                }
            );
        } catch (err) {
            console.error("Failed to load walkins:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadWalkIns();
        const interval = setInterval(loadWalkIns, 8000); // auto-refresh
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    async function handleAddWalkIn(e: React.FormEvent) {
        e.preventDefault();
        setLogging(true);
        setFormError("");

        try {
            await apiFetch("/api/membership/walkins", {
                method: "POST",
                body: JSON.stringify({
                    customerName: formName,
                    customerPhone: formPhone,
                    partySize: formPartySize,
                    tableNumber: formTable,
                    serviceType: formServiceType,
                    cardCode: formCardCode,
                    notes: formNotes,
                }),
            });

            setShowAddModal(false);
            setFormName("");
            setFormPhone("");
            setFormPartySize(2);
            setFormCardCode("");
            setFormNotes("");
            await loadWalkIns();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : "Failed to record walk-in.");
        } finally {
            setLogging(false);
        }
    }

    const filteredWalkIns = walkIns.filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase().trim();
        return (
            item.customerName?.toLowerCase().includes(q) ||
            item.customerPhone?.toLowerCase().includes(q) ||
            item.cardCode?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-5 sm:p-6 mb-6">
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2A2A] pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-[#CFAF63]" />
                        <h3 className="font-(--font-heading) text-lg sm:text-xl font-bold text-[#F5F5F5]">
                            Customer Walk-in & Scanned Visits Registry
                        </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#999] mt-1">
                        Real-time log of scanned cardholders, arrival times, and updated total visits.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-[#CFAF63] to-[#E5C378] px-4 py-2.5 text-xs sm:text-sm font-bold text-[#111] shadow-[0_0_20px_rgba(207,175,99,0.25)] hover:opacity-95 transition cursor-pointer"
                >
                    <UserPlus className="w-4 h-4" />
                    Log New Walk-in
                </button>
            </div>

            {/* Summary Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
                <div className="rounded-xl border border-[#CFAF63]/20 bg-[#141414] p-4 flex flex-col justify-between">
                    <p className="text-xs text-[#888] font-medium">Scanned Visits Today</p>
                    <p className="text-2xl font-bold text-[#F5F5F5] mt-1 font-mono">{summary.totalWalkIns} <span className="text-xs text-[#999] font-normal">records</span></p>
                </div>
                <div className="rounded-xl border border-[#00D98E]/20 bg-[#141414] p-4 flex flex-col justify-between">
                    <p className="text-xs text-[#888] font-medium">Total Guests Arrived</p>
                    <p className="text-2xl font-bold text-[#00D98E] mt-1 font-mono">{summary.totalGuests} <span className="text-xs text-[#999] font-normal">guests</span></p>
                </div>
                <div className="rounded-xl border border-[#8B5CF6]/20 bg-[#141414] p-4 flex flex-col justify-between">
                    <p className="text-xs text-[#888] font-medium">Active Dining / Seated</p>
                    <p className="text-2xl font-bold text-[#8B5CF6] mt-1 font-mono">{summary.activeSeated} <span className="text-xs text-[#999] font-normal">active</span></p>
                </div>
            </div>

            {/* Search / Filter Bar with Search Icon */}
            <div className="relative mb-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CFAF63]" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search scanned visits by customer name, phone, or card number (e.g. CMM001)..."
                    className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#141414] pl-10 pr-4 py-2.5 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#777] focus:outline-none focus:border-[#CFAF63]"
                />
                {searchTerm && (
                    <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#888] hover:text-[#FFF]"
                    >
                        Clear
                    </button>
                )}
            </div>

            {/* Clean Scanned Visits Table: Date & Time | Card Holder | Total Visits */}
            <div className="max-h-[320px] overflow-auto rounded-xl border border-[#CFAF63]/15">
                <table className="w-full text-xs sm:text-sm">
                    <thead className="sticky top-0 bg-[#121212] z-10">
                        <tr className="border-b border-[#2A2A2A]">
                            <th className="px-4 py-3 text-left font-semibold text-[#888] w-48">Scanned Date & Time</th>
                            <th className="px-4 py-3 text-left font-semibold text-[#888]">Card Holder & Customer</th>
                            <th className="px-4 py-3 text-right font-semibold text-[#888] w-36">Total Visits</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredWalkIns.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-4 py-8 text-center text-[#777]">
                                    {searchTerm
                                        ? `No records matching "${searchTerm}".`
                                        : "No scanned card visits recorded yet today. Scan a physical card or mobile above."}
                                </td>
                            </tr>
                        ) : (
                            filteredWalkIns.map((item) => {
                                const dateObj = new Date(item.arrivalDate);
                                const formattedDate = dateObj.toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                });
                                const formattedTime = dateObj.toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                });

                                return (
                                    <tr
                                        key={item._id}
                                        className="border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#181818] transition"
                                    >
                                        <td className="px-4 py-3 font-mono whitespace-nowrap">
                                            <div className="text-xs text-[#F5F5F5] font-semibold flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-[#CFAF63]" />
                                                {formattedDate}
                                            </div>
                                            <div className="text-[11px] text-[#888] flex items-center gap-1.5 mt-0.5">
                                                <Clock className="w-3 h-3 text-[#AAA]" />
                                                {formattedTime}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-[#F5F5F5] flex items-center gap-2">
                                                <span>{item.customerName}</span>
                                                {item.cardCode && (
                                                    <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-full bg-[#CFAF63]/20 text-[#CFAF63] border border-[#CFAF63]/30">
                                                        {item.cardCode} {item.cardType ? `(${item.cardType})` : ""}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-[#888] font-mono mt-0.5">
                                                <span>{item.customerPhone}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="inline-flex items-center gap-1 text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                                {item.totalVisits ? `${item.totalVisits} ${item.totalVisits === 1 ? "Visit" : "Visits"}` : "1st Visit"}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal: Log Walk-in */}
            <AnimatePresence>
                {showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-[#CFAF63]/30 bg-[#141414] shadow-2xl p-6"
                        >
                            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-4 mb-4">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="w-5 h-5 text-[#CFAF63]" />
                                    <h4 className="font-(--font-heading) text-lg font-bold text-[#F5F5F5]">
                                        Log Walk-in Customer
                                    </h4>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="p-1 rounded-lg text-[#888] hover:text-[#FFF] hover:bg-[#2A2A2A] transition cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {formError && (
                                <p className="mb-4 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
                                    {formError}
                                </p>
                            )}

                            <form onSubmit={handleAddWalkIn} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[#999] mb-1 font-medium">Customer Mobile Number *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formPhone}
                                        onChange={(e) => setFormPhone(e.target.value)}
                                        placeholder="e.g. +91 9876543210"
                                        className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[#999] mb-1 font-medium">Customer Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        placeholder="e.g. Ramesh Sharma"
                                        className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[#999] mb-1 font-medium">Number of Guests *</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={50}
                                            required
                                            value={formPartySize}
                                            onChange={(e) => setFormPartySize(Number(e.target.value))}
                                            className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[#999] mb-1 font-medium">Table / Area</label>
                                        <input
                                            type="text"
                                            value={formTable}
                                            onChange={(e) => setFormTable(e.target.value)}
                                            placeholder="e.g. T-04"
                                            className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[#999] mb-1 font-medium">Card Code (if Member)</label>
                                    <input
                                        type="text"
                                        value={formCardCode}
                                        onChange={(e) => setFormCardCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. CMM001"
                                        className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm font-mono text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[#999] mb-1 font-medium">Special Requests / Notes</label>
                                    <input
                                        type="text"
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        placeholder="e.g. VIP table"
                                        className="w-full rounded-xl border border-[#CFAF63]/30 bg-[#1A1A1A] px-3.5 py-2.5 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#CFAF63]"
                                    />
                                </div>

                                <div className="pt-3 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 rounded-xl border border-[#333] bg-[#181818] py-2.5 text-sm font-semibold text-[#888] hover:text-[#FFF] transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={logging}
                                        className="flex-1 rounded-xl bg-linear-to-r from-[#CFAF63] to-[#E5C378] py-2.5 text-sm font-bold text-[#111] disabled:opacity-50 transition cursor-pointer"
                                    >
                                        {logging ? "Saving..." : "Record Walk-in"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
