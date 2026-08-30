import mongoose from "mongoose";

const membershipCardSchema = new mongoose.Schema(
    {
        cardCode: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true,
            index: true,
        },
        cardType: {
            type: String,
            required: true,
            enum: ["gold", "platinum", "diamond", "master"],
            index: true,
        },
        discountPercent: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        status: {
            type: String,
            required: true,
            enum: ["unassigned", "active", "blocked"],
            default: "unassigned",
            index: true,
        },
        assignedToCustomer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        assignedAt: {
            type: Date,
            default: null,
        },
        assignedBy: {
            type: String,
            default: "admin",
        },
        // Master Card specific yearly tracking
        yearlyDiscountLimit: {
            type: Number,
            default: 0, // e.g. 3000 for Master
        },
        yearlyDiscountUsed: {
            type: Number,
            default: 0,
        },
        currentYear: {
            type: Number,
            default: () => new Date().getFullYear(),
        },
        // 1-Year validity from allocation date
        validUntil: {
            type: Date,
            default: null,
        },
        minBillAmount: {
            type: Number,
            default: 0, // e.g. 1000 for Master
        },
        maxDiscountPerTx: {
            type: Number,
            default: 500, // e.g. 500 for Master
        },
        notes: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

membershipCardSchema.methods.ensureCurrentYearQuota = function () {
    const now = new Date();
    const thisYear = now.getFullYear();
    if (this.currentYear !== thisYear) {
        this.currentYear = thisYear;
        this.yearlyDiscountUsed = 0;
    }
    if (this.validUntil && now > new Date(this.validUntil)) {
        // If 1 year has passed since allocation, all credit is considered exhausted
        this.yearlyDiscountUsed = this.yearlyDiscountLimit || 3000;
    }
};

membershipCardSchema.methods.isCreditValid = function () {
    if (!this.validUntil) return true;
    return new Date() <= new Date(this.validUntil);
};

export const MembershipCard =
    mongoose.models.MembershipCard ||
    mongoose.model("MembershipCard", membershipCardSchema);
