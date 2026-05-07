const MINIMUM_ORDER_AMOUNT = 99;
const DELIVERY_CHARGE = 40;
const GST_RATE = 0.05;

function roundToPaise(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function calculateOrderPricing(subtotal, options = {}) {
    return calculateOrderPricingWithCoupon({ subtotal, coupon: null, ...options });
}

export function normalizeCouponCode(rawCode) {
    return String(rawCode || "").trim().toUpperCase();
}

export function validateCouponForSubtotal(coupon, subtotal, now = new Date()) {
    if (!coupon) {
        return { ok: false, message: "Invalid coupon code" };
    }

    const safeSubtotal = roundToPaise(Number(subtotal) || 0);
    const normalizedCode = normalizeCouponCode(coupon.code);

    if (!normalizedCode) {
        return { ok: false, message: "Invalid coupon code" };
    }

    if (!coupon.isActive) {
        return { ok: false, message: "Coupon is inactive" };
    }

    const startDate = coupon.startDate ? new Date(coupon.startDate) : null;
    const expiryDate = coupon.expiryDate ? new Date(coupon.expiryDate) : null;

    if (!startDate || Number.isNaN(startDate.getTime()) || !expiryDate || Number.isNaN(expiryDate.getTime())) {
        return { ok: false, message: "Coupon date is invalid" };
    }

    if (startDate.getTime() > now.getTime()) {
        return { ok: false, message: "Coupon is not active yet" };
    }

    if (expiryDate.getTime() < now.getTime()) {
        return { ok: false, message: "Coupon has expired" };
    }

    const minOrder = roundToPaise(Number(coupon.minOrder) || 0);
    if (safeSubtotal < minOrder) {
        return {
            ok: false,
            message: `Minimum order for this coupon is INR ${minOrder.toFixed(2)}`,
        };
    }

    return {
        ok: true,
        coupon: {
            code: normalizedCode,
            type: coupon.type,
            value: Number(coupon.value) || 0,
            minOrder,
            maxDiscount: coupon.maxDiscount == null ? null : Number(coupon.maxDiscount),
            startDate,
            expiryDate,
            isActive: Boolean(coupon.isActive),
        },
    };
}

export function calculateOrderPricingWithCoupon({ subtotal, coupon, applyDeliveryCharge = true }) {
    const safeSubtotal = roundToPaise(Number(subtotal) || 0);
    const isMinimumOrderMet = safeSubtotal >= MINIMUM_ORDER_AMOUNT;
    const baseDelivery = isMinimumOrderMet && applyDeliveryCharge ? DELIVERY_CHARGE : 0;
    let discount = 0;
    let delivery = baseDelivery;
    let appliedCouponCode = null;
    let appliedCouponType = null;

    if (coupon && coupon.code) {
        appliedCouponCode = normalizeCouponCode(coupon.code);
        appliedCouponType = coupon.type || null;

        if (coupon.type === "flat") {
            discount = roundToPaise(Number(coupon.value) || 0);
        } else if (coupon.type === "percent") {
            const rawDiscount = safeSubtotal * ((Number(coupon.value) || 0) / 100);
            const maxDiscount = coupon.maxDiscount == null ? null : Number(coupon.maxDiscount);
            discount = maxDiscount != null && Number.isFinite(maxDiscount)
                ? Math.min(rawDiscount, maxDiscount)
                : rawDiscount;
            discount = roundToPaise(discount);
        } else if (coupon.type === "free_delivery") {
            delivery = 0;
        }
    }

    discount = Math.max(0, Math.min(roundToPaise(discount), safeSubtotal));
    const taxableAmount = roundToPaise(safeSubtotal - discount + delivery);
    const gst = isMinimumOrderMet ? roundToPaise(taxableAmount * GST_RATE) : 0;
    const total = roundToPaise(taxableAmount + gst);
    const shortfall = isMinimumOrderMet ? 0 : roundToPaise(MINIMUM_ORDER_AMOUNT - safeSubtotal);

    return {
        subtotal: safeSubtotal,
        discount,
        delivery,
        gst,
        total,
        minimumOrder: MINIMUM_ORDER_AMOUNT,
        isMinimumOrderMet,
        shortfall,
        couponCode: appliedCouponCode,
        couponType: appliedCouponType,
    };
}

export { MINIMUM_ORDER_AMOUNT, DELIVERY_CHARGE, GST_RATE };