import mongoose from "mongoose";
import { MembershipCard } from "../models/MembershipCard.js";
import { Customer } from "../models/Customer.js";
import { Bill } from "../models/Bill.js";
import { Visit } from "../models/Visit.js";
import { Referral } from "../models/Referral.js";
import { PointsLedger } from "../models/PointsLedger.js";
import { MembershipSetting } from "../models/MembershipSetting.js";

export async function getSettings() {
    let settings = await MembershipSetting.findOne({ key: "default_config" });
    if (!settings) {
        settings = await MembershipSetting.create({
            key: "default_config",
            discounts: { gold: 5, platinum: 15, diamond: 10, master: 15 },
            masterRules: { minBillAmount: 1000, maxDiscountPerTx: 500, yearlyDiscountLimit: 3000 },
            referralOptions: { availableDiscounts: [5, 10, 15], defaultFirstVisitDiscount: 10 },
            pointsRules: {
                pointsPerNewReferralFirstBill: 100,
                pointsPerReferralRepeatVisit: 25,
                pointsPerSpendRs100: 1,
                pointValueInRs: 1,
                minPointsToRedeem: 100,
            },
        });
    }
    return settings;
}

export async function updateSettings(updates) {
    const settings = await getSettings();
    if (updates.discounts) Object.assign(settings.discounts, updates.discounts);
    if (updates.masterRules) Object.assign(settings.masterRules, updates.masterRules);
    if (updates.referralOptions) Object.assign(settings.referralOptions, updates.referralOptions);
    if (updates.pointsRules) Object.assign(settings.pointsRules, updates.pointsRules);

    await settings.save();
    return settings;
}

function getPhoneVariants(phone) {
    if (!phone) return [];
    const digits = String(phone).replace(/\D/g, "");
    if (!digits) return [];
    const last10 = digits.slice(-10);
    return [
        phone,
        last10,
        `+91${last10}`,
        `91${last10}`,
        `0${last10}`,
    ];
}

export async function assignCardToCustomer({
    cardCode,
    name,
    customerName,
    phone,
    customerPhone,
    email = "",
    customerEmail = "",
    referredByCode = "",
    referralDiscountPercent = 10,
    assignedBy = "staff",
    notes = "",
}) {
    const resolvedName = String(name || customerName || "").trim();
    const resolvedPhone = String(phone || customerPhone || "").trim();
    const resolvedEmail = String(email || customerEmail || "").trim();

    const formattedCode = String(cardCode || "").trim().toUpperCase();
    const phoneVariants = getPhoneVariants(resolvedPhone);
    const formattedPhone = phoneVariants.find((p) => p.startsWith("+91")) || resolvedPhone;

    if (!formattedCode) throw new Error("Card code is required.");
    if (!resolvedPhone) throw new Error("Customer phone number is required.");
    if (!resolvedName) throw new Error("Customer name is required.");

    const card = await MembershipCard.findOne({ cardCode: formattedCode });
    if (!card) throw new Error(`Card '${formattedCode}' does not exist in the system.`);

    if (card.status === "blocked") {
        throw new Error(`Card '${formattedCode}' is currently blocked.`);
    }

    let customer = await Customer.findOne({
        $or: [
            { phone: { $in: phoneVariants } },
            ...(email ? [{ email: String(email).trim().toLowerCase() }] : []),
        ],
    });

    // Check if card is already assigned to a different customer
    if (card.status === "active" && card.assignedToCustomer) {
        if (!customer || String(card.assignedToCustomer) !== String(customer._id)) {
            throw new Error(`Card '${formattedCode}' is already assigned to another customer.`);
        }
    }

    // Check if customer already has a different active card
    if (customer && customer.cardCode && customer.cardCode !== formattedCode) {
        throw new Error(`Customer with phone ${formattedPhone} already holds active card '${customer.cardCode}'.`);
    }

    // Check referrer if provided
    let referrerCustomer = null;
    if (referredByCode) {
        const cleanRef = String(referredByCode).trim().toUpperCase();
        referrerCustomer = await Customer.findOne({
            $or: [{ referralCode: cleanRef }, { cardCode: cleanRef }],
        });
        if (!referrerCustomer) {
            throw new Error(`Referral code / Master Card '${cleanRef}' not found.`);
        }
    }

    if (!customer) {
        customer = new Customer({
            name: resolvedName,
            phone: formattedPhone,
            email: resolvedEmail,
            notes,
        });
    } else {
        customer.name = resolvedName || customer.name;
        customer.phone = formattedPhone;
        customer.email = resolvedEmail || customer.email;
        if (notes) customer.notes = notes;
    }

    // Link card to customer
    customer.cardId = card._id;
    customer.cardCode = card.cardCode;
    customer.cardType = card.cardType;

    // Generate referral code for Master Card members
    if (card.cardType === "master") {
        const targetReferralCode = `REF-${card.cardCode}`;
        // Clear referralCode from any other customer record to prevent duplicate key collisions
        await Customer.updateMany(
            { referralCode: targetReferralCode, _id: { $ne: customer._id } },
            { $unset: { referralCode: 1 } }
        );
        customer.referralCode = targetReferralCode;
    }

    // Handle referrer link
    if (referrerCustomer && String(referrerCustomer._id) !== String(customer._id)) {
        customer.referredByMasterId = referrerCustomer._id;
        customer.referredByMasterCardCode = referrerCustomer.cardCode;
        customer.referralFirstVisitDiscountPercent = Number(referralDiscountPercent) || 10;
        customer.referralFirstVisitUsed = false;

        // Upsert Referral record
        await Referral.findOneAndUpdate(
            { referredCustomerId: customer._id },
            {
                masterCustomerId: referrerCustomer._id,
                masterCardCode: referrerCustomer.cardCode,
                referredCustomerId: customer._id,
                referredCustomerPhone: formattedPhone,
                firstVisitDiscountPercent: Number(referralDiscountPercent) || 10,
                status: "pending_first_visit",
            },
            { upsert: true, new: true }
        );
    }

    await customer.save();

    card.status = "active";
    card.assignedToCustomer = customer._id;
    const now = new Date();
    card.assignedAt = now;
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    card.validUntil = oneYearLater;
    card.assignedBy = assignedBy;
    card.ensureCurrentYearQuota();
    await card.save();

    return { customer, card };
}

export async function lookupCustomerOrCard(query) {
    const raw = String(query || "").trim();
    if (!raw) throw new Error("Search query is required.");

    const upper = raw.toUpperCase();
    const cleanPhone = raw.replace(/\s+/g, "");
    const phoneVariants = getPhoneVariants(cleanPhone);

    // 1. Check if it's a card code directly
    let card = await MembershipCard.findOne({ cardCode: upper }).populate("assignedToCustomer");
    let customer = null;

    if (card) {
        if (card.assignedToCustomer) {
            customer = card.assignedToCustomer;
        } else {
            // Find if any customer has this cardCode
            customer = await Customer.findOne({
                $or: [
                    { cardCode: upper },
                    { cardId: card._id },
                ],
            });
            if (customer) {
                card.assignedToCustomer = customer._id;
                card.status = "active";
                await card.save();
            }
        }
    }

    // 2. If not found via card, search by phone, referralCode, email, or cardCode on Customer
    if (!customer) {
        customer = await Customer.findOne({
            $or: [
                ...(phoneVariants.length > 0 ? [{ phone: { $in: phoneVariants } }] : [{ phone: cleanPhone }]),
                { cardCode: upper },
                { referralCode: upper },
                { email: raw.toLowerCase() },
            ],
        }).populate("cardId");

        if (customer && customer.cardId) {
            card = customer.cardId;
        } else if (customer && customer.cardCode && !card) {
            card = await MembershipCard.findOne({ cardCode: customer.cardCode.toUpperCase() });
        }
    }

    if (card) {
        card.ensureCurrentYearQuota();
        await card.save();
    }

    if (!customer && !card) {
        return { found: false, message: `No customer or card matching '${raw}' found.` };
    }

    // If card exists but unassigned
    if (card && !customer) {
        return {
            found: true,
            type: "unassigned_card",
            card,
            customer: null,
            message: `Card '${card.cardCode}' (${card.cardType.toUpperCase()}) is unassigned. Ready to link to a customer.`,
        };
    }

    // Get recent visits & referrals
    const visits = await Visit.find({ customerId: customer._id }).sort({ visitDate: -1 }).limit(10);
    const referrals = customer.cardType === "master"
        ? await Referral.find({ masterCustomerId: customer._id }).populate("referredCustomerId", "name phone totalVisits totalSpend")
        : [];

    return {
        found: true,
        type: "customer_profile",
        customer,
        card,
        visits,
        referrals,
    };
}

export async function calculateBillDiscount({
    customerId,
    customerPhone,
    cardCode,
    subtotal = 0,
    applyReferralDiscount = false,
    selectedReferralDiscount = 10,
    masterDiscountChoice = "credit_500", // "credit_500" | "percent_15"
}) {
    const settings = await getSettings();
    const amount = Math.max(0, Number(subtotal) || 0);

    let customer = null;
    let card = null;

    if (customerId) {
        customer = await Customer.findById(customerId).populate("cardId");
    }
    if (!customer && customerPhone) {
        const raw = String(customerPhone).trim();
        const digits = raw.replace(/\D/g, "");
        const tenDigits = digits.slice(-10);
        customer = await Customer.findOne({
            $or: [
                { phone: raw },
                { phone: `+91${tenDigits}` },
                { phone: tenDigits },
            ],
        }).populate("cardId");
    }

    if (cardCode) {
        card = await MembershipCard.findOne({ cardCode: String(cardCode).trim().toUpperCase() });
    } else if (customer && customer.cardId) {
        card = customer.cardId;
    }

    let discountPercent = 0;
    let discountAmount = 0;
    let discountType = "none";
    let isMasterCapped = false;
    let yearlyQuotaRemaining = 0;
    let masterExplanation = "";

    // 1. Referral First Visit Discount Check
    const isEligibleForReferralWelcome = Boolean(
        customer && customer.referredByMasterId && !customer.referralFirstVisitUsed && applyReferralDiscount
    );

    if (isEligibleForReferralWelcome) {
        discountPercent = Number(selectedReferralDiscount) || customer.referralFirstVisitDiscountPercent || 10;
        discountAmount = Math.round((amount * discountPercent) / 100);
        discountType = "referral_first_visit";
    } else if (card && card.status === "active") {
        // 2. Card Discount Calculation
        card.ensureCurrentYearQuota();

        if (card.cardType === "gold") {
            discountPercent = settings.discounts.gold || 5;
            discountAmount = Math.round((amount * discountPercent) / 100);
            discountType = "card_discount";
        } else if (card.cardType === "platinum") {
            discountPercent = settings.discounts.platinum || 15;
            discountAmount = Math.round((amount * discountPercent) / 100);
            discountType = "card_discount";
        } else if (card.cardType === "diamond") {
            discountPercent = settings.discounts.diamond || 10;
            discountAmount = Math.round((amount * discountPercent) / 100);
            discountType = "card_discount";
        } else if (card.cardType === "master") {
            const minBill = card.minBillAmount || settings.masterRules.minBillAmount || 1000;
            const maxPerTx = card.maxDiscountPerTx || settings.masterRules.maxDiscountPerTx || 500;
            const yearlyLimit = card.yearlyDiscountLimit || settings.masterRules.yearlyDiscountLimit || 3000;
            yearlyQuotaRemaining = Math.max(0, yearlyLimit - (card.yearlyDiscountUsed || 0));

            const isCreditAvailable = yearlyQuotaRemaining > 0 && (typeof card.isCreditValid === "function" ? card.isCreditValid() : true);

            if (masterDiscountChoice === "credit_500" && isCreditAvailable) {
                // Option A: Use ₹500 from the ₹3,000 credit pool
                if (amount < minBill) {
                    discountAmount = 0;
                    discountType = "none";
                    masterExplanation = `Bill ₹${amount} is below minimum requirement of ₹${minBill} for Master ₹500 Free Credit discount.`;
                } else {
                    discountAmount = Math.min(maxPerTx, yearlyQuotaRemaining, amount);
                    discountPercent = Math.round((discountAmount / amount) * 100);
                    discountType = "master_credit_500";
                    masterExplanation = `Master ₹500 Free Credit applied (₹${discountAmount} off). Remaining credit pool: ₹${yearlyQuotaRemaining - discountAmount}/₹${yearlyLimit}.`;
                }
            } else {
                // Option B: Standard 15% Member Discount (when credit limit is not there or member chooses 15%)
                discountPercent = settings.discounts.master || 15;
                if (amount < minBill) {
                    discountAmount = 0;
                    discountType = "none";
                    masterExplanation = `Bill ₹${amount} is below minimum requirement of ₹${minBill} for Master Card discount.`;
                } else {
                    discountAmount = Math.round((amount * discountPercent) / 100);
                    discountType = "card_discount";
                    masterExplanation = isCreditAvailable
                        ? `Master 15% Discount applied (₹${discountAmount} off). Free credit pool intact: ₹${yearlyQuotaRemaining}/₹${yearlyLimit}.`
                        : `Master ₹3,000 credit limit exhausted. Standard 15% discount applied (₹${discountAmount} off).`;
                }
            }
        }
    }

    const netTotal = Math.max(0, amount - discountAmount);

    // Compute estimated points
    const pointsRule = settings.pointsRules || {};
    const customerPointsEarned = Math.floor((netTotal / 100) * (pointsRule.pointsPerSpendRs100 || 1));

    let referrerPointsToAward = 0;
    if (customer && customer.referredByMasterId) {
        if (!customer.referralFirstVisitUsed) {
            referrerPointsToAward = pointsRule.pointsPerNewReferralFirstBill || 100;
        } else {
            referrerPointsToAward = pointsRule.pointsPerReferralRepeatVisit || 25;
        }
    }

    return {
        subtotal: amount,
        discountPercent,
        discountAmount,
        discountType,
        netTotal,
        cardType: card?.cardType || "",
        cardCode: card?.cardCode || "",
        masterExplanation,
        isMasterCapped,
        yearlyQuotaRemaining,
        customerPointsEarned,
        referrerPointsToAward,
        hasReferralBenefit: Boolean(customer?.referredByMasterId && !customer?.referralFirstVisitUsed),
    };
}

export async function processBillTransaction({
    customerId,
    customerPhone,
    customerName,
    cardCode,
    items = [],
    subtotal = 0,
    paymentMethod = "upi",
    orderType = "dine-in",
    tableNumber = "",
    applyReferralDiscount = false,
    selectedReferralDiscount = 10,
    processedBy = "staff",
}) {
    const calc = await calculateBillDiscount({
        customerId,
        customerPhone,
        cardCode,
        subtotal,
        applyReferralDiscount,
        selectedReferralDiscount,
    });

    const billNumber = `CM-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

    let customer = null;
    if (customerId) {
        customer = await Customer.findById(customerId);
    }
    if (!customer && customerPhone) {
        const raw = String(customerPhone).trim();
        const digits = raw.replace(/\D/g, "");
        const tenDigits = digits.slice(-10);
        customer = await Customer.findOne({
            $or: [
                { phone: raw },
                { phone: `+91${tenDigits}` },
                { phone: tenDigits },
            ],
        });
    }

    // Auto-create customer if guest with phone
    if (!customer && customerPhone) {
        customer = await Customer.create({
            name: customerName || "Guest Member",
            phone: String(customerPhone).trim(),
            totalVisits: 0,
            totalSpend: 0,
            totalDiscountClaimed: 0,
            pointsBalance: 0,
        });
    }

    let card = null;
    if (cardCode || (customer && customer.cardCode)) {
        card = await MembershipCard.findOne({ cardCode: (cardCode || customer.cardCode).toUpperCase() });
    }

    // 1. Create Bill
    const bill = new Bill({
        billNumber,
        customerId: customer?._id || null,
        customerName: customerName || customer?.name || "Walk-in Guest",
        customerPhone: customerPhone || customer?.phone || "",
        cardCode: card?.cardCode || "",
        cardType: card?.cardType || "",
        items: items.map((item) => ({
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity || 1),
            subtotal: Number(item.price) * Number(item.quantity || 1),
        })),
        subtotal: calc.subtotal,
        discountType: calc.discountType,
        discountPercent: calc.discountPercent,
        discountAmount: calc.discountAmount,
        masterDiscountCapped: calc.isMasterCapped,
        masterYearlyQuotaUsedInThisTx: card?.cardType === "master" ? calc.discountAmount : 0,
        netTotal: calc.netTotal,
        pointsEarnedByCustomer: calc.customerPointsEarned,
        pointsAwardedToReferrer: calc.referrerPointsToAward,
        referrerMasterId: customer?.referredByMasterId || null,
        paymentMethod,
        orderType,
        tableNumber,
        processedBy,
        status: "paid",
    });

    await bill.save();

    // 2. Update Master Card yearly usage only if Master Free Credit was applied
    if (card && card.cardType === "master" && calc.discountType === "master_credit_500" && calc.discountAmount > 0) {
        card.ensureCurrentYearQuota();
        card.yearlyDiscountUsed += calc.discountAmount;
        await card.save();
    }

    // 3. Update Customer & Referrals
    const isFirst = Boolean(customer && customer.totalVisits === 0);

    if (customer) {
        const isFirstReferralBill = !customer.referralFirstVisitUsed;

        customer.totalVisits += 1;
        customer.totalSpend += calc.netTotal;
        customer.totalDiscountClaimed += calc.discountAmount;
        customer.pointsBalance += calc.customerPointsEarned;

        if (calc.discountType === "referral_first_visit" || isFirstReferralBill) {
            customer.referralFirstVisitUsed = true;
        }

        await customer.save();

        // Customer Points Ledger
        if (calc.customerPointsEarned > 0) {
            await PointsLedger.create({
                customerId: customer._id,
                cardCode: customer.cardCode || "",
                points: calc.customerPointsEarned,
                type: "spend_reward",
                balanceAfter: customer.pointsBalance,
                billId: bill._id,
                description: `Reward points earned on Bill #${bill.billNumber} (₹${calc.netTotal})`,
            });
        }

        // Referral Points Engine for Master Card referrer
        if (customer.referredByMasterId && calc.referrerPointsToAward > 0) {
            const masterCustomer = await Customer.findById(customer.referredByMasterId);
            if (masterCustomer) {
                masterCustomer.pointsBalance += calc.referrerPointsToAward;
                await masterCustomer.save();

                await PointsLedger.create({
                    customerId: masterCustomer._id,
                    cardCode: masterCustomer.cardCode || "",
                    points: calc.referrerPointsToAward,
                    type: isFirstReferralBill ? "referral_first_visit" : "referral_repeat_visit",
                    balanceAfter: masterCustomer.pointsBalance,
                    billId: bill._id,
                    referredCustomerId: customer._id,
                    description: isFirstReferralBill
                        ? `Referral welcome bonus for ${customer.name} (${customer.phone}) first visit`
                        : `Referral repeat visit bonus for ${customer.name} (${customer.phone})`,
                });

                // Update Referral document
                await Referral.findOneAndUpdate(
                    { referredCustomerId: customer._id },
                    {
                        firstVisitCompleted: true,
                        firstVisitBillId: bill._id,
                        $inc: {
                            totalRepeatVisits: isFirstReferralBill ? 0 : 1,
                            totalPointsAwardedToMaster: calc.referrerPointsToAward,
                        },
                        status: "active",
                    }
                );
            }
        }

        // 4. Record Visit
        await Visit.create({
            customerId: customer._id,
            customerPhone: customer.phone,
            cardCode: customer.cardCode || "",
            cardType: customer.cardType || "",
            billId: bill._id,
            billNumber: bill.billNumber,
            billAmount: calc.subtotal,
            discountAmount: calc.discountAmount,
            discountPercent: calc.discountPercent,
            netPaid: calc.netTotal,
            isFirstVisit: isFirst,
            isReferralVisit: Boolean(customer.referredByMasterId),
            referrerMasterId: customer.referredByMasterId || null,
            pointsAwardedToReferrer: calc.referrerPointsToAward,
        });
    }

    return {
        success: true,
        bill,
        customer,
        card,
        summary: {
            billNumber: bill.billNumber,
            subtotal: bill.subtotal,
            discountAmount: bill.discountAmount,
            netTotal: bill.netTotal,
            discountType: bill.discountType,
            pointsEarned: calc.customerPointsEarned,
            referrerPointsAwarded: calc.referrerPointsToAward,
        },
    };
}
