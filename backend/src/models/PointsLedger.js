import mongoose from "mongoose";

const pointsLedgerSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },
        cardCode: {
            type: String,
            default: "",
            index: true,
        },
        points: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: [
                "referral_first_visit",
                "referral_repeat_visit",
                "spend_reward",
                "manual_adjustment",
                "redemption",
            ],
            required: true,
            index: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
            default: null,
        },
        referredCustomerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        description: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

export const PointsLedger =
    mongoose.models.PointsLedger ||
    mongoose.model("PointsLedger", pointsLedgerSchema);
