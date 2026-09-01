import "dotenv/config";
import mongoose from "mongoose";
import { Order } from "../src/models/Order.js";
import { Bill } from "../src/models/Bill.js";
import { PaymentSession } from "../src/models/PaymentSession.js";
import { WalkIn } from "../src/models/WalkIn.js";
import { Reservation } from "../src/models/Reservation.js";
import { ScreeningBooking } from "../src/models/ScreeningBooking.js";
import { Visit } from "../src/models/Visit.js";
import { AnalyticsCache } from "../src/models/AnalyticsCache.js";
import { OtpSession } from "../src/models/OtpSession.js";
import { WhatsAppMessageLog } from "../src/models/WhatsAppMessageLog.js";
import { PointsLedger } from "../src/models/PointsLedger.js";
import { Referral } from "../src/models/Referral.js";
import { Customer } from "../src/models/Customer.js";
import { MembershipCard } from "../src/models/MembershipCard.js";
import { User } from "../src/models/User.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function clearMockData() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(mongoUri);
        console.log("✅ Connected to MongoDB\n");

        console.log("🧹 Clearing transactional & mock data...");

        // 1. Orders (active & past)
        const deletedOrders = await Order.deleteMany({});
        console.log(`✓ Deleted ${deletedOrders.deletedCount} orders`);

        // 2. Bills
        const deletedBills = await Bill.deleteMany({});
        console.log(`✓ Deleted ${deletedBills.deletedCount} bills`);

        // 3. Payment Sessions
        const deletedPaymentSessions = await PaymentSession.deleteMany({});
        console.log(`✓ Deleted ${deletedPaymentSessions.deletedCount} payment sessions`);

        // 4. Walk-Ins
        const deletedWalkIns = await WalkIn.deleteMany({});
        console.log(`✓ Deleted ${deletedWalkIns.deletedCount} walk-ins`);

        // 5. Reservations
        const deletedReservations = await Reservation.deleteMany({});
        console.log(`✓ Deleted ${deletedReservations.deletedCount} reservations`);

        // 6. Screening Bookings
        const deletedScreening = await ScreeningBooking.deleteMany({});
        console.log(`✓ Deleted ${deletedScreening.deletedCount} screening bookings`);

        // 7. Visits
        const deletedVisits = await Visit.deleteMany({});
        console.log(`✓ Deleted ${deletedVisits.deletedCount} visits`);

        // 8. Analytics Cache
        const deletedAnalytics = await AnalyticsCache.deleteMany({});
        console.log(`✓ Deleted ${deletedAnalytics.deletedCount} analytics cache entries`);

        // 9. OTP Sessions
        const deletedOtp = await OtpSession.deleteMany({});
        console.log(`✓ Deleted ${deletedOtp.deletedCount} OTP sessions`);

        // 10. WhatsApp Message Logs
        const deletedWhatsapp = await WhatsAppMessageLog.deleteMany({});
        console.log(`✓ Deleted ${deletedWhatsapp.deletedCount} WhatsApp message logs`);

        // 11. Points Ledgers
        const deletedLedgers = await PointsLedger.deleteMany({});
        console.log(`✓ Deleted ${deletedLedgers.deletedCount} points ledger transactions`);

        // 12. Referrals
        const deletedReferrals = await Referral.deleteMany({});
        console.log(`✓ Deleted ${deletedReferrals.deletedCount} referrals`);

        // 13. Customers
        const deletedCustomers = await Customer.deleteMany({});
        console.log(`✓ Deleted ${deletedCustomers.deletedCount} customer records`);

        // 14. Reset all membership cards to pristine unassigned state
        const resetCards = await MembershipCard.updateMany(
            {},
            {
                $set: {
                    status: "unassigned",
                    assignedToCustomer: null,
                    assignedAt: null,
                    validUntil: null,
                    yearlyDiscountUsed: 0,
                    notes: "",
                },
            }
        );
        console.log(`✓ Reset ${resetCards.modifiedCount} membership cards to unassigned`);

        // 15. Clean guest and placeholder customer user logins
        const deletedGuestUsers = await User.deleteMany({
            role: "customer",
            $or: [
                { email: { $regex: /guest|test|example\.com/i } },
                { name: { $regex: /test|guest/i } },
            ],
        });
        console.log(`✓ Deleted ${deletedGuestUsers.deletedCount} guest/test customer user accounts`);

        console.log("\n🎉 Database cleanup completed successfully!");
    } catch (error) {
        console.error("❌ Error during cleanup:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

clearMockData();
