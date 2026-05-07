#!/usr/bin/env node
/**
 * Script to export MongoDB menu data to frontend mockData format
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

async function exportToMockData() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Get all unique categories
        const categories = await MenuItem.distinct("category");
        categories.sort();

        console.log(`📊 Found ${categories.length} categories`);
        categories.forEach((cat) => console.log(`   - ${cat}`));

        // Generate mockData code
        let mockDataCode = `// Auto-generated from MongoDB menu items
export type Dish = {
    _id?: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    isVeg?: boolean;
    isBestSeller?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

export type MenuCategory = {
    id: string;
    label: string;
    items: Dish[];
};

export const menuCategories: MenuCategory[] = [
`;

        // For each category, fetch items and format them
        for (const category of categories) {
            const items = await MenuItem.find({ category }).limit(50); // Limit to 50 items per category for mockData
            const categoryId = category
                .toLowerCase()
                .replace(/[&\/]/g, "")
                .replace(/\s+/g, "-")
                .replace(/--+/g, "-");

            mockDataCode += `    {
        id: "${categoryId}",
        label: "${category}",
        items: [
`;

            items.forEach((item) => {
                const line = `            { name: "${item.name.replace(/"/g, '\\"')}", price: ${item.price}, image: "/images/${categoryId}.jpg"${item.isVeg ? ", isVeg: true" : ""
                    }${item.isBestSeller ? ", isBestSeller: true" : ""}${item.isSoldOut ? ", isSoldOut: true" : ""} },\n`;
                mockDataCode += line;
            });

            mockDataCode += `        ],
    },
`;
        }

        mockDataCode += `];

export const grillFeatures = [
    { title: "Live Grill", text: "Sizzling skewers served at your table." },
    { title: "Fresh Ingredients", text: "Handpicked produce and premium cuts daily." },
    { title: "Family Dining", text: "Spacious luxury seating for family celebrations." },
    { title: "Chef Specials", text: "Signature marinades crafted by our master chefs." },
];`;

        // Save to file
        const outputPath = path.join(
            __dirname,
            "../../cafe-maza-web/data/mockData.generated.ts"
        );
        fs.writeFileSync(outputPath, mockDataCode, "utf-8");

        console.log(`\n✅ Generated mockData saved to:`);
        console.log(`   ${outputPath}`);
        console.log(`\n📋 File includes:`);
        console.log(`   - ${categories.length} categories`);
        console.log(`   - ${categories.reduce((sum, cat) => sum + 1, 0)} category objects`);

        console.log("\n⚠️  Next steps:");
        console.log("1. Review the generated file");
        console.log(
            "2. Copy categories from mockData.generated.ts to mockData.ts"
        );
        console.log("3. Update admin dropdown with new categories");

        console.log("\n✅ Export completed!");
    } catch (error) {
        console.error("❌ Export failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Disconnected from MongoDB");
    }
}

exportToMockData();
