#!/usr/bin/env node
/**
 * Script to update menu items with actual prices from Masood
 */

import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:5678/cafe_maza";

// Prices data from user (Category + Item Name -> Price)
const PRICES_DATA = [
    { category: "Biryanis (Veg & Non-Veg)", name: "Paneer Dum Biryani", price: 270 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Fry Piece Biyani", price: 289 },
    { category: "Veg Soups", name: "Tomato Dhaniya Shorba", price: 95 },
    { category: "Veg Soups", name: "Dal Shorba", price: 125 },
    { category: "Veg Soups", name: "Kim In Mushroom Soup", price: 139 },
    { category: "Veg Soups", name: "Manchow Soup (Veg)", price: 109 },
    { category: "Veg Soups", name: "Sweet Corn Soup (Veg)", price: 109 },
    { category: "Non Veg Soups", name: "Manchow Soup (Chicken)", price: 129 },
    { category: "Non Veg Soups", name: "Sweet Corn Soup (Chicken)", price: 129 },
    { category: "Non Veg Soups", name: "Kim In Chicken Soup", price: 159 },
    { category: "Non Veg Soups", name: "Paya Shorba", price: 179 },
    { category: "Non Veg Soups", name: "Marag Shorba", price: 239 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Hyderabadi Chicken 65", price: 285 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Hyderabadi Prawn 65", price: 379 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Chicken - Dry", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Chicken - Wet", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Manchurian - Dry", price: 299 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Manchurian - Wet", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Majestick", price: 319 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Thaipai", price: 319 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Lollypop - Crispy", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Lollypop -soucs", price: 329 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Pepper Chicken", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Jeedi Pappau Kodi Pakodi", price: 319 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Prawns", price: 399 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Apolo Fish", price: 369 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Thaipai Fish", price: 379 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Golden Fried Prawns", price: 399 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Loose Prawns", price: 399 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Pandu Mirchi Kodi Vepudu", price: 309 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Veg Manchurian - Dry", price: 219 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Veg Manchurian -Wet", price: 249 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Paneer- Dry", price: 269 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Paneer-Wet", price: 289 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Kung Pao Paneer", price: 279 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Paneer Majestick", price: 289 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Gobi 65", price: 249 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chilli Mushroom", price: 259 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Crispy Mushroom Chilli Garlic", price: 249 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Honey Chilli Potato", price: 239 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Crispy Garlic Corn", price: 209 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chinese Non Veg Platter", price: 1695 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Malai Chicken Tikka", price: 359 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Zafrani Chicken Tikka", price: 329 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Hariyali Chicken Tikka", price: 339 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Sholey Kebab", price: 349 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tangdi Kabab", price: 369 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Santrewala Murgh Tikka", price: 339 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Achri Fish Tikka", price: 379 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Hariyali Fish Tikka", price: 359 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tandoori Sea Prawns", price: 379 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tala Hua Gosht", price: 389 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Lamb Chops", price: 439 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Murgh Afgani Kebab", price: 309 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Chelo Kebab ( Mutton & Chicken )", price: 499 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Persian Kebab", price: 249 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Mutton Seekh Kebab", price: 419 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Mutton Ronaki Seekh Kebab", price: 419 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Sangam Seek Kebab", price: 359 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Mutton Boti Kebab", price: 399 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tandoori Chicken (half)", price: 319 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tandoori Chicken (full)", price: 589 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Malai Paneer Tikka", price: 309 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Hariyali Paneer Tikka", price: 289 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Achri Paneer Tikka", price: 289 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Veg Seekh Kebab", price: 249 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Malai Brocoli Peri Peri", price: 269 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Hara Bhara Kebab", price: 259 },
    { category: "Main Course (Veg & Non-Veg)", name: "Chicken Chettinad", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Andhra Kodi Kura", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Afghani Chicken Curry", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Butter Chicken", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Chicken Tikka Masala", price: 359 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kadai Chicken", price: 349 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mutton Rogan Josh", price: 389 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mutton Rara Masala", price: 389 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kadai Mutton", price: 369 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mix Veg Curry", price: 239 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kadai Veg", price: 239 },
    { category: "Main Course (Veg & Non-Veg)", name: "Veg Korma", price: 239 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mushroom Do Pyaza", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mushroom Masala", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Paneer Butter Masala", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kadai Paneer", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Paneer Tikka Masala", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kaju Paneer Masala", price: 299 },
    { category: "Main Course (Veg & Non-Veg)", name: "Methi Chaman", price: 289 },
    { category: "Indian Breads", name: "Tandoori Roti", price: 29 },
    { category: "Indian Breads", name: "Butter Roti", price: 29 },
    { category: "Indian Breads", name: "Garlic Naan", price: 69 },
    { category: "Indian Breads", name: "Plain Naan", price: 49 },
    { category: "Indian Breads", name: "Butter Naan", price: 59 },
    { category: "Indian Breads", name: "Plain Kulcha", price: 59 },
    { category: "Indian Breads", name: "Masala Kulcha", price: 69 },
    { category: "Indian Breads", name: "Plain Paratha", price: 59 },
    { category: "Indian Breads", name: "Aloo Paratha", price: 69 },
    { category: "Indian Breads", name: "Roomali Roti", price: 49 },
    { category: "Indian Breads", name: "Kashmiri Naan", price: 79 },
    { category: "Hakka Noodles & Fried Rice", name: "Veg Fried Rice", price: 199 },
    { category: "Hakka Noodles & Fried Rice", name: "Chicken Fried Rice", price: 259 },
    { category: "Hakka Noodles & Fried Rice", name: "Mix Fried Rice", price: 339 },
    { category: "Hakka Noodles & Fried Rice", name: "Veg Hakka Noodles", price: 199 },
    { category: "Hakka Noodles & Fried Rice", name: "Chicken Hakka Noodles", price: 259 },
    { category: "Hakka Noodles & Fried Rice", name: "Mix Hakka Noodles", price: 339 },
    { category: "Hakka Noodles & Fried Rice", name: "Veg American Chopsuey", price: 289 },
    { category: "Hakka Noodles & Fried Rice", name: "Non-Veg American Chopsuey", price: 309 },
    { category: "Hakka Noodles & Fried Rice", name: "Jeera Rice", price: 199 },
    { category: "Hakka Noodles & Fried Rice", name: "Veg Pulao", price: 229 },
    { category: "Hakka Noodles & Fried Rice", name: "Kodi Pulao", price: 259 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Veg Dum Biryani", price: 269 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Kaju Paneer Biryani", price: 339 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Keema Biryani", price: 309 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Mutton Keema Biryani", price: 419 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Prawns Keema Biryani", price: 419 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Dum Biryani", price: 299 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Mutton Dum Biryani", price: 429 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Prawns Dum Biryani", price: 429 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken 65 Biryani", price: 339 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Tikka Biryani", price: 349 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Nalli Gosht Biryani", price: 479 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Dum Biryani Family Pack", price: 769 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Mutton Dum Biryani Family Pack", price: 949 },
    { category: "Desserts & Sweets", name: "Qurbani Ka Meetha", price: 139 },
    { category: "Desserts & Sweets", name: "Gulab Jamun With Ice Cream", price: 149 },
    { category: "Desserts & Sweets", name: "Gulab Jamun", price: 99 },
    { category: "Desserts & Sweets", name: "Double Ka Meetha", price: 129 },
    { category: "Mocktails", name: "Virgin Mojito", price: 149 },
    { category: "Mocktails", name: "Strawberry Delight", price: 149 },
    { category: "Mocktails", name: "Blue Moon", price: 149 },
    { category: "Mocktails", name: "Passion Fruits Pop", price: 149 },
    { category: "Mocktails", name: "Orange Blossom", price: 149 },
    { category: "Mocktails", name: "Zamun Zaminia", price: 149 },
    { category: "Mocktails", name: "Berry Bliss", price: 149 },
    { category: "Mocktails", name: "Pina Colada", price: 149 },
    { category: "Mocktails", name: "Mango Mania", price: 149 },
    { category: "Mocktails", name: "Fruits Punch", price: 149 },
    { category: "Mocktails", name: "Sweet Lassi", price: 99 },
    { category: "Mocktails", name: "Butter Milk", price: 89 },
    { category: "Mocktails", name: "Fresh Lime Soda", price: 99 },
    { category: "Cafe Maza Specials", name: "Murgh Musallam", price: 1299 },
    { category: "Cafe Maza Specials", name: "Mutton Sikandari Run", price: 1599 },
    { category: "Cafe Maza Specials", name: "Tandoori Non Veg Platter ( 5 Items )", price: 1999 },
    { category: "Cafe Maza Sizzlers", name: "Italian Soup (Veg)", price: 249 },
    { category: "Cafe Maza Sizzlers", name: "American Chopsy With Sauce (nonveg)", price: 339 },
    { category: "Cafe Maza Sizzlers", name: "Cafe Maza Special Stroganoff (Veg)", price: 239 },
    { category: "Cafe Maza Sizzlers", name: "Singapore Noodles (Veg)", price: 239 },
    { category: "Cafe Maza Sizzlers", name: "Italian Soup (Non-Veg)", price: 259 },
    { category: "Cafe Maza Sizzlers", name: "Angari Murgh Kabab", price: 309 },
    { category: "Cafe Maza Sizzlers", name: "Angari Fish Tikka", price: 339 },
    { category: "Cafe Maza Sizzlers", name: "Cafe Maza Special Stroganoff (Non-Veg)", price: 339 },
    { category: "Cafe Maza Sizzlers", name: "Singapore Noodles (Non-Veg)", price: 289 },
    { category: "Cafe Maza Sizzlers", name: "Chicken Monica", price: 289 },
    { category: "Veg Soups", name: "Hot 'N Sour Soup (Veg)", price: 99 },
    { category: "Non Veg Soups", name: "Hot 'N Sour Soup (Chicken)", price: 129 },
    { category: "Hakka Noodles & Fried Rice", name: "Egg Fried Rice", price: 219 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Dragon Chicken", price: 349 },
    { category: "Main Course (Veg & Non-Veg)", name: "Dum Chicken", price: 349 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tandoori Brocooli", price: 309 },
    { category: "Main Course (Veg & Non-Veg)", name: "Egg Amlet", price: 159 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Extra Dum 1 Pic", price: 99 },
    { category: "Main Course (Veg & Non-Veg)", name: "Mutton Keema Curry", price: 409 },
    { category: "Hakka Noodles & Fried Rice", name: "Egg Noodles", price: 219 },
    { category: "Hakka Noodles & Fried Rice", name: "Curd Rice", price: 129 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Special Tangdi Biryani", price: 389 },
    { category: "Hakka Noodles & Fried Rice", name: "Extra Rice", price: 199 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Kaju Fry", price: 289 },
    { category: "Main Course (Veg & Non-Veg)", name: "Dal Tadka", price: 199 },
    { category: "Main Course (Veg & Non-Veg)", name: "Palak Paneer", price: 289 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Fry Piece Biryani Family", price: 769 },
    { category: "Main Course (Veg & Non-Veg)", name: "Kaju Curry", price: 339 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Mushroom Biryani", price: 289 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Kaju Biryani", price: 329 },
    { category: "Hakka Noodles & Fried Rice", name: "Paneer Fried Rice", price: 289 },
    { category: "Hakka Noodles & Fried Rice", name: "Mushroom Fried Rice", price: 319 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Babycorn Crispy", price: 289 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Aalu Parata", price: 69 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Chicken Tikka Lasooni", price: 389 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Paneer 555", price: 289 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Tandoori Mix Non Veg Platter", price: 1999 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Slice Sauce Chicken", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Egg Masala Curry", price: 199 },
    { category: "Main Course (Veg & Non-Veg)", name: "Tamoto Curry", price: 169 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Chicken Tikka", price: 329 },
    { category: "Hakka Noodles & Fried Rice", name: "Double Egg Fried Rice", price: 249 },
    { category: "Hakka Noodles & Fried Rice", name: "Chicken Noodles", price: 229 },
    { category: "Main Course (Veg & Non-Veg)", name: "Dal Khichidi", price: 219 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Lollypop Biryani", price: 329 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Paneer 65", price: 269 },
    { category: "Tandoori Starters (Veg & Non-Veg)", name: "Soya Chaap", price: 249 },
    { category: "Main Course (Veg & Non-Veg)", name: "Chicken Kolhapuri", price: 339 },
    { category: "Main Course (Veg & Non-Veg)", name: "Chicken Mughlai Curry", price: 339 },
    { category: "Cafe Maza Specials", name: "Chicken Harees", price: 100 },
    { category: "Cafe Maza Specials", name: "Chicken Harees Family Pack", price: 250 },
    { category: "Main Course (Veg & Non-Veg)", name: "Punjabi Chicken", price: 339 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Chicken Dum Biryani Single", price: 209 },
    { category: "Cafe Maza Specials", name: "Chicken Dum Biryani Handi 25p", price: 7250 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Egg Biryani", price: 259 },
    { category: "Non Veg Soups", name: "Chicken Lemon Coriander Soup", price: 129 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Fish Biryani", price: 399 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Green Salad", price: 69 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken Fry", price: 309 },
    { category: "Hakka Noodles & Fried Rice", name: "Kaju Paneer Fried Rice", price: 289 },
    { category: "Chinese Starters (Veg & Non-Veg)", name: "Chicken 555", price: 319 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Fish Biryani Family Pack", price: 1099 },
    { category: "Cafe Maza Sizzlers", name: "Bbq Setup", price: 419 },
    { category: "Main Course (Veg & Non-Veg)", name: "Fish Masala Curry", price: 329 },
    { category: "Biryanis (Veg & Non-Veg)", name: "Biryani Rice", price: 149 },
];

async function updatePrices() {
    try {
        console.log("🔄 Connecting to MongoDB...");
        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected\n");

        let updated = 0;
        let notFound = 0;
        const notFoundItems = [];

        console.log("📝 Updating prices...\n");

        for (const priceEntry of PRICES_DATA) {
            const item = await MenuItem.findOne({
                name: priceEntry.name,
                category: priceEntry.category,
            });

            if (item) {
                await MenuItem.updateOne(
                    { _id: item._id },
                    { price: priceEntry.price }
                );
                console.log(`✅ ${priceEntry.name}: ₹${priceEntry.price}`);
                updated++;
            } else {
                notFound++;
                notFoundItems.push(`${priceEntry.name} (${priceEntry.category})`);
            }
        }

        console.log(`\n✅ Updated: ${updated} items`);
        console.log(`❌ Not found: ${notFound} items`);

        if (notFoundItems.length > 0 && notFoundItems.length <= 10) {
            console.log("\nNot found items:");
            notFoundItems.forEach(item => console.log(`  - ${item}`));
        }

        // Show summary
        const allItems = await MenuItem.countDocuments();
        const itemsWithPrice = await MenuItem.countDocuments({ price: { $gt: 0 } });
        console.log(`\n📊 Database Summary:`);
        console.log(`   Total items: ${allItems}`);
        console.log(`   Items with prices: ${itemsWithPrice}`);

    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log("\n🔌 Disconnected");
    }
}

updatePrices();
