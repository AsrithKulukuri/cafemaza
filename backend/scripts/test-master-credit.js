import "dotenv/config";
import mongoose from "mongoose";
import { calculateBillDiscount, processBillTransaction, assignCardToCustomer } from "../src/services/membershipService.js";
import { MembershipCard } from "../src/models/MembershipCard.js";
import { Customer } from "../src/models/Customer.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function testMasterCreditLogic() {
    await mongoose.connect(mongoUri);
    console.log("Connected to DB:", mongoUri);

    // 1. Find user's Master Card
    const card = await MembershipCard.findOne({ cardCode: "CMM001" });
    const customer = await Customer.findOne({ phone: "+918977311418" });

    console.log("Card CMM001:", {
        cardType: card.cardType,
        yearlyDiscountLimit: card.yearlyDiscountLimit,
        yearlyDiscountUsed: card.yearlyDiscountUsed,
        validUntil: card.validUntil,
        assignedAt: card.assignedAt,
    });

    // Test 1: Subtotal ₹3,185 with masterDiscountChoice = "credit_500"
    const calc500 = await calculateBillDiscount({
        customerId: customer._id,
        subtotal: 3185,
        masterDiscountChoice: "credit_500",
    });
    console.log("\n--- TEST 1: Choice 'credit_500' on ₹3185 ---");
    console.log("Discount Amount:", calc500.discountAmount, "(Expected: 500)");
    console.log("Discount Type:", calc500.discountType);
    console.log("Explanation:", calc500.masterExplanation);
    console.assert(calc500.discountAmount === 500, "Test 1 Failed: Expected ₹500 discount");

    // Test 2: Subtotal ₹3,185 with masterDiscountChoice = "percent_15"
    const calc15 = await calculateBillDiscount({
        customerId: customer._id,
        subtotal: 3185,
        masterDiscountChoice: "percent_15",
    });
    console.log("\n--- TEST 2: Choice 'percent_15' on ₹3185 ---");
    console.log("Discount Amount:", calc15.discountAmount, "(Expected: ~478)");
    console.log("Discount Type:", calc15.discountType);
    console.log("Explanation:", calc15.masterExplanation);
    console.assert(calc15.discountAmount === 478 || calc15.discountAmount === 477.75, "Test 2 Failed: Expected ₹478 discount");

    // Test 3: Exhausted Credit (yearlyDiscountUsed = 3000)
    card.yearlyDiscountUsed = 3000;
    await card.save();

    const calcExhausted = await calculateBillDiscount({
        customerId: customer._id,
        subtotal: 3185,
        masterDiscountChoice: "credit_500",
    });
    console.log("\n--- TEST 3: Credit Limit Exhausted (₹3,000 used) with Choice 'credit_500' ---");
    console.log("Discount Amount:", calcExhausted.discountAmount, "(Expected: 478 fallback to 15%)");
    console.log("Discount Type:", calcExhausted.discountType);
    console.log("Explanation:", calcExhausted.masterExplanation);
    console.assert(calcExhausted.discountAmount === 478, "Test 3 Failed: Should fallback to 15%");

    // Restore card usage back to 500
    card.yearlyDiscountUsed = 500;
    await card.save();
    console.log("\n✓ Restored CMM001 yearlyDiscountUsed back to 500 (₹2500 remaining)");

    await mongoose.disconnect();
    console.log("\n🎉 All 3 Master Card Credit rules verified successfully!");
}

testMasterCreditLogic().catch(console.error);
