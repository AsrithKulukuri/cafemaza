"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Search,
    CreditCard,
    CheckCircle2,
    Ban,
    AlertCircle,
    UserPlus,
    RefreshCw,
    X,
    Filter,
    Sparkles,
    Shield,
    Award,
    QrCode,
    Edit2,
    Save,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

type MembershipCardItem = {
    _id: string;
    cardCode: string;
    cardType: "gold" | "platinum" | "diamond" | "master";
    discountPercent: number;
    status: "unassigned" | "active" | "blocked";
    assignedToCustomer?: {
        _id: string;
        name: string;
        phone: string;
        email?: string;
        referralCode?: string;
        totalVisits?: number;
        totalSpend?: number;
    } | null;
    yearlyDiscountLimit?: number;
    yearlyDiscountUsed?: number;
    currentYear?: number;
    notes?: string;
    createdAt: string;
    assignedAt?: string;
};

const CARD_THEMES = {
    gold: {
        bg: "from-amber-950/60 via-[#1a160d] to-black",
        border: "border-amber-500/40",
        badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        text: "text-amber-400",
        title: "Gold Card",
    },
    platinum: {
        bg: "from-slate-900 via-[#151821] to-black",
        border: "border-cyan-400/40",
        badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
        text: "text-cyan-400",
        title: "Platinum Card",
    },
    diamond: {
        bg: "from-blue-950/60 via-[#0d1421] to-black",
        border: "border-blue-400/40",
        badge: "bg-blue-500/20 text-blue-300 border-blue-500/30",
        text: "text-blue-400",
        title: "Diamond Card",
    },
    master: {
        bg: "from-purple-950/60 via-[#180d24] to-black",
        border: "border-purple-500/40",
        badge: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        text: "text-purple-400",
        title: "Master Card",
    },
};

export function CardsManagerPanel() {
    const [cards, setCards] = useState<MembershipCardItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Modal state for assigning card
    const [assignModalCard, setAssignModalCard] = useState<MembershipCardItem | null>(null);
    const [custName, setCustName] = useState("");
    const [custPhone, setCustPhone] = useState("");
    const [custEmail, setCustEmail] = useState("");
    const [referredByCode, setReferredByCode] = useState("");
    const [referralDiscount, setReferralDiscount] = useState("10");
    const [assigning, setAssigning] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");

    // Modal state for editing card & member details
    const [editModalCard, setEditModalCard] = useState<MembershipCardItem | null>(null);
    const [editCustName, setEditCustName] = useState("");
    const [editCustPhone, setEditCustPhone] = useState("");
    const [editCustEmail, setEditCustEmail] = useState("");
    const [editDiscountPct, setEditDiscountPct] = useState("15");
    const [editYearlyLimit, setEditYearlyLimit] = useState("3000");
    const [editYearlyUsed, setEditYearlyUsed] = useState("0");
    const [editReferralCode, setEditReferralCode] = useState("");
    const [editStatus, setEditStatus] = useState<"active" | "blocked">("active");
    const [editNotes, setEditNotes] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    const [editError, setEditError] = useState("");

    function openEditModal(card: MembershipCardItem) {
        setEditModalCard(card);
        setEditCustName(card.assignedToCustomer?.name || "");
        setEditCustPhone(card.assignedToCustomer?.phone || "");
        setEditCustEmail(card.assignedToCustomer?.email || "");
        setEditDiscountPct(String(card.discountPercent || 15));
        setEditYearlyLimit(String(card.yearlyDiscountLimit || 3000));
        setEditYearlyUsed(String(card.yearlyDiscountUsed || 0));
        setEditReferralCode(card.assignedToCustomer?.referralCode || `REF-${card.cardCode}`);
        setEditStatus((card.status === "blocked" ? "blocked" : "active") as "active" | "blocked");
        setEditNotes(card.notes || "");
        setEditError("");
    }

    async function handleEditSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!editModalCard) return;
        setSavingEdit(true);
        setEditError("");

        try {
            await apiFetch("/api/membership/cards/edit", {
                method: "POST",
                body: JSON.stringify({
                    cardCode: editModalCard.cardCode,
                    customerName: editCustName,
                    customerPhone: editCustPhone,
                    customerEmail: editCustEmail,
                    discountPercent: Number(editDiscountPct),
                    yearlyDiscountLimit: Number(editYearlyLimit),
                    yearlyDiscountUsed: Number(editYearlyUsed),
                    referralCode: editReferralCode,
                    status: editStatus,
                    notes: editNotes,
                }),
            });
            setEditModalCard(null);
            await loadCards();
        } catch (err: unknown) {
            setEditError(err instanceof Error ? err.message : "Failed to update card");
        } finally {
            setSavingEdit(false);
        }
    }

    async function loadCards() {
        setLoading(true);
        try {
            const data = await apiFetch<{ cards: MembershipCardItem[] }>("/api/membership/cards?limit=200");
            if (data?.cards) {
                setCards(data.cards);
            }
        } catch (err: unknown) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCards();
    }, []);

    const filteredCards = useMemo(() => {
        return cards.filter((card) => {
            if (typeFilter !== "all" && card.cardType !== typeFilter) return false;
            if (statusFilter !== "all" && card.status !== statusFilter) return false;
            if (!search) return true;

            const q = search.toLowerCase();
            const codeMatch = card.cardCode.toLowerCase().includes(q);
            const nameMatch = card.assignedToCustomer?.name.toLowerCase().includes(q);
            const phoneMatch = card.assignedToCustomer?.phone.includes(q);
            return codeMatch || nameMatch || phoneMatch;
        });
    }, [cards, typeFilter, statusFilter, search]);

    const stats = useMemo(() => {
        const total = cards.length;
        const gold = cards.filter((c) => c.cardType === "gold").length;
        const platinum = cards.filter((c) => c.cardType === "platinum").length;
        const diamond = cards.filter((c) => c.cardType === "diamond").length;
        const master = cards.filter((c) => c.cardType === "master").length;
        const active = cards.filter((c) => c.status === "active").length;
        const unassigned = cards.filter((c) => c.status === "unassigned").length;
        const blocked = cards.filter((c) => c.status === "blocked").length;
        return { total, gold, platinum, diamond, master, active, unassigned, blocked };
    }, [cards]);

    async function handleToggleStatus(cardCode: string, action: "block" | "unblock" | "unassign") {
        if (action === "unassign" && !confirm(`Are you sure you want to unassign ${cardCode}?`)) {
            return;
        }
        try {
            await apiFetch("/api/membership/cards/toggle-status", {
                method: "POST",
                body: JSON.stringify({ cardCode, action }),
            });
            await loadCards();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Action failed");
        }
    }

    async function handleAssignSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!assignModalCard) return;
        setAssigning(true);
        setErrorMsg("");

        try {
            await apiFetch("/api/membership/cards/assign", {
                method: "POST",
                body: JSON.stringify({
                    cardCode: assignModalCard.cardCode,
                    name: custName,
                    phone: custPhone,
                    email: custEmail,
                    referredByCode: referredByCode || undefined,
                    referralDiscountPercent: Number(referralDiscount),
                }),
            });
            setAssignModalCard(null);
            setCustName("");
            setCustPhone("");
            setCustEmail("");
            setReferredByCode("");
            await loadCards();
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : "Assignment failed");
        } finally {
            setAssigning(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Header & Stats Banner */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <p className="text-xs uppercase text-zinc-400">Total Cards</p>
                    <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
                    <p className="text-xs uppercase text-amber-400">Gold (5%)</p>
                    <p className="mt-1 text-2xl font-bold text-amber-300">{stats.gold}</p>
                </div>
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4">
                    <p className="text-xs uppercase text-cyan-400">Platinum (15%)</p>
                    <p className="mt-1 text-2xl font-bold text-cyan-300">{stats.platinum}</p>
                </div>
                <div className="rounded-2xl border border-blue-500/30 bg-blue-950/20 p-4">
                    <p className="text-xs uppercase text-blue-400">Diamond (10%)</p>
                    <p className="mt-1 text-2xl font-bold text-blue-300">{stats.diamond}</p>
                </div>
                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4">
                    <p className="text-xs uppercase text-purple-400">Master (15%)</p>
                    <p className="mt-1 text-2xl font-bold text-purple-300">{stats.master}</p>
                </div>
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                    <p className="text-xs uppercase text-emerald-400">Assigned</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.active}</p>
                </div>
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/40 p-4">
                    <p className="text-xs uppercase text-zinc-400">Unassigned</p>
                    <p className="mt-1 text-2xl font-bold text-zinc-300">{stats.unassigned}</p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Search card code, customer name, or phone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="min-h-[40px] flex-1 sm:flex-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
                    >
                        <option value="all">All Types</option>
                        <option value="gold">Gold (100)</option>
                        <option value="platinum">Platinum (30)</option>
                        <option value="diamond">Diamond (50)</option>
                        <option value="master">Master (20)</option>
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="min-h-[40px] flex-1 sm:flex-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-white focus:border-amber-500 focus:outline-none"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active (Assigned)</option>
                        <option value="unassigned">Unassigned</option>
                        <option value="blocked">Blocked</option>
                    </select>

                    <button
                        onClick={loadCards}
                        className="touch-target min-h-[40px] flex items-center justify-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-700 transition cursor-pointer"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-44 animate-pulse rounded-2xl bg-zinc-900 border border-zinc-800" />
                    ))}
                </div>
            ) : filteredCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center">
                    <CreditCard className="h-12 w-12 text-zinc-600 mb-3" />
                    <p className="text-lg font-semibold text-white">No cards match your filter</p>
                    <p className="text-sm text-zinc-400 mt-1">Try changing the search keyword or filter options.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredCards.map((card) => {
                        const theme = CARD_THEMES[card.cardType];
                        const isAssigned = card.status === "active" && card.assignedToCustomer;

                        return (
                            <motion.div
                                key={card._id}
                                whileHover={{ y: -4 }}
                                className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border ${theme.border} bg-linear-to-b ${theme.bg} p-5 shadow-lg backdrop-blur-md`}
                            >
                                {/* Top Badges */}
                                <div>
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${theme.badge}`}>
                                                {theme.title}
                                            </span>
                                            <h3 className="mt-2 font-mono text-2xl font-black tracking-widest text-white">
                                                {card.cardCode}
                                            </h3>
                                        </div>

                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${card.status === "active"
                                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                    : card.status === "blocked"
                                                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                        : "bg-zinc-700/50 text-zinc-300 border border-zinc-600"
                                                }`}
                                        >
                                            {card.status}
                                        </span>
                                    </div>

                                    {/* Discount & Rules */}
                                    <div className="mt-3 flex items-center gap-3 text-xs text-zinc-300">
                                        <div className="font-semibold text-white">
                                            {card.discountPercent}% Discount
                                        </div>
                                        {card.cardType === "master" && (
                                            <div className="text-[11px] text-purple-300">
                                                (Limit ₹3k/yr · Max ₹500/tx)
                                            </div>
                                        )}
                                    </div>

                                    {/* Member Info */}
                                    <div className="mt-4 rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs">
                                        {isAssigned ? (
                                            <div className="space-y-1">
                                                <p className="font-semibold text-white truncate">
                                                    {card.assignedToCustomer?.name}
                                                </p>
                                                <p className="text-zinc-400 font-mono">
                                                    📞 {card.assignedToCustomer?.phone}
                                                </p>
                                                {card.cardType === "master" && (
                                                    <div className="mt-2 pt-2 border-t border-zinc-800 flex justify-between text-[10px] text-purple-300">
                                                        <span>Yearly Quota:</span>
                                                        <span className="font-bold">
                                                            ₹{card.yearlyDiscountUsed || 0} / ₹{card.yearlyDiscountLimit || 3000}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="italic text-zinc-500 flex items-center gap-1">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                Unassigned · Ready to link
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Barcode Graphic + Action Buttons */}
                                <div className="mt-4 pt-3 border-t border-zinc-800/80">
                                    <div className="flex items-center justify-between gap-2">
                                        {/* 1D Barcode Simulation Stripe */}
                                        <div className="flex h-5 items-center gap-0.5 opacity-60">
                                            {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 2].map((w, idx) => (
                                                <div key={idx} className="h-full bg-zinc-300" style={{ width: `${w}px` }} />
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            {card.status === "unassigned" ? (
                                                <button
                                                    onClick={() => setAssignModalCard(card)}
                                                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 py-1 text-xs font-semibold text-black hover:opacity-90 transition"
                                                >
                                                    <UserPlus className="h-3 w-3" />
                                                    Assign
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => openEditModal(card)}
                                                        className="rounded-lg border border-purple-500/40 bg-purple-500/15 px-2 py-1 text-[11px] font-semibold text-purple-300 hover:bg-purple-500/25 inline-flex items-center gap-1"
                                                    >
                                                        <Edit2 className="h-3 w-3" />
                                                        Edit
                                                    </button>
                                                    {card.status === "active" ? (
                                                        <button
                                                            onClick={() => handleToggleStatus(card.cardCode, "block")}
                                                            className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20"
                                                        >
                                                            Block
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleToggleStatus(card.cardCode, "unblock")}
                                                            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/20"
                                                        >
                                                            Unblock
                                                        </button>
                                                    )}

                                                    <button
                                                        onClick={() => handleToggleStatus(card.cardCode, "unassign")}
                                                        className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-300 hover:bg-zinc-700"
                                                    >
                                                        Unlink
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Assign Card Modal */}
            {assignModalCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-amber-400" />
                                <h3 className="font-bold text-white text-lg">
                                    Assign {assignModalCard.cardCode} ({assignModalCard.cardType.toUpperCase()})
                                </h3>
                            </div>
                            <button
                                onClick={() => setAssignModalCard(null)}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAssignSubmit} className="mt-4 space-y-4">
                            {errorMsg && (
                                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                                    {errorMsg}
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-semibold text-zinc-400">Customer Full Name *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Rahul Sharma"
                                    value={custName}
                                    onChange={(e) => setCustName(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400">Mobile Phone *</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 9876543210"
                                    value={custPhone}
                                    onChange={(e) => setCustPhone(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-400">Email (Optional)</label>
                                <input
                                    type="email"
                                    placeholder="e.g. rahul@example.com"
                                    value={custEmail}
                                    onChange={(e) => setCustEmail(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            {/* Master Card Specific: Referrer Link Box */}
                            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-3">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Referred by a Master Member? (Optional)
                                </div>
                                <div>
                                    <label className="text-[11px] text-zinc-400">
                                        Enter Master Card Code or Referral Code:
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CMM001 or REF-CMM001"
                                        value={referredByCode}
                                        onChange={(e) => setReferredByCode(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white uppercase focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setAssignModalCard(null)}
                                    className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assigning}
                                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-bold text-black shadow-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {assigning ? "Linking..." : "Confirm & Link Card"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Edit Card & Customer Details Modal */}
            {editModalCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm overflow-y-auto">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-lg rounded-3xl border border-purple-500/40 bg-zinc-900 p-6 shadow-2xl space-y-4 my-8"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    <Edit2 className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">
                                        Edit Membership Card: {editModalCard.cardCode}
                                    </h3>
                                    <p className="text-[11px] text-zinc-400">
                                        {editModalCard.cardType.toUpperCase()} PASS · Update member info, discount rate & quota
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditModalCard(null)}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {editError && (
                                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300">
                                    {editError}
                                </div>
                            )}

                            {/* Customer Profile Section */}
                            <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4 space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                                    Customer Information
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400">Name</label>
                                        <input
                                            type="text"
                                            value={editCustName}
                                            onChange={(e) => setEditCustName(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400">Phone</label>
                                        <input
                                            type="text"
                                            value={editCustPhone}
                                            onChange={(e) => setEditCustPhone(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-zinc-400">Email (Optional)</label>
                                    <input
                                        type="email"
                                        value={editCustEmail}
                                        onChange={(e) => setEditCustEmail(e.target.value)}
                                        className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Card Settings & Quota Section */}
                            <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3">
                                <p className="text-xs font-bold uppercase tracking-wider text-purple-300">
                                    Card Rules & Benefits
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400">Discount Percent (%)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={editDiscountPct}
                                            onChange={(e) => setEditDiscountPct(e.target.value)}
                                            className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-zinc-400">Card Status</label>
                                        <select
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value as "active" | "blocked")}
                                            className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                                        >
                                            <option value="active">Active</option>
                                            <option value="blocked">Blocked</option>
                                        </select>
                                    </div>
                                </div>

                                {editModalCard.cardType === "master" && (
                                    <>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-400">Free Credit Pool Limit (₹)</label>
                                                <input
                                                    type="number"
                                                    value={editYearlyLimit}
                                                    onChange={(e) => setEditYearlyLimit(e.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-semibold text-zinc-400">Credit Used (₹)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditYearlyUsed("0")}
                                                        className="text-[10px] text-purple-400 hover:underline font-semibold"
                                                    >
                                                        Reset to ₹0
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={editYearlyUsed}
                                                    onChange={(e) => setEditYearlyUsed(e.target.value)}
                                                    className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-semibold text-zinc-400">Master Referral Code</label>
                                            <input
                                                type="text"
                                                value={editReferralCode}
                                                onChange={(e) => setEditReferralCode(e.target.value.toUpperCase())}
                                                className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white uppercase font-mono focus:border-purple-500 focus:outline-none"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setEditModalCard(null)}
                                    className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    <Save className="h-3.5 w-3.5" />
                                    {savingEdit ? "Saving Changes..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
}
