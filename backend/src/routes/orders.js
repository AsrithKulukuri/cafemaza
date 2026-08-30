import express from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import Razorpay from "razorpay";

import { Order } from "../models/Order.js";
import { MenuItem } from "../models/MenuItem.js";
import { Coupon } from "../models/Coupon.js";
import { User } from "../models/User.js";
import { PaymentSession } from "../models/PaymentSession.js";
import { NotificationSetting } from "../models/NotificationSetting.js";
import { auth, optionalAuth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";
import { getSocketIO } from "../config/socket.js";
import { sendOrderNotificationEmail } from "../utils/orderEmail.js";
import {
    sendMsg91DeliveryAssignedNotification,
    sendMsg91OrderAcceptedNotification,
    sendMsg91OrderDeliveredNotification,
    sendMsg91OrderReceivedNotification,
    sendMsg91OrderPlacedNotification,
    sendMsg91OutForDeliveryNotification,
} from "../utils/msg91Whatsapp.js";
import { logger, maskPhone } from "../utils/logger.js";
import {
    calculateOrderPricing,
    calculateOrderPricingWithCoupon,
    normalizeCouponCode,
    validateCouponForSubtotal,
} from "../utils/pricing.js";
import { calculateBillDiscount } from "../services/membershipService.js";
import { MembershipCard } from "../models/MembershipCard.js";
import { Customer } from "../models/Customer.js";

const router = express.Router();

function isCashOnDelivery(paymentMethod) {
    return String(paymentMethod || "").trim().toLowerCase() === "cash";
}

function isUpiPayment(paymentMethod) {
    return String(paymentMethod || "").trim().toLowerCase() === "upi";
}

function normalizeStaffPaymentMethod(paymentMethod) {
    const value = String(paymentMethod || "").trim().toLowerCase();
    if (value === "upi") return "UPI";
    if (value === "cash") return "Cash";
    return null;
}

function normalizeOrderType(rawOrderType, tableNumber) {
    const normalized = String(rawOrderType || "").trim().toLowerCase();
    if (["dine_in", "dine-in", "dinein", "table"].includes(normalized)) {
        return "dine_in";
    }
    if (["takeaway", "take_away", "pickup", "pick_up"].includes(normalized)) {
        return "takeaway";
    }
    if (["delivery", "online"].includes(normalized)) {
        return "delivery";
    }
    if (tableNumber) {
        return "dine_in";
    }
    return "delivery";
}

function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        throw new Error("Razorpay keys are not configured");
    }

    return {
        keyId,
        client: new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        }),
    };
}

async function resolveMenuItemFromPayload(item) {
    const providedMenuItemId = String(item?.menuItemId || item?._id || "").trim();

    if (providedMenuItemId && mongoose.isValidObjectId(providedMenuItemId)) {
        const menuItem = await MenuItem.findById(providedMenuItemId);
        if (menuItem) {
            return menuItem;
        }
    }

    const providedName = String(item?.name || "").trim();
    if (!providedName) {
        throw new Error("One or more menu items are invalid or missing an identifier.");
    }

    const existing = await MenuItem.findOne({
        name: { $regex: `^${escapeRegExp(providedName)}$`, $options: "i" },
    });

    if (existing) {
        return existing;
    }

    throw new Error(`Menu item '${providedName}' is not found in the official catalog.`);
}

async function resolveMenuItemsAndTotal(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("items are required");
    }

    const menuItems = [];
    let subtotal = 0;

    for (const item of items) {
        const menuItem = await resolveMenuItemFromPayload(item);
        menuItems.push(menuItem);

        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));

        // Resolve unit price strictly from database record
        let unitPrice = Number(menuItem.price || 0);

        const variantName = String(item?.selectedVariant?.name || item?.variantName || "").trim();
        if (variantName && Array.isArray(menuItem.variants) && menuItem.variants.length > 0) {
            const matchedVariant = menuItem.variants.find(
                (v) => String(v.name).trim().toLowerCase() === variantName.toLowerCase()
            );
            if (matchedVariant && Number.isFinite(Number(matchedVariant.price))) {
                unitPrice = Number(matchedVariant.price);
            }
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Price for '${menuItem.name}' is invalid in the system.`);
        }

        subtotal += unitPrice * qty;
    }

    return { menuItems, subtotal };
}

async function getCouponUsageLimitViolation({ couponDoc, userId }) {
    if (!couponDoc) {
        return "Invalid coupon code";
    }

    const usageLimit = Number(couponDoc.usageLimit);
    if (Number.isFinite(usageLimit) && usageLimit > 0 && Number(couponDoc.usageCount || 0) >= usageLimit) {
        return "Coupon usage limit reached";
    }

    const perUserLimit = Number(couponDoc.perUserLimit);
    if (Number.isFinite(perUserLimit) && perUserLimit > 0 && userId) {
        const usedByUserCount = await Order.countDocuments({
            userId,
            couponCode: normalizeCouponCode(couponDoc.code),
        });

        if (usedByUserCount >= perUserLimit) {
            return "You have reached the usage limit for this coupon";
        }
    }

    return null;
}

async function calculatePricingForOrder({ user, customerPhone, subtotal, coupon, applyDeliveryCharge, masterDiscountChoice = "credit_500" }) {
    const basePricing = calculateOrderPricingWithCoupon({ subtotal, coupon, applyDeliveryCharge });

    // Rule: Membership Card offer and Coupons CANNOT be clubbed. Only one applies!
    if (coupon && coupon.code) {
        return {
            ...basePricing,
            membershipCardCode: "",
            membershipDiscountAmount: 0,
        };
    }

    let membershipCalc = null;
    try {
        membershipCalc = await calculateBillDiscount({
            customerId: user?._id,
            customerPhone: user?.phone || customerPhone,
            subtotal,
            masterDiscountChoice,
        });
    } catch {
        // ignore
    }

    const membershipDiscount = membershipCalc?.discountAmount || 0;

    if (membershipDiscount > 0) {
        const taxable = Math.max(0, subtotal - membershipDiscount);
        const gst = basePricing.isMinimumOrderMet ? Math.round(taxable * 0.05 * 100) / 100 : 0;
        const total = Math.max(0, taxable + basePricing.delivery + gst);
        return {
            ...basePricing,
            discount: membershipDiscount,
            gst,
            total,
            membershipCardCode: membershipCalc?.cardCode || "",
            membershipDiscountAmount: membershipDiscount,
            membershipDiscountType: membershipCalc?.discountType || "",
        };
    }

    return {
        ...basePricing,
        membershipCardCode: membershipCalc?.cardCode || "",
        membershipDiscountAmount: 0,
    };
}

async function createRazorpayOrderFromPayload(payload, user) {
    const { items, address, paymentMethod, couponCode, orderType, tableNumber, customerPhone, masterDiscountChoice } = payload;

    if (!address || !paymentMethod) {
        throw new Error("items, address and paymentMethod are required");
    }

    if (isCashOnDelivery(paymentMethod)) {
        throw new Error("Razorpay order can only be created for online payments");
    }

    const { subtotal } = await resolveMenuItemsAndTotal(items);
    let coupon = null;

    if (couponCode) {
        const normalizedCode = normalizeCouponCode(couponCode);
        const couponDoc = await Coupon.findOne({ code: normalizedCode });

        const limitViolation = await getCouponUsageLimitViolation({
            couponDoc,
            userId: user?._id,
        });

        if (limitViolation) {
            throw new Error(limitViolation);
        }

        const couponCheck = validateCouponForSubtotal(couponDoc, subtotal);
        if (!couponCheck.ok) {
            throw new Error(couponCheck.message || "Invalid coupon code");
        }

        coupon = couponCheck.coupon;
    }

    const resolvedOrderType = normalizeOrderType(orderType, tableNumber);
    const applyDeliveryCharge = resolvedOrderType === "delivery";
    const pricing = await calculatePricingForOrder({
        user,
        customerPhone: customerPhone || user?.phone,
        subtotal,
        coupon,
        applyDeliveryCharge,
        masterDiscountChoice: masterDiscountChoice || "credit_500",
    });

    if (!pricing.isMinimumOrderMet) {
        throw new Error(`Minimum order is INR ${pricing.minimumOrder}`);
    }

    const amountInPaise = Math.round(pricing.total * 100);

    if (amountInPaise <= 0) {
        throw new Error("Order amount must be greater than zero");
    }

    const { client, keyId } = getRazorpayClient();
    const receipt = `cm_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const razorpayOrder = await client.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: {
            source: "cafe_maza_checkout",
            paymentMethod: String(paymentMethod),
        },
    });

    await PaymentSession.create({
        razorpayOrderId: razorpayOrder.id,
        amountInPaise,
        currency: "INR",
        userId: user?._id || null,
        customerPhone: customerPhone || user?.phone || "",
        customerName: user?.name || payload.customerName || "",
        customerEmail: user?.email || payload.customerEmail || "",
        payload: {
            items,
            address,
            paymentMethod: String(paymentMethod),
            couponCode: coupon?.code || "",
            orderType: resolvedOrderType,
            tableNumber,
            customerPhone: customerPhone || user?.phone || "",
            customerName: user?.name || payload.customerName || "",
            customerEmail: user?.email || payload.customerEmail || "",
            specialInstructions: payload.specialInstructions,
            masterDiscountChoice,
        },
        pricing,
        status: "created",
    });

    return {
        keyId,
        razorpayOrder,
        pricing,
    };
}

function getFallbackEmail(name) {
    const slug = String(name || "guest")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "guest";

    return `${slug}-${Date.now()}@guest.cafemaza.local`;
}

function buildPhoneLookupCandidates(rawPhone) {
    const value = String(rawPhone || "").trim();
    if (!value) return [];

    const digits = value.replace(/\D/g, "");
    const candidates = new Set([value]);

    if (/^[6-9]\d{9}$/.test(digits)) {
        candidates.add(digits);
        candidates.add(`+91${digits}`);
        candidates.add(`91${digits}`);
    } else if (/^91[6-9]\d{9}$/.test(digits)) {
        const local = digits.slice(2);
        candidates.add(digits);
        candidates.add(local);
        candidates.add(`+${digits}`);
    } else if (/^0[6-9]\d{9}$/.test(digits)) {
        const local = digits.slice(1);
        candidates.add(local);
        candidates.add(`+91${local}`);
        candidates.add(`91${local}`);
    }

    return Array.from(candidates).filter(Boolean);
}

async function getOrCreateCustomerUser({ name, email, phone }) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const lookupEmail = normalizedEmail || getFallbackEmail(name);
    const phoneCandidates = buildPhoneLookupCandidates(phone);

    let user = null;

    if (phoneCandidates.length) {
        user = await User.findOne({ phone: { $in: phoneCandidates } });
    }

    if (!user) {
        user = await User.findOne({ email: lookupEmail });
    }

    if (user) {
        if (!user.phone && phoneCandidates.length) {
            user.phone = phoneCandidates[0];
            await user.save();
        }
        return user;
    }

    const randomPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    user = await User.create({
        name: String(name || "Guest Customer").trim() || "Guest Customer",
        email: lookupEmail,
        phone: phoneCandidates[0] || undefined,
        password: hashedPassword,
        role: "customer",
    });

    return user;
}

function verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
        return false;
    }

    const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return expected === razorpaySignature;
}

function getOrderServiceAndQuantity(items, menuItems, requestedService) {
    const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    if (requestedService && String(requestedService).trim()) {
        return { service: String(requestedService).trim(), quantity };
    }

    const service = items
        .map((item) => {
            const menu = menuItems.find((m) => m._id.toString() === String(item.menuItemId));
            return menu?.name || "Menu Item";
        })
        .join(", ");

    return { service: service || "Food Order", quantity };
}

function itemsToSummary(menuItems, items) {
    return items
        .map((item) => {
            const menu = menuItems.find((menuItem) => menuItem._id.toString() === String(item.menuItemId));
            return `${menu?.name || "Menu Item"} x${item.quantity}`;
        })
        .join(", ");
}

function generateDeliveryOtp() {
    return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeIndianPhone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (/^[6-9]\d{9}$/.test(digits)) {
        return `91${digits}`;
    }

    if (/^0\d{10}$/.test(digits)) {
        return `91${digits.slice(1)}`;
    }

    return digits;
}

function getAdminNotificationPhone(customerPhone) {
    const adminPhone = String(process.env.WHATSAPP_ADMIN_PHONE || "").trim();

    if (!adminPhone) {
        return "";
    }

    return adminPhone;
}

async function getConfiguredOrderReceivedAlertPhone(customerPhone) {
    const setting = await NotificationSetting.findOne({ key: "order_received_alert_phone" }).lean();
    const configuredPhone = String(setting?.value || process.env.ORDER_RECEIVED_ALERT_PHONE || process.env.WHATSAPP_ADMIN_PHONE || "").trim();

    if (!configuredPhone) {
        return "";
    }

    return configuredPhone;
}

async function createOrderFromPayload({ user, payload, paymentStatus, paymentProvider, paymentReference }) {
    const { items, address, paymentMethod, customerPhone, tableNumber, specialInstructions, couponCode, orderType, createdByRole } = payload;
    const resolvedAddress = address || (tableNumber ? `Table ${tableNumber}` : null);
    const resolvedOrderType = normalizeOrderType(orderType, tableNumber);

    if (!Array.isArray(items) || items.length === 0 || !resolvedAddress || !paymentMethod) {
        throw new Error("items, address and paymentMethod are required");
    }

    const { menuItems, subtotal } = await resolveMenuItemsAndTotal(items);
    let coupon = null;
    let couponDoc = null;

    if (couponCode) {
        const normalizedCode = normalizeCouponCode(couponCode);
        couponDoc = await Coupon.findOne({ code: normalizedCode });

        const limitViolation = await getCouponUsageLimitViolation({
            couponDoc,
            userId: user?._id,
        });

        if (limitViolation) {
            throw new Error(limitViolation);
        }

        const couponCheck = validateCouponForSubtotal(couponDoc, subtotal);
        if (!couponCheck.ok) {
            throw new Error(couponCheck.message || "Invalid coupon code");
        }

        coupon = couponCheck.coupon;
    }

    const pricing = await calculatePricingForOrder({
        user,
        customerPhone: customerPhone || user?.phone,
        subtotal,
        coupon,
        applyDeliveryCharge: resolvedOrderType === "delivery",
    });

    if (!pricing.isMinimumOrderMet) {
        throw new Error(`Minimum order is INR ${pricing.minimumOrder}`);
    }

    const created = await Order.create({
        userId: user._id,
        items,
        totalAmount: pricing.total,
        subtotal: pricing.subtotal,
        discountAmount: pricing.discount,
        deliveryCharge: pricing.delivery,
        gstAmount: pricing.gst,
        couponCode: pricing.couponCode || undefined,
        couponType: pricing.couponType || undefined,
        status: "placed",
        orderType: resolvedOrderType,
        createdByRole: createdByRole || user?.role,
        address: resolvedAddress,
        customerPhone: user.phone || customerPhone,
        paymentMethod,
        paymentStatus,
        paymentProvider,
        paymentReference,
        tableNumber: tableNumber ? Number(tableNumber) : undefined,
        specialInstructions: specialInstructions ? String(specialInstructions).trim() : undefined,
    });

    if (couponDoc && pricing.couponCode) {
        await Coupon.updateOne({ _id: couponDoc._id }, { $inc: { usageCount: 1 } });
    }

    const itemSummary = items
        .map((item) => {
            const menu = menuItems.find((m) => m._id.toString() === String(item.menuItemId));
            return `${menu?.name || "Menu Item"} x${item.quantity}`;
        })
        .join(", ");

    sendOrderNotificationEmail({
        orderId: created._id.toString(),
        customerName: user.name,
        customerEmail: user.email,
        totalAmount: pricing.total,
        paymentMethod,
        address,
        itemSummary,
    }).catch((error) => {
        console.error("Order email notification failed:", error);
    });

    getSocketIO()?.emit("order_created", created);

    return { created, menuItems, pricing };
}

router.post("/calculate-total", async (req, res, next) => {
    try {
        const { items, orderType, tableNumber } = req.body;
        const { subtotal } = await resolveMenuItemsAndTotal(items);
        const pricing = calculateOrderPricing(subtotal, {
            applyDeliveryCharge: normalizeOrderType(orderType, tableNumber) === "delivery",
        });

        if (!pricing.isMinimumOrderMet) {
            return res.status(400).json({
                message: `Minimum order is INR ${pricing.minimumOrder}`,
                subtotal: pricing.subtotal,
                delivery: pricing.delivery,
                gst: pricing.gst,
                total: pricing.total,
                shortfall: pricing.shortfall,
            });
        }

        return res.status(200).json({
            subtotal: pricing.subtotal,
            discount: 0,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
        });
    } catch (error) {
        if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/calculate-total/public", async (req, res, next) => {
    try {
        const { items, orderType, tableNumber } = req.body;
        const { subtotal } = await resolveMenuItemsAndTotal(items);
        const pricing = calculateOrderPricing(subtotal, {
            applyDeliveryCharge: normalizeOrderType(orderType, tableNumber) === "delivery",
        });

        if (!pricing.isMinimumOrderMet) {
            return res.status(400).json({
                message: `Minimum order is INR ${pricing.minimumOrder}`,
                subtotal: pricing.subtotal,
                delivery: pricing.delivery,
                gst: pricing.gst,
                total: pricing.total,
                shortfall: pricing.shortfall,
            });
        }

        return res.status(200).json({
            subtotal: pricing.subtotal,
            discount: 0,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
        });
    } catch (error) {
        if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

async function applyCouponFromRequest(req, res, next) {
    try {
        const { items, subtotal, code, orderType, tableNumber } = req.body || {};
        const normalizedCode = normalizeCouponCode(code);
        const applyDeliveryCharge = normalizeOrderType(orderType, tableNumber) === "delivery";

        if (!normalizedCode) {
            return res.status(400).json({ message: "Coupon code is required" });
        }

        let resolvedSubtotal = Number(subtotal);
        if (!Number.isFinite(resolvedSubtotal)) {
            if (!Array.isArray(items) || !items.length) {
                return res.status(400).json({ message: "items or subtotal is required" });
            }

            const resolved = await resolveMenuItemsAndTotal(items);
            resolvedSubtotal = resolved.subtotal;
        }

        const coupon = await Coupon.findOne({ code: normalizedCode });

        const limitViolation = await getCouponUsageLimitViolation({
            couponDoc: coupon,
            userId: req.user?._id,
        });

        if (limitViolation) {
            return res.status(400).json({
                message: limitViolation,
                subtotal: resolvedSubtotal,
                discount: 0,
                delivery: applyDeliveryCharge && resolvedSubtotal >= 99 ? 40 : 0,
            });
        }

        const couponCheck = validateCouponForSubtotal(coupon, resolvedSubtotal);

        if (!couponCheck.ok) {
            return res.status(400).json({
                message: couponCheck.message || "Coupon is not valid",
                subtotal: resolvedSubtotal,
                discount: 0,
                delivery: applyDeliveryCharge && resolvedSubtotal >= 99 ? 40 : 0,
            });
        }

        const pricing = calculateOrderPricingWithCoupon({
            subtotal: resolvedSubtotal,
            coupon: couponCheck.coupon,
            applyDeliveryCharge,
        });

        return res.status(200).json({
            code: couponCheck.coupon.code,
            type: couponCheck.coupon.type,
            discount: pricing.discount,
            delivery: pricing.delivery,
            subtotal: pricing.subtotal,
            gst: pricing.gst,
            total: pricing.total,
            message: `Coupon Applied! You saved INR ${pricing.discount.toFixed(2)}`,
        });
    } catch (error) {
        return next(error);
    }
}

router.post("/apply-coupon", optionalAuth, applyCouponFromRequest);
router.post("/apply-coupon/public", applyCouponFromRequest);

// Dev-only: emit a test order_created event to connected clients
if (process.env.NODE_ENV !== "production") {
    router.post("/__debug/emit-order-created", (req, res) => {
        const testOrder = {
            _id: `debug_${Date.now()}`,
            status: "placed",
            createdAt: new Date().toISOString(),
            totalAmount: 0,
            items: [{ quantity: 1, name: "Debug Item" }],
        };

        getSocketIO()?.emit("order_created", testOrder);
        return res.status(200).json({ ok: true, emitted: testOrder });
    });
}

router.get("/best-coupon", optionalAuth, async (req, res, next) => {
    try {
        const subtotal = Number(req.query.subtotal || 0);
        const applyDeliveryCharge = normalizeOrderType(req.query.orderType, req.query.tableNumber) === "delivery";
        const now = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
        }).sort({ createdAt: -1 });

        let best = null;

        for (const coupon of coupons) {
            const limitViolation = await getCouponUsageLimitViolation({
                couponDoc: coupon,
                userId: req.user?._id,
            });
            if (limitViolation) {
                continue;
            }

            const validation = validateCouponForSubtotal(coupon, subtotal, now);
            if (!validation.ok) {
                continue;
            }

            const pricing = calculateOrderPricingWithCoupon({
                subtotal,
                coupon: validation.coupon,
                applyDeliveryCharge,
            });
            if (!best || pricing.discount > best.discount || (pricing.discount === best.discount && pricing.total < best.total)) {
                best = {
                    code: validation.coupon.code,
                    type: validation.coupon.type,
                    discount: pricing.discount,
                    total: pricing.total,
                };
            }
        }

        return res.json({ bestCoupon: best });
    } catch (error) {
        return next(error);
    }
});

async function listAvailableCoupons(req, res, next) {
    try {
        const subtotal = Number(req.query.subtotal || 0);
        const applyDeliveryCharge = normalizeOrderType(req.query.orderType, req.query.tableNumber) === "delivery";
        const now = new Date();

        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            expiryDate: { $gte: now },
        }).sort({ createdAt: -1 });

        const data = [];

        for (const coupon of coupons) {
            const limitViolation = await getCouponUsageLimitViolation({
                couponDoc: coupon,
                userId: req.user?._id,
            });
            const validation = validateCouponForSubtotal(coupon, subtotal, now);
            const canApply = !limitViolation && validation.ok;
            const pricing = canApply
                ? calculateOrderPricingWithCoupon({ subtotal, coupon: validation.coupon, applyDeliveryCharge })
                : null;

            data.push({
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                minOrder: coupon.minOrder,
                maxDiscount: coupon.maxDiscount,
                usageLimit: coupon.usageLimit,
                perUserLimit: coupon.perUserLimit,
                usageCount: coupon.usageCount,
                startDate: coupon.startDate,
                expiryDate: coupon.expiryDate,
                canApply,
                reason: canApply ? null : limitViolation || validation.message,
                estimatedDiscount: pricing?.discount || 0,
            });
        }

        return res.json({ coupons: data });
    } catch (error) {
        return next(error);
    }
}

router.get("/available-coupons", optionalAuth, listAvailableCoupons);
router.get("/available-coupons/public", listAvailableCoupons);

router.get("/tables/active", auth, permit("admin", "manager", "staff", "bearer", "kitchen"), async (req, res, next) => {
    try {
        const active = await Order.aggregate([
            {
                $match: {
                    orderType: "dine_in",
                    tableNumber: { $exists: true, $ne: null },
                    status: { $in: ["placed", "preparing", "ready"] },
                },
            },
            {
                $sort: { tableNumber: 1, createdAt: 1 },
            },
            {
                $group: {
                    _id: "$tableNumber",
                    activeOrders: { $sum: 1 },
                    latestOrderAt: { $max: "$createdAt" },
                    latestStatus: { $last: "$status" },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        return res.json(
            active.map((row) => ({
                tableNumber: row._id,
                activeOrders: row.activeOrders,
                latestOrderAt: row.latestOrderAt,
                latestStatus: row.latestStatus,
            }))
        );
    } catch (error) {
        return next(error);
    }
});

async function sendOrderWhatsAppNotifications({ createdOrder, user, payload, menuItems }) {
    const orderId = createdOrder._id.toString();

    if (createdOrder.createdByRole === "bearer") {
        logger.info("[MSG91 WhatsApp] Skipping notifications for bearer-created order", { orderId });
        return {
            customer: { to: null, ok: false, reason: "bearer_created_skipped" },
            admin: { to: null, ok: false, reason: "bearer_created_skipped" },
        };
    }

    if (createdOrder.orderType === "dine_in") {
        logger.info("[MSG91 WhatsApp] Skipping notifications for dine-in order", { orderId });
        return {
            customer: { to: null, ok: false, reason: "dine_in_skipped" },
            admin: { to: null, ok: false, reason: "dine_in_skipped" },
        };
    }

    const customerTargetPhone = payload.customerPhone || payload.phone || user.phone || user.mobile;

    if (!customerTargetPhone) {
        console.warn(`[MSG91 WhatsApp] No customer phone found for order ${orderId}. Skipping customer notification.`);
        return {
            customer: { to: null, ok: false, reason: "no_phone" },
            admin: { to: null, ok: false, reason: "skipped" },
        };
    }

    logger.info("[MSG91 WhatsApp] Sending order placed notification", {
        orderId,
        to: maskPhone(customerTargetPhone),
    });

    const customerResult = await sendMsg91OrderPlacedNotification({
        orderId: createdOrder._id,
        recipientType: "customer",
        to: customerTargetPhone,
        order: {
            ...createdOrder.toObject(),
            userId: { name: user.name },
        },
    });

    logger.debug("[MSG91 WhatsApp] Customer notification result", {
        orderId,
        ok: customerResult?.ok,
        skipped: customerResult?.skipped,
        reason: customerResult?.reason,
    });

    const { service, quantity } = getOrderServiceAndQuantity(payload.items, menuItems, payload.serviceType);
    const orderReceivedAlertPhone = await getConfiguredOrderReceivedAlertPhone(customerTargetPhone);

    let adminResult;
    if (orderReceivedAlertPhone) {
        logger.info("[MSG91 WhatsApp] Sending order received alert to configured admin number", {
            orderId,
            to: maskPhone(orderReceivedAlertPhone),
            source: (await NotificationSetting.findOne({ key: "order_received_alert_phone" }).lean()) ? "database" : "environment",
        });

        adminResult = await sendMsg91OrderReceivedNotification({
            orderId: createdOrder._id,
            recipientType: "admin",
            to: orderReceivedAlertPhone,
            order: {
                ...createdOrder.toObject(),
                userId: { name: user.name, email: user.email },
                customerEmail: user.email,
                itemSummary: itemsToSummary(menuItems, payload.items),
            },
        });
    } else {
        const adminPhone = getAdminNotificationPhone(customerTargetPhone);
        logger.info("[MSG91 WhatsApp] Falling back to admin template notification", {
            orderId,
            to: maskPhone(adminPhone || ""),
        });
        adminResult = adminPhone
            ? await sendMsg91OrderPlacedNotification({
                orderId: createdOrder._id,
                recipientType: "admin",
                to: adminPhone,
                order: {
                    ...createdOrder.toObject(),
                    userId: { name: user.name },
                    customerPhone: customerTargetPhone,
                    service,
                    quantity,
                },
            })
            : { ok: false, reason: "admin_phone_missing_or_same_as_customer" };
    }

    logger.debug("[MSG91 WhatsApp] Admin notification result", {
        orderId,
        ok: adminResult?.ok,
        skipped: adminResult?.skipped,
        reason: adminResult?.reason,
    });

    return {
        customer: { to: customerTargetPhone, ...customerResult },
        admin: { to: orderReceivedAlertPhone || getAdminNotificationPhone(customerTargetPhone), ...adminResult },
    };
}

async function sendOrderStatusWhatsAppNotification(order) {
    const orderId = String(order._id);
    if (order.createdByRole === "bearer") {
        return {
            customer: { to: "", ok: false, reason: "bearer_created_skipped" },
            admin: { to: "", ok: false, reason: "bearer_created_skipped" },
        };
    }

    if (order.orderType === "dine_in") {
        return {
            customer: { to: "", ok: false, reason: "dine_in_skipped" },
            admin: { to: "", ok: false, reason: "dine_in_skipped" },
        };
    }

    const customerPhone = order.userId?.phone || order.customerPhone;
    const adminPhone = getAdminNotificationPhone(customerPhone);

    logger.debug("[MSG91 WhatsApp] Sending status update", { orderId, status: order.status });

    let adminResult;
    if (!adminPhone) {
        adminResult = { ok: false, reason: "admin_phone_missing_or_same_as_customer" };
    } else if (order.status === "preparing" || order.status === "ready") {
        adminResult = await sendMsg91OrderAcceptedNotification({
            orderId: order._id,
            recipientType: "admin",
            to: adminPhone,
            order,
        });
    } else if (order.status === "out_for_delivery") {
        adminResult = await sendMsg91OutForDeliveryNotification({
            orderId: order._id,
            recipientType: "admin",
            to: adminPhone,
            order,
            deliveryPartnerName: order.deliveryPartnerId?.name,
        });
    } else if (order.status === "delivered") {
        adminResult = await sendMsg91OrderDeliveredNotification({
            orderId: order._id,
            recipientType: "admin",
            to: adminPhone,
            order,
        });
    } else {
        adminResult = await sendMsg91OrderPlacedNotification({
            orderId: order._id,
            recipientType: "admin",
            to: adminPhone,
            order,
        });
    }

    logger.debug("[MSG91 WhatsApp] Status notification to admin", {
        orderId,
        to: maskPhone(adminPhone),
        ok: adminResult?.ok,
        reason: adminResult?.reason,
    });

    return {
        customer: { to: customerPhone || "", ok: false, reason: "handled_elsewhere" },
        admin: { to: adminPhone, ...adminResult },
    };
}

async function sendDeliveryTakeOrderAdminNotification({ order, deliveryUser }) {
    const customerPhone = order.userId?.phone || order.customerPhone;
    const adminPhone = getAdminNotificationPhone(customerPhone);

    if (!adminPhone) {
        return { ok: false, reason: "admin_phone_missing_or_same_as_customer" };
    }

    return sendMsg91DeliveryAssignedNotification({
        orderId: order._id,
        recipientType: "admin",
        to: adminPhone,
        order,
        deliveryPartnerName: deliveryUser.name,
    });
}

router.post("/", auth, async (req, res, next) => {
    try {
        if (!isCashOnDelivery(req.body.paymentMethod)) {
            return res.status(400).json({
                message: "Online payment order creation is blocked until payment is verified.",
            });
        }

        const payload = {
            ...req.body,
            customerPhone: req.user.phone || req.body.customerPhone,
        };

        const paymentStatus = "pending";
        const paymentProvider = "cod";

        const { created, menuItems, pricing } = await createOrderFromPayload({
            user: req.user,
            payload,
            paymentStatus,
            paymentProvider,
            paymentReference: null,
        });

        // Send WhatsApp notifications in background (fire and forget)
        sendOrderWhatsAppNotifications({
            createdOrder: created,
            user: req.user,
            payload,
            menuItems,
        }).catch((error) => {
            console.error("WhatsApp notification background send failed:", error);
        });

        return res.status(201).json({
            ...created.toObject(),
            paymentStatus: created.paymentStatus,
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            message: "Order created successfully. Notifications are being sent.",
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/staff", auth, permit("admin", "manager", "staff", "bearer"), async (req, res, next) => {
    try {
        const requestedPaymentMethod = normalizeStaffPaymentMethod(req.body.paymentMethod || "Cash");
        if (!requestedPaymentMethod) {
            return res.status(400).json({
                message: "Staff-created orders support only Cash or UPI.",
            });
        }

        if (req.user?.role === "bearer") {
            const resolvedOrderType = normalizeOrderType(req.body.orderType, req.body.tableNumber);
            if (resolvedOrderType !== "dine_in") {
                return res.status(400).json({
                    message: "Bearer can place dine-in table orders only.",
                });
            }

            const tableNumber = Number(req.body.tableNumber);
            if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
                return res.status(400).json({
                    message: "Table number is required for bearer orders.",
                });
            }
        }

        const customerUser = await getOrCreateCustomerUser({
            name: req.body.customerName,
            email: req.body.customerEmail,
            phone: req.body.customerPhone,
        });

        const payload = {
            ...req.body,
            paymentMethod: requestedPaymentMethod,
            createdByRole: req.user.role,
            address: req.body.address || (req.body.tableNumber ? `Table ${req.body.tableNumber}` : "Dine-in order"),
        };

        const { created, menuItems, pricing } = await createOrderFromPayload({
            user: customerUser,
            payload,
            paymentStatus: "pending",
            paymentProvider: "manual",
            paymentReference: null,
        });

        sendOrderWhatsAppNotifications({
            createdOrder: created,
            user: customerUser,
            payload,
            menuItems,
        }).catch((error) => {
            console.error("WhatsApp staff order notification failed:", error);
        });

        return res.status(201).json({
            ...created.toObject(),
            paymentStatus: created.paymentStatus,
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            message: "Staff order created successfully.",
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.get("/customer-by-phone", auth, permit("admin", "manager", "staff", "bearer"), async (req, res, next) => {
    try {
        const phone = String(req.query.phone || "").trim();
        if (!phone) {
            return res.status(400).json({ message: "phone is required" });
        }

        const candidates = buildPhoneLookupCandidates(phone);
        if (!candidates.length) {
            return res.json({ found: false });
        }

        const user = await User.findOne({ phone: { $in: candidates }, role: "customer" }).select("name email phone");
        if (!user) {
            return res.json({ found: false });
        }

        return res.json({
            found: true,
            customer: {
                name: user.name,
                email: user.email,
                phone: user.phone,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/create-razorpay-order", auth, async (req, res, next) => {
    try {
        const { keyId, razorpayOrder, pricing } = await createRazorpayOrderFromPayload(req.body, req.user);

        return res.status(201).json({
            keyId,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            totalAmount: pricing.total,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/public", async (req, res, next) => {
    try {
        if (!isCashOnDelivery(req.body.paymentMethod)) {
            return res.status(400).json({
                message: "Online payment order creation is blocked until payment is verified.",
            });
        }

        const { customerName, customerEmail, customerPhone } = req.body;
        const customerUser = await getOrCreateCustomerUser({
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
        });

        const paymentStatus = "pending";
        const paymentProvider = "cod";

        const payload = {
            ...req.body,
            customerPhone: customerPhone || req.body.customerPhone,
        };

        const { created, menuItems, pricing } = await createOrderFromPayload({
            user: customerUser,
            payload,
            paymentStatus,
            paymentProvider,
            paymentReference: null,
        });

        // Send WhatsApp notifications in background (fire and forget)
        sendOrderWhatsAppNotifications({
            createdOrder: created,
            user: customerUser,
            payload,
            menuItems,
        }).catch((error) => {
            console.error("WhatsApp notification background send failed:", error);
        });

        return res.status(201).json({
            ...created.toObject(),
            paymentStatus: created.paymentStatus,
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            message: "Order created successfully. Notifications are being sent.",
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/create-razorpay-order/public", async (req, res, next) => {
    try {
        let customerUser = null;
        if (req.body?.customerName || req.body?.customerEmail || req.body?.customerPhone) {
            customerUser = await getOrCreateCustomerUser({
                name: req.body.customerName,
                email: req.body.customerEmail,
                phone: req.body.customerPhone,
            });
        }

        const { keyId, razorpayOrder, pricing } = await createRazorpayOrderFromPayload(req.body, customerUser);

        return res.status(201).json({
            keyId,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            totalAmount: pricing.total,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/payment-success-callback", auth, async (req, res, next) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentMethod,
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                message: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
            });
        }

        if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
            return res.status(400).json({ message: "Invalid Razorpay signature" });
        }

        // Prevent duplicate processing of the same payment
        const duplicate = await Order.findOne({ paymentReference: razorpayPaymentId });
        if (duplicate) {
            return res.status(200).json({
                message: "Order already processed for this payment",
                orderId: duplicate._id,
                paymentStatus: duplicate.paymentStatus,
            });
        }

        // Load authoritative server-verified session
        const session = await PaymentSession.findOne({ razorpayOrderId });
        if (!session) {
            return res.status(400).json({ message: "Payment session not found or expired" });
        }

        if (session.status === "paid" && session.orderId) {
            return res.status(200).json({
                message: "Order already processed for this payment",
                orderId: session.orderId,
                paymentStatus: "paid",
            });
        }

        const verifiedPayload = {
            ...session.payload,
            paymentMethod: paymentMethod || session.payload.paymentMethod || "UPI",
            customerPhone: req.user.phone || session.payload.customerPhone,
        };

        const { created, menuItems, pricing } = await createOrderFromPayload({
            user: req.user,
            payload: verifiedPayload,
            paymentStatus: "paid",
            paymentProvider: "razorpay",
            paymentReference: razorpayPaymentId,
        });

        session.status = "paid";
        session.razorpayPaymentId = razorpayPaymentId;
        session.orderId = created._id;
        await session.save();

        const whatsappNotification = await sendOrderWhatsAppNotifications({
            createdOrder: created,
            user: req.user,
            payload: verifiedPayload,
            menuItems,
        });

        return res.status(201).json({
            orderId: created._id,
            paymentStatus: "success",
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            message: "Payment verified, order placed, WhatsApp notifications triggered",
            whatsappNotification,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.post("/payment-success-callback/public", async (req, res, next) => {
    try {
        const {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            paymentMethod,
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                message: "razorpayOrderId, razorpayPaymentId and razorpaySignature are required",
            });
        }

        if (!verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature })) {
            return res.status(400).json({ message: "Invalid Razorpay signature" });
        }

        // Prevent duplicate processing of the same payment
        const duplicate = await Order.findOne({ paymentReference: razorpayPaymentId });
        if (duplicate) {
            return res.status(200).json({
                message: "Order already processed for this payment",
                orderId: duplicate._id,
                paymentStatus: duplicate.paymentStatus,
            });
        }

        // Load authoritative server-verified session
        const session = await PaymentSession.findOne({ razorpayOrderId });
        if (!session) {
            return res.status(400).json({ message: "Payment session not found or expired" });
        }

        if (session.status === "paid" && session.orderId) {
            return res.status(200).json({
                message: "Order already processed for this payment",
                orderId: session.orderId,
                paymentStatus: "paid",
            });
        }

        const verifiedPayload = {
            ...session.payload,
            paymentMethod: paymentMethod || session.payload.paymentMethod || "UPI",
        };

        const customerUser = await getOrCreateCustomerUser({
            name: session.customerName || verifiedPayload.customerName,
            email: session.customerEmail || verifiedPayload.customerEmail,
            phone: session.customerPhone || verifiedPayload.customerPhone,
        });

        const { created, menuItems, pricing } = await createOrderFromPayload({
            user: customerUser,
            payload: verifiedPayload,
            paymentStatus: "paid",
            paymentProvider: "razorpay",
            paymentReference: razorpayPaymentId,
        });

        session.status = "paid";
        session.razorpayPaymentId = razorpayPaymentId;
        session.orderId = created._id;
        await session.save();

        const whatsappNotification = await sendOrderWhatsAppNotifications({
            createdOrder: created,
            user: customerUser,
            payload: verifiedPayload,
            menuItems,
        });

        return res.status(201).json({
            orderId: created._id,
            paymentStatus: "success",
            subtotal: pricing.subtotal,
            delivery: pricing.delivery,
            gst: pricing.gst,
            total: pricing.total,
            message: "Payment verified, order placed, WhatsApp notifications triggered",
            whatsappNotification,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("required")) {
            return res.status(400).json({ message: error.message });
        }

        if (error instanceof Error && error.message.includes("invalid")) {
            return res.status(400).json({ message: error.message });
        }

        return next(error);
    }
});

router.get("/", auth, permit("admin", "staff", "manager", "bearer", "kitchen"), async (req, res, next) => {
    try {
        const historyDays = Number.parseInt(String(req.query.days || ""), 10);
        const query = {};

        if (Number.isFinite(historyDays) && historyDays > 0) {
            const startDate = new Date();
            startDate.setUTCDate(startDate.getUTCDate() - (Math.min(historyDays, 365) - 1));
            startDate.setUTCHours(0, 0, 0, 0);
            query.createdAt = { $gte: startDate };
        }

        const orders = await Order.find(query)
            .populate("userId", "name email phone role")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("deliveredBy", "name email role")
            .populate("items.menuItemId", "name price")
            .sort({ createdAt: -1 });
        return res.json(orders);
    } catch (error) {
        return next(error);
    }
});

router.get("/delivery/available", auth, permit("delivery", "admin"), async (req, res, next) => {
    try {
        const orders = await Order.find({
            status: { $in: ["placed", "preparing", "ready"] },
            $or: [{ deliveryPartnerId: { $exists: false } }, { deliveryPartnerId: null }],
        })
            .populate("userId", "name email")
            .populate("items.menuItemId", "name price")
            .sort({ createdAt: -1 });

        return res.json(orders);
    } catch (error) {
        return next(error);
    }
});

router.get("/delivery/mine", auth, permit("delivery", "admin"), async (req, res, next) => {
    try {
        const orders = await Order.find({ deliveryPartnerId: req.user._id })
            .populate("userId", "name email")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("deliveredBy", "name email role")
            .populate("items.menuItemId", "name price")
            .sort({ createdAt: -1 });

        return res.json(orders);
    } catch (error) {
        return next(error);
    }
});

router.put("/:id/take", auth, permit("delivery", "admin"), async (req, res, next) => {
    try {
        const existing = await Order.findById(req.params.id);

        if (!existing) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (!["placed", "preparing", "ready", "out_for_delivery"].includes(existing.status)) {
            return res.status(400).json({ message: "Only active orders can be taken" });
        }

        if (existing.deliveryPartnerId && String(existing.deliveryPartnerId) !== String(req.user._id)) {
            return res.status(409).json({ message: "Order already assigned to another delivery partner" });
        }

        existing.deliveryPartnerId = req.user._id;
        existing.deliveryAssignedAt = new Date();
        existing.deliveryOtp = generateDeliveryOtp();
        existing.deliveredAt = undefined;
        existing.deliveredBy = undefined;
        existing.status = "out_for_delivery";
        await existing.save();

        const updated = await Order.findById(existing._id)
            .populate("userId", "name email phone")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("items.menuItemId", "name price");

        sendDeliveryTakeOrderAdminNotification({ order: updated, deliveryUser: req.user }).catch((error) => {
            console.error("Delivery take-order admin notification failed", error);
        });

        const customerPhone = updated.userId?.phone || updated.customerPhone;
        if (customerPhone) {
            sendMsg91DeliveryAssignedNotification({
                orderId: updated._id,
                recipientType: "customer",
                to: customerPhone,
                order: updated,
                deliveryPartnerName: req.user.name,
            }).catch((error) => {
                console.error("MSG91 delivery_assigned notification failed:", error);
            });

            sendMsg91OutForDeliveryNotification({
                orderId: updated._id,
                recipientType: "customer",
                to: customerPhone,
                order: updated,
                deliveryPartnerName: req.user.name,
            }).catch((error) => {
                console.error("MSG91 out_for_delivery notification failed:", error);
            });
        }

        getSocketIO()?.emit("order_delivery_assigned", {
            orderId: updated._id,
            status: updated.status,
            deliveryPartner: updated.deliveryPartnerId,
            order: updated,
        });

        getSocketIO()?.to(`order:${updated._id}`).emit("order_status_updated", {
            orderId: updated._id,
            status: updated.status,
            order: updated,
        });

        return res.json(updated);
    } catch (error) {
        return next(error);
    }
});

router.get("/user", auth, async (req, res, next) => {
    try {
        const orders = await Order.find({ userId: req.user._id })
            .populate("items.menuItemId", "name price")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("deliveredBy", "name email role")
            .sort({ createdAt: -1 });
        return res.json(orders);
    } catch (error) {
        return next(error);
    }
});

router.get("/public", auth, async (req, res, next) => {
    try {
        const email = String(req.query.email || "").trim().toLowerCase();
        const phone = String(req.query.phone || "").trim();

        // Non-staff users can only query their own orders
        const isStaff = req.user && ["admin", "manager", "staff"].includes(req.user.role);
        const targetUserId = isStaff && email ? (await User.findOne({ email }))?._id : req.user._id;

        const query = { userId: targetUserId };
        if (isStaff && phone && !email) {
            query.customerPhone = phone;
            delete query.userId;
        }

        const orders = await Order.find(query)
            .populate("items.menuItemId", "name price")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("deliveredBy", "name email role")
            .sort({ createdAt: -1 });

        return res.json(orders);
    } catch (error) {
        return next(error);
    }
});

router.put("/tables/:tableNumber/complete", auth, permit("admin", "manager", "staff", "bearer"), async (req, res, next) => {
    try {
        const tableNumber = Number(req.params.tableNumber);
        if (!Number.isFinite(tableNumber) || tableNumber <= 0) {
            return res.status(400).json({ message: "Valid table number is required" });
        }

        const activeOrders = await Order.find({
            orderType: "dine_in",
            tableNumber,
            status: { $in: ["placed", "preparing", "ready"] },
        }).select("_id");

        if (!activeOrders.length) {
            return res.status(404).json({ message: "No active orders found for this table" });
        }

        const orderIds = activeOrders.map((o) => o._id);

        await Order.updateMany(
            { _id: { $in: orderIds } },
            {
                $set: {
                    status: "delivered",
                    deliveredAt: new Date(),
                    deliveredBy: req.user._id,
                },
                $unset: {
                    deliveryOtp: 1,
                },
            }
        );

        for (const orderId of orderIds) {
            getSocketIO()?.emit("order_status_updated", {
                orderId,
                status: "delivered",
            });
        }

        return res.json({
            message: `Marked ${orderIds.length} order(s) completed for table ${tableNumber}`,
            tableNumber,
            completedCount: orderIds.length,
            orderIds,
        });
    } catch (error) {
        return next(error);
    }
});

router.put("/:id/status", auth, permit("admin", "staff", "manager", "bearer", "kitchen", "delivery"), async (req, res, next) => {
    try {
        const { status, otp } = req.body;
        const allowed = ["placed", "preparing", "ready", "out_for_delivery", "delivered"];

        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
        }

        if (req.user.role === "delivery" && !["out_for_delivery", "delivered"].includes(status)) {
            return res.status(403).json({ message: "Delivery role can only update delivery statuses" });
        }

        if (status === "delivered" && req.user.role !== "delivery") {
            return res.status(403).json({ message: "Only delivery partner can mark order as delivered" });
        }

        const current = await Order.findById(req.params.id);
        if (!current) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (
            req.user.role === "delivery" &&
            current.deliveryPartnerId &&
            String(current.deliveryPartnerId) !== String(req.user._id)
        ) {
            return res.status(403).json({ message: "You are not assigned to this order" });
        }

        const hadDeliveryPartnerBefore = Boolean(current.deliveryPartnerId);

        if (req.user.role === "delivery" && !current.deliveryPartnerId) {
            current.deliveryPartnerId = req.user._id;
            current.deliveryAssignedAt = new Date();
            current.deliveryOtp = current.deliveryOtp || generateDeliveryOtp();
        }

        const previousStatus = current.status;
        const deliveryPartnerAssignedNow = req.user.role === "delivery" && !hadDeliveryPartnerBefore;

        if (req.user.role === "delivery" && status === "delivered") {
            const submittedOtp = String(otp || "").trim();

            if (!current.deliveryOtp) {
                return res.status(400).json({ message: "Delivery OTP is missing for this order" });
            }

            if (!submittedOtp || submittedOtp !== current.deliveryOtp) {
                return res.status(400).json({ message: "Invalid delivery OTP" });
            }
        }

        current.status = status;

        if (status === "delivered") {
            current.deliveryOtp = undefined;
            current.deliveredAt = new Date();
            current.deliveredBy = req.user._id;
        } else {
            current.deliveredAt = undefined;
            current.deliveredBy = undefined;
        }
        await current.save();

        const updated = await Order.findById(current._id)
            .populate("userId", "name email phone")
            .populate("items.menuItemId", "name price")
            .populate("deliveryPartnerId", "name phone deliveryProfile")
            .populate("deliveredBy", "name email role");

        const customerPhone = updated.userId?.phone || updated.customerPhone;
        const shouldNotifyCustomerWhatsapp = updated.orderType !== "dine_in" && updated.createdByRole !== "bearer";

        if (customerPhone && shouldNotifyCustomerWhatsapp) {
            if ((status === "preparing" || status === "ready") && previousStatus !== status) {
                sendMsg91OrderAcceptedNotification({
                    orderId: updated._id,
                    recipientType: "customer",
                    to: customerPhone,
                    order: updated,
                }).catch((error) => {
                    console.error("MSG91 order_accepted notification failed:", error);
                });
            }

            if (status === "out_for_delivery" && previousStatus !== status) {
                if (deliveryPartnerAssignedNow) {
                    sendMsg91DeliveryAssignedNotification({
                        orderId: updated._id,
                        recipientType: "customer",
                        to: customerPhone,
                        order: updated,
                        deliveryPartnerName: req.user.name,
                    }).catch((error) => {
                        console.error("MSG91 delivery_assigned notification failed:", error);
                    });
                }

                sendMsg91OutForDeliveryNotification({
                    orderId: updated._id,
                    recipientType: "customer",
                    to: customerPhone,
                    order: updated,
                    deliveryPartnerName: updated.deliveryPartnerId?.name,
                }).catch((error) => {
                    console.error("MSG91 out_for_delivery notification failed:", error);
                });
            }

            if (status === "delivered" && previousStatus !== status) {
                sendMsg91OrderDeliveredNotification({
                    orderId: updated._id,
                    recipientType: "customer",
                    to: customerPhone,
                    order: updated,
                }).catch((error) => {
                    console.error("MSG91 order_delivered notification failed:", error);
                });
            }
        }

        // Send admin status notification in background (fire and forget)
        sendOrderStatusWhatsAppNotification(updated).catch((error) => {
            console.error("WhatsApp status notification background send failed:", error);
        });

        // Emit global event and also notify sockets in the specific order room and admin room
        getSocketIO()?.emit("order_status_updated", {
            orderId: updated._id,
            status: updated.status,
            order: updated,
        });

        // Notify sockets that joined the order room (customers/delivery partners)
        try {
            getSocketIO()?.to(`order:${updated._id}`).emit("order_status_updated", {
                orderId: updated._id,
                status: updated.status,
                order: updated,
            });
        } catch (e) {
            // ignore
        }

        // Notify admin dashboards specifically if they joined the admins room
        try {
            getSocketIO()?.to("admins").emit("order_status_updated", {
                orderId: updated._id,
                status: updated.status,
                order: updated,
            });
        } catch (e) {
            // ignore
        }

        return res.json({
            ...updated.toObject(),
            message: "Order status updated. Notifications are being sent."
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
