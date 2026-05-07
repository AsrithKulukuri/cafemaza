import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
    {
        menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
        quantity: { type: Number, required: true, min: 1 },
    },
    { _id: false }
);

const orderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        items: { type: [orderItemSchema], required: true, validate: [(v) => v.length > 0, "Order requires items"] },
        subtotal: { type: Number, min: 0, default: 0 },
        discountAmount: { type: Number, min: 0, default: 0 },
        deliveryCharge: { type: Number, min: 0, default: 0 },
        gstAmount: { type: Number, min: 0, default: 0 },
        couponCode: { type: String, uppercase: true, trim: true },
        couponType: { type: String, enum: ["flat", "percent", "free_delivery"] },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: ["placed", "preparing", "ready", "out_for_delivery", "delivered"],
            default: "placed",
        },
        orderType: {
            type: String,
            enum: ["dine_in", "takeaway", "delivery"],
            default: "delivery",
        },
        createdByRole: {
            type: String,
            enum: ["customer", "staff", "bearer", "manager", "admin", "kitchen", "delivery"],
        },
        deliveryPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        deliveryAssignedAt: { type: Date },
        deliveryOtp: { type: String, trim: true },
        deliveredAt: { type: Date },
        deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        tableNumber: { type: Number, min: 1 },
        specialInstructions: { type: String, trim: true },
        address: { type: String, required: true },
        customerPhone: { type: String, trim: true },
        paymentMethod: { type: String, enum: ["UPI", "Card", "Cash"], required: true },
        paymentStatus: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        paymentProvider: {
            type: String,
            enum: ["razorpay", "cod", "manual"],
            default: "manual",
        },
        paymentReference: { type: String, trim: true },
    },
    { timestamps: true }
);

orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ deliveryPartnerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ paymentReference: 1 }, { sparse: true, unique: false });

export const Order = mongoose.model("Order", orderSchema);
