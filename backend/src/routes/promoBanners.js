import express from "express";

import { PromoBanner } from "../models/PromoBanner.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";

const router = express.Router();

function normalizePayload(input = {}) {
    return {
        title: String(input.title || "").trim(),
        subtitle: String(input.subtitle || "").trim(),
        couponCode: String(input.couponCode || "").trim().toUpperCase(),
        image: String(input.image || "").trim(),
        ctaText: String(input.ctaText || "Order Now").trim(),
        ctaLink: String(input.ctaLink || "/menu").trim(),
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        isActive: input.isActive == null ? true : Boolean(input.isActive),
    };
}

function validatePayload(payload) {
    if (!payload.title) {
        return "Title is required";
    }

    if (payload.startsAt && Number.isNaN(payload.startsAt.getTime())) {
        return "startsAt is invalid";
    }

    if (payload.endsAt && Number.isNaN(payload.endsAt.getTime())) {
        return "endsAt is invalid";
    }

    if (payload.startsAt && payload.endsAt && payload.endsAt.getTime() < payload.startsAt.getTime()) {
        return "endsAt must be after startsAt";
    }

    return null;
}

function withStatus(banner) {
    const now = Date.now();
    const startsAt = banner.startsAt ? new Date(banner.startsAt).getTime() : null;
    const endsAt = banner.endsAt ? new Date(banner.endsAt).getTime() : null;

    const isUpcoming = startsAt != null && startsAt > now;
    const isExpired = endsAt != null && endsAt < now;

    const status = !banner.isActive ? "inactive" : isUpcoming ? "upcoming" : isExpired ? "expired" : "active";

    return {
        ...banner,
        status,
    };
}

router.get("/public", async (req, res, next) => {
    try {
        const banners = await PromoBanner.find({ isActive: true }).sort({ createdAt: -1 }).lean();
        const now = Date.now();

        const activeBanners = banners
            .filter((banner) => {
                const startsAt = banner.startsAt ? new Date(banner.startsAt).getTime() : null;
                const endsAt = banner.endsAt ? new Date(banner.endsAt).getTime() : null;
                if (startsAt != null && startsAt > now) return false;
                if (endsAt != null && endsAt < now) return false;
                return true;
            })
            .slice(0, 3);

        return res.json(activeBanners.map(withStatus));
    } catch (error) {
        return next(error);
    }
});

router.get("/", auth, permit("admin"), async (req, res, next) => {
    try {
        const banners = await PromoBanner.find({}).sort({ createdAt: -1 }).lean();
        return res.json(banners.map(withStatus));
    } catch (error) {
        return next(error);
    }
});

router.post("/", auth, permit("admin"), async (req, res, next) => {
    try {
        const count = await PromoBanner.countDocuments();
        if (count >= 3) {
            return res.status(400).json({ message: "Maximum 3 promo slides allowed" });
        }

        const payload = normalizePayload(req.body);
        const error = validatePayload(payload);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const created = await PromoBanner.create(payload);
        return res.status(201).json(withStatus(created.toObject()));
    } catch (error) {
        return next(error);
    }
});

router.put("/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const payload = normalizePayload(req.body);
        const error = validatePayload(payload);
        if (error) {
            return res.status(400).json({ message: error });
        }

        const updated = await PromoBanner.findByIdAndUpdate(req.params.id, { $set: payload }, { new: true, runValidators: true }).lean();
        if (!updated) {
            return res.status(404).json({ message: "Promo banner not found" });
        }

        return res.json(withStatus(updated));
    } catch (error) {
        return next(error);
    }
});

router.delete("/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const deleted = await PromoBanner.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: "Promo banner not found" });
        }

        return res.json({ ok: true });
    } catch (error) {
        return next(error);
    }
});

export default router;
