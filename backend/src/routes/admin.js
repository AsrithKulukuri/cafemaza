import express from "express";
import bcrypt from "bcryptjs";

import { Order } from "../models/Order.js";
import { Reservation } from "../models/Reservation.js";
import { ScreeningBooking } from "../models/ScreeningBooking.js";
import { Coupon } from "../models/Coupon.js";
import { User } from "../models/User.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";

const router = express.Router();

function normalizeCouponPayload(input = {}) {
    return {
        code: String(input.code || "").trim().toUpperCase(),
        type: String(input.type || "").trim(),
        value: Number(input.value),
        minOrder: Number(input.minOrder),
        maxDiscount: input.maxDiscount == null || input.maxDiscount === "" ? null : Number(input.maxDiscount),
        usageLimit: input.usageLimit == null || input.usageLimit === "" ? null : Number(input.usageLimit),
        perUserLimit: input.perUserLimit == null || input.perUserLimit === "" ? null : Number(input.perUserLimit),
        startDate: input.startDate ? new Date(input.startDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        isActive: input.isActive == null ? true : Boolean(input.isActive),
    };
}

function validateCouponPayload(payload) {
    if (!payload.code) return "Coupon code is required";
    if (!payload.type || !["flat", "percent", "free_delivery"].includes(payload.type)) {
        return "Coupon type must be flat, percent, or free_delivery";
    }
    if (!Number.isFinite(payload.value) || payload.value < 0) {
        return "Coupon value must be a valid non-negative number";
    }
    if (!Number.isFinite(payload.minOrder) || payload.minOrder < 0) {
        return "Minimum order must be a valid non-negative number";
    }
    if (payload.maxDiscount != null && (!Number.isFinite(payload.maxDiscount) || payload.maxDiscount < 0)) {
        return "Max discount must be a non-negative number";
    }
    if (payload.usageLimit != null && (!Number.isFinite(payload.usageLimit) || payload.usageLimit < 1)) {
        return "Usage limit must be at least 1";
    }
    if (payload.perUserLimit != null && (!Number.isFinite(payload.perUserLimit) || payload.perUserLimit < 1)) {
        return "Per-user limit must be at least 1";
    }
    if (!(payload.startDate instanceof Date) || Number.isNaN(payload.startDate.getTime())) {
        return "Start date is invalid";
    }
    if (!(payload.expiryDate instanceof Date) || Number.isNaN(payload.expiryDate.getTime())) {
        return "Expiry date is invalid";
    }
    if (payload.expiryDate.getTime() < payload.startDate.getTime()) {
        return "Expiry date must be after start date";
    }
    if (payload.type === "percent" && payload.value > 100) {
        return "Percentage discount cannot exceed 100";
    }
    if (payload.type !== "percent") {
        payload.maxDiscount = null;
    }
    if (payload.type === "free_delivery") {
        payload.value = 0;
    }
    return null;
}

function withCouponStatus(coupon) {
    const now = new Date();
    const isExpired = new Date(coupon.expiryDate).getTime() < now.getTime();
    const isUpcoming = new Date(coupon.startDate).getTime() > now.getTime();
    const status = !coupon.isActive ? "inactive" : isExpired ? "expired" : isUpcoming ? "upcoming" : "active";

    return {
        ...coupon,
        status,
        remainingUses:
            Number.isFinite(Number(coupon.usageLimit)) && Number(coupon.usageLimit) > 0
                ? Math.max(0, Number(coupon.usageLimit) - Number(coupon.usageCount || 0))
                : null,
    };
}

router.get("/coupon-analytics", auth, permit("admin"), async (req, res, next) => {
    try {
        const couponOrders = await Order.aggregate([
            { $match: { couponCode: { $exists: true, $ne: null, $ne: "" } } },
            {
                $group: {
                    _id: "$couponCode",
                    redemptions: { $sum: 1 },
                    totalDiscount: { $sum: { $ifNull: ["$discountAmount", 0] } },
                    totalRevenue: { $sum: { $ifNull: ["$totalAmount", 0] } },
                    avgOrderValue: { $avg: { $ifNull: ["$totalAmount", 0] } },
                },
            },
            { $sort: { redemptions: -1 } },
        ]);

        const coupons = await Coupon.find({}).lean();
        const couponMap = new Map(coupons.map((coupon) => [String(coupon.code || "").toUpperCase(), coupon]));

        const rows = couponOrders.map((row) => {
            const code = String(row._id || "").toUpperCase();
            const coupon = couponMap.get(code);
            return {
                code,
                redemptions: row.redemptions || 0,
                totalDiscount: row.totalDiscount || 0,
                totalRevenue: row.totalRevenue || 0,
                avgOrderValue: Number((row.avgOrderValue || 0).toFixed(2)),
                type: coupon?.type || null,
                isActive: coupon?.isActive ?? null,
                usageLimit: coupon?.usageLimit ?? null,
                usageCount: coupon?.usageCount ?? 0,
            };
        });

        const summary = {
            totalCoupons: coupons.length,
            totalRedemptions: rows.reduce((sum, row) => sum + row.redemptions, 0),
            totalDiscountGiven: Number(rows.reduce((sum, row) => sum + row.totalDiscount, 0).toFixed(2)),
            topCoupon: rows[0] || null,
        };

        return res.json({ summary, rows });
    } catch (error) {
        return next(error);
    }
});

function clampHistoryDays(rawValue, fallback = 90) {
    const parsed = Number.parseInt(String(rawValue || fallback), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return fallback;
    return Math.min(parsed, 365);
}

function buildUtcDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildDailyHistory(startDate, days, aggregateRows) {
    const historyMap = new Map(
        aggregateRows.map((row) => [row._id, { orders: row.orders || 0, revenue: row.revenue || 0 }])
    );

    const dailyHistory = [];
    const current = new Date(startDate);

    for (let index = 0; index < days; index += 1) {
        const key = buildUtcDateKey(current);
        const summary = historyMap.get(key) || { orders: 0, revenue: 0 };

        dailyHistory.push({
            date: key,
            orders: summary.orders,
            revenue: summary.revenue,
        });

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dailyHistory;
}

router.get("/analytics", auth, permit("admin"), async (req, res, next) => {
    try {
        const historyDays = clampHistoryDays(req.query.days, 90);
        const historyStart = new Date();
        historyStart.setUTCDate(historyStart.getUTCDate() - (historyDays - 1));
        historyStart.setUTCHours(0, 0, 0, 0);

        const totalOrders = await Order.countDocuments();
        const activeOrders = await Order.countDocuments({ status: { $in: ["placed", "preparing", "ready", "out_for_delivery"] } });
        const revenueData = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$totalAmount" } } }]);
        const reservations = await Reservation.countDocuments();
        const screenings = await ScreeningBooking.countDocuments();
        const dailyHistoryRows = await Order.aggregate([
            { $match: { createdAt: { $gte: historyStart } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const dailyHistory = buildDailyHistory(historyStart, historyDays, dailyHistoryRows);

        return res.json({
            totalOrders,
            revenue: revenueData[0]?.revenue ?? 0,
            activeOrders,
            reservations,
            screenings,
            historyDays,
            historyStart,
            dailyHistory,
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/delivery-partners", auth, permit("admin"), async (req, res, next) => {
    try {
        const partners = await User.find({ role: "delivery" })
            .select("name email phone role deliveryProfile createdAt")
            .sort({ createdAt: -1 });

        return res.json(partners);
    } catch (error) {
        return next(error);
    }
});

router.get("/staff-users", auth, permit("admin"), async (req, res, next) => {
    try {
        const staffUsers = await User.find({ role: { $in: ["staff", "bearer", "kitchen", "manager"] } })
            .select("name email phone role createdAt")
            .sort({ createdAt: -1 });

        return res.json(staffUsers);
    } catch (error) {
        return next(error);
    }
});

router.post("/staff-users", auth, permit("admin"), async (req, res, next) => {
    try {
        const { name, email, phone, password, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "name, email, password and role are required" });
        }

        const allowedRoles = ["staff", "bearer", "kitchen", "manager"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid staff role" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const exists = await User.findOne({ email: normalizedEmail });

        if (exists) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const created = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            phone: phone ? String(phone).trim() : undefined,
            password: hashedPassword,
            role,
        });

        return res.status(201).json({
            _id: created._id,
            name: created.name,
            email: created.email,
            phone: created.phone,
            role: created.role,
            createdAt: created.createdAt,
        });
    } catch (error) {
        return next(error);
    }
});

router.put("/staff-users/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const { name, phone, role } = req.body;
        const patch = {};

        if (typeof name === "string") patch.name = name.trim();
        if (typeof phone === "string") patch.phone = phone.trim();

        if (typeof role === "string") {
            const allowedRoles = ["staff", "bearer", "kitchen", "manager"];
            if (!allowedRoles.includes(role)) {
                return res.status(400).json({ message: "Invalid staff role" });
            }

            patch.role = role;
        }

        const updated = await User.findOneAndUpdate(
            { _id: req.params.id, role: { $in: ["staff", "bearer", "kitchen", "manager"] } },
            { $set: patch },
            { new: true, runValidators: true }
        ).select("name email phone role createdAt");

        if (!updated) {
            return res.status(404).json({ message: "Staff user not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

router.post("/delivery-partners", auth, permit("admin"), async (req, res, next) => {
    try {
        const { name, email, phone, password, vehicleNumber, licenseNumber } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email and password are required" });
        }

        const normalizedEmail = String(email).trim().toLowerCase();
        const exists = await User.findOne({ email: normalizedEmail });

        if (exists) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const created = await User.create({
            name: String(name).trim(),
            email: normalizedEmail,
            phone: phone ? String(phone).trim() : undefined,
            password: hashedPassword,
            role: "delivery",
            deliveryProfile: {
                vehicleNumber: vehicleNumber ? String(vehicleNumber).trim() : undefined,
                licenseNumber: licenseNumber ? String(licenseNumber).trim() : undefined,
                isActive: true,
            },
        });

        return res.status(201).json({
            _id: created._id,
            name: created.name,
            email: created.email,
            phone: created.phone,
            role: created.role,
            deliveryProfile: created.deliveryProfile,
            createdAt: created.createdAt,
        });
    } catch (error) {
        return next(error);
    }
});

router.put("/delivery-partners/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const { name, phone, vehicleNumber, licenseNumber, isActive } = req.body;
        const patch = {};

        if (typeof name === "string") patch.name = name.trim();
        if (typeof phone === "string") patch.phone = phone.trim();
        if (typeof vehicleNumber === "string") patch["deliveryProfile.vehicleNumber"] = vehicleNumber.trim();
        if (typeof licenseNumber === "string") patch["deliveryProfile.licenseNumber"] = licenseNumber.trim();
        if (typeof isActive === "boolean") patch["deliveryProfile.isActive"] = isActive;

        const updated = await User.findOneAndUpdate(
            { _id: req.params.id, role: "delivery" },
            { $set: patch },
            { new: true },
        ).select("name email phone role deliveryProfile createdAt");

        if (!updated) {
            return res.status(404).json({ message: "Delivery partner not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

router.get("/coupons", auth, permit("admin"), async (req, res, next) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 }).lean();
        return res.json(coupons.map(withCouponStatus));
    } catch (error) {
        return next(error);
    }
});

router.post("/add-coupon", auth, permit("admin"), async (req, res, next) => {
    try {
        const payload = normalizeCouponPayload(req.body);
        const validationError = validateCouponPayload(payload);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const exists = await Coupon.findOne({ code: payload.code });
        if (exists) {
            return res.status(409).json({ message: "Coupon code already exists" });
        }

        const created = await Coupon.create(payload);
        return res.status(201).json(withCouponStatus(created.toObject()));
    } catch (error) {
        return next(error);
    }
});

router.put("/update-coupon/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const payload = normalizeCouponPayload(req.body);
        const validationError = validateCouponPayload(payload);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const existingWithCode = await Coupon.findOne({ code: payload.code, _id: { $ne: req.params.id } });
        if (existingWithCode) {
            return res.status(409).json({ message: "Coupon code already exists" });
        }

        const updated = await Coupon.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean();
        if (!updated) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        return res.json(withCouponStatus(updated));
    } catch (error) {
        return next(error);
    }
});

router.put("/update-coupon", auth, permit("admin"), async (req, res, next) => {
    try {
        const couponId = String(req.body?.id || req.body?._id || "").trim();
        if (!couponId) {
            return res.status(400).json({ message: "Coupon id is required" });
        }

        const payload = normalizeCouponPayload(req.body);
        const validationError = validateCouponPayload(payload);

        if (validationError) {
            return res.status(400).json({ message: validationError });
        }

        const existingWithCode = await Coupon.findOne({ code: payload.code, _id: { $ne: couponId } });
        if (existingWithCode) {
            return res.status(409).json({ message: "Coupon code already exists" });
        }

        const updated = await Coupon.findByIdAndUpdate(couponId, { $set: payload }, { new: true, runValidators: true }).lean();
        if (!updated) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        return res.json(withCouponStatus(updated));
    } catch (error) {
        return next(error);
    }
});

router.delete("/delete-coupon/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const deleted = await Coupon.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        return res.json({ ok: true });
    } catch (error) {
        return next(error);
    }
});

router.delete("/delete-coupon", auth, permit("admin"), async (req, res, next) => {
    try {
        const couponId = String(req.body?.id || req.query?.id || "").trim();
        if (!couponId) {
            return res.status(400).json({ message: "Coupon id is required" });
        }

        const deleted = await Coupon.findByIdAndDelete(couponId);
        if (!deleted) {
            return res.status(404).json({ message: "Coupon not found" });
        }

        return res.json({ ok: true });
    } catch (error) {
        return next(error);
    }
});

export default router;
