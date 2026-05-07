"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Monitor, Users, Cake, Music, Film, Tv, ChevronRight, Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ScreeningBooking } from "@/data/mockData";
import { apiFetch } from "@/lib/api";

type BookingFormData = {
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    guests: number;
    occasion: ScreeningBooking["occasion"];
    contentType: ScreeningBooking["contentType"];
    specialRequest: string;
};

const INITIAL_FORM: BookingFormData = {
    name: "",
    phone: "",
    email: "",
    date: "",
    time: "",
    guests: 2,
    occasion: "Casual",
    contentType: "Movie",
    specialRequest: "",
};

function ScreeningRoomLayout() {
    return (
        <div className="relative mx-auto w-full max-w-xs select-none py-2">
            {/* Screen */}
            <motion.div
                initial={{ opacity: 0, scaleX: 0.6 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="relative mx-auto mb-3 h-16 w-[90%] rounded-lg bg-gradient-to-b from-[#1A1A2E] to-[#0F0F1A] border border-[#CFAF63]/50 overflow-hidden flex items-center justify-center"
            >
                {/* screen glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/20 via-[#8B5CF6]/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-[#CFAF63]/60 to-transparent" />
                <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                    className="text-xs tracking-[0.18em] text-[#CFAF63] font-semibold z-10"
                >
                    HD SCREEN
                </motion.div>
                {/* scan-line shimmer */}
                <motion.div
                    animate={{ y: [-30, 70] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-x-0 h-4 bg-gradient-to-b from-transparent via-white/6 to-transparent pointer-events-none"
                />
            </motion.div>
            {/* Projection beam */}
            <div className="relative mx-auto mb-4 w-[70%]">
                <div className="h-3 w-full bg-gradient-to-b from-[#CFAF63]/20 to-transparent" style={{ clipPath: "polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)" }} />
            </div>
            {/* Table */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="relative mx-auto w-[78%] rounded-2xl border border-[#CFAF63]/40 bg-gradient-to-b from-[#1C1A12] to-[#141210] p-3 shadow-[0_0_30px_rgba(207,175,99,0.12)]"
            >
                <div className="text-center text-[10px] uppercase tracking-[0.16em] text-[#CFAF63]/70 mb-3">Private Table</div>
                {/* Seats: top row */}
                <div className="flex justify-around mb-1">
                    {[0, 1].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-full border border-[#CFAF63]/50 bg-[#1A1A1A] flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-[#CFAF63]/40" />
                        </div>
                    ))}
                </div>
                {/* Table surface */}
                <div className="mx-auto my-2 h-10 w-[85%] rounded-xl border border-[#CFAF63]/30 bg-[#0E0C07] flex items-center justify-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-[#FF6A00]/70" />
                    <div className="w-2 h-2 rounded-full bg-[#CFAF63]/70" />
                    <div className="w-2 h-2 rounded-full bg-[#FF6A00]/70" />
                </div>
                {/* Seats: bottom row */}
                <div className="flex justify-around mt-1">
                    {[0, 1].map((i) => (
                        <div key={i} className="w-7 h-7 rounded-full border border-[#CFAF63]/50 bg-[#1A1A1A] flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-[#CFAF63]/40" />
                        </div>
                    ))}
                </div>
            </motion.div>
            <p className="mt-2 text-center text-[10px] text-[#999] tracking-[0.12em]">UP TO 4 GUESTS</p>
        </div>
    );
}

interface ScreeningBookingModalProps {
    onClose: () => void;
}

export function ScreeningBookingModal({ onClose }: ScreeningBookingModalProps) {
    const [step, setStep] = useState<"layout" | "form" | "confirm">("layout");
    const [form, setForm] = useState<BookingFormData>(INITIAL_FORM);
    const [errors, setErrors] = useState<Partial<Record<keyof BookingFormData, string>>>({});
    const [saving, setSaving] = useState(false);
    const [requestError, setRequestError] = useState("");

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const update = (field: keyof BookingFormData, value: string | number) => {
        setForm((f) => ({ ...f, [field]: value }));
        setErrors((e) => ({ ...e, [field]: undefined }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof BookingFormData, string>> = {};
        if (!form.name.trim()) newErrors.name = "Name is required";
        if (!/^\d{10}$/.test(form.phone.trim())) newErrors.phone = "Enter a valid 10-digit phone";
        if (!/\S+@\S+\.\S+/.test(form.email.trim())) newErrors.email = "Enter a valid email";
        if (!form.date) newErrors.date = "Select a date";
        if (!form.time) newErrors.time = "Select a time";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        setRequestError("");

        if (!validate()) {
            return;
        }

        try {
            setSaving(true);

            const contentTypeMap: Record<ScreeningBooking["contentType"], "movie" | "sports" | "custom"> = {
                "Movie": "movie",
                "Sports Match": "sports",
                "Custom Content": "custom",
            };

            await apiFetch("/api/screening", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    guests: form.guests,
                    date: form.date,
                    time: form.time,
                    occasion: form.occasion,
                    contentType: contentTypeMap[form.contentType],
                }),
            });

            setStep("confirm");
        } catch (error) {
            setRequestError(error instanceof Error ? error.message : "Failed to create booking");
        } finally {
            setSaving(false);
        }
    };

    const contentTypes: { value: ScreeningBooking["contentType"]; icon: LucideIcon; color: string }[] = [
        { value: "Sports Match", icon: Tv, color: "from-[#3B82F6]" },
        { value: "Movie", icon: Film, color: "from-[#8B5CF6]" },
        { value: "Custom Content", icon: Monitor, color: "from-[#FF6A00]" },
    ];

    const occasions: { value: ScreeningBooking["occasion"]; icon: LucideIcon }[] = [
        { value: "Birthday", icon: Cake },
        { value: "Anniversary", icon: Music },
        { value: "Casual", icon: Users },
    ];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <AnimatePresence mode="wait">
                {step === "layout" && (
                    <motion.div
                        key="layout"
                        initial={{ opacity: 0, scale: 0.92, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.94, y: -10 }}
                        transition={{ duration: 0.35, ease: "easeOut" }}
                        className="relative w-full max-w-lg glass-card rounded-3xl border border-[#CFAF63]/30 bg-[#0D0D0D] p-8 shadow-[0_0_60px_rgba(207,175,99,0.15)]"
                    >
                        <button
                            onClick={onClose}
                            className="absolute right-5 top-5 rounded-full bg-[#1A1A1A] p-2 text-[#999] hover:text-[#F5F5F5] transition"
                        >
                            <X size={18} />
                        </button>

                        <p className="text-xs uppercase tracking-[0.22em] text-[#CFAF63] mb-1">Exclusive Experience</p>
                        <h2 className="font-[var(--font-heading)] text-3xl text-[#F5F5F5] mb-1">Private Screening</h2>
                        <p className="text-sm text-[#F5F5F5]/65 mb-6">
                            A cinematic dining experience tailored just for you.
                        </p>

                        <ScreeningRoomLayout />

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            {[
                                { icon: "🎬", label: "Large HD Screen" },
                                { icon: "🍖", label: "Live Grill Dining" },
                                { icon: "👥", label: "Up to 4 Guests" },
                                { icon: "🎂", label: "Celebrations" },
                            ].map((f) => (
                                <div key={f.label} className="flex items-center gap-2 text-sm text-[#F5F5F5]/75 rounded-xl border border-[#CFAF63]/15 bg-[#111]/70 px-3 py-2">
                                    <span>{f.icon}</span>
                                    {f.label}
                                </div>
                            ))}
                        </div>

                        <motion.button
                            onClick={() => setStep("form")}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="mt-7 w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] py-3.5 font-semibold text-[#111] hover:shadow-[0_0_30px_rgba(207,175,99,0.4)] transition"
                        >
                            Book Screening <ChevronRight size={18} />
                        </motion.button>
                    </motion.div>
                )}

                {step === "form" && (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0, x: 40 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="relative w-full max-w-lg glass-card rounded-3xl border border-[#CFAF63]/30 bg-[#0D0D0D] p-8 shadow-[0_0_60px_rgba(207,175,99,0.15)] max-h-[92vh] overflow-y-auto"
                    >
                        <button
                            onClick={() => setStep("layout")}
                            className="absolute left-5 top-5 rounded-full bg-[#1A1A1A] px-3 py-1.5 text-xs text-[#999] hover:text-[#F5F5F5] transition"
                        >
                            ← Back
                        </button>
                        <button
                            onClick={onClose}
                            className="absolute right-5 top-5 rounded-full bg-[#1A1A1A] p-2 text-[#999] hover:text-[#F5F5F5] transition"
                        >
                            <X size={18} />
                        </button>

                        <p className="text-xs uppercase tracking-[0.22em] text-[#CFAF63] mb-1 mt-2">Booking Details</p>
                        <h2 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5] mb-6">Reserve Your Experience</h2>

                        <div className="space-y-4">
                            {/* Name + Phone */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-[#999] mb-1 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => update("name", e.target.value)}
                                        placeholder="Arjun Sharma"
                                        className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#555] focus:border-[#CFAF63]/60 focus:outline-none transition"
                                    />
                                    {errors.name && <p className="text-[10px] text-[#FF6A00] mt-1 ml-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs text-[#999] mb-1 ml-1">Phone</label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={(e) => update("phone", e.target.value)}
                                        placeholder="9876543210"
                                        className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#555] focus:border-[#CFAF63]/60 focus:outline-none transition"
                                    />
                                    {errors.phone && <p className="text-[10px] text-[#FF6A00] mt-1 ml-1">{errors.phone}</p>}
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-xs text-[#999] mb-1 ml-1">Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => update("email", e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#555] focus:border-[#CFAF63]/60 focus:outline-none transition"
                                />
                                {errors.email && <p className="text-[10px] text-[#FF6A00] mt-1 ml-1">{errors.email}</p>}
                            </div>

                            {/* Date + Time */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-[#999] mb-1 ml-1">Date</label>
                                    <input
                                        type="date"
                                        value={form.date}
                                        onChange={(e) => update("date", e.target.value)}
                                        min={new Date().toISOString().split("T")[0]}
                                        className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] focus:border-[#CFAF63]/60 focus:outline-none transition [color-scheme:dark]"
                                    />
                                    {errors.date && <p className="text-[10px] text-[#FF6A00] mt-1 ml-1">{errors.date}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs text-[#999] mb-1 ml-1">Time</label>
                                    <select
                                        value={form.time}
                                        onChange={(e) => update("time", e.target.value)}
                                        className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] focus:border-[#CFAF63]/60 focus:outline-none transition"
                                    >
                                        <option value="">Select time</option>
                                        {["17:00", "18:00", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30"].map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    {errors.time && <p className="text-[10px] text-[#FF6A00] mt-1 ml-1">{errors.time}</p>}
                                </div>
                            </div>

                            {/* Guests */}
                            <div>
                                <label className="block text-xs text-[#999] mb-2 ml-1">Number of Guests</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map((n) => (
                                        <button
                                            key={n}
                                            onClick={() => update("guests", n)}
                                            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl border text-sm font-semibold transition ${form.guests === n
                                                ? "bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] border-transparent text-[#111]"
                                                : "border-[#CFAF63]/20 text-[#F5F5F5] hover:border-[#CFAF63]/50"
                                                }`}
                                        >
                                            <Users size={13} /> {n}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Occasion */}
                            <div>
                                <label className="block text-xs text-[#999] mb-2 ml-1">Occasion</label>
                                <div className="flex gap-2">
                                    {occasions.map(({ value, icon: Icon }) => (
                                        <button
                                            key={value}
                                            onClick={() => update("occasion", value)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition ${form.occasion === value
                                                ? "bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] border-transparent text-[#111]"
                                                : "border-[#CFAF63]/20 text-[#F5F5F5] hover:border-[#CFAF63]/50"
                                                }`}
                                        >
                                            <Icon size={13} /> {value}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Content Type */}
                            <div>
                                <label className="block text-xs text-[#999] mb-2 ml-1">Select Content Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {contentTypes.map(({ value, icon: Icon, color }) => (
                                        <button
                                            key={value}
                                            onClick={() => update("contentType", value)}
                                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition ${form.contentType === value
                                                ? `bg-gradient-to-b ${color}/20 to-transparent border-[#CFAF63]/60 text-[#CFAF63]`
                                                : "border-[#CFAF63]/15 text-[#F5F5F5]/70 hover:border-[#CFAF63]/40"
                                                }`}
                                        >
                                            <Icon size={20} />
                                            <span className="text-center leading-tight">{value}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Special Request */}
                            <div>
                                <label className="block text-xs text-[#999] mb-1 ml-1">Special Request <span className="text-[#666]">(optional)</span></label>
                                <textarea
                                    value={form.specialRequest}
                                    onChange={(e) => update("specialRequest", e.target.value)}
                                    placeholder="Any special arrangements, preferences or content requests…"
                                    rows={3}
                                    className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#111] px-4 py-3 text-sm text-[#F5F5F5] placeholder-[#555] focus:border-[#CFAF63]/60 focus:outline-none transition resize-none"
                                />
                            </div>
                        </div>

                        <motion.button
                            onClick={handleSubmit}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            disabled={saving}
                            className="mt-6 w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] py-3.5 font-semibold text-[#111] hover:shadow-[0_0_30px_rgba(207,175,99,0.4)] transition"
                        >
                            {saving ? "Booking..." : "Confirm Booking"} <ChevronRight size={18} />
                        </motion.button>
                        {requestError ? <p className="mt-2 text-xs text-rose-300">{requestError}</p> : null}
                    </motion.div>
                )}

                {step === "confirm" && (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="relative w-full max-w-md glass-card rounded-3xl border border-[#CFAF63]/35 bg-[#0D0D0D] p-8 text-center shadow-[0_0_80px_rgba(207,175,99,0.2)]"
                    >
                        {/* Golden glow */}
                        <div className="absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(207,175,99,0.12),transparent_60%)] pointer-events-none" />

                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#CFAF63] to-[#FF6A00] shadow-[0_0_30px_rgba(207,175,99,0.5)]"
                        >
                            <Check size={32} className="text-[#111]" strokeWidth={2.5} />
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25 }}
                            className="text-xs uppercase tracking-[0.22em] text-[#CFAF63] mb-1"
                        >
                            Booking Received
                        </motion.p>
                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="font-[var(--font-heading)] text-3xl text-[#F5F5F5] mb-3"
                        >
                            You&apos;re all set!
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4 }}
                            className="text-sm text-[#F5F5F5]/65 mb-7"
                        >
                            Your Private Screening experience has been booked. We&apos;ll confirm via phone or email shortly.
                        </motion.p>

                        {/* Booking summary pill */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 }}
                            className="mb-7 rounded-2xl border border-[#CFAF63]/25 bg-[#111]/60 p-5 text-left space-y-2.5 text-sm"
                        >
                            {[
                                { label: "Name", value: form.name },
                                { label: "Date & Time", value: `${form.date} at ${form.time}` },
                                { label: "Guests", value: `${form.guests} guest${form.guests > 1 ? "s" : ""}` },
                                { label: "Occasion", value: form.occasion },
                                { label: "Content", value: form.contentType },
                            ].map((row) => (
                                <div key={row.label} className="flex justify-between">
                                    <span className="text-[#999]">{row.label}</span>
                                    <span className="text-[#F5F5F5] font-medium">{row.value}</span>
                                </div>
                            ))}
                        </motion.div>

                        <motion.button
                            onClick={onClose}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="w-full rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] py-3 font-semibold text-[#111] transition hover:shadow-[0_0_25px_rgba(207,175,99,0.35)]"
                        >
                            Done
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
