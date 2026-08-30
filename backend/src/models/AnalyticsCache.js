import mongoose from "mongoose";

const AnalyticsCacheSchema = new mongoose.Schema(
    {
        days: { type: Number, required: true },
        generatedAt: { type: Date, required: true },
        totalOrders: { type: Number, default: 0 },
        revenue: { type: Number, default: 0 },
        totalOrdersToday: { type: Number, default: 0 },
        revenueToday: { type: Number, default: 0 },
        activeOrders: { type: Number, default: 0 },
        reservations: { type: Number, default: 0 },
        screenings: { type: Number, default: 0 },
        dailyHistory: { type: Array, default: [] },
    },
    { timestamps: true }
);

export const AnalyticsCache = mongoose.model("AnalyticsCache", AnalyticsCacheSchema);
