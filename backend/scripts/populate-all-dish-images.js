import "dotenv/config";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

// Curated high quality food images for every type of dish
const dishSpecificImages = {
    // Tandoori & Kebabs
    "Chicken Tikka Malai": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Chicken Tikka Zafrani": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Chicken Tikka Hariyali": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Chilli Sholey Kebab": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Murgh Tikka": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Tangdi Kabab": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&h=400&fit=crop",
    "Santrewala Murgh Tikka": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Fish Tikka Achari": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&h=400&fit=crop",
    "Fish Tikka Hariyali": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&h=400&fit=crop",
    "Tandoori Sea Prawns": "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop",
    "Tala Hua Gosht": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Lamb Chops": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Murgh Afgani Kebab": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Chelo Kebab": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    "Persian Kebab": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    "Mutton Seekh Kebab": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    "Sangam Seek Kebab": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    "Mutton Sikandari Run": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Mutton Sikandari Raan": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Mutton Boti Kebab": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Tandoori Chicken": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&h=400&fit=crop",
    "Tandoori Non Veg Platter": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",
    "Paneer Tikka Malai": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop",
    "Paneer Tikka Hariyali": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop",
    "Paneer Tikka Achari": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop",
    "Veg Seekh Kebab": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&h=400&fit=crop",
    "Malai Brocoli Peri Peri": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&h=400&fit=crop",
    "Hara Bhara Kebab": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop",
    "Assorted BBQ Setup": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&h=400&fit=crop",

    // Chinese Starters
    "Hyderabadi 65 Chicken": "https://images.unsplash.com/photo-1599599810694-b5ac4dd64e59?w=600&h=400&fit=crop",
    "Hyderabadi 65 Prawns": "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop",
    "Chilli Chicken": "https://images.unsplash.com/photo-1543521521-83ec6361ceae?w=600&h=400&fit=crop",
    "Chicken Manchurian": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&h=400&fit=crop",
    "Chicken Majestic": "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Chicken Thaipai": "https://images.unsplash.com/photo-1543521521-83ec6361ceae?w=600&h=400&fit=crop",
    "Chicken Lollypop Crispy": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&h=400&fit=crop",
    "Chicken Lollypop Soucy": "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=600&h=400&fit=crop",
    "Pepper Chicken": "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Jeedi Pappu Kodi Pakodi": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&h=400&fit=crop",
    "Chilli Prawns": "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop",
    "Apollo Fish": "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Thaipai Fish": "https://images.unsplash.com/photo-1580959375944-abd7029f3937?w=600&h=400&fit=crop",
    "Golden Fried Prawns": "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop",
    "Loose Prawns": "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop",
    "Pandu Mirchi Kodi Vepudu": "https://images.unsplash.com/photo-1604074131614-69f1a68a6fbf?w=600&h=400&fit=crop",
    "Veg Manchurian": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Chilli Paneer": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Kung Pao Paneer": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Paneer Majestic": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Gobi 65": "https://images.unsplash.com/photo-1618511267537-b685faf3a97b?w=600&h=400&fit=crop",
    "Chilli Mushroom": "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Crispy Mushroom Chilli Garlic": "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Honey Chilli Potato": "https://images.unsplash.com/photo-1585238342024-78d387f4a707?w=600&h=400&fit=crop",
    "Crispy Garlic Corn": "https://images.unsplash.com/photo-1618511267537-b685faf3a97b?w=600&h=400&fit=crop",
    "Chinese Non Veg Platter": "https://images.unsplash.com/photo-1543521521-83ec6361ceae?w=600&h=400&fit=crop",

    // Soups
    "Tomato Dhaniya Shorba": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Dal Shorba": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&h=400&fit=crop",
    "Cream In Mushroom Soup": "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Hot N Sour Soup": "https://images.unsplash.com/photo-1460306855917-335d081e8a51?w=600&h=400&fit=crop",
    "Manchaw Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Sweet Corn Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Cream In Chicken Soup": "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Paya Shorba": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Marag Shorba": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",
    "Italian Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop",

    // Main Course
    "Chicken Chettinad": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Andhra Kodi Kura": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Afghani Chicken Curry": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Butter Chicken": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Chicken Tikka Masala": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Kadai Chicken": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Mutton Rogan Jush": "https://images.unsplash.com/photo-1545247181-516773cae754?w=600&h=400&fit=crop",
    "Mutton Rara Masala": "https://images.unsplash.com/photo-1545247181-516773cae754?w=600&h=400&fit=crop",
    "Kadai Mutton": "https://images.unsplash.com/photo-1545247181-516773cae754?w=600&h=400&fit=crop",
    "Murgh Musallam": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop",
    "Mix Veg Curry": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop",
    "Kadai Veg": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop",
    "Veg Korma": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop",
    "Mushroom Do Pyaza": "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Mushroom Masala": "https://images.unsplash.com/photo-1476124369162-f4978ebb5528?w=600&h=400&fit=crop",
    "Paneer Butter Masala": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Kadai Paneer": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Paneer Tikka Masala": "https://images.unsplash.com/photo-1589301760014-eed73d98b47b?w=600&h=400&fit=crop",
    "Methi Chaman": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&h=400&fit=crop",

    // Biryani
    "Veg Cum Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Paneer Dum Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Kaju Paneer Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Egg Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Kheema Biryani Chicken": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Kheema Biryani Mutton": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Kheema Biryani Prawns": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Chicken Dum Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Mutton Dum Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Fry Chicken Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Prawns Dum Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Chicken 65 Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Chicken Tikka Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Nalli Gosht Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Chicken Dum Biryani Family Pack": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Mutton Dum Biryani Family Pack": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Special Tangdi Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",

    // Breads
    "Tandoori Roti": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Butter Roti": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Garlic Naan": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Plain Naan": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Butter Naan": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Plain Kulcha": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Masala Kulcha": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Plain Paratha": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Aloo Paratha": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Rumali Roti": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",
    "Kashmiri Naan": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop",

    // Rice & Noodles
    "Fried Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&h=400&fit=crop",
    "Hakka Noodles": "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "American Chopsy": "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",
    "Plain Rice": "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&h=400&fit=crop",
    "Jeera Rice": "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&h=400&fit=crop",
    "Veg Pulao": "https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?w=600&h=400&fit=crop",
    "Kodi Pulao": "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop",
    "Singapur Noodles": "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop",

    // Sizzlers & Specials
    "American Chopsuey Sizzler": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",
    "Angari Murgh Kabab": "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop",
    "Angari Fish Tikka": "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&h=400&fit=crop",
    "Cafe Maza Special Stroganoff": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&h=400&fit=crop",

    // Desserts
    "Qurbani Ka Meetha": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",
    "Gulab Jamun With Ice Cream": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Gulab Jamun": "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop",
    "Double Ka Meeta": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&h=400&fit=crop",

    // Mocktails & Beverages
    "Virgin Mojito": "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=600&h=400&fit=crop",
    "Strawberry Delight": "https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=600&h=400&fit=crop",
    "Blue Moon": "https://images.unsplash.com/photo-1541905590316-e06b3dd5b540?w=600&h=400&fit=crop",
    "Passion Fruits Pop": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=400&fit=crop",
    "Orange Blossom": "https://images.unsplash.com/photo-1600788326217-7f45f314ff0a?w=600&h=400&fit=crop",
    "Zamun Zaminia": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&h=400&fit=crop",
    "Berry Bliss": "https://images.unsplash.com/photo-1505252585461-04db1267ae5b?w=600&h=400&fit=crop",
    "Butter Milk": "https://images.unsplash.com/photo-1585337033009-ca1ee5dc1f76?w=600&h=400&fit=crop",
    "Sweet Lassi": "https://images.unsplash.com/photo-1585337033009-ca1ee5dc1f76?w=600&h=400&fit=crop",
    "Fresh Lime Soda": "https://images.unsplash.com/photo-1554866585-c53ca4d72f54?w=600&h=400&fit=crop"
};

// Popular & Best Seller flags to set on top dishes
const bestSellers = new Set([
    "Chicken Dum Biryani",
    "Butter Chicken",
    "Chicken Tikka Malai",
    "Mutton Dum Biryani",
    "Chicken 65 Biryani",
    "Paneer Butter Masala",
    "Garlic Naan",
    "Murgh Musallam",
    "Mutton Sikandari Raan",
    "Chilli Chicken",
    "Chicken Majestic",
    "Apollo Fish",
    "Virgin Mojito",
    "Gulab Jamun With Ice Cream",
    "Qurbani Ka Meetha"
]);

const populars = new Set([
    "Chicken Tikka Zafrani",
    "Tandoori Chicken",
    "Tangdi Kabab",
    "Chicken Manchurian",
    "Kadai Chicken",
    "Chicken Tikka Masala",
    "Mutton Rogan Jush",
    "Nalli Gosht Biryani",
    "Paneer Dum Biryani",
    "Chilli Paneer",
    "Butter Naan",
    "Hakka Noodles",
    "Strawberry Delight",
    "Sweet Lassi"
]);

async function run() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const items = await MenuItem.find({});
    console.log(`Found ${items.length} dishes in database.`);

    let updatedCount = 0;

    for (const item of items) {
        let imageUrl = dishSpecificImages[item.name];

        // If not exact match, check generic keywords
        if (!imageUrl) {
            const nameLower = item.name.toLowerCase();
            const catLower = (item.category || "").toLowerCase();

            if (nameLower.includes("biryani")) {
                imageUrl = "https://images.unsplash.com/photo-1563379091339-03b21ab4a104?w=600&h=400&fit=crop";
            } else if (nameLower.includes("tikka") || nameLower.includes("kebab") || nameLower.includes("kabab") || catLower.includes("tandoori")) {
                imageUrl = "https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=600&h=400&fit=crop";
            } else if (nameLower.includes("curry") || nameLower.includes("masala") || nameLower.includes("kura") || nameLower.includes("butter chicken") || catLower.includes("main course")) {
                imageUrl = "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=600&h=400&fit=crop";
            } else if (nameLower.includes("naan") || nameLower.includes("roti") || nameLower.includes("paratha") || nameLower.includes("kulcha") || catLower.includes("bread")) {
                imageUrl = "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop";
            } else if (nameLower.includes("rice") || nameLower.includes("pulao") || nameLower.includes("noodles") || nameLower.includes("chopsuey")) {
                imageUrl = "https://images.unsplash.com/photo-1612874742237-415c69bb0a4f?w=600&h=400&fit=crop";
            } else if (nameLower.includes("soup") || nameLower.includes("shorba") || catLower.includes("soup")) {
                imageUrl = "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&h=400&fit=crop";
            } else if (catLower.includes("desert") || nameLower.includes("meetha") || nameLower.includes("jamun") || nameLower.includes("ice cream")) {
                imageUrl = "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&h=400&fit=crop";
            } else if (catLower.includes("beverage") || catLower.includes("mocktail") || nameLower.includes("mojito") || nameLower.includes("soda") || nameLower.includes("lassi")) {
                imageUrl = "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=600&h=400&fit=crop";
            } else if (nameLower.includes("prawn") || nameLower.includes("fish")) {
                imageUrl = "https://images.unsplash.com/photo-1559742811-822873691df8?w=600&h=400&fit=crop";
            } else {
                imageUrl = "https://images.unsplash.com/photo-1543521521-83ec6361ceae?w=600&h=400&fit=crop";
            }
        }

        const isBestSeller = bestSellers.has(item.name);
        const isPopular = populars.has(item.name) || isBestSeller;
        const isSpecial = item.category?.includes("Specials") || bestSellers.has(item.name);

        await MenuItem.findByIdAndUpdate(item._id, {
            image: imageUrl,
            isBestSeller,
            isPopular,
            isSpecial
        });

        updatedCount++;
    }

    console.log(`✓ Successfully updated ${updatedCount} dishes with images, bestSeller and popular flags!`);
    await mongoose.disconnect();
}

run().catch(console.error);
