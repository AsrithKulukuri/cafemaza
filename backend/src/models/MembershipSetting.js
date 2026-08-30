import mongoose from "mongoose";

const membershipSettingSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: "default_config",
        },
        // Card Discount Percentages
        discounts: {
            gold: { type: Number, default: 5 },
            platinum: { type: Number, default: 15 },
            diamond: { type: Number, default: 10 },
            master: { type: Number, default: 15 },
        },
        // Master Card Rules
        masterRules: {
            minBillAmount: { type: Number, default: 1000 },
            maxDiscountPerTx: { type: Number, default: 500 },
            yearlyDiscountLimit: { type: Number, default: 3000 },
        },
        // Referral Discount Options available for admin to pick for first-visit
        referralOptions: {
            availableDiscounts: {
                type: [Number],
                default: [5, 10, 15],
            },
            defaultFirstVisitDiscount: {
                type: Number,
                default: 10,
            },
        },
        // Points Engine Rules
        pointsRules: {
            pointsPerNewReferralFirstBill: {
                type: Number,
                default: 100, // Points given to Master member when referral places first bill
            },
            pointsPerReferralRepeatVisit: {
                type: Number,
                default: 25, // Points given to Master member whenever referral visits again
            },
            pointsPerSpendRs100: {
                type: Number,
                default: 1, // Regular spend reward for customer per ₹100 spent
            },
            pointValueInRs: {
                type: Number,
                default: 1, // 1 point = ₹1
            },
            minPointsToRedeem: {
                type: Number,
                default: 100,
            },
        },
    },
    {
        timestamps: true,
    }
);

export const MembershipSetting =
    mongoose.models.MembershipSetting ||
    mongoose.model("MembershipSetting", membershipSettingSchema);
