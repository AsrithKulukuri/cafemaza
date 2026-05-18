import { Order } from "../models/Order.js";
import { Reservation } from "../models/Reservation.js";
import { ScreeningBooking } from "../models/ScreeningBooking.js";
import { AnalyticsCache } from "../models/AnalyticsCache.js";
import { logger } from "../utils/logger.js";

function buildUtcDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildDailyHistory(startDate, days, aggregateRows) {
    const historyMap = new Map(
        aggregateRows.map((row) => [row._id, { orders: row.orders || 0, revenue: row.revenue || 0 }])
    );

    const dailyHistory = [];
    const current = new Date(startDate);

    for (let index = 0; index < days; index += 1) {
        const key = buildUtcDateKey(current);
        const summary = historyMap.get(key) || { orders: 0, revenue: 0 };

        dailyHistory.push({
            date: key,
            orders: summary.orders,
            revenue: summary.revenue,
        });

        current.setUTCDate(current.getUTCDate() + 1);
    }

    return dailyHistory;
}

export async function computeAndCacheAnalytics(days = 90) {
    try {
        const historyDays = Math.min(Math.max(Number(days) || 90, 1), 365);
        const historyStart = new Date();
        historyStart.setUTCDate(historyStart.getUTCDate() - (historyDays - 1));
        historyStart.setUTCHours(0, 0, 0, 0);

        const totalOrders = await Order.countDocuments();
        const activeOrders = await Order.countDocuments({ status: { $in: ["placed", "preparing", "ready", "out_for_delivery"] } });
        const revenueData = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$totalAmount" } } }]);
        const reservations = await Reservation.countDocuments();
        const screenings = await ScreeningBooking.countDocuments();
        const dailyHistoryRows = await Order.aggregate([
            { $match: { createdAt: { $gte: historyStart } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        const dailyHistory = buildDailyHistory(historyStart, historyDays, dailyHistoryRows);

        const payload = {
            days: historyDays,
            generatedAt: new Date(),
            totalOrders,
            revenue: revenueData[0]?.revenue ?? 0,
            activeOrders,
            reservations,
            screenings,
            dailyHistory,
        };

        await AnalyticsCache.findOneAndUpdate({ days: historyDays }, payload, { upsert: true, new: true });
        logger.info("Analytics cache updated", { days: historyDays });
        return payload;
    } catch (error) {
        logger.error("Failed to compute analytics", { message: error?.message });
        throw error;
    }
}

export function scheduleDailyAnalytics(days = 90) {
    // Compute immediately then schedule for next midnight and every 24h
    void computeAndCacheAnalytics(days).catch(() => { });

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msToNextMidnight = nextMidnight.getTime() - now.getTime();

    // Schedule first run at next midnight, then every 24 hours
    setTimeout(() => {
        void computeAndCacheAnalytics(days).catch(() => { });
        setInterval(() => void computeAndCacheAnalytics(days).catch(() => { }), 24 * 60 * 60 * 1000);
    }, msToNextMidnight);
}
