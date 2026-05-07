#!/usr/bin/env node
/**
 * Script to read Excel file and populate MongoDB with all menu items
 */

import XLSX from "xlsx";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_FILE = path.join(__dirname, "../../Price Comparisons.xlsx");
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

async function importMenuFromExcel() {
    try {
        console.log("📂 Reading Excel file:", EXCEL_FILE);
        const workbook = XLSX.readFile(EXCEL_FILE);
        const sheetNames = workbook.SheetNames;
        console.log(`✅ Found ${sheetNames.length} sheet(s): ${sheetNames.join(", ")}\n`);

        const sheetData = {};
        sheetNames.forEach((sheetName) => {
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);
            sheetData[sheetName] = data;
            console.log(`📋 Sheet: "${sheetName}" - ${data.length} rows`);
        });

        console.log("\n🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Parse each sheet and insert items
        let totalAdded = 0;
        for (const [sheetName, rows] of Object.entries(sheetData)) {
            console.log(`\n📝 Processing sheet: "${sheetName}"`);

            if (!rows || rows.length === 0) {
                console.log("   ℹ️  Empty sheet, skipping");
                continue;
            }

            // Parse each row
            const items = rows
                .map((row) => {
                    // Normalize column names (handle various formats)
                    const name =
                        row.Name ||
                        row.name ||
                        row.Item ||
                        row.item ||
                        row["Item Name"] ||
                        row["item_name"];
                    const category =
                        row.Category ||
                        row.category ||
                        row.Type ||
                        row.type ||
                        row["Category Name"];
                    const priceStr =
                        row.Price ||
                        row.price ||
                        row.Cost ||
                        row.cost ||
                        row["Unit Price"];
                    const price = parseFloat(priceStr) || 0;
                    const isVeg =
                        row["Is Veg"] ||
                        row["isVeg"] ||
                        row.Veg ||
                        row.veg ||
                        false;

                    if (!name || !category) {
                        return null; // Skip rows missing required fields
                    }

                    return {
                        name: String(name).trim(),
                        category: String(category).trim(),
                        price: Math.max(0, price),
                        image: "",
                        isVeg:
                            String(isVeg).toLowerCase() === "true" ||
                            String(isVeg).toLowerCase() === "yes" ||
                            String(isVeg) === "1",
                        isPopular: false,
                        isBestSeller: false,
                        isSoldOut: false,
                        tags: [],
                    };
                })
                .filter((item) => item !== null);

            console.log(`   Found ${items.length} valid items`);

            if (items.length > 0) {
                try {
                    // Replace all items for this sheet (treating sheet as category source)
                    const categories = [...new Set(items.map((i) => i.category))];
                    console.log(`   Categories: ${categories.join(", ")}`);

                    // Delete existing items from these categories
                    const deleteResult = await MenuItem.deleteMany({
                        category: { $in: categories },
                    });
                    console.log(`   🗑️  Deleted ${deleteResult.deletedCount} old items`);

                    // Insert new items
                    const insertResult = await MenuItem.insertMany(items);
                    console.log(`   ✅ Added ${insertResult.length} new items`);
                    totalAdded += insertResult.length;
                } catch (error) {
                    console.error(`   ❌ Error processing sheet: ${error.message}`);
                }
            }
        }

        // Show final summary
        console.log("\n📊 Final Menu Summary:");
        console.log("─".repeat(60));
        const categories = await MenuItem.distinct("category");
        categories.sort();

        let totalItems = 0;
        for (const category of categories) {
            const count = await MenuItem.countDocuments({ category });
            totalItems += count;
            console.log(`${category.padEnd(30)} ${count} items`);
        }
        console.log("─".repeat(60));
        console.log(`Total Menu Items: ${totalItems}`);

        console.log("\n✅ Menu import completed successfully!");
    } catch (error) {
        console.error("❌ Import failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Disconnected from MongoDB");
    }
}

importMenuFromExcel();
