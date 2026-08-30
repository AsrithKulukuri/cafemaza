import mongoose from "mongoose";

const referralSchema = new mongoose.Schema(
    {
        masterCustomerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },
        masterCardCode: {
            type: String,
            required: true,
            index: true,
        },
        referredCustomerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            unique: true, // One referral origin per customer
            index: true,
        },
        referredCustomerPhone: {
            type: String,
            required: true,
        },
        firstVisitCompleted: {
            type: Boolean,
            default: false,
        },
        firstVisitDiscountPercent: {
            type: Number,
            enum: [5, 10, 15],
            default: 10,
        },
        firstVisitBillId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
            default: null,
        },
        totalRepeatVisits: {
            type: Number,
            default: 0,
        },
        totalPointsAwardedToMaster: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["pending_first_visit", "active", "completed"],
            default: "pending_first_visit",
        },
    },
    {
        timestamps: true,
    }
);

export const Referral =
    mongoose.models.Referral || mongoose.model("Referral", referralSchema);
