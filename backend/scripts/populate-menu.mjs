#!/usr/bin/env node
/**
 * Script to populate MongoDB with menu items for all categories
 * Adds sample items for Seafood and Mocktails if missing
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

const SAMPLE_ITEMS = {
    Seafood: [
        { name: "Apollo Fish", category: "Seafood", price: 340, isVeg: false, isBestSeller: true },
        { name: "Fish Tikka", category: "Seafood", price: 340, isVeg: false },
        { name: "Tandoori Fish Masala", category: "Seafood", price: 350, isVeg: false },
        { name: "Prawns Koliwada", category: "Seafood", price: 380, isVeg: false, isBestSeller: true },
        { name: "Tandoori Prawns", category: "Seafood", price: 400, isVeg: false },
        { name: "Butter Garlic Fish Fry", category: "Seafood", price: 360, isVeg: false },
    ],
    Mocktails: [
        { name: "Virgin Mojito", category: "Mocktails", price: 129, isVeg: true },
        { name: "Strawberry Delight", category: "Mocktails", price: 129, isVeg: true },
        { name: "Blue Moon", category: "Mocktails", price: 129, isVeg: true },
        { name: "Pina Colada", category: "Mocktails", price: 129, isVeg: true },
        { name: "Mango Mania", category: "Mocktails", price: 129, isVeg: true },
        { name: "Fruits Punch", category: "Mocktails", price: 129, isVeg: true },
        { name: "Sweet Lassi", category: "Mocktails", price: 99, isVeg: true },
        { name: "Butter Milk", category: "Mocktails", price: 89, isVeg: true },
        { name: "Fresh Lime Soda", category: "Mocktails", price: 99, isVeg: true },
    ],
};

async function populateMenu() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // For each category, check if it has items and add if missing
        for (const [category, items] of Object.entries(SAMPLE_ITEMS)) {
            const count = await MenuItem.countDocuments({ category });
            console.log(`📊 ${category}: ${count} items`);

            if (count === 0) {
                console.log(`   ➕ Adding ${items.length} sample items...`);
                const result = await MenuItem.insertMany(items);
                console.log(`   ✅ Added ${result.length} items\n`);
            } else {
                console.log(`   ℹ️  Skipping (already populated)\n`);
            }
        }

        // Show summary of all categories
        console.log("📋 Final Menu Summary:");
        console.log("─".repeat(50));
        const categories = await MenuItem.distinct("category");
        categories.sort().forEach(async (cat) => {
            const count = await MenuItem.countDocuments({ category: cat });
            console.log(`${cat.padEnd(25)} ${count} items`);
        });

        console.log("─".repeat(50));
        const totalItems = await MenuItem.countDocuments();
        console.log(`Total Menu Items: ${totalItems}`);

        console.log("\n✅ Menu population completed successfully!");
    } catch (error) {
        console.error("❌ Population failed:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

populateMenu();
