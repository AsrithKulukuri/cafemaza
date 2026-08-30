import "dotenv/config";
import mongoose from "mongoose";
import { MembershipCard } from "../src/models/MembershipCard.js";
import { MembershipSetting } from "../src/models/MembershipSetting.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

export async function seedMembershipCards(force = false) {
    if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(mongoUri);
    }

    // 1. Ensure Membership Settings Singleton
    let settings = await MembershipSetting.findOne({ key: "default_config" });
    if (!settings) {
        settings = await MembershipSetting.create({
            key: "default_config",
            discounts: {
                gold: 5,
                platinum: 15,
                diamond: 10,
                master: 15,
            },
            masterRules: {
                minBillAmount: 1000,
                maxDiscountPerTx: 500,
                yearlyDiscountLimit: 3000,
            },
            referralOptions: {
                availableDiscounts: [5, 10, 15],
                defaultFirstVisitDiscount: 10,
            },
            pointsRules: {
                pointsPerNewReferralFirstBill: 100,
                pointsPerReferralRepeatVisit: 25,
                pointsPerSpendRs100: 1,
                pointValueInRs: 1,
                minPointsToRedeem: 100,
            },
        });
        console.log("✓ Default Membership Settings initialized");
    }

    // 2. Generate the 200 Card Specifications
    const cardSpecs = [];

    // Gold: CMG001 to CMG100 (100 cards, 5%)
    for (let i = 1; i <= 100; i++) {
        const code = `CMG${String(i).padStart(3, "0")}`;
        cardSpecs.push({
            cardCode: code,
            cardType: "gold",
            discountPercent: settings.discounts.gold || 5,
            status: "unassigned",
            yearlyDiscountLimit: 0,
            minBillAmount: 0,
            maxDiscountPerTx: 0,
        });
    }

    // Platinum: CMP001 to CMP030 (30 cards, 15%)
    for (let i = 1; i <= 30; i++) {
        const code = `CMP${String(i).padStart(3, "0")}`;
        cardSpecs.push({
            cardCode: code,
            cardType: "platinum",
            discountPercent: settings.discounts.platinum || 15,
            status: "unassigned",
            yearlyDiscountLimit: 0,
            minBillAmount: 0,
            maxDiscountPerTx: 0,
        });
    }

    // Diamond: CMD001 to CMD050 (50 cards, 10%)
    for (let i = 1; i <= 50; i++) {
        const code = `CMD${String(i).padStart(3, "0")}`;
        cardSpecs.push({
            cardCode: code,
            cardType: "diamond",
            discountPercent: settings.discounts.diamond || 10,
            status: "unassigned",
            yearlyDiscountLimit: 0,
            minBillAmount: 0,
            maxDiscountPerTx: 0,
        });
    }

    // Master: CMM001 to CMM020 (20 cards, 15%, Min 1000, Max 500, Yearly 3000)
    for (let i = 1; i <= 20; i++) {
        const code = `CMM${String(i).padStart(3, "0")}`;
        cardSpecs.push({
            cardCode: code,
            cardType: "master",
            discountPercent: settings.discounts.master || 15,
            status: "unassigned",
            yearlyDiscountLimit: settings.masterRules.yearlyDiscountLimit || 3000,
            minBillAmount: settings.masterRules.minBillAmount || 1000,
            maxDiscountPerTx: settings.masterRules.maxDiscountPerTx || 500,
            yearlyDiscountUsed: 0,
            currentYear: new Date().getFullYear(),
        });
    }

    console.log(`Prepared ${cardSpecs.length} predefined cards specifications.`);

    let inserted = 0;
    let existing = 0;

    for (const spec of cardSpecs) {
        const found = await MembershipCard.findOne({ cardCode: spec.cardCode });
        if (!found) {
            await MembershipCard.create(spec);
            inserted++;
        } else {
            existing++;
            if (force && found.status === "unassigned") {
                await MembershipCard.updateOne({ _id: found._id }, spec);
            }
        }
    }

    console.log(`✓ Cards Seeding summary: ${inserted} newly created, ${existing} already in database (Total: 200).`);
    return { inserted, existing, total: cardSpecs.length };
}

if (process.argv[1]?.endsWith("seed-membership-cards.js")) {
    seedMembershipCards()
        .then(() => mongoose.disconnect())
        .catch((err) => {
            console.error(err);
            process.exit(1);
        });
}
