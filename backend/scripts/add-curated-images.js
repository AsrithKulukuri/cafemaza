import "dotenv/config";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseServiceKey || !mongoUri) {
    console.error(
        "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, MONGODB_URI"
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Dish name to high-quality free image URL mapping
// Using Unsplash direct URLs (no API auth required)
const dishImageMapping = {
    "Tomato Dhaniya Shorba":
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Dal Shorba":
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    "Kim In Mushroom Soup":
        "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Hot n Sour Soup Veg":
        "https://images.unsplash.com/photo-1460306855917-335d081e8a51?w=600&h=400&fit=crop",
    "Hot n Sour Soup Chicken":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Manchow Soup Veg":
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Manchow Soup Chicken":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Sweet Corn Soup Veg":
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Sweet Corn Soup Chicken":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Cream of Mushroom Soup":
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Hyderabadi 65":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Chilli Chicken":
        "https://images.unsplash.com/photo-1543521521-83ec6361ceae?w=600&h=400&fit=crop",
    "Chicken Manchurian":
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop",
    "Chicken Majestic":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Pepper Chicken":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Apollo Fish":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Chilli Paneer":
        "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Paneer Majestic":
        "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Gobi 65":
        "https://images.unsplash.com/photo-1618511267537-b685faf3a97b?w=600&h=400&fit=crop",
    "Crispy Garlic Corn":
        "https://images.unsplash.com/photo-1618511267537-b685faf3a97b?w=600&h=400&fit=crop",
    "Shrimp Manchurian":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Salt n Pepper Squid":
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Chilli Fish":
        "https://images.unsplash.com/photo-1560707303-4e980ce876ad?w=600&h=400&fit=crop",
    "Veg Spring Rolls":
        "https://images.unsplash.com/photo-1581084162694-097669a7c0e6?w=600&h=400&fit=crop",
    "Chicken Spring Rolls":
        "https://images.unsplash.com/photo-1581084162694-097669a7c0e6?w=600&h=400&fit=crop",
    "Prawn Spring Rolls":
        "https://images.unsplash.com/photo-1581084162694-097669a7c0e6?w=600&h=400&fit=crop",
    "Hakka Noodles":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Chicken Hakka Noodles":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Schezwan Noodles":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Chicken Schezwan Noodles":
        "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Chicken Tikka":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Murgh Tikka":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Tangidi Kabab":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Fish Tikka":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Lamb Chops":
        "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop",
    "Murgh Afghani Kebab":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Paneer Tikka":
        "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Veg Seekh Kebab":
        "https://images.unsplash.com/photo-1568717881350-5381c10fafdf?w=600&h=400&fit=crop",
    "Hara Bhara Kebab":
        "https://images.unsplash.com/photo-1568717881350-5381c10fafdf?w=600&h=400&fit=crop",
    "Tandoori Pomfret":
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop",
    "Tandoori Shrimp":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Makhanwala Tandoori Chicken":
        "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Boti Kebab":
        "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop",
    "Shami Kebab":
        "https://images.unsplash.com/photo-1568717881350-5381c10fafdf?w=600&h=400&fit=crop",
    "Kakori Kebab":
        "https://images.unsplash.com/photo-1568717881350-5381c10fafdf?w=600&h=400&fit=crop",
    "Chicken Chettinad":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Andhra Kodi Kura":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Afghani Chicken Curry":
        "https://images.unsplash.com/photo-1609501676725-7186f017a4b8?w=600&h=400&fit=crop",
    "Butter Chicken":
        "https://images.unsplash.com/photo-1603894772006-8e7e4a6bd4e4?w=600&h=400&fit=crop",
    "Chicken Tikka Masala":
        "https://images.unsplash.com/photo-1603894772006-8e7e4a6bd4e4?w=600&h=400&fit=crop",
    "Kadai Chicken":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Murg Makhani":
        "https://images.unsplash.com/photo-1603894772006-8e7e4a6bd4e4?w=600&h=400&fit=crop",
    "Chicken Korma":
        "https://images.unsplash.com/photo-1609501676725-7186f017a4b8?w=600&h=400&fit=crop",
    "Chicken 555":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Rara Meat":
        "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop",
    "Mutton Rogan Josh":
        "https://images.unsplash.com/photo-1618512453938-8e63e188933b?w=600&h=400&fit=crop",
    "Kadai Mutton":
        "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Paya":
        "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=600&h=400&fit=crop",
    "Haleem":
        "https://images.unsplash.com/photo-1554080221-cbf60dd51e59?w=600&h=400&fit=crop",
    "Paneer Butter Masala":
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=400&fit=crop",
    "Kadai Paneer":
        "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Paneer Tikka Masala":
        "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Mushroom Masala":
        "https://images.unsplash.com/photo-1595435934249-5df7ee86a58e?w=600&h=400&fit=crop",
    "Veg Korma":
        "https://images.unsplash.com/photo-1609501676725-7186f017a4b8?w=600&h=400&fit=crop",
    "Chana Masala":
        "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop",
    "Dal Makhani":
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    "Dal Tadka":
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    "Chole Bhature":
        "https://images.unsplash.com/photo-1585518419759-87b1e30dfd83?w=600&h=400&fit=crop",
    "Tandoori Roti":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Butter Roti":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Garlic Naan":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Plain Naan":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Butter Naan":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Cheese Naan":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Peshwari Naan":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Masala Kulcha":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Roomali Roti":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Lachcha Paratha":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Aloo Paratha":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Paneer Paratha":
        "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Veg Dum Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Paneer Dum Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Chicken Dum Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Mutton Dum Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Chicken 65 Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Chicken Tikka Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Nalli Gosht Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Chicken Biryani Family Pack":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Mutton Biryani Family Pack":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Briyani Lunch Special":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Veg Biryani Lunch Special":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Hyderabadi Dum Biryani":
        "https://images.unsplash.com/photo-1573708582047-e1b84d59f45f?w=600&h=400&fit=crop",
    "Fish Curry":
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop",
    "Amritsari Kunni":
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop",
    "Fried Fish":
        "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=600&h=400&fit=crop",
    "Prawn Masala":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Prawn Pepper Fry":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Butter Garlic Shrimp":
        "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Squid Masala":
        "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Crab Masala":
        "https://images.unsplash.com/photo-1613395877917-a9c7b4b8df85?w=600&h=400&fit=crop",
    "Qurbani Ka Meetha":
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Gulab Jamun With Ice Cream":
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Gulab Jamun":
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Double Ka Meetha":
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Kheer":
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Phirni":
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Ras Malai":
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Mango Sorbet":
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Ice Cream Scoop":
        "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Khubani Bread":
        "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Virgin Mojito":
        "https://images.unsplash.com/photo-1514692723207-360e90d5eccc?w=600&h=400&fit=crop",
    "Strawberry Delight":
        "https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=600&h=400&fit=crop",
    "Blue Moon":
        "https://images.unsplash.com/photo-1541905590316-e06b3dd5b540?w=600&h=400&fit=crop",
    "Pina Colada":
        "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=600&h=400&fit=crop",
    "Mango Mania":
        "https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=600&h=400&fit=crop",
    "Fruits Punch":
        "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=600&h=400&fit=crop",
    "Sweet Lassi":
        "https://images.unsplash.com/photo-1585337033009-ca1ee5dc1f76?w=600&h=400&fit=crop",
    "Butter Milk":
        "https://images.unsplash.com/photo-1585337033009-ca1ee5dc1f76?w=600&h=400&fit=crop",
    "Fresh Lime Soda":
        "https://images.unsplash.com/photo-1554866585-c53ca4d72f54?w=600&h=400&fit=crop",
    "Mango Shake":
        "https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=600&h=400&fit=crop",
    "Watermelon Juice":
        "https://images.unsplash.com/photo-1600788132231-ef45cac7d2e1?w=600&h=400&fit=crop",
    "Orange Juice":
        "https://images.unsplash.com/photo-1600788326217-7f45f314ff0a?w=600&h=400&fit=crop",
    "Pomegranate Juice":
        "https://images.unsplash.com/photo-1600788132231-ef45cac7d2e1?w=600&h=400&fit=crop",
    "Coffee":
        "https://images.unsplash.com/photo-1559056169-9f14062d91e7?w=600&h=400&fit=crop",
    "Chai": "https://images.unsplash.com/photo-1597318615921-aee81c6e098e?w=600&h=400&fit=crop",
};

// Function to upload image to Supabase
async function uploadImageToSupabase(imageUrl, dishName) {
    try {
        const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);

        const fileName = `dishes/${Date.now()}-${dishName.replace(/\s+/g, "-").toLowerCase()}.jpg`;

        const { error } = await supabase.storage
            .from("menu-images")
            .upload(fileName, buffer, {
                contentType: "image/jpeg",
                upsert: false,
            });

        if (error) {
            console.error(`Upload error for ${dishName}:`, error.message);
            return null;
        }

        const { data } = supabase.storage
            .from("menu-images")
            .getPublicUrl(fileName);

        return data.publicUrl;
    } catch (error) {
        console.error(`Failed to upload image for "${dishName}":`, error.message);
        return null;
    }
}

// Main update function
async function updateMenuWithImages() {
    try {
        await mongoose.connect(mongoUri);
        console.log("✓ Connected to MongoDB\n");

        const items = await MenuItem.find({});
        console.log(`Updating ${items.length} menu items with curated images...\n`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            // Get image URL from mapping
            const imageUrl = dishImageMapping[item.name] || dishImageMapping[item.category];

            if (!imageUrl) {
                console.log(
                    `⚠ [${i + 1}/${items.length}] ${item.name} - no image in database, skipping`
                );
                failCount++;
                continue;
            }

            console.log(
                `[${i + 1}/${items.length}] ${item.name}...`
            );

            // Upload to Supabase
            const publicUrl = await uploadImageToSupabase(imageUrl, item.name);

            if (publicUrl) {
                // Update in database
                await MenuItem.findByIdAndUpdate(item._id, { image: publicUrl });
                console.log(`  ✓ Uploaded to Supabase`);
                successCount++;
            } else {
                failCount++;
            }

            // Rate limiting
            if (i % 5 === 0) {
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        }

        console.log(`\n========================================`);
        console.log(`✓ Image Update Complete!`);
        console.log(`✓ Success: ${successCount}`);
        console.log(`✗ Failed/Skipped: ${failCount}`);
        console.log(`========================================\n`);

        process.exit(0);
    } catch (error) {
        console.error("Fatal error:", error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

// Run
updateMenuWithImages();
