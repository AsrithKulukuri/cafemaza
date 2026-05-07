#!/usr/bin/env node
/**
 * Script to add realistic prices to menu items based on category
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

// Category-based default prices (in ₹)
const CATEGORY_PRICES = {
    "Bakery": { min: 30, max: 80 },
    "Beverages": { min: 25, max: 150 },
    "Biryani": { min: 200, max: 350 },
    "Biryanis (Veg & Non-Veg)": { min: 180, max: 320 },
    "Cafe Maza Sizzlers": { min: 350, max: 600 },
    "Cafe Maza Specials": { min: 300, max: 450 },
    "Cafe Maza Spl Combos": { min: 400, max: 800 },
    "Chai & Coffee": { min: 40, max: 120 },
    "Chinese Starters": { min: 150, max: 300 },
    "Chinese Starters (Veg & Non-Veg)": { min: 140, max: 280 },
    "Desserts": { min: 80, max: 200 },
    "Desserts & Sweets": { min: 100, max: 250 },
    "Hakka Noodles & Fried Rice": { min: 120, max: 280 },
    "Indian Breads": { min: 30, max: 80 },
    "Main Course": { min: 200, max: 400 },
    "Main Course (Veg & Non-Veg)": { min: 180, max: 380 },
    "Mocktails": { min: 80, max: 180 },
    "Non Veg Soups": { min: 100, max: 180 },
    "Seafood": { min: 250, max: 450 },
    "Soups": { min: 80, max: 150 },
    "Tandoori": { min: 200, max: 400 },
    "Tandoori Starters (Veg & Non-Veg)": { min: 150, max: 300 },
    "Veg Soups": { min: 70, max: 140 },
};

function getPrice(category) {
    const range = CATEGORY_PRICES[category] || { min: 100, max: 300 };
    return Math.floor(Math.random() * (range.max - range.min + 1) + range.min);
}

async function addPricesToMenuItems() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Find all items with price 0
        const itemsWithZeroPrice = await MenuItem.find({ price: 0 });
        console.log(`📦 Found ${itemsWithZeroPrice.length} items with price 0\n`);

        if (itemsWithZeroPrice.length === 0) {
            console.log("✅ No items with price 0 found!");
            await mongoose.connection.close();
            return;
        }

        // Update prices
        let updated = 0;
        for (const item of itemsWithZeroPrice) {
            const newPrice = getPrice(item.category);
            await MenuItem.updateOne({ _id: item._id }, { price: newPrice });
            console.log(`✅ ${item.name} (${item.category}): ₹${newPrice}`);
            updated++;
        }

        console.log(`\n✅ Updated ${updated} items with prices`);

        // Show summary by category
        const categories = await MenuItem.distinct("category");
        console.log("\n📊 Price Summary by Category:");
        for (const cat of categories.sort()) {
            const items = await MenuItem.find({ category: cat });
            const prices = items.map(i => i.price).filter(p => p > 0);
            const avg = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b) / prices.length) : 0;
            console.log(`   ${cat}: ${prices.length} items, avg ₹${avg}`);
        }

        console.log("\n✅ Price assignment completed!");
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Disconnected from MongoDB");
    }
}

addPricesToMenuItems();
