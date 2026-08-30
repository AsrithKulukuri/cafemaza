import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function fixCardAndCustomer() {
    await mongoose.connect(process.env.MONGODB_URI);
    const { Customer } = await import("../src/models/Customer.js");
    const { MembershipCard } = await import("../src/models/MembershipCard.js");

    console.log("Fixing CMM001 link to Asrith (+918977311418)...");

    // 1. Find Asrith
    const asrith = await Customer.findOne({ phone: { $regex: "8977311418" } });
    if (!asrith) {
        console.error("Asrith not found!");
        await mongoose.disconnect();
        return;
    }

    // 2. Find Card CMM001
    const card = await MembershipCard.findOne({ cardCode: "CMM001" });
    if (!card) {
        console.error("Card CMM001 not found!");
        await mongoose.disconnect();
        return;
    }

    // 3. Remove duplicate/stale cardCode on Vikram Master or other test customers
    await Customer.updateMany(
        { cardCode: "CMM001", _id: { $ne: asrith._id } },
        { $unset: { cardCode: 1, cardId: 1, cardType: 1, referralCode: 1 } }
    );

    // 4. Update Asrith's details and Master referral code
    asrith.cardId = card._id;
    asrith.cardCode = "CMM001";
    asrith.cardType = "master";
    asrith.referralCode = "REF-CMM001";
    await asrith.save();

    // 5. Update Card CMM001 assignedToCustomer
    card.status = "active";
    card.assignedToCustomer = asrith._id;
    card.assignedBy = "admin";
    card.yearlyDiscountLimit = 3000;
    card.ensureCurrentYearQuota();
    await card.save();

    console.log("✓ Successfully synchronized CMM001 with Asrith:", {
        customerId: asrith._id,
        name: asrith.name,
        phone: asrith.phone,
        cardCode: asrith.cardCode,
        referralCode: asrith.referralCode,
        cardAssignedTo: card.assignedToCustomer,
    });

    await mongoose.disconnect();
}

fixCardAndCustomer();
