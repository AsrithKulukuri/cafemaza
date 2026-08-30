import express from "express";
import { MembershipCard } from "../models/MembershipCard.js";
import { Customer } from "../models/Customer.js";
import { Bill } from "../models/Bill.js";
import { Visit } from "../models/Visit.js";
import { Referral } from "../models/Referral.js";
import { PointsLedger } from "../models/PointsLedger.js";
import { WalkIn } from "../models/WalkIn.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";
import {
    getSettings,
    updateSettings,
    assignCardToCustomer,
    lookupCustomerOrCard,
    calculateBillDiscount,
    processBillTransaction,
} from "../services/membershipService.js";
import { seedMembershipCards } from "../../scripts/seed-membership-cards.js";

const router = express.Router();

// 1. GET /cards - List all cards with filters & stats (Admin & Manager only)
router.get("/cards", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const { type, status, search, page = 1, limit = 200 } = req.query;
        const query = {};

        if (type && type !== "all") query.cardType = type;
        if (status && status !== "all") query.status = status;
        if (search) {
            const raw = String(search).trim();
            query.$or = [
                { cardCode: new RegExp(raw, "i") },
                { notes: new RegExp(raw, "i") },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [cards, total, stats] = await Promise.all([
            MembershipCard.find(query)
                .populate("assignedToCustomer", "name phone email totalVisits totalSpend")
                .sort({ cardCode: 1 })
                .skip(skip)
                .limit(Number(limit)),
            MembershipCard.countDocuments(query),
            MembershipCard.aggregate([
                {
                    $group: {
                        _id: "$cardType",
                        total: { $sum: 1 },
                        assigned: {
                            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
                        },
                        blocked: {
                            $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] },
                        },
                        unassigned: {
                            $sum: { $cond: [{ $eq: ["$status", "unassigned"] }, 1, 0] },
                        },
                    },
                },
            ]),
        ]);

        res.json({
            cards,
            total,
            stats,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 2. POST /cards/assign - Assign physical card to a customer (Admin, Manager & Staff)
router.post("/cards/assign", auth, permit("admin", "manager", "staff"), async (req, res) => {
    try {
        const payload = {
            ...req.body,
            assignedBy: req.user?.email || req.user?.name || "staff",
        };
        const result = await assignCardToCustomer(payload);
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 3. POST /cards/toggle-status - Block / Unblock / Unassign card (Admin & Manager only)
router.post("/cards/toggle-status", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const { cardCode, action, notes } = req.body;
        const upper = String(cardCode || "").trim().toUpperCase();

        const card = await MembershipCard.findOne({ cardCode: upper });
        if (!card) return res.status(404).json({ message: `Card ${upper} not found.` });

        if (action === "block") {
            card.status = "blocked";
            if (notes) card.notes = notes;
        } else if (action === "unblock") {
            card.status = card.assignedToCustomer ? "active" : "unassigned";
        } else if (action === "unassign") {
            if (card.assignedToCustomer) {
                await Customer.findByIdAndUpdate(card.assignedToCustomer, {
                    cardId: null,
                    cardCode: "",
                    cardType: "",
                    $unset: { referralCode: 1 },
                });
            }
            card.status = "unassigned";
            card.assignedToCustomer = null;
            card.assignedAt = null;
            card.validUntil = null;
        } else {
            return res.status(400).json({ message: "Invalid action. Use 'block', 'unblock', or 'unassign'." });
        }

        await card.save();
        res.json({ success: true, card });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 3.5. POST /cards/edit - Edit card discount, quota, customer details, referral code (Admin & Manager only)
router.post("/cards/edit", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const {
            cardCode,
            customerName,
            customerPhone,
            customerEmail,
            discountPercent,
            yearlyDiscountLimit,
            yearlyDiscountUsed,
            referralCode,
            status,
            notes,
        } = req.body;

        const upper = String(cardCode || "").trim().toUpperCase();
        const card = await MembershipCard.findOne({ cardCode: upper });
        if (!card) return res.status(404).json({ message: `Card ${upper} not found.` });

        // 1. Update Card fields
        if (discountPercent !== undefined && !isNaN(Number(discountPercent))) {
            card.discountPercent = Math.max(0, Math.min(100, Number(discountPercent)));
        }
        if (yearlyDiscountLimit !== undefined && !isNaN(Number(yearlyDiscountLimit))) {
            card.yearlyDiscountLimit = Math.max(0, Number(yearlyDiscountLimit));
        }
        if (yearlyDiscountUsed !== undefined && !isNaN(Number(yearlyDiscountUsed))) {
            card.yearlyDiscountUsed = Math.max(0, Number(yearlyDiscountUsed));
        }
        if (status && ["active", "blocked", "unassigned"].includes(status)) {
            card.status = status;
        }
        if (notes !== undefined) {
            card.notes = String(notes);
        }

        await card.save();

        // 2. Update Customer details if assigned
        let customer = null;
        if (card.assignedToCustomer) {
            customer = await Customer.findById(card.assignedToCustomer);
            if (customer) {
                if (customerName) customer.name = String(customerName).trim();
                if (customerPhone) {
                    const formatted = String(customerPhone).trim().startsWith("+91")
                        ? String(customerPhone).trim()
                        : `+91${String(customerPhone).trim().replace(/^(\+91|91|0)/, "")}`;
                    customer.phone = formatted;
                }
                if (customerEmail !== undefined) customer.email = String(customerEmail).trim();
                if (referralCode && card.cardType === "master") {
                    const cleanRef = String(referralCode).trim().toUpperCase();
                    // clear any duplicate on other customers
                    await Customer.updateMany(
                        { referralCode: cleanRef, _id: { $ne: customer._id } },
                        { $unset: { referralCode: 1 } }
                    );
                    customer.referralCode = cleanRef;
                }
                await customer.save();
            }
        }

        return res.json({ success: true, card, customer });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// 4. GET /lookup - Fast POS lookup by card code or mobile number (Staff/POS roles)
router.get("/lookup", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: "Query parameter 'q' is required." });

        const result = await lookupCustomerOrCard(q);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 5. POST /bills/calculate - Preview discount, Master caps, referral options (Staff/POS roles)
router.post("/bills/calculate", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const calc = await calculateBillDiscount(req.body);
        res.json(calc);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 6. POST /bills/process - Process billing, record visit, quota & points (Staff/POS roles)
router.post("/bills/process", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const result = await processBillTransaction(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 7. GET /customers - List customers directory (Admin & Manager only)
router.get("/customers", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const { search, cardType, page = 1, limit = 50 } = req.query;
        const query = {};

        if (cardType && cardType !== "all") query.cardType = cardType;
        if (search) {
            const raw = String(search).trim();
            query.$or = [
                { name: new RegExp(raw, "i") },
                { phone: new RegExp(raw, "i") },
                { cardCode: new RegExp(raw, "i") },
                { referralCode: new RegExp(raw, "i") },
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const [customers, total] = await Promise.all([
            Customer.find(query)
                .populate("cardId")
                .populate("referredByMasterId", "name phone cardCode")
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(Number(limit)),
            Customer.countDocuments(query),
        ]);

        res.json({ customers, total });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 8. GET /customers/:id - Deep profile with visits, bills, points ledger & referrals (Admin & Manager only)
router.get("/customers/:id", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id)
            .populate("cardId")
            .populate("referredByMasterId", "name phone cardCode");

        if (!customer) return res.status(404).json({ message: "Customer not found." });

        const [visits, bills, pointsLedger, referrals] = await Promise.all([
            Visit.find({ customerId: customer._id }).sort({ visitDate: -1 }).limit(20),
            Bill.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(20),
            PointsLedger.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(30),
            Referral.find({ masterCustomerId: customer._id }).populate("referredCustomerId", "name phone totalVisits totalSpend createdAt"),
        ]);

        res.json({
            customer,
            visits,
            bills,
            pointsLedger,
            referrals,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 9. POST /customers/:id/adjust-points - Manual points credit/debit (Admin & Manager only)
router.post("/customers/:id/adjust-points", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const { points, description } = req.body;
        const numPoints = Number(points);
        if (!numPoints || isNaN(numPoints)) {
            return res.status(400).json({ message: "Valid points number required." });
        }

        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ message: "Customer not found." });

        customer.pointsBalance = Math.max(0, customer.pointsBalance + numPoints);
        await customer.save();

        const entry = await PointsLedger.create({
            customerId: customer._id,
            cardCode: customer.cardCode || "",
            points: numPoints,
            type: "manual_adjustment",
            balanceAfter: customer.pointsBalance,
            description: description || `Manual points adjustment (${numPoints > 0 ? "+" : ""}${numPoints})`,
        });

        res.json({ success: true, customer, entry });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 10. GET /settings & PUT /settings (Admin & Manager only)
router.get("/settings", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const settings = await getSettings();
        res.json(settings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.put("/settings", auth, permit("admin", "manager"), async (req, res) => {
    try {
        const settings = await updateSettings(req.body);
        res.json({ success: true, settings });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// 12. GET /walkins - Get today's walk-ins with summary metrics (Staff/POS roles)
router.get("/walkins", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [list, stats] = await Promise.all([
            WalkIn.find({ arrivalDate: { $gte: todayStart } })
                .sort({ arrivalDate: -1 })
                .limit(100),
            WalkIn.aggregate([
                { $match: { arrivalDate: { $gte: todayStart } } },
                {
                    $group: {
                        _id: null,
                        totalWalkIns: { $sum: 1 },
                        totalGuests: { $sum: "$partySize" },
                        activeSeated: {
                            $sum: { $cond: [{ $eq: ["$status", "seated"] }, 1, 0] },
                        },
                        billed: {
                            $sum: { $cond: [{ $in: ["$status", ["billed", "completed"]] }, 1, 0] },
                        },
                    },
                },
            ]),
        ]);

        const summary = stats[0] || {
            totalWalkIns: 0,
            totalGuests: 0,
            activeSeated: 0,
            billed: 0,
        };

        return res.json({ summary, list });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

// 13. POST /walkins - Log customer walk-in with party size & table (Staff/POS roles)
router.post("/walkins", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            partySize = 1,
            tableNumber = "T-01",
            serviceType = "dine-in",
            cardCode = "",
            notes = "",
        } = req.body;

        if (!customerPhone && !customerName) {
            return res.status(400).json({ message: "Customer phone or name is required." });
        }

        const rawPhone = String(customerPhone || "").trim();
        const formattedPhone = rawPhone.startsWith("+91")
            ? rawPhone
            : rawPhone
            ? `+91${rawPhone.replace(/^(\+91|91|0)/, "")}`
            : "";

        let matchedCustomer = null;
        if (formattedPhone) {
            matchedCustomer = await Customer.findOne({
                $or: [
                    { phone: formattedPhone },
                    { phone: rawPhone },
                ],
            });
        }

        if (!matchedCustomer && cardCode) {
            const cleanCode = String(cardCode).trim().toUpperCase();
            matchedCustomer = await Customer.findOne({
                $or: [{ cardCode: cleanCode }, { referralCode: cleanCode }],
            });
            if (!matchedCustomer) {
                const cardDoc = await MembershipCard.findOne({ cardCode: cleanCode }).populate("assignedToCustomer");
                if (cardDoc && cardDoc.assignedToCustomer) {
                    matchedCustomer = cardDoc.assignedToCustomer;
                }
            }
        }

        const resolvedName = String(customerName || matchedCustomer?.name || "Walk-in Guest").trim();
        const resolvedCardCode = String(cardCode || matchedCustomer?.cardCode || "").trim().toUpperCase();
        const resolvedCardType = matchedCustomer?.cardType || "";

        // Session Deduplication: Check if this customer or card already has a walk-in within the last 2 hours
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const orConditions = [];
        if (matchedCustomer) {
            orConditions.push({ customerId: matchedCustomer._id });
        }
        if (resolvedCardCode) {
            orConditions.push({ cardCode: resolvedCardCode });
        }
        if (formattedPhone) {
            orConditions.push({ customerPhone: formattedPhone });
        }
        if (rawPhone && rawPhone !== "N/A") {
            orConditions.push({ customerPhone: rawPhone });
        }

        if (orConditions.length > 0) {
            const existingWalkIn = await WalkIn.findOne({
                arrivalDate: { $gte: twoHoursAgo },
                status: { $in: ["seated", "billed", "completed"] },
                $or: orConditions,
            }).sort({ arrivalDate: -1 });

            if (existingWalkIn) {
                // Return existing walk-in without incrementing visits again
                return res.status(200).json({
                    success: true,
                    walkIn: existingWalkIn,
                    customer: matchedCustomer,
                    alreadyLogged: true,
                });
            }
        }

        let totalVisitsCount = 1;
        if (matchedCustomer) {
            matchedCustomer.totalVisits = (matchedCustomer.totalVisits || 0) + 1;
            matchedCustomer.lastVisitDate = new Date();
            await matchedCustomer.save();
            totalVisitsCount = matchedCustomer.totalVisits;
        }

        const walkIn = await WalkIn.create({
            customerName: resolvedName,
            customerPhone: formattedPhone || rawPhone || "N/A",
            partySize: Math.max(1, Number(partySize) || 1),
            tableNumber: String(tableNumber || "T-01").trim(),
            serviceType: ["dine-in", "takeaway", "live-grill", "screening"].includes(serviceType)
                ? serviceType
                : "dine-in",
            customerId: matchedCustomer ? matchedCustomer._id : null,
            cardCode: resolvedCardCode,
            cardType: resolvedCardType,
            totalVisits: totalVisitsCount,
            status: "seated",
            arrivalDate: new Date(),
            notes: String(notes || "").trim(),
            loggedBy: req.user?.name || "POS Staff",
        });

        return res.status(201).json({ success: true, walkIn, customer: matchedCustomer });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
});

// 14. PATCH /walkins/:id/status - Update walk-in status (seated -> billed -> completed)
router.patch("/walkins/:id/status", auth, permit("admin", "manager", "staff", "bearer"), async (req, res) => {
    try {
        const { status, billedAmount } = req.body;
        const validStatuses = ["seated", "billed", "completed", "cancelled"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
        }

        const updateData = { status };
        if (billedAmount !== undefined && !isNaN(Number(billedAmount))) {
            updateData.billedAmount = Number(billedAmount);
        }

        const walkIn = await WalkIn.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!walkIn) return res.status(404).json({ message: "Walk-in entry not found." });

        return res.json({ success: true, walkIn });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
});

export default router;
