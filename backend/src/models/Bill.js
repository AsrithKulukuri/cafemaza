import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
    {
        billNumber: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
            index: true,
        },
        customerName: {
            type: String,
            default: "Walk-in Guest",
        },
        customerPhone: {
            type: String,
            default: "",
            index: true,
        },
        cardCode: {
            type: String,
            default: "",
            index: true,
        },
        cardType: {
            type: String,
            enum: ["gold", "platinum", "diamond", "master", ""],
            default: "",
        },
        items: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, default: 1 },
                subtotal: { type: Number, required: true },
            },
        ],
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        discountType: {
            type: String,
            enum: ["none", "card_discount", "master_credit_500", "referral_first_visit", "manual"],
            default: "none",
        },
        discountPercent: {
            type: Number,
            default: 0,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        masterDiscountCapped: {
            type: Boolean,
            default: false,
        },
        masterYearlyQuotaUsedInThisTx: {
            type: Number,
            default: 0,
        },
        netTotal: {
            type: Number,
            required: true,
            min: 0,
        },
        pointsEarnedByCustomer: {
            type: Number,
            default: 0,
        },
        pointsAwardedToReferrer: {
            type: Number,
            default: 0,
        },
        referrerMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        paymentMethod: {
            type: String,
            enum: ["cash", "upi", "card", "razorpay", "other"],
            default: "upi",
        },
        orderType: {
            type: String,
            enum: ["dine-in", "takeaway", "delivery"],
            default: "dine-in",
        },
        tableNumber: {
            type: String,
            default: "",
        },
        processedBy: {
            type: String,
            default: "staff",
        },
        status: {
            type: String,
            enum: ["paid", "cancelled", "refunded"],
            default: "paid",
        },
    },
    {
        timestamps: true,
    }
);

export const Bill = mongoose.models.Bill || mongoose.model("Bill", billSchema);
