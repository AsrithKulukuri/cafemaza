import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
            default: "",
        },
        cardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "MembershipCard",
            default: null,
        },
        cardCode: {
            type: String,
            uppercase: true,
            trim: true,
            default: "",
            index: true,
        },
        cardType: {
            type: String,
            enum: ["gold", "platinum", "diamond", "master", ""],
            default: "",
        },
        // Generated unique referral code for Master Card members
        referralCode: {
            type: String,
            uppercase: true,
            trim: true,
            sparse: true,
            unique: true,
        },
        // If this customer was referred by a Master Card member
        referredByMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        referredByMasterCardCode: {
            type: String,
            default: "",
        },
        referralFirstVisitDiscountPercent: {
            type: Number,
            default: 0, // e.g. 5, 10, or 15
        },
        referralFirstVisitUsed: {
            type: Boolean,
            default: false,
        },
        totalVisits: {
            type: Number,
            default: 0,
        },
        totalSpend: {
            type: Number,
            default: 0,
        },
        totalDiscountClaimed: {
            type: Number,
            default: 0,
        },
        pointsBalance: {
            type: Number,
            default: 0,
        },
        isBlocked: {
            type: Boolean,
            default: false,
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

export const Customer =
    mongoose.models.Customer || mongoose.model("Customer", customerSchema);
