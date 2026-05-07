import express from "express";

import { MenuItem } from "../models/MenuItem.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";

const router = express.Router();

router.get("/", async (req, res, next) => {
    try {
        const items = await MenuItem.find()
            .select("name category price variants image isVeg isPopular isBestSeller isSpecial isSoldOut tags createdAt")
            .sort({ createdAt: 1, _id: 1 })
            .lean();
        res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=3600");
        return res.json(items);
    } catch (error) {
        return next(error);
    }
});

router.post("/", auth, permit("admin"), async (req, res, next) => {
    try {
        const {
            name,
            category,
            price,
            variants,
            image,
            isVeg,
            isPopular,
            isBestSeller,
            isSpecial,
            isSoldOut,
            tags,
        } = req.body;

        if (!name || !category) {
            return res.status(400).json({ message: "name and category are required" });
        }

        const normalizedTags = Array.isArray(tags)
            ? tags
                .map((tag) => String(tag).trim().toLowerCase())
                .filter(Boolean)
            : [];

        const created = await MenuItem.create({
            name,
            category,
            price,
            variants: Array.isArray(variants) ? variants : [],
            image,
            isVeg: Boolean(isVeg),
            isPopular: Boolean(isPopular),
            isBestSeller: Boolean(isBestSeller),
            isSpecial: Boolean(isSpecial),
            isSoldOut: Boolean(isSoldOut),
            tags: normalizedTags,
        });
        return res.status(201).json(created);
    } catch (error) {
        return next(error);
    }
});

router.put("/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        if (!updated) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

router.delete("/:id", auth, permit("admin"), async (req, res, next) => {
    try {
        const deleted = await MenuItem.findByIdAndDelete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ message: "Menu item not found" });
        }

        return res.json({ message: "Menu item deleted" });
    } catch (error) {
        return next(error);
    }
});

export default router;
