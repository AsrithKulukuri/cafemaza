"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LuxuryButton } from "@/components/ui/LuxuryButton";
import { usePremiumUI } from "@/components/providers/PremiumUIProvider";
import { apiFetch } from "@/lib/api";

type Table = {
    id: number;
    seats: number;
};

type ReserveTableClientProps = {
    tables: Table[];
};

export function ReserveTableClient({ tables }: ReserveTableClientProps) {
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [bookedTables, setBookedTables] = useState<number[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
    const { pushToast } = usePremiumUI();
    const [form, setForm] = useState({ name: "", phone: "", guests: "2", date: "", time: "", request: "" });

    const isValid = useMemo(
        () => Boolean(form.name && form.phone && form.date && form.time && selectedTable),
        [form, selectedTable]
    );

    const timeSlots = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

    useEffect(() => {
        async function loadAvailability() {
            if (!form.date || !form.time) {
                setBookedTables([]);
                return;
            }

            try {
                setLoadingAvailability(true);
                const availability = await apiFetch<{ bookedTables: number[] }>(
                    `/api/reservations/availability?date=${encodeURIComponent(form.date)}&time=${encodeURIComponent(form.time)}`
                );
                setBookedTables(Array.isArray(availability.bookedTables) ? availability.bookedTables : []);
            } catch {
                setBookedTables([]);
            } finally {
                setLoadingAvailability(false);
            }
        }

        void loadAvailability();
    }, [form.date, form.time]);

    useEffect(() => {
        if (selectedTable && bookedTables.includes(selectedTable)) {
            setSelectedTable(null);
            setError(`Table T${selectedTable} is already booked for this time slot.`);
        }
    }, [bookedTables, selectedTable]);

    const submitReservation = async () => {
        setSubmitted(true);
        setError("");
        if (!isValid) return;

        try {
            setSaving(true);
            await apiFetch("/api/reservations", {
                method: "POST",
                body: JSON.stringify({
                    name: form.name,
                    phone: form.phone,
                    guests: Number(form.guests),
                    date: form.date,
                    time: form.time,
                    tableNumber: selectedTable,
                    specialRequest: form.request,
                }),
            });

            setShowConfirmation(true);
            pushToast("Table reserved successfully");
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : "Reservation failed";
            setError(message);
            pushToast(message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mx-auto grid max-w-7xl gap-8 px-6 pb-20 md:grid-cols-2 md:px-10">
            <section className="glass-card rounded-3xl border border-[#CFAF63]/20 p-8">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Reserve Table</p>
                <h1 className="mt-2 font-(--font-heading) text-4xl text-[#F5F5F5]">Plan Your<br />Luxury Dinner</h1>
                <div className="mt-2 h-px w-16 bg-linear-to-r from-[#CFAF63] to-transparent" />
                <p className="mt-4 mb-6 text-sm text-[#F5F5F5]/70">Secure your perfect table for an unforgettable culinary experience at Cafe Maza.</p>
                <form className="space-y-4">
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Name
                        <input
                            type="text"
                            value={form.name}
                            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                        />
                        {submitted && !form.name ? <span className="mt-1 block text-xs text-[#FF6A00]">Name is required.</span> : null}
                    </label>
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Phone
                        <input
                            type="tel"
                            value={form.phone}
                            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                        />
                        {submitted && !form.phone ? <span className="mt-1 block text-xs text-[#FF6A00]">Phone is required.</span> : null}
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm text-[#F5F5F5]/75">
                            Number of people
                            <select
                                value={form.guests}
                                onChange={(event) => setForm((prev) => ({ ...prev, guests: event.target.value }))}
                                className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                            >
                                {[1, 2, 3, 4].map((count) => (
                                    <option key={count} value={count.toString()}>{count}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block text-sm text-[#F5F5F5]/75">
                            Date
                            <input
                                type="date"
                                value={form.date}
                                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                                className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                            />
                            {submitted && !form.date ? <span className="mt-1 block text-xs text-[#FF6A00]">Date is required.</span> : null}
                        </label>
                    </div>
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Time slot
                        <select
                            value={form.time}
                            onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                        >
                            <option value="">Select a slot</option>
                            {timeSlots.map((slot) => (
                                <option key={slot} value={slot}>{slot}</option>
                            ))}
                        </select>
                        {submitted && !form.time ? <span className="mt-1 block text-xs text-[#FF6A00]">Time slot is required.</span> : null}
                    </label>
                    {form.date && form.time ? (
                        <p className="text-xs text-[#F5F5F5]/70">
                            {loadingAvailability
                                ? "Checking table availability..."
                                : bookedTables.length > 0
                                    ? `Booked tables for ${form.time}: ${bookedTables.map((tableId) => `T${tableId}`).join(", ")}`
                                    : "All tables are currently available for this slot."}
                        </p>
                    ) : null}
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Special Request
                        <textarea
                            rows={3}
                            value={form.request}
                            onChange={(event) => setForm((prev) => ({ ...prev, request: event.target.value }))}
                            placeholder="Birthday setup, high chair, window seat..."
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                        />
                    </label>
                    <LuxuryButton className="w-full py-3" onClick={submitReservation}>
                        {saving ? "Saving..." : "Confirm Reservation"}
                    </LuxuryButton>
                    {submitted && !selectedTable ? <p className="text-xs text-[#FF6A00]">Select a table to continue.</p> : null}
                    {error ? <p className="text-xs text-rose-300">{error}</p> : null}
                </form>
            </section>

            <section className="glass-card rounded-3xl border border-[#CFAF63]/20 p-7">
                <h2 className="font-(--font-heading) text-3xl text-[#F5F5F5]">Select Your Table</h2>
                <div className="mt-5 grid grid-cols-3 gap-4">
                    {tables.map((table) => (
                        <button
                            key={table.id}
                            type="button"
                            onClick={() => {
                                if (bookedTables.includes(table.id)) {
                                    pushToast(`Table T${table.id} is already booked`);
                                    return;
                                }
                                setSelectedTable(table.id);
                            }}
                            disabled={bookedTables.includes(table.id)}
                            className={`rounded-2xl border p-4 text-center transition ${selectedTable === table.id
                                ? "border-[#FF6A00] bg-[#FF6A00]/20 shadow-[0_0_18px_rgba(255,106,0,0.45)]"
                                : bookedTables.includes(table.id)
                                    ? "border-rose-400/35 bg-rose-500/10 opacity-70 cursor-not-allowed"
                                    : "border-[#CFAF63]/20 bg-[#161616] hover:-translate-y-1"
                                }`}
                        >
                            <p className="font-(--font-heading) text-2xl">T{table.id}</p>
                            <p className="text-xs text-[#F5F5F5]/70">{table.seats} Seats</p>
                            {bookedTables.includes(table.id) ? <p className="mt-1 text-[10px] font-semibold text-rose-300">Already booked</p> : null}
                        </button>
                    ))}
                </div>
            </section>

            <AnimatePresence>
                {showConfirmation ? (
                    <motion.div
                        className="fixed inset-0 z-90 grid place-items-center bg-black/70 p-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="glass-card w-full max-w-md rounded-2xl border border-[#CFAF63]/30 p-7 text-center"
                        >
                            <h3 className="font-(--font-heading) text-3xl text-[#F5F5F5]">Reservation Confirmed</h3>
                            <p className="mt-3 text-sm text-[#F5F5F5]/75">Table T{selectedTable} is reserved for {form.name}. We look forward to serving you.</p>
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="mt-5 rounded-full border border-[#CFAF63]/35 px-5 py-2 text-sm"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}