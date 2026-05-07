#!/usr/bin/env node
/**
 * Migration script to update MongoDB menu items with corrected category names
 * Changes: "starters" -> "chinese-starters", "main" -> "main-course"
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

const CATEGORY_MAPPINGS = {
    starters: "chinese-starters",
    main: "main-course",
    seafood: "seafood", // Ensure consistency
};

async function migrateCategories() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // Update each old category to new category
        for (const [oldCategory, newCategory] of Object.entries(CATEGORY_MAPPINGS)) {
            console.log(`\n📝 Migrating "${oldCategory}" → "${newCategory}"`);

            const result = await MenuItem.updateMany(
                { category: oldCategory },
                { $set: { category: newCategory } }
            );

            console.log(`   ✅ Updated ${result.modifiedCount} items`);
            console.log(`   ℹ️  Matched ${result.matchedCount} items`);
        }

        // Verify all categories
        console.log("\n📊 Current menu categories:");
        const categories = await MenuItem.distinct("category");
        categories.sort().forEach((cat) => {
            console.log(`   - ${cat}`);
        });

        console.log("\n✅ Migration completed successfully!");
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

migrateCategories();
