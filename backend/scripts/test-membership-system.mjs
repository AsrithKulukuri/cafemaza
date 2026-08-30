import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

import { MembershipCard } from "../src/models/MembershipCard.js";
import { Customer } from "../src/models/Customer.js";
import { Bill } from "../src/models/Bill.js";
import { Visit } from "../src/models/Visit.js";
import { Referral } from "../src/models/Referral.js";
import { PointsLedger } from "../src/models/PointsLedger.js";
import {
    getSettings,
    assignCardToCustomer,
    lookupCustomerOrCard,
    calculateBillDiscount,
    processBillTransaction,
} from "../src/services/membershipService.js";
import { seedMembershipCards } from "./seed-membership-cards.js";

const mongoUri = process.env.MONGODB_URI;

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ Assertion Failed: ${message}`);
        throw new Error(message);
    }
    console.log(`  ✓ ${message}`);
}

async function runTests() {
    console.log("\n=======================================================");
    console.log("🚀 Starting Cafe Maza Membership System Acceptance Tests");
    console.log("=======================================================\n");

    await mongoose.connect(mongoUri);

    // 1. Test 200 Cards Seeding & Code Formats
    console.log("TEST 1: Card Seeding & 200 Predefined Codes");
    await seedMembershipCards(true);

    const totalCards = await MembershipCard.countDocuments();
    assert(totalCards === 200, `Total cards in database is 200 (got ${totalCards})`);

    const goldCount = await MembershipCard.countDocuments({ cardType: "gold" });
    const platinumCount = await MembershipCard.countDocuments({ cardType: "platinum" });
    const diamondCount = await MembershipCard.countDocuments({ cardType: "diamond" });
    const masterCount = await MembershipCard.countDocuments({ cardType: "master" });

    assert(goldCount === 100, `100 Gold cards seeded (CMG001 to CMG100)`);
    assert(platinumCount === 30, `30 Platinum cards seeded (CMP001 to CMP030)`);
    assert(diamondCount === 50, `50 Diamond cards seeded (CMD001 to CMD050)`);
    assert(masterCount === 20, `20 Master cards seeded (CMM001 to CMM020)`);

    // Verify sample codes
    const cmg001 = await MembershipCard.findOne({ cardCode: "CMG001" });
    const cmp030 = await MembershipCard.findOne({ cardCode: "CMP030" });
    const cmd050 = await MembershipCard.findOne({ cardCode: "CMD050" });
    const cmm001 = await MembershipCard.findOne({ cardCode: "CMM001" });

    assert(cmg001 && cmg001.discountPercent === 5, "CMG001 exists with 5% discount");
    assert(cmp030 && cmp030.discountPercent === 15, "CMP030 exists with 15% discount");
    assert(cmd050 && cmd050.discountPercent === 10, "CMD050 exists with 10% discount");
    assert(cmm001 && cmm001.yearlyDiscountLimit === 3000 && cmm001.minBillAmount === 1000, "CMM001 exists with ₹3000 limit & ₹1000 min bill");

    // 2. Test Card Assignment & Master Referral Code Creation
    console.log("\nTEST 2: Card Linking & Master Card Referral Generation");
    const testPhoneMaster = "+919999000001";
    await Customer.deleteMany({ phone: { $in: [testPhoneMaster, "+919999000002", "+919999000003"] } });
    await MembershipCard.updateMany({ cardCode: { $in: ["CMM001", "CMG001", "CMP001"] } }, { status: "unassigned", assignedToCustomer: null, yearlyDiscountUsed: 0 });

    const masterAssigned = await assignCardToCustomer({
        cardCode: "CMM001",
        name: "Vikram Master",
        phone: testPhoneMaster,
        email: "vikram@example.com",
    });

    assert(masterAssigned.customer.cardCode === "CMM001", "Master card CMM001 linked to customer");
    assert(masterAssigned.customer.referralCode === "REF-CMM001", "Unique referral code REF-CMM001 generated");
    assert(masterAssigned.card.status === "active", "Card status changed to active");

    // 3. Test Master Card Discount Limits (Min Bill ₹1000, Max ₹500/tx, ₹3000 Yearly Cap)
    console.log("\nTEST 3: Master Card Discount Limits & Enforcement");

    // Case A: Bill below min ₹1000
    const calcLow = await calculateBillDiscount({
        customerId: masterAssigned.customer._id,
        subtotal: 800,
    });
    assert(calcLow.discountAmount === 0, "Bill of ₹800 received ₹0 discount (below ₹1000 min)");

    // Case B: Bill of ₹2000 => with percent_15 => 15% = ₹300 (< ₹500 cap)
    const calcNorm = await calculateBillDiscount({
        customerId: masterAssigned.customer._id,
        subtotal: 2000,
        masterDiscountChoice: "percent_15",
    });
    assert(calcNorm.discountAmount === 300 && calcNorm.netTotal === 1700, "Bill of ₹2000 with percent_15 received 15% (₹300 discount, net ₹1700)");

    // Case C: Bill of ₹5000 => with credit_500 => ₹500 discount from credit pool
    const calcCapped = await calculateBillDiscount({
        customerId: masterAssigned.customer._id,
        subtotal: 5000,
        masterDiscountChoice: "credit_500",
    });
    assert(calcCapped.discountAmount === 500 && calcCapped.discountType === "master_credit_500", "Bill of ₹5000 with credit_500 received ₹500 discount from credit pool");

    // Process a bill to consume quota
    const billRes1 = await processBillTransaction({
        customerId: masterAssigned.customer._id,
        subtotal: 5000,
        masterDiscountChoice: "credit_500",
    });
    assert(billRes1.bill.discountAmount === 500, "Bill processed with ₹500 discount recorded");

    const updatedCard = await MembershipCard.findOne({ cardCode: "CMM001" });
    assert(updatedCard.yearlyDiscountUsed === 500, "Card yearlyDiscountUsed incremented to ₹500");

    // 4. Test Referral Flow & Points Engine
    console.log("\nTEST 4: Referral System & Points Ledger Engine");
    const testPhoneReferred = "+919999000002";

    const referredAssigned = await assignCardToCustomer({
        cardCode: "CMG001",
        name: "Rahul Referred",
        phone: testPhoneReferred,
        referredByCode: "REF-CMM001",
        referralDiscountPercent: 10,
    });

    assert(String(referredAssigned.customer.referredByMasterId) === String(masterAssigned.customer._id), "Referred customer linked to Master customer");
    assert(referredAssigned.customer.referralFirstVisitDiscountPercent === 10, "Referral first-visit discount set to 10%");

    // First visit bill processing for referred customer
    const initialMasterPoints = (await Customer.findById(masterAssigned.customer._id)).pointsBalance;
    const refBill1 = await processBillTransaction({
        customerId: referredAssigned.customer._id,
        subtotal: 1000,
        applyReferralDiscount: true,
        selectedReferralDiscount: 10,
    });

    assert(refBill1.bill.discountAmount === 100, "Referred customer received 10% first-visit discount (₹100)");

    const masterAfterFirst = await Customer.findById(masterAssigned.customer._id);
    assert(masterAfterFirst.pointsBalance === initialMasterPoints + 100, "Master member earned 100 bonus points on referral first bill");

    const ledgerFirst = await PointsLedger.findOne({
        customerId: masterAssigned.customer._id,
        type: "referral_first_visit",
    });
    assert(ledgerFirst && ledgerFirst.points === 100, "PointsLedger entry created for referral_first_visit");

    // Repeat visit by referred customer
    const refBill2 = await processBillTransaction({
        customerId: referredAssigned.customer._id,
        subtotal: 1500,
    });

    const masterAfterRepeat = await Customer.findById(masterAssigned.customer._id);
    assert(masterAfterRepeat.pointsBalance === masterAfterFirst.pointsBalance + 25, "Master member earned 25 repeat-visit points on referral 2nd visit");

    const ledgerRepeat = await PointsLedger.findOne({
        customerId: masterAssigned.customer._id,
        type: "referral_repeat_visit",
    });
    assert(ledgerRepeat && ledgerRepeat.points === 25, "PointsLedger entry created for referral_repeat_visit");

    // 5. Test Fast Universal Lookup
    console.log("\nTEST 5: POS Barcode Scanner & Universal Lookup");
    const scanLookup = await lookupCustomerOrCard("CMM001");
    assert(scanLookup.found === true && scanLookup.customer.name === "Vikram Master", "Scanned card CMM001 returned Vikram Master");

    const phoneLookup = await lookupCustomerOrCard("+919999000002");
    assert(phoneLookup.found === true && phoneLookup.customer.cardCode === "CMG001", "Phone lookup returned Rahul Referred holding CMG001");

    const unassignedLookup = await lookupCustomerOrCard("CMP002");
    assert(unassignedLookup.found === true && unassignedLookup.type === "unassigned_card", "Scanned unassigned card CMP002 returned unassigned_card status");

    console.log("\n=======================================================");
    console.log("🎉 ALL 5 ACCEPTANCE TEST SUITES PASSED PERFECTLY!");
    console.log("=======================================================\n");

    await mongoose.disconnect();
}

runTests().catch((err) => {
    console.error("Test Suite Failed:", err);
    process.exit(1);
});
