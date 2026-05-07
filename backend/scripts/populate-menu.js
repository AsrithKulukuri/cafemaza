import "dotenv/config";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const mongoUri = process.env.MONGODB_URI;

if (!supabaseUrl || !supabaseServiceKey || !mongoUri) {
    console.error(
        "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, MONGODB_URI"
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Comprehensive Cafe Maza Menu Dataset
const menuDataset = [
    // SOUPS (10)
    {
        name: "Tomato Dhaniya Shorba",
        category: "Soups",
        price: 99,
        isVeg: true,
        searchQuery: "tomato soup served hot",
    },
    {
        name: "Dal Shorba",
        category: "Soups",
        price: 110,
        isVeg: true,
        searchQuery: "lentil soup dal",
    },
    {
        name: "Kim In Mushroom Soup",
        category: "Soups",
        price: 120,
        isVeg: true,
        searchQuery: "mushroom soup creamy",
    },
    {
        name: "Hot n Sour Soup Veg",
        category: "Soups",
        price: 99,
        isVeg: true,
        searchQuery: "hot and sour soup",
    },
    {
        name: "Hot n Sour Soup Chicken",
        category: "Soups",
        price: 120,
        isVeg: false,
        searchQuery: "chicken hot and sour soup",
    },
    {
        name: "Manchow Soup Veg",
        category: "Soups",
        price: 99,
        isVeg: true,
        searchQuery: "manchow soup vegetables",
    },
    {
        name: "Manchow Soup Chicken",
        category: "Soups",
        price: 120,
        isVeg: false,
        searchQuery: "chicken manchow soup",
    },
    {
        name: "Sweet Corn Soup Veg",
        category: "Soups",
        price: 99,
        isVeg: true,
        searchQuery: "corn soup creamy",
    },
    {
        name: "Sweet Corn Soup Chicken",
        category: "Soups",
        price: 120,
        isVeg: false,
        searchQuery: "chicken corn soup",
    },
    {
        name: "Cream of Mushroom Soup",
        category: "Soups",
        price: 129,
        isVeg: true,
        searchQuery: "creamy mushroom soup",
    },

    // CHINESE STARTERS (20)
    {
        name: "Hyderabadi 65",
        category: "Chinese Starters",
        price: 270,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "hyderabadi 65 fried chicken",
    },
    {
        name: "Chilli Chicken",
        category: "Chinese Starters",
        price: 260,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "chilli chicken with peppers",
    },
    {
        name: "Chicken Manchurian",
        category: "Chinese Starters",
        price: 270,
        isVeg: false,
        searchQuery: "chicken manchurian crispy",
    },
    {
        name: "Chicken Majestic",
        category: "Chinese Starters",
        price: 280,
        isVeg: false,
        searchQuery: "chicken majestic gravy",
    },
    {
        name: "Pepper Chicken",
        category: "Chinese Starters",
        price: 280,
        isVeg: false,
        searchQuery: "pepper chicken spicy",
    },
    {
        name: "Apollo Fish",
        category: "Chinese Starters",
        price: 340,
        isVeg: false,
        searchQuery: "apollo fish crispy fried",
    },
    {
        name: "Chilli Paneer",
        category: "Chinese Starters",
        price: 240,
        isVeg: true,
        searchQuery: "chilli paneer with bell peppers",
    },
    {
        name: "Paneer Majestic",
        category: "Chinese Starters",
        price: 220,
        isVeg: true,
        searchQuery: "paneer majestic gravy",
    },
    {
        name: "Gobi 65",
        category: "Chinese Starters",
        price: 189,
        isVeg: true,
        searchQuery: "gobi 65 fried cauliflower",
    },
    {
        name: "Crispy Garlic Corn",
        category: "Chinese Starters",
        price: 189,
        isVeg: true,
        searchQuery: "crispy corn with garlic",
    },
    {
        name: "Shrimp Manchurian",
        category: "Chinese Starters",
        price: 320,
        isVeg: false,
        searchQuery: "shrimp manchurian",
    },
    {
        name: "Salt n Pepper Squid",
        category: "Chinese Starters",
        price: 300,
        isVeg: false,
        searchQuery: "salt and pepper squid",
    },
    {
        name: "Chilli Fish",
        category: "Chinese Starters",
        price: 300,
        isVeg: false,
        searchQuery: "chilli fish with peppers",
    },
    {
        name: "Veg Spring Rolls",
        category: "Chinese Starters",
        price: 180,
        isVeg: true,
        searchQuery: "vegetable spring rolls crispy",
    },
    {
        name: "Chicken Spring Rolls",
        category: "Chinese Starters",
        price: 210,
        isVeg: false,
        searchQuery: "chicken spring rolls",
    },
    {
        name: "Prawn Spring Rolls",
        category: "Chinese Starters",
        price: 240,
        isVeg: false,
        searchQuery: "prawn spring rolls",
    },
    {
        name: "Hakka Noodles",
        category: "Chinese Starters",
        price: 189,
        isVeg: true,
        searchQuery: "hakka noodles stir fried",
    },
    {
        name: "Chicken Hakka Noodles",
        category: "Chinese Starters",
        price: 240,
        isVeg: false,
        searchQuery: "chicken hakka noodles",
    },
    {
        name: "Schezwan Noodles",
        category: "Chinese Starters",
        price: 189,
        isVeg: true,
        searchQuery: "schezwan noodles spicy",
    },
    {
        name: "Chicken Schezwan Noodles",
        category: "Chinese Starters",
        price: 240,
        isVeg: false,
        searchQuery: "chicken schezwan noodles",
    },

    // TANDOORI (15)
    {
        name: "Chicken Tikka",
        category: "Tandoori",
        price: 290,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "chicken tikka tandoori",
    },
    {
        name: "Murgh Tikka",
        category: "Tandoori",
        price: 270,
        isVeg: false,
        searchQuery: "murgh tikka tandoori",
    },
    {
        name: "Tangidi Kabab",
        category: "Tandoori",
        price: 299,
        isVeg: false,
        searchQuery: "tangidi kabab spiced chicken",
    },
    {
        name: "Fish Tikka",
        category: "Tandoori",
        price: 340,
        isVeg: false,
        searchQuery: "fish tikka tandoori",
    },
    {
        name: "Lamb Chops",
        category: "Tandoori",
        price: 349,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "tandoori lamb chops",
    },
    {
        name: "Murgh Afghani Kebab",
        category: "Tandoori",
        price: 299,
        isVeg: false,
        searchQuery: "afghani chicken kebab",
    },
    {
        name: "Paneer Tikka",
        category: "Tandoori",
        price: 229,
        isVeg: true,
        isBestSeller: true,
        searchQuery: "paneer tikka tandoori",
    },
    {
        name: "Veg Seekh Kebab",
        category: "Tandoori",
        price: 229,
        isVeg: true,
        searchQuery: "vegetable seekh kebab",
    },
    {
        name: "Hara Bhara Kebab",
        category: "Tandoori",
        price: 229,
        isVeg: true,
        searchQuery: "hara bhara kebab green",
    },
    {
        name: "Tandoori Pomfret",
        category: "Tandoori",
        price: 380,
        isVeg: false,
        searchQuery: "tandoori pomfret fish",
    },
    {
        name: "Tandoori Shrimp",
        category: "Tandoori",
        price: 340,
        isVeg: false,
        searchQuery: "tandoori shrimp prawns",
    },
    {
        name: "Makhanwala Tandoori Chicken",
        category: "Tandoori",
        price: 320,
        isVeg: false,
        searchQuery: "tandoori chicken with butter",
    },
    {
        name: "Boti Kebab",
        category: "Tandoori",
        price: 329,
        isVeg: false,
        searchQuery: "boti kebab meat",
    },
    {
        name: "Shami Kebab",
        category: "Tandoori",
        price: 229,
        isVeg: false,
        searchQuery: "shami kebab minced meat",
    },
    {
        name: "Kakori Kebab",
        category: "Tandoori",
        price: 249,
        isVeg: false,
        searchQuery: "kakori kebab lucknowi",
    },

    // MAIN COURSE (35)
    {
        name: "Chicken Chettinad",
        category: "Main Course",
        price: 249,
        isVeg: false,
        searchQuery: "chicken chettinad south indian",
    },
    {
        name: "Andhra Kodi Kura",
        category: "Main Course",
        price: 249,
        isVeg: false,
        searchQuery: "andhra chicken kodi kura",
    },
    {
        name: "Afghani Chicken Curry",
        category: "Main Course",
        price: 279,
        isVeg: false,
        searchQuery: "afghani chicken curry",
    },
    {
        name: "Butter Chicken",
        category: "Main Course",
        price: 289,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "butter chicken creamy tomato",
    },
    {
        name: "Chicken Tikka Masala",
        category: "Main Course",
        price: 289,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "chicken tikka masala",
    },
    {
        name: "Kadai Chicken",
        category: "Main Course",
        price: 289,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "kadai chicken with peppers",
    },
    {
        name: "Murg Makhani",
        category: "Main Course",
        price: 289,
        isVeg: false,
        searchQuery: "murgh makhani buttery chicken",
    },
    {
        name: "Chicken Korma",
        category: "Main Course",
        price: 279,
        isVeg: false,
        searchQuery: "chicken korma cream yogurt",
    },
    {
        name: "Chicken 555",
        category: "Main Course",
        price: 280,
        isVeg: false,
        searchQuery: "chicken 555 spicy",
    },
    {
        name: "Rara Meat",
        category: "Main Course",
        price: 340,
        isVeg: false,
        searchQuery: "rara meat curry",
    },
    {
        name: "Mutton Rogan Josh",
        category: "Main Course",
        price: 360,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "mutton rogan josh",
    },
    {
        name: "Kadai Mutton",
        category: "Main Course",
        price: 340,
        isVeg: false,
        searchQuery: "kadai mutton with peppers",
    },
    {
        name: "Paya",
        category: "Main Course",
        price: 300,
        isVeg: false,
        searchQuery: "paya meat curry",
    },
    {
        name: "Haleem",
        category: "Main Course",
        price: 220,
        isVeg: false,
        searchQuery: "haleem meat lentil",
    },
    {
        name: "Paneer Butter Masala",
        category: "Main Course",
        price: 189,
        isVeg: true,
        isBestSeller: true,
        searchQuery: "paneer butter masala",
    },
    {
        name: "Kadai Paneer",
        category: "Main Course",
        price: 189,
        isVeg: true,
        isBestSeller: true,
        searchQuery: "paneer kadai with peppers",
    },
    {
        name: "Paneer Tikka Masala",
        category: "Main Course",
        price: 199,
        isVeg: true,
        searchQuery: "paneer tikka masala",
    },
    {
        name: "Mushroom Masala",
        category: "Main Course",
        price: 189,
        isVeg: true,
        searchQuery: "mushroom masala curry",
    },
    {
        name: "Veg Korma",
        category: "Main Course",
        price: 189,
        isVeg: true,
        searchQuery: "vegetable korma cream",
    },
    {
        name: "Chana Masala",
        category: "Main Course",
        price: 129,
        isVeg: true,
        searchQuery: "chana masala chickpea curry",
    },
    {
        name: "Dal Makhani",
        category: "Main Course",
        price: 139,
        isVeg: true,
        searchQuery: "dal makhani butter lentils",
    },
    {
        name: "Dal Tadka",
        category: "Main Course",
        price: 119,
        isVeg: true,
        searchQuery: "dal tadka spiced lentils",
    },
    {
        name: "Chole Bhature",
        category: "Main Course",
        price: 149,
        isVeg: true,
        searchQuery: "chole bhature fried bread",
    },
    {
        name: "Tandoori Roti",
        category: "Main Course",
        price: 25,
        isVeg: true,
        searchQuery: "tandoori roti bread",
    },
    {
        name: "Butter Roti",
        category: "Main Course",
        price: 35,
        isVeg: true,
        searchQuery: "butter roti naan",
    },
    {
        name: "Garlic Naan",
        category: "Main Course",
        price: 60,
        isVeg: true,
        isBestSeller: true,
        searchQuery: "garlic naan bread",
    },
    {
        name: "Plain Naan",
        category: "Main Course",
        price: 40,
        isVeg: true,
        searchQuery: "plain naan bread",
    },
    {
        name: "Butter Naan",
        category: "Main Course",
        price: 45,
        isVeg: true,
        searchQuery: "butter naan bread",
    },
    {
        name: "Cheese Naan",
        category: "Main Course",
        price: 70,
        isVeg: true,
        searchQuery: "cheese naan with paneer",
    },
    {
        name: "Peshwari Naan",
        category: "Main Course",
        price: 80,
        isVeg: true,
        searchQuery: "peshwari naan with dry fruits",
    },
    {
        name: "Masala Kulcha",
        category: "Main Course",
        price: 60,
        isVeg: true,
        searchQuery: "masala kulcha bread",
    },
    {
        name: "Roomali Roti",
        category: "Main Course",
        price: 40,
        isVeg: true,
        searchQuery: "roomali roti thin bread",
    },
    {
        name: "Lachcha Paratha",
        category: "Main Course",
        price: 50,
        isVeg: true,
        searchQuery: "lachcha paratha layered",
    },
    {
        name: "Aloo Paratha",
        category: "Main Course",
        price: 60,
        isVeg: true,
        searchQuery: "aloo paratha potato",
    },
    {
        name: "Paneer Paratha",
        category: "Main Course",
        price: 70,
        isVeg: true,
        searchQuery: "paneer paratha cheese",
    },

    // BIRYANI (12)
    {
        name: "Veg Dum Biryani",
        category: "Biryani",
        price: 200,
        isVeg: true,
        searchQuery: "vegetable dum biryani",
    },
    {
        name: "Paneer Dum Biryani",
        category: "Biryani",
        price: 250,
        isVeg: true,
        searchQuery: "paneer biryani cheese",
    },
    {
        name: "Chicken Dum Biryani",
        category: "Biryani",
        price: 250,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "chicken dum biryani",
    },
    {
        name: "Mutton Dum Biryani",
        category: "Biryani",
        price: 360,
        isVeg: false,
        isBestSeller: true,
        searchQuery: "mutton dum biryani",
    },
    {
        name: "Chicken 65 Biryani",
        category: "Biryani",
        price: 299,
        isVeg: false,
        searchQuery: "chicken 65 biryani",
    },
    {
        name: "Chicken Tikka Biryani",
        category: "Biryani",
        price: 299,
        isVeg: false,
        searchQuery: "chicken tikka biryani",
    },
    {
        name: "Nalli Gosht Biryani",
        category: "Biryani",
        price: 399,
        isVeg: false,
        searchQuery: "nalli gosht biryani lamb",
    },
    {
        name: "Chicken Biryani Family Pack",
        category: "Biryani",
        price: 699,
        isVeg: false,
        searchQuery: "family pack biryani",
    },
    {
        name: "Mutton Biryani Family Pack",
        category: "Biryani",
        price: 850,
        isVeg: false,
        searchQuery: "mutton biryani family",
    },
    {
        name: "Briyani Lunch Special",
        category: "Biryani",
        price: 180,
        isVeg: false,
        searchQuery: "biryani lunch special",
    },
    {
        name: "Veg Biryani Lunch Special",
        category: "Biryani",
        price: 150,
        isVeg: true,
        searchQuery: "vegetable biryani lunch",
    },
    {
        name: "Hyderabadi Dum Biryani",
        category: "Biryani",
        price: 280,
        isVeg: false,
        searchQuery: "hyderabadi biryani",
    },

    // SEAFOOD (12)
    {
        name: "Fish Curry",
        category: "Seafood",
        price: 320,
        isVeg: false,
        searchQuery: "fish curry gravy",
    },
    {
        name: "Amritsari Kunni",
        category: "Seafood",
        price: 300,
        isVeg: false,
        searchQuery: "amritsari fish",
    },
    {
        name: "Fried Fish",
        category: "Seafood",
        price: 320,
        isVeg: false,
        searchQuery: "fried fish crispy",
    },
    {
        name: "Fish Tikka",
        category: "Seafood",
        price: 340,
        isVeg: false,
        searchQuery: "fish tikka tandoori",
    },
    {
        name: "Prawn Masala",
        category: "Seafood",
        price: 380,
        isVeg: false,
        searchQuery: "prawn masala curry",
    },
    {
        name: "Prawn Pepper Fry",
        category: "Seafood",
        price: 380,
        isVeg: false,
        searchQuery: "prawn pepper fry",
    },
    {
        name: "Butter Garlic Shrimp",
        category: "Seafood",
        price: 380,
        isVeg: false,
        searchQuery: "butter garlic shrimp",
    },
    {
        name: "Squid Masala",
        category: "Seafood",
        price: 300,
        isVeg: false,
        searchQuery: "squid masala curry",
    },
    {
        name: "Crab Masala",
        category: "Seafood",
        price: 420,
        isVeg: false,
        searchQuery: "crab masala curry",
    },
    {
        name: "Tandoori Pomfret",
        category: "Seafood",
        price: 380,
        isVeg: false,
        searchQuery: "tandoori pomfret fish",
    },
    {
        name: "Fish Fry",
        category: "Seafood",
        price: 320,
        isVeg: false,
        searchQuery: "fish fry crispy",
    },
    {
        name: "Chilli Shrimp",
        category: "Seafood",
        price: 380,
        isVeg: false,
        searchQuery: "chilli shrimp",
    },

    // DESSERTS (10)
    {
        name: "Qurbani Ka Meetha",
        category: "Desserts",
        price: 129,
        isVeg: true,
        searchQuery: "qurbani ka meetha halwa",
    },
    {
        name: "Gulab Jamun With Ice Cream",
        category: "Desserts",
        price: 139,
        isVeg: true,
        searchQuery: "gulab jamun ice cream",
    },
    {
        name: "Gulab Jamun",
        category: "Desserts",
        price: 99,
        isVeg: true,
        searchQuery: "gulab jamun syrup",
    },
    {
        name: "Double Ka Meetha",
        category: "Desserts",
        price: 120,
        isVeg: true,
        searchQuery: "double ka meetha",
    },
    {
        name: "Kheer",
        category: "Desserts",
        price: 100,
        isVeg: true,
        searchQuery: "kheer rice pudding",
    },
    {
        name: "Phirni",
        category: "Desserts",
        price: 110,
        isVeg: true,
        searchQuery: "phirni dessert",
    },
    {
        name: "Ras Malai",
        category: "Desserts",
        price: 120,
        isVeg: true,
        searchQuery: "ras malai cheese dessert",
    },
    {
        name: "Mango Sorbet",
        category: "Desserts",
        price: 99,
        isVeg: true,
        searchQuery: "mango sorbet ice",
    },
    {
        name: "Ice Cream Scoop",
        category: "Desserts",
        price: 80,
        isVeg: true,
        searchQuery: "ice cream scoop",
    },
    {
        name: "Khubani Bread",
        category: "Desserts",
        price: 110,
        isVeg: true,
        searchQuery: "khubani bread apricot",
    },

    // MOCKTAILS & BEVERAGES (15)
    {
        name: "Virgin Mojito",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "virgin mojito mint",
    },
    {
        name: "Strawberry Delight",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "strawberry mocktail",
    },
    {
        name: "Blue Moon",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "blue moon mocktail",
    },
    {
        name: "Pina Colada",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "pina colada mocktail",
    },
    {
        name: "Mango Mania",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "mango mocktail",
    },
    {
        name: "Fruits Punch",
        category: "Mocktails",
        price: 129,
        isVeg: true,
        searchQuery: "fruit punch beverage",
    },
    {
        name: "Sweet Lassi",
        category: "Mocktails",
        price: 99,
        isVeg: true,
        searchQuery: "sweet lassi yogurt",
    },
    {
        name: "Butter Milk",
        category: "Mocktails",
        price: 89,
        isVeg: true,
        searchQuery: "buttermilk drink",
    },
    {
        name: "Fresh Lime Soda",
        category: "Mocktails",
        price: 99,
        isVeg: true,
        searchQuery: "fresh lime soda",
    },
    {
        name: "Mango Shake",
        category: "Mocktails",
        price: 120,
        isVeg: true,
        searchQuery: "mango shake milkshake",
    },
    {
        name: "Watermelon Juice",
        category: "Mocktails",
        price: 99,
        isVeg: true,
        searchQuery: "watermelon juice",
    },
    {
        name: "Orange Juice",
        category: "Mocktails",
        price: 80,
        isVeg: true,
        searchQuery: "fresh orange juice",
    },
    {
        name: "Pomegranate Juice",
        category: "Mocktails",
        price: 100,
        isVeg: true,
        searchQuery: "pomegranate juice",
    },
    {
        name: "Coffee",
        category: "Mocktails",
        price: 60,
        isVeg: true,
        searchQuery: "hot coffee",
    },
    {
        name: "Chai",
        category: "Mocktails",
        price: 40,
        isVeg: true,
        searchQuery: "indian chai tea",
    },
];

// Function to fetch image from Pexels (free, no auth needed)
async function fetchImageUrl(searchQuery) {
    try {
        const response = await axios.get("https://api.pexels.com/v1/search", {
            params: {
                query: searchQuery,
                per_page: 1,
                size: "large",
            },
            headers: {
                "Authorization": "OVMbXfqhaMfEcbJzm1V4Z9Qd6I6nlkR84pMfVxU65PdP9hYPq9R7b0cQ",
            },
        });

        if (response.data.photos && response.data.photos.length > 0) {
            const photo = response.data.photos[0];
            return photo.src.medium || photo.src.small; // Good quality, fast loading
        }
    } catch (error) {
        console.error(`Failed to fetch image for "${searchQuery}":`, error.message);
    }

    // Fallback to a generic food image from Pexels
    return "https://images.pexels.com/photos/1095521/pexels-photo-1095521.jpeg?auto=compress&cs=tinysrgb&w=600";
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

// Main populate function
async function populateMenu() {
    try {
        // Connect to MongoDB
        await mongoose.connect(mongoUri);
        console.log("✓ Connected to MongoDB");

        // Clear existing items
        const deleted = await MenuItem.deleteMany({});
        console.log(`✓ Cleared ${deleted.deletedCount} existing menu items`);

        let successCount = 0;
        let failCount = 0;

        // Process each menu item
        for (let i = 0; i < menuDataset.length; i++) {
            const item = menuDataset[i];
            console.log(`\n[${i + 1}/${menuDataset.length}] Processing: ${item.name}`);

            // Fetch image URL from Unsplash
            console.log(`  → Searching image for "${item.searchQuery}"...`);
            const imageUrl = await fetchImageUrl(item.searchQuery);

            // Upload to Supabase
            console.log(`  → Uploading to Supabase...`);
            const publicUrl = await uploadImageToSupabase(imageUrl, item.name);

            // Create menu item in database
            try {
                await MenuItem.create({
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    image: publicUrl || imageUrl,
                    isVeg: item.isVeg || false,
                    isPopular: item.isBestSeller || false,
                    isBestSeller: item.isBestSeller || false,
                    isSoldOut: false,
                    tags: item.isVeg ? ["vegetarian"] : ["non-vegetarian"],
                });
                console.log(`  ✓ Created: ${item.name} - ₹${item.price}`);
                successCount++;
            } catch (error) {
                console.error(`  ✗ Failed to create menu item: ${error.message}`);
                failCount++;
            }

            // Rate limiting - wait a bit between requests
            if (i % 5 === 0) {
                console.log("  ⏳ Rate limiting...");
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        }

        console.log(`\n========================================`);
        console.log(`✓ Menu Population Complete!`);
        console.log(`✓ Success: ${successCount}`);
        console.log(`✗ Failed: ${failCount}`);
        console.log(`✓ Total: ${successCount + failCount}`);
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
populateMenu();
