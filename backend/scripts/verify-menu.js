import "dotenv/config";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const mongoUri = process.env.MONGODB_URI;

async function verify() {
    try {
        await mongoose.connect(mongoUri);
        console.log("✓ Connected to MongoDB\n");

        const count = await MenuItem.countDocuments();
        console.log(`✓ Total menu items: ${count}`);

        if (count > 0) {
            const items = await MenuItem.find().limit(10);
            console.log(`\n📋 Sample Menu Items (first 10):`);
            items.forEach((item, idx) => {
                console.log(
                    `  ${idx + 1}. ${item.name} (${item.category}) - ₹${item.price}`
                );
            });

            const categories = await MenuItem.distinct("category");
            console.log(`\n📂 Categories (${categories.length}):`);
            categories.forEach((cat) => {
                console.log(`  • ${cat}`);
            });

            const bestSellers = await MenuItem.countDocuments({ isBestSeller: true });
            const vegItems = await MenuItem.countDocuments({ isVeg: true });
            console.log(`\n📊 Statistics:`);
            console.log(`  • Best Sellers: ${bestSellers}`);
            console.log(`  • Vegetarian: ${vegItems}`);
            console.log(`  • Non-Vegetarian: ${count - vegItems}`);
        }

        process.exit(0);
    } catch (error) {
        console.error("✗ Error:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

verify();
