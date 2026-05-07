#!/usr/bin/env node
/**
 * Script to generate admin dropdown options from MongoDB categories
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

async function generateDropdownOptions() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB\n");

        // Get all unique categories sorted
        const categories = await MenuItem.distinct("category");
        categories.sort();

        console.log("📋 Admin Dropdown Options:\n");
        console.log("Replace the <select> element in admin/dashboard/page.tsx with:\n");
        console.log("<select");
        console.log('    value={newMenuItem.category}');
        console.log('    onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}');
        console.log('    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] focus:outline-none"');
        console.log(">");

        categories.forEach((category) => {
            const id = category
                .toLowerCase()
                .replace(/[&\/]/g, "")
                .replace(/\s+/g, "-")
                .replace(/--+/g, "-");
            console.log(`    <option value="${id}">${category}</option>`);
        });

        console.log("</select>\n");

        console.log("Or, for TypeScript safety, create a categories constant:");
        console.log("\nconst MENU_CATEGORIES = [");
        categories.forEach((category) => {
            const id = category
                .toLowerCase()
                .replace(/[&\/]/g, "")
                .replace(/\s+/g, "-")
                .replace(/--+/g, "-");
            console.log(`    { id: "${id}", label: "${category}" },`);
        });
        console.log("];");

        console.log("\n✅ Generation completed!");
    } catch (error) {
        console.error("❌ Generation failed:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("🔌 Disconnected from MongoDB");
    }
}

generateDropdownOptions();
