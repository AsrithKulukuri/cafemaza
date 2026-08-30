import mongoose from "mongoose";

const walkInSchema = new mongoose.Schema(
    {
        customerName: {
            type: String,
            required: true,
            trim: true,
        },
        customerPhone: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        partySize: {
            type: Number,
            required: true,
            min: 1,
            default: 1,
        },
        tableNumber: {
            type: String,
            trim: true,
            default: "T-01",
        },
        serviceType: {
            type: String,
            enum: ["dine-in", "takeaway", "live-grill", "screening"],
            default: "dine-in",
        },
        customerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Customer",
            default: null,
        },
        cardCode: {
            type: String,
            trim: true,
            default: "",
        },
        cardType: {
            type: String,
            trim: true,
            default: "",
        },
        status: {
            type: String,
            enum: ["seated", "billed", "completed", "cancelled"],
            default: "seated",
            index: true,
        },
        arrivalDate: {
            type: Date,
            default: Date.now,
            index: true,
        },
        billedAmount: {
            type: Number,
            default: 0,
        },
        totalVisits: {
            type: Number,
            default: 1,
        },
        notes: {
            type: String,
            default: "",
            trim: true,
        },
        loggedBy: {
            type: String,
            default: "POS Staff",
        },
    },
    { timestamps: true }
);

export const WalkIn = mongoose.model("WalkIn", walkInSchema);
