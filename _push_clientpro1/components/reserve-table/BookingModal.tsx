"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type BookingModalProps = {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

type BookingForm = {
    name: string;
    phone: string;
    guests: string;
    date: string;
    time: string;
    tableNumber: string;
    request: string;
};

const timeSlots = ["18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
const tableOptions = Array.from({ length: 12 }).map((_, index) => index + 1);

const initialForm: BookingForm = {
    name: "",
    phone: "",
    guests: "2",
    date: "",
    time: "",
    tableNumber: "",
    request: "",
};

export function BookingModal({ open, onClose, onSuccess }: BookingModalProps) {
    const [form, setForm] = useState<BookingForm>(initialForm);
    const [submitted, setSubmitted] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [bookedTables, setBookedTables] = useState<number[]>([]);
    const [loadingAvailability, setLoadingAvailability] = useState(false);

    const isValid = useMemo(
        () => Boolean(form.name.trim() && form.phone.trim() && form.date && form.time && form.tableNumber),
        [form]
    );

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
        if (!form.tableNumber) {
            return;
        }

        const selectedTable = Number(form.tableNumber);
        if (bookedTables.includes(selectedTable)) {
            setForm((prev) => ({ ...prev, tableNumber: "" }));
            setError(`Table T${selectedTable} is already booked for this time slot.`);
        }
    }, [bookedTables, form.tableNumber]);

    const update = (field: keyof BookingForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
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
                    tableNumber: Number(form.tableNumber),
                    specialRequest: form.request,
                }),
            });

            onSuccess();
            setForm(initialForm);
            setSubmitted(false);
            onClose();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Reservation failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {open ? (
                <>
                    <motion.button
                        aria-label="Close booking modal"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-140 bg-black/70 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 22 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.28, ease: "easeOut" }}
                        className="fixed left-1/2 top-1/2 z-150 flex max-h-[90dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-[#CFAF63]/25 bg-[#121212]/95 p-4 shadow-[0_0_60px_rgba(255,106,0,0.2)] backdrop-blur-xl sm:p-6"
                    >
                        <h2 className="font-(--font-heading) text-2xl text-[#F5F5F5] sm:text-3xl">Book Table</h2>
                        <p className="mt-2 text-sm text-[#F5F5F5]/68">Reserve your premium table in seconds.</p>

                        <form onSubmit={handleSubmit} className="mt-4 flex min-h-0 flex-1 flex-col">
                            <div className="grid min-h-0 gap-4 overflow-y-auto pr-1">
                                <label className="text-sm text-[#F5F5F5]/75">
                                    Name
                                    <input
                                        value={form.name}
                                        onChange={(event) => update("name", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                    />
                                    {submitted && !form.name.trim() ? <span className="mt-1 block text-xs text-[#FF6A00]">Name is required.</span> : null}
                                </label>

                                <label className="text-sm text-[#F5F5F5]/75">
                                    Phone
                                    <input
                                        value={form.phone}
                                        onChange={(event) => update("phone", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                    />
                                    {submitted && !form.phone.trim() ? <span className="mt-1 block text-xs text-[#FF6A00]">Phone is required.</span> : null}
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="text-sm text-[#F5F5F5]/75">
                                        Number of people
                                        <select
                                            value={form.guests}
                                            onChange={(event) => update("guests", event.target.value)}
                                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                        >
                                            {[1, 2, 3, 4].map((count) => (
                                                <option key={count} value={count.toString()}>
                                                    {count}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="text-sm text-[#F5F5F5]/75">
                                        Date
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(event) => update("date", event.target.value)}
                                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                        />
                                        {submitted && !form.date ? <span className="mt-1 block text-xs text-[#FF6A00]">Date is required.</span> : null}
                                    </label>
                                </div>

                                <label className="text-sm text-[#F5F5F5]/75">
                                    Time slot
                                    <select
                                        value={form.time}
                                        onChange={(event) => update("time", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                    >
                                        <option value="">Select a slot</option>
                                        {timeSlots.map((slot) => (
                                            <option key={slot} value={slot}>
                                                {slot}
                                            </option>
                                        ))}
                                    </select>
                                    {submitted && !form.time ? <span className="mt-1 block text-xs text-[#FF6A00]">Time slot is required.</span> : null}
                                </label>

                                <label className="text-sm text-[#F5F5F5]/75">
                                    Table
                                    <select
                                        value={form.tableNumber}
                                        onChange={(event) => {
                                            setError("");
                                            update("tableNumber", event.target.value);
                                        }}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                    >
                                        <option value="">Select a table</option>
                                        {tableOptions.map((tableId) => (
                                            <option key={tableId} value={String(tableId)} disabled={bookedTables.includes(tableId)}>
                                                {bookedTables.includes(tableId) ? `T${tableId} (Already booked)` : `T${tableId}`}
                                            </option>
                                        ))}
                                    </select>
                                    {submitted && !form.tableNumber ? <span className="mt-1 block text-xs text-[#FF6A00]">Table is required.</span> : null}
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

                                <label className="text-sm text-[#F5F5F5]/75">
                                    Special request
                                    <textarea
                                        rows={3}
                                        value={form.request}
                                        onChange={(event) => update("request", event.target.value)}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#0E0E0E] px-4 py-3 outline-none transition focus:border-[#FF6A00]"
                                    />
                                </label>

                                {error ? <p className="text-xs text-rose-300">{error}</p> : null}
                            </div>

                            <div className="mt-3 flex justify-end gap-3 border-t border-[#CFAF63]/15 bg-[#121212]/95 pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
                                <button type="button" onClick={onClose} className="rounded-full border border-[#CFAF63]/35 px-5 py-2.5 text-sm text-[#F5F5F5]/88">
                                    Cancel
                                </button>
                                <button type="submit" className="luxury-button px-6 py-2.5 text-sm">
                                    {saving ? "Reserving..." : "Reserve Table"}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </>
            ) : null}
        </AnimatePresence>
    );
}
