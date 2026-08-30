import { Order } from "../models/Order.js";
import { Bill } from "../models/Bill.js";
import { Reservation } from "../models/Reservation.js";
import { ScreeningBooking } from "../models/ScreeningBooking.js";
import { AnalyticsCache } from "../models/AnalyticsCache.js";
import { logger } from "../utils/logger.js";

function buildUtcDateKey(date) {
    return date.toISOString().slice(0, 10);
}

function buildDailyHistory(startDate, days, aggregateRows) {
    const historyMap = new Map(
        aggregateRows.map((row) => [row._id, { orders: row.orders || 0, revenue: Number((row.revenue || 0).toFixed(2)) }])
    );

    const dailyHistory = [];
    const current = new Date();
    current.setUTCHours(0, 0, 0, 0);

    // Build descending from today down to (days - 1) days ago
    for (let index = 0; index < days; index += 1) {
        const key = buildUtcDateKey(current);
        const summary = historyMap.get(key) || { orders: 0, revenue: 0 };

        dailyHistory.push({
            date: key,
            orders: summary.orders,
            revenue: Number((summary.revenue || 0).toFixed(2)),
        });

        current.setUTCDate(current.getUTCDate() - 1);
    }

    return dailyHistory;
}

export async function computeAndCacheAnalytics(days = 90) {
    try {
        const historyDays = Math.min(Math.max(Number(days) || 90, 1), 365);
        const historyStart = new Date();
        historyStart.setUTCDate(historyStart.getUTCDate() - (historyDays - 1));
        historyStart.setUTCHours(0, 0, 0, 0);

        const todayStart = new Date();
        todayStart.setUTCHours(0, 0, 0, 0);

        // 1. Order + Bill Counts & Revenues (All Time)
        const orderCount = await Order.countDocuments();
        const billCount = await Bill.countDocuments({ status: "paid" });
        const totalOrders = orderCount + billCount;

        const orderRevenueData = await Order.aggregate([{ $group: { _id: null, revenue: { $sum: "$totalAmount" } } }]);
        const billRevenueData = await Bill.aggregate([{ $match: { status: "paid" } }, { $group: { _id: null, revenue: { $sum: "$netTotal" } } }]);
        const totalRevenue = Number(((orderRevenueData[0]?.revenue || 0) + (billRevenueData[0]?.revenue || 0)).toFixed(2));

        // 2. Today Metrics
        const ordersTodayCount = (await Order.countDocuments({ createdAt: { $gte: todayStart } })) +
                                 (await Bill.countDocuments({ createdAt: { $gte: todayStart }, status: "paid" }));

        const orderTodayRev = await Order.aggregate([
            { $match: { createdAt: { $gte: todayStart } } },
            { $group: { _id: null, revenue: { $sum: "$totalAmount" } } },
        ]);
        const billTodayRev = await Bill.aggregate([
            { $match: { createdAt: { $gte: todayStart }, status: "paid" } },
            { $group: { _id: null, revenue: { $sum: "$netTotal" } } },
        ]);
        const revenueToday = Number(((orderTodayRev[0]?.revenue || 0) + (billTodayRev[0]?.revenue || 0)).toFixed(2));

        // 3. Active & Bookings
        const activeOrders = await Order.countDocuments({ status: { $in: ["placed", "preparing", "ready", "out_for_delivery"] } });
        const reservations = await Reservation.countDocuments();
        const screenings = await ScreeningBooking.countDocuments();

        // 4. Daily Aggregations (Order + Bill)
        const dailyOrderRows = await Order.aggregate([
            { $match: { createdAt: { $gte: historyStart } } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" },
                },
            },
        ]);

        const dailyBillRows = await Bill.aggregate([
            { $match: { createdAt: { $gte: historyStart }, status: "paid" } },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$netTotal" },
                },
            },
        ]);

        // Merge daily order & bill aggregations by date key
        const mergedDailyMap = new Map();
        for (const row of [...dailyOrderRows, ...dailyBillRows]) {
            const existing = mergedDailyMap.get(row._id) || { orders: 0, revenue: 0 };
            mergedDailyMap.set(row._id, {
                orders: existing.orders + (row.orders || 0),
                revenue: existing.revenue + (row.revenue || 0),
            });
        }

        const aggregateRows = Array.from(mergedDailyMap.entries()).map(([_id, val]) => ({
            _id,
            orders: val.orders,
            revenue: val.revenue,
        }));

        const dailyHistory = buildDailyHistory(historyStart, historyDays, aggregateRows);

        const payload = {
            days: historyDays,
            generatedAt: new Date(),
            totalOrders,
            revenue: totalRevenue,
            totalOrdersToday: ordersTodayCount,
            revenueToday,
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
    void computeAndCacheAnalytics(days).catch(() => { });

    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const msToNextMidnight = nextMidnight.getTime() - now.getTime();

    setTimeout(() => {
        void computeAndCacheAnalytics(days).catch(() => { });
        setInterval(() => void computeAndCacheAnalytics(days).catch(() => { }), 24 * 60 * 60 * 1000);
    }, msToNextMidnight);
}
