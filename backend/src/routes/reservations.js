import express from "express";

import { Reservation } from "../models/Reservation.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";

const router = express.Router();

const DEFAULT_RESERVATION_DURATION_MINUTES = 90;

function getReservationStart(date, time) {
    return new Date(`${date}T${time}:00`);
}

function getReservationEnd(reservation) {
    if (reservation.reservedUntil instanceof Date) {
        return reservation.reservedUntil;
    }

    const durationMinutes = Number(reservation.durationMinutes || DEFAULT_RESERVATION_DURATION_MINUTES);
    return new Date(getReservationStart(reservation.date, reservation.time).getTime() + durationMinutes * 60 * 1000);
}

function reservationOverlaps(targetDate, targetTime, reservation) {
    const targetStart = getReservationStart(targetDate, targetTime);
    const targetEnd = new Date(targetStart.getTime() + DEFAULT_RESERVATION_DURATION_MINUTES * 60 * 1000);
    const reservationStart = getReservationStart(reservation.date, reservation.time);
    const reservationEnd = getReservationEnd(reservation);

    return reservationStart < targetEnd && targetStart < reservationEnd;
}

router.get("/availability", async (req, res, next) => {
    try {
        const { date, time } = req.query;

        if (!date || !time) {
            return res.status(400).json({ message: "date and time are required" });
        }

        const reservations = await Reservation.find({
            date: String(date),
            tableNumber: { $exists: true },
            status: { $ne: "cancelled" },
        }).select("tableNumber date time durationMinutes reservedUntil status -_id");

        const bookedTables = reservations
            .filter((reservation) => reservationOverlaps(String(date), String(time), reservation))
            .map((reservation) => reservation.tableNumber);
        return res.json({ bookedTables });
    } catch (error) {
        return next(error);
    }
});

router.post("/", async (req, res, next) => {
    try {
        const { name, phone, guests, date, time, tableNumber, specialRequest, durationMinutes } = req.body;

        if (!name || !phone || !guests || !date || !time || !tableNumber) {
            return res.status(400).json({ message: "All reservation fields are required" });
        }

        const existingReservation = await Reservation.find({
            date: String(date),
            tableNumber: Number(tableNumber),
            status: { $ne: "cancelled" },
        });

        const hasOverlap = existingReservation.some((reservation) => reservationOverlaps(String(date), String(time), reservation));

        if (hasOverlap) {
            return res.status(409).json({
                message: `Table T${tableNumber} is already booked for that time window`,
            });
        }

        const startAt = getReservationStart(String(date), String(time));
        const finalDuration = Number(durationMinutes) > 0 ? Number(durationMinutes) : DEFAULT_RESERVATION_DURATION_MINUTES;

        const created = await Reservation.create({
            name,
            phone,
            guests,
            date,
            time,
            tableNumber,
            specialRequest: specialRequest ? String(specialRequest).trim() : undefined,
            durationMinutes: finalDuration,
            reservedUntil: new Date(startAt.getTime() + finalDuration * 60 * 1000),
        });
        return res.status(201).json(created);
    } catch (error) {
        return next(error);
    }
});

router.get("/", auth, permit("admin", "staff", "manager"), async (req, res, next) => {
    try {
        const reservations = await Reservation.find().sort({ createdAt: -1 });
        return res.json(reservations);
    } catch (error) {
        return next(error);
    }
});

router.post("/:id/cancel", auth, permit("admin", "staff", "manager"), async (req, res, next) => {
    try {
        const updated = await Reservation.findByIdAndUpdate(
            req.params.id,
            { status: "cancelled" },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

router.put("/:id/status", auth, permit("admin", "staff", "manager"), async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ["confirmed", "completed", "cancelled"];

        if (!allowed.includes(String(status))) {
            return res.status(400).json({ message: "Invalid reservation status value" });
        }

        const updated = await Reservation.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Reservation not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

export default router;
