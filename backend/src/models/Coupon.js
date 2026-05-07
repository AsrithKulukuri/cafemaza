import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["flat", "percent", "free_delivery"],
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        minOrder: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        maxDiscount: {
            type: Number,
            min: 0,
            default: null,
        },
        usageLimit: {
            type: Number,
            min: 1,
            default: null,
        },
        perUserLimit: {
            type: Number,
            min: 1,
            default: null,
        },
        usageCount: {
            type: Number,
            min: 0,
            default: 0,
        },
        startDate: {
            type: Date,
            required: true,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

couponSchema.index({ isActive: 1, startDate: 1, expiryDate: 1 });

export const Coupon = mongoose.model("Coupon", couponSchema);
