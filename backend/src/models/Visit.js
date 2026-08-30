import mongoose from "mongoose";

const visitSchema = new mongoose.Schema(
    {
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },
        customerPhone: {
            type: String,
            required: true,
            index: true,
        },
        cardCode: {
            type: String,
            default: "",
            index: true,
        },
        cardType: {
            type: String,
            default: "",
        },
        billId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Bill",
            default: null,
        },
        billNumber: {
            type: String,
            default: "",
        },
        billAmount: {
            type: Number,
            required: true,
        },
        discountAmount: {
            type: Number,
            default: 0,
        },
        discountPercent: {
            type: Number,
            default: 0,
        },
        netPaid: {
            type: Number,
            required: true,
        },
        isFirstVisit: {
            type: Boolean,
            default: false,
        },
        isReferralVisit: {
            type: Boolean,
            default: false,
        },
        referrerMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        pointsAwardedToReferrer: {
            type: Number,
            default: 0,
        },
        visitDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export const Visit =
    mongoose.models.Visit || mongoose.model("Visit", visitSchema);
