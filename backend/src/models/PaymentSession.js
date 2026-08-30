import mongoose from "mongoose";

const paymentSessionSchema = new mongoose.Schema(
    {
        razorpayOrderId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        amountInPaise: {
            type: Number,
            required: true,
            min: 100, // At least ₹1.00
        },
        currency: {
            type: String,
            default: "INR",
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
            index: true,
        },
        customerPhone: {
            type: String,
            default: "",
            index: true,
        },
        customerName: {
            type: String,
            default: "",
        },
        customerEmail: {
            type: String,
            default: "",
        },
        payload: {
            type: mongoose.Schema.Types.Mixed,
            required: true,
        },
        pricing: {
            subtotal: { type: Number, required: true },
            discount: { type: Number, default: 0 },
            delivery: { type: Number, default: 0 },
            gst: { type: Number, default: 0 },
            total: { type: Number, required: true },
            couponCode: { type: String },
            couponType: { type: String },
            masterDiscountChoice: { type: String },
        },
        status: {
            type: String,
            enum: ["created", "paid", "failed", "expired"],
            default: "created",
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            default: null,
            index: true,
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// TTL index to automatically purge expired sessions after 48 hours
paymentSessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 48 * 3600 });

export const PaymentSession =
    mongoose.models.PaymentSession ||
    mongoose.model("PaymentSession", paymentSessionSchema);
