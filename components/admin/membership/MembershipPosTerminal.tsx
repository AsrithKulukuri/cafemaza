"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Scan,
    Search,
    User,
    CreditCard,
    CheckCircle2,
    Sparkles,
    Calculator,
    Receipt,
    Plus,
    Trash2,
    Printer,
    Check,
    AlertTriangle,
    Coins,
    Gift,
    Clock,
    Flame,
    X,
    Camera,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useBarcodeScanner } from "@/lib/hooks/useBarcodeScanner";
import { CameraBarcodeScannerModal } from "./CameraBarcodeScannerModal";
import { CustomerWalkInPanel, type WalkInItem } from "./CustomerWalkInPanel";

type LookupResponse = {
    found: boolean;
    type?: "customer_profile" | "unassigned_card";
    message?: string;
    card?: {
        _id: string;
        cardCode: string;
        cardType: "gold" | "platinum" | "diamond" | "master";
        discountPercent: number;
        status: string;
        yearlyDiscountLimit?: number;
        yearlyDiscountUsed?: number;
        currentYear?: number;
    };
    customer?: {
        _id: string;
        name: string;
        phone: string;
        email?: string;
        cardCode?: string;
        cardType?: string;
        referralCode?: string;
        referredByMasterId?: string;
        referredByMasterCardCode?: string;
        referralFirstVisitDiscountPercent?: number;
        referralFirstVisitUsed?: boolean;
        totalVisits: number;
        totalSpend: number;
        totalDiscountClaimed: number;
        pointsBalance: number;
    } | null;
    visits?: Array<{
        _id: string;
        billNumber: string;
        billAmount: number;
        discountAmount: number;
        netPaid: number;
        visitDate: string;
    }>;
};

type BillCalcResult = {
    subtotal: number;
    discountPercent: number;
    discountAmount: number;
    discountType: string;
    netTotal: number;
    cardType: string;
    cardCode: string;
    masterExplanation: string;
    isMasterCapped: boolean;
    yearlyQuotaRemaining: number;
    customerPointsEarned: number;
    referrerPointsToAward: number;
    hasReferralBenefit: boolean;
};

export function MembershipPosTerminal() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [lookupResult, setLookupResult] = useState<LookupResponse | null>(null);
    const [showCameraScanner, setShowCameraScanner] = useState(false);

    // Quick New Customer Modal (if unassigned card is scanned or guest phone entered)
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkCardCode, setLinkCardCode] = useState("");
    const [linkName, setLinkName] = useState("");
    const [linkPhone, setLinkPhone] = useState("");
    const [linkReferredBy, setLinkReferredBy] = useState("");
    const [linkDiscountPct, setLinkDiscountPct] = useState("10");
    const [linking, setLinking] = useState(false);
    const [linkError, setLinkError] = useState("");

    // Billing inputs
    const [subtotalInput, setSubtotalInput] = useState<string>("1200");
    const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "card">("upi");
    const [orderType, setOrderType] = useState<"dine-in" | "takeaway" | "delivery">("dine-in");
    const [tableNo, setTableNo] = useState("T-04");
    const [applyReferralDiscount, setApplyReferralDiscount] = useState(true);
    const [selectedReferralDiscount, setSelectedReferralDiscount] = useState(10);
    const [masterDiscountChoice, setMasterDiscountChoice] = useState<"credit_500" | "percent_15">("credit_500");

    // Live Calculation Result
    const [calcResult, setCalcResult] = useState<BillCalcResult | null>(null);
    const [calculating, setCalculating] = useState(false);

    // Process result
    const [processing, setProcessing] = useState(false);
    const [completedBill, setCompletedBill] = useState<any | null>(null);
    const [scannerNotice, setScannerNotice] = useState<string | null>(null);
    const [walkInRefreshTrigger, setWalkInRefreshTrigger] = useState(0);
    const lastScanRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });

    // Hook to listen to TVS BS-C101 USB Barcode Scanner globally
    useBarcodeScanner((barcode) => {
        if (!barcode) return;
        const clean = barcode.trim().toUpperCase();
        const now = Date.now();
        if (lastScanRef.current.code === clean && now - lastScanRef.current.time < 1500) {
            return;
        }
        lastScanRef.current = { code: clean, time: now };
        setSearchQuery(clean);
        setScannerNotice(`Scanned Barcode: ${clean}`);
        setTimeout(() => setScannerNotice(null), 3000);
        handleLookup(clean);
    });

    async function handleLookup(codeOrPhone: string) {
        if (!codeOrPhone) return;
        const cleanQuery = codeOrPhone.trim().toUpperCase();
        setSearching(true);
        setCompletedBill(null);

        try {
            const res = await apiFetch<LookupResponse>(`/api/membership/lookup?q=${encodeURIComponent(cleanQuery)}`);

            if (res.found && res.customer) {
                setScannerNotice(`✓ Identified: ${res.customer.name} • ${res.customer.cardCode || res.card?.cardCode || ""} • Total Visits: ${res.customer.totalVisits}`);
                setTimeout(() => setScannerNotice(null), 4000);
            } else if (res.found && res.type === "unassigned_card" && res.card) {
                setLinkCardCode(res.card.cardCode);
                setShowLinkModal(true);
            }

            setLookupResult({ ...res });
        } catch (err: unknown) {
            console.error(err);
            setLookupResult({
                found: false,
                message: err instanceof Error ? err.message : "Lookup failed.",
            });
        } finally {
            setSearching(false);
        }
    }

    // Auto-recalculate bill whenever subtotal, customer or options change
    useEffect(() => {
        let active = true;
        async function runCalc() {
            const amount = Number(subtotalInput);
            if (isNaN(amount) || amount <= 0) {
                setCalcResult(null);
                return;
            }

            setCalculating(true);
            try {
                const res = await apiFetch<BillCalcResult>("/api/membership/bills/calculate", {
                    method: "POST",
                    body: JSON.stringify({
                        customerId: lookupResult?.customer?._id,
                        cardCode: lookupResult?.card?.cardCode || lookupResult?.customer?.cardCode,
                        subtotal: amount,
                        applyReferralDiscount,
                        selectedReferralDiscount,
                        masterDiscountChoice,
                    }),
                });
                if (active) {
                    setCalcResult(res);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (active) setCalculating(false);
            }
        }

        const timer = setTimeout(runCalc, 200);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [subtotalInput, lookupResult, applyReferralDiscount, selectedReferralDiscount, masterDiscountChoice]);

    // Handle Quick Linking
    async function handleLinkSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLinking(true);
        setLinkError("");

        try {
            await apiFetch("/api/membership/cards/assign", {
                method: "POST",
                body: JSON.stringify({
                    cardCode: linkCardCode,
                    name: linkName,
                    phone: linkPhone,
                    referredByCode: linkReferredBy || undefined,
                    referralDiscountPercent: Number(linkDiscountPct),
                }),
            });
            setShowLinkModal(false);
            await handleLookup(linkCardCode || linkPhone);
        } catch (err: unknown) {
            setLinkError(err instanceof Error ? err.message : "Linking failed.");
        } finally {
            setLinking(false);
        }
    }

    // Process Bill
    async function handleProcessBill() {
        if (!calcResult) return;
        setProcessing(true);

        try {
            const res = await apiFetch<any>("/api/membership/bills/process", {
                method: "POST",
                body: JSON.stringify({
                    customerId: lookupResult?.customer?._id,
                    customerPhone: lookupResult?.customer?.phone || (searchQuery.length >= 10 ? searchQuery : ""),
                    customerName: lookupResult?.customer?.name || "Walk-in Guest",
                    cardCode: lookupResult?.card?.cardCode || lookupResult?.customer?.cardCode,
                    items: [
                        { name: "Dine-in Order Items", price: calcResult.subtotal, quantity: 1 },
                    ],
                    subtotal: calcResult.subtotal,
                    paymentMethod,
                    orderType,
                    tableNumber: tableNo,
                    applyReferralDiscount,
                    selectedReferralDiscount,
                    masterDiscountChoice,
                    processedBy: "POS Terminal Staff",
                }),
            });

            setCompletedBill(res);
            // Refresh customer profile to reflect updated points & quota
            if (lookupResult?.customer?.phone || lookupResult?.card?.cardCode) {
                await handleLookup(lookupResult.customer?.phone || lookupResult.card?.cardCode || "");
            }
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : "Failed to process bill.");
        } finally {
            setProcessing(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* TVS Hardware Scanner Status & Manual Camera Option */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-3xl border border-amber-500/30 bg-linear-to-r from-[#18130a] via-[#120f09] to-black p-5 shadow-xl">
                <div className="flex items-center gap-3.5">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                        <Scan className="h-6 w-6 animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                        </span>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-white text-base sm:text-lg">
                                TVS BS-C101 Star 1D Scanner Terminal
                            </h2>
                            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                                Ready to Scan
                            </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Auto-reads physical card barcode via hardware scanner, or use device camera.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setShowCameraScanner(true)}
                        className="flex items-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-400 px-4 py-2.5 text-xs sm:text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 transition cursor-pointer"
                    >
                        <Camera className="h-4 w-4" />
                        Scan with Device Camera
                    </button>
                    {scannerNotice && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-mono text-amber-300 flex items-center gap-1.5"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                            {scannerNotice}
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Customer Walk-in Registry & Headcount */}
            <CustomerWalkInPanel
                refreshTrigger={walkInRefreshTrigger}
                onSelectWalkInForBilling={(walkIn) => {
                    if (walkIn.tableNumber) setTableNo(walkIn.tableNumber);
                    setOrderType(walkIn.serviceType === "takeaway" ? "takeaway" : "dine-in");
                    const target = walkIn.cardCode || walkIn.customerPhone;
                    if (target) {
                        setSearchQuery(target);
                        handleLookup(target);
                    }
                }}
            />

            {/* Main Terminal Grid: Left (Customer & Card Search) | Right (POS Billing Engine) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                {/* LEFT COL: Search & Member Profile (5 Cols) */}
                <div className="space-y-4 lg:col-span-5">
                    {/* Search Bar */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
                        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                            Search Customer or Scan Card
                        </label>
                        <div className="mt-2 flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Enter Mobile / Card Code (e.g. CMG001)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleLookup(searchQuery);
                                    }}
                                    className="w-full min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-950 pl-10 pr-11 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCameraScanner(true)}
                                    title="Scan Barcode via Device Camera"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-amber-400 hover:bg-zinc-800 transition cursor-pointer"
                                >
                                    <Camera className="h-4 w-4" />
                                </button>
                            </div>
                            <button
                                onClick={() => handleLookup(searchQuery)}
                                disabled={searching}
                                className="touch-target min-h-[44px] rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50 transition cursor-pointer"
                            >
                                {searching ? "..." : "Lookup"}
                            </button>
                        </div>
                    </div>

                    {/* Member Profile Display */}
                    {lookupResult?.found && lookupResult.customer ? (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-3xl border border-zinc-700 bg-zinc-900/90 p-5 shadow-xl space-y-4"
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">
                                        {lookupResult.customer.name}
                                    </h3>
                                    <p className="font-mono text-xs text-zinc-400">
                                        📞 {lookupResult.customer.phone}
                                    </p>
                                </div>

                                {lookupResult.customer.cardType ? (
                                    <span className="rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-amber-300">
                                        {lookupResult.customer.cardCode} ({lookupResult.customer.cardType.toUpperCase()})
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setLinkPhone(lookupResult.customer!.phone);
                                            setLinkName(lookupResult.customer!.name);
                                            setShowLinkModal(true);
                                        }}
                                        className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                                    >
                                        + Link Card
                                    </button>
                                )}
                            </div>

                            {/* Loyalty & Spend Statistics */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl border border-zinc-800 bg-black/40 p-2.5">
                                    <p className="text-[10px] uppercase text-zinc-400">Visits</p>
                                    <p className="text-base font-bold text-white">{lookupResult.customer.totalVisits}</p>
                                </div>
                                <div className="rounded-xl border border-zinc-800 bg-black/40 p-2.5">
                                    <p className="text-[10px] uppercase text-zinc-400">Total Spend</p>
                                    <p className="text-base font-bold text-white">₹{lookupResult.customer.totalSpend}</p>
                                </div>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                                    <p className="text-[10px] uppercase text-amber-400 flex items-center justify-center gap-0.5">
                                        <Coins className="h-3 w-3" /> Points
                                    </p>
                                    <p className="text-base font-bold text-amber-300">{lookupResult.customer.pointsBalance}</p>
                                </div>
                            </div>

                            {/* Master Card Yearly Quota Meter */}
                            {lookupResult.card?.cardType === "master" && (
                                <div className="rounded-2xl border border-purple-500/30 bg-purple-950/20 p-3.5 space-y-2">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-semibold text-purple-300">
                                            Master Card Yearly Quota ({lookupResult.card.currentYear || 2026})
                                        </span>
                                        <span className="font-bold text-white font-mono">
                                            ₹{lookupResult.card.yearlyDiscountUsed || 0} / ₹{lookupResult.card.yearlyDiscountLimit || 3000}
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
                                        <div
                                            className="h-full bg-gradient-to-r from-purple-500 to-amber-500 transition-all duration-500"
                                            style={{
                                                width: `${Math.min(100, ((lookupResult.card.yearlyDiscountUsed || 0) / (lookupResult.card.yearlyDiscountLimit || 3000)) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-zinc-400">
                                        Remaining discount available this calendar year:{" "}
                                        <strong className="text-purple-300">
                                            ₹{Math.max(0, (lookupResult.card.yearlyDiscountLimit || 3000) - (lookupResult.card.yearlyDiscountUsed || 0))}
                                        </strong>
                                    </p>
                                </div>
                            )}

                            {/* Referral Badge if referred */}
                            {lookupResult.customer.referredByMasterCardCode && (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2.5 text-xs text-emerald-300 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <Gift className="h-4 w-4" />
                                        <span>Referred by Master Card <strong>{lookupResult.customer.referredByMasterCardCode}</strong></span>
                                    </div>
                                    {!lookupResult.customer.referralFirstVisitUsed ? (
                                        <span className="rounded bg-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase">
                                            1st Visit Discount Available
                                        </span>
                                    ) : (
                                        <span className="text-[10px] text-zinc-400">1st visit used</span>
                                    )}
                                </div>
                            )}

                            {/* Master Referral Code if Master Member */}
                            {lookupResult.customer.referralCode && (
                                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-2.5 text-xs text-purple-300 flex items-center justify-between">
                                    <span>Master Referral Code:</span>
                                    <span className="font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded border border-purple-500/40">
                                        {lookupResult.customer.referralCode}
                                    </span>
                                </div>
                            )}
                        </motion.div>
                    ) : lookupResult?.found === false ? (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-center text-xs text-zinc-400">
                            <p>{lookupResult.message}</p>
                            <button
                                onClick={() => {
                                    if (searchQuery.length >= 10 && !isNaN(Number(searchQuery))) {
                                        setLinkPhone(searchQuery);
                                    }
                                    setShowLinkModal(true);
                                }}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-1.5 font-bold text-black text-xs hover:bg-amber-400"
                            >
                                <Plus className="h-3.5 w-3.5" /> Register / Link Member
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-500">
                            Scan a card with TVS scanner or search mobile above to view customer profile and discount eligibility.
                        </div>
                    )}
                </div>

                {/* RIGHT COL: POS Billing Calculator & Process Engine (7 Cols) */}
                <div className="space-y-4 lg:col-span-7">
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/90 p-6 shadow-xl space-y-5">
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Calculator className="h-5 w-5 text-amber-400" />
                                <h3 className="font-bold text-white text-lg">POS Discount & Billing Engine</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="Table No"
                                    value={tableNo}
                                    onChange={(e) => setTableNo(e.target.value)}
                                    className="w-20 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-center text-white focus:outline-none"
                                />
                                <select
                                    value={orderType}
                                    onChange={(e) => setOrderType(e.target.value as any)}
                                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-white focus:outline-none"
                                >
                                    <option value="dine-in">Dine-in</option>
                                    <option value="takeaway">Takeaway</option>
                                    <option value="delivery">Delivery</option>
                                </select>
                            </div>
                        </div>

                        {/* Bill Amount Input */}
                        <div>
                            <label className="text-xs font-semibold text-zinc-300">
                                Bill Subtotal Amount (₹) *
                            </label>
                            <div className="relative mt-1.5">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-lg text-zinc-400">
                                    ₹
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={subtotalInput}
                                    onChange={(e) => setSubtotalInput(e.target.value)}
                                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-3 text-xl font-bold text-white focus:border-amber-500 focus:outline-none font-mono"
                                />
                            </div>

                            {/* Quick Amount Buttons */}
                            <div className="mt-2 flex flex-wrap gap-2">
                                {[500, 850, 1000, 1500, 2500, 3500].map((amt) => (
                                    <button
                                        key={amt}
                                        type="button"
                                        onClick={() => setSubtotalInput(String(amt))}
                                        className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs font-mono text-zinc-300 hover:border-amber-500 hover:text-white"
                                    >
                                        ₹{amt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Referral Discount Option (If customer was referred and on 1st visit) */}
                        {lookupResult?.customer?.referredByMasterId && !lookupResult?.customer?.referralFirstVisitUsed && (
                            <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 text-xs font-semibold text-purple-300">
                                        <input
                                            type="checkbox"
                                            checked={applyReferralDiscount}
                                            onChange={(e) => setApplyReferralDiscount(e.target.checked)}
                                            className="rounded border-purple-500 text-purple-600 focus:ring-purple-500"
                                        />
                                        Apply Referral 1st Visit Welcome Discount
                                    </label>
                                </div>

                                {applyReferralDiscount && (
                                    <div className="flex items-center gap-2 pt-1">
                                        {[5, 10, 15].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => setSelectedReferralDiscount(pct)}
                                                className={`flex-1 rounded-xl py-1.5 text-xs font-bold transition ${selectedReferralDiscount === pct
                                                        ? "bg-purple-600 text-white shadow"
                                                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                                    }`}
                                            >
                                                {pct}% Discount
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Master Card Discount Choice Toggle */}
                        {(lookupResult?.card?.cardType === "master" || lookupResult?.customer?.cardType === "master") && (
                            <div className="rounded-2xl border border-purple-500/40 bg-purple-950/20 p-3.5 space-y-2">
                                <p className="text-xs font-semibold text-purple-300">Master Card Member Benefit:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMasterDiscountChoice("credit_500")}
                                        className={`rounded-xl py-2 px-2 text-xs font-bold transition ${
                                            masterDiscountChoice === "credit_500"
                                                ? "bg-purple-600 text-white shadow ring-1 ring-purple-400"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        }`}
                                    >
                                        ✨ ₹500 Free Credit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMasterDiscountChoice("percent_15")}
                                        className={`rounded-xl py-2 px-2 text-xs font-bold transition ${
                                            masterDiscountChoice === "percent_15"
                                                ? "bg-purple-600 text-white shadow ring-1 ring-purple-400"
                                                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                                        }`}
                                    >
                                        🏷️ Flat 15% Discount
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Live Calculation Preview Breakdown */}
                        {calcResult && (
                            <div className="rounded-2xl border border-zinc-800 bg-black/60 p-4 space-y-3">
                                <div className="flex justify-between text-sm text-zinc-400">
                                    <span>Subtotal:</span>
                                    <span className="font-mono text-white">₹{calcResult.subtotal}</span>
                                </div>

                                <div className="flex justify-between text-sm">
                                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                        <Sparkles className="h-4 w-4" />
                                        Membership Discount ({calcResult.discountPercent}%):
                                    </span>
                                    <span className="font-mono font-bold text-emerald-400">
                                        - ₹{calcResult.discountAmount}
                                    </span>
                                </div>

                                {calcResult.masterExplanation && (
                                    <p className="text-xs text-purple-300 italic border-l-2 border-purple-500 pl-2">
                                        {calcResult.masterExplanation}
                                    </p>
                                )}

                                <div className="border-t border-zinc-800 pt-2 flex justify-between items-baseline">
                                    <span className="text-base font-bold text-white">Net Payable:</span>
                                    <span className="font-mono text-3xl font-black text-amber-400">
                                        ₹{calcResult.netTotal}
                                    </span>
                                </div>

                                {/* Points Earned Projection */}
                                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
                                    <span className="flex items-center gap-1 text-emerald-400">
                                        <Coins className="h-3.5 w-3.5" /> +{calcResult.customerPointsEarned} pts for Customer
                                    </span>
                                    {calcResult.referrerPointsToAward > 0 && (
                                        <span className="flex items-center gap-1 text-purple-400">
                                            <Gift className="h-3.5 w-3.5" /> +{calcResult.referrerPointsToAward} pts to Master Referrer
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Payment Method Selector & Process Button */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-2">
                                {(["upi", "cash", "card"] as const).map((method) => (
                                    <button
                                        key={method}
                                        type="button"
                                        onClick={() => setPaymentMethod(method)}
                                        className={`touch-target min-h-[44px] flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${paymentMethod === method
                                                ? "bg-amber-500 text-black shadow-lg"
                                                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                            }`}
                                    >
                                        {method}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleProcessBill}
                                disabled={processing || !calcResult || calcResult.subtotal <= 0}
                                className="touch-target min-h-[48px] w-full rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 py-3.5 text-base font-bold text-black shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:opacity-95 disabled:opacity-40 transition flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Receipt className="h-5 w-5" />
                                {processing ? "Processing Bill..." : `Confirm Payment & Record Visit (₹${calcResult?.netTotal ?? 0})`}
                            </button>
                        </div>
                    </div>

                    {/* Receipt Output Modal / Card */}
                    {completedBill && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="rounded-3xl border border-emerald-500/40 bg-emerald-950/20 p-5 shadow-2xl space-y-3"
                        >
                            <div className="flex items-center justify-between text-emerald-300">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                    <h4 className="font-bold">Bill #{completedBill.summary?.billNumber} Processed Successfully!</h4>
                                </div>
                                <span className="font-mono text-xs text-zinc-400">
                                    {new Date().toLocaleTimeString()}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs font-mono text-zinc-300">
                                <div>Subtotal: ₹{completedBill.summary?.subtotal}</div>
                                <div className="text-emerald-400">Discount: -₹{completedBill.summary?.discountAmount}</div>
                                <div className="font-bold text-white">Net: ₹{completedBill.summary?.netTotal}</div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </div>

            {/* Quick Link Card Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full max-w-md rounded-3xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                            <div className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-amber-400" />
                                <h3 className="font-bold text-white text-lg">Link Membership Card to Guest</h3>
                            </div>
                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="rounded-full p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {linkError && (
                            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                                {linkError}
                            </div>
                        )}

                        <form onSubmit={handleLinkSubmit} className="space-y-3.5">
                            <div>
                                <label className="text-xs font-semibold text-zinc-300">Physical Card Code *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. CMG001, CMM005"
                                    value={linkCardCode}
                                    onChange={(e) => setLinkCardCode(e.target.value.toUpperCase())}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white uppercase font-mono focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">Guest Mobile Number *</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="e.g. +91 9876543210"
                                    value={linkPhone}
                                    onChange={(e) => setLinkPhone(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-zinc-300">Guest Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Anand Varma"
                                    value={linkName}
                                    onChange={(e) => setLinkName(e.target.value)}
                                    className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-purple-300">Referred by Master Card (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. CMM001 or REF-CMM001"
                                    value={linkReferredBy}
                                    onChange={(e) => setLinkReferredBy(e.target.value.toUpperCase())}
                                    className="mt-1 w-full rounded-xl border border-purple-500/30 bg-zinc-950 px-3 py-2 text-xs text-white uppercase focus:border-purple-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowLinkModal(false)}
                                    className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={linking}
                                    className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 text-xs font-bold text-black shadow-lg hover:opacity-90 disabled:opacity-50"
                                >
                                    {linking ? "Linking..." : "Link & Activate"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {/* Device Camera Barcode / QR Scanner Modal */}
            <CameraBarcodeScannerModal
                isOpen={showCameraScanner}
                onClose={() => setShowCameraScanner(false)}
                onScanSuccess={(scannedCode) => {
                    setSearchQuery(scannedCode);
                    handleLookup(scannedCode);
                }}
            />
        </div>
    );
}
