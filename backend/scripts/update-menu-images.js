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

// Pexels API Key
const PEXELS_API_KEY = "OVMbXfqhaMfEcbJzm1V4Z9Qd6I6nlkR84pMfVxU65PdP9hYPq9R7b0cQ";

// Function to fetch image from Pexels
async function fetchImageUrl(searchQuery) {
    try {
        const response = await axios.get("https://api.pexels.com/v1/search", {
            params: {
                query: searchQuery,
                per_page: 1,
                size: "medium",
            },
            headers: {
                Authorization: PEXELS_API_KEY,
            },
        });

        if (response.data.photos && response.data.photos.length > 0) {
            const photo = response.data.photos[0];
            return photo.src.medium || photo.src.small;
        }
    } catch (error) {
        console.error(`Failed to fetch image for "${searchQuery}":`, error.message);
    }

    return null;
}

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

        const items = await MenuItem.find({}); // Get all items
        console.log(`Updating ${items.length} menu items with images...\n`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            console.log(
                `[${i + 1}/${items.length}] Updating: ${item.name}`
            );

            // Build search query
            const searchQuery = `${item.name} ${item.category} food`;

            // Fetch image from Pexels
            console.log(`  → Searching image...`);
            const imageUrl = await fetchImageUrl(searchQuery);

            if (!imageUrl) {
                console.log(`  ✗ No image found, skipping`);
                failCount++;
                continue;
            }

            // Upload to Supabase
            console.log(`  → Uploading to Supabase...`);
            const publicUrl = await uploadImageToSupabase(imageUrl, item.name);

            if (publicUrl) {
                // Update in database
                await MenuItem.findByIdAndUpdate(item._id, { image: publicUrl });
                console.log(`  ✓ Updated with image`);
                successCount++;
            } else {
                failCount++;
            }

            // Rate limiting
            if (i % 3 === 0) {
                console.log("  ⏳ Rate limiting...");
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        console.log(`\n========================================`);
        console.log(`✓ Image Update Complete!`);
        console.log(`✓ Success: ${successCount}`);
        console.log(`✗ Failed: ${failCount}`);
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
