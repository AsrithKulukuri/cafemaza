import express from "express";

import { ScreeningBooking } from "../models/ScreeningBooking.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";

const router = express.Router();

router.post("/", async (req, res, next) => {
    try {
        const { name, phone, guests, date, time, occasion, contentType } = req.body;

        if (!name || !phone || !guests || !date || !time || !occasion || !contentType) {
            return res.status(400).json({ message: "All screening fields are required" });
        }

        if (Number(guests) > 4) {
            return res.status(400).json({ message: "Maximum 4 guests allowed for screening" });
        }

        const normalizedContent = ["movie", "sports", "custom"].includes(String(contentType).toLowerCase())
            ? String(contentType).toLowerCase()
            : null;

        if (!normalizedContent) {
            return res.status(400).json({ message: "contentType must be movie, sports or custom" });
        }

        const created = await ScreeningBooking.create({
            name,
            phone,
            guests: Number(guests),
            date,
            time,
            occasion,
            contentType: normalizedContent,
            status: "pending",
        });

        return res.status(201).json(created);
    } catch (error) {
        return next(error);
    }
});

router.get("/", auth, permit("admin", "staff", "manager"), async (req, res, next) => {
    try {
        const bookings = await ScreeningBooking.find().sort({ createdAt: -1 });
        return res.json(bookings);
    } catch (error) {
        return next(error);
    }
});

router.put("/:id/status", auth, permit("admin", "staff", "manager"), async (req, res, next) => {
    try {
        const { status } = req.body;
        const allowed = ["pending", "confirmed", "completed", "cancelled"];

        if (!allowed.includes(String(status))) {
            return res.status(400).json({ message: "Invalid screening status value" });
        }

        const updated = await ScreeningBooking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Screening booking not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

export default router;
