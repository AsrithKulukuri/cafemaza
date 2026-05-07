import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";

import { MenuItem } from "../src/models/MenuItem.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONGODB_URI = "mongodb://127.0.0.1:5678/cafe_maza";
const SUPABASE_PUBLIC_BASE = "https://nrhtpkjiyjwypxdwthgq.supabase.co/storage/v1/object/public/menu-images/seed";

const CATEGORY_ORDER = [
    "Recommended",
    "Soups",
    "Tandoori",
    "Chinese",
    "Main Course",
    "Biryani",
    "Rice & Noodles",
    "Breads",
    "Sizzlers",
    "Desserts",
    "Drinks",
];

const SPECIAL_ITEMS = new Set([
    "murgh musallam",
    "mutton sikandari raan",
    "tandoori non veg platter",
    "assorted bbq setup",
    "special tangdi biryani",
    "chilli sholey kebab",
    "chelo kebab",
]);

const RECOMMENDED_ITEMS = new Set([
    "butter chicken",
    "chicken dum biryani",
    "mutton dum biryani",
    "tandoori chicken",
    "chicken tikka",
    "murgh musallam",
    "tandoori non veg platter",
    "special tangdi biryani",
    "paneer butter masala",
    "virgin mojito",
]);

const CATEGORY_FALLBACK_SLUG = {
    Recommended: "recommended-cafe-maza.jpg",
    Soups: "soup.jpg",
    Tandoori: "chicken-tikka.jpg",
    Chinese: "chilli-chicken.jpg",
    "Main Course": "butter-chicken.jpg",
    Biryani: "chicken-dum-biryani.jpg",
    "Rice & Noodles": "fried-rice-noodles.jpg",
    Breads: "roti.jpg",
    Sizzlers: "sizzler.jpg",
    Desserts: "dessert.jpg",
    Drinks: "virgin-mojito.jpg",
};

const vegCategories = new Set(["Desserts", "Breads", "Drinks"]);
const vegKeywords = [
    "aalu",
    "aloo",
    "babycorn",
    "brocoli",
    "brocooli",
    "broccoli",
    "butter milk",
    "corn",
    "curd",
    "dal",
    "gobi",
    "kaju",
    "kulcha",
    "lassi",
    "methi",
    "mushroom",
    "naan",
    "palak",
    "paneer",
    "paratha",
    "parata",
    "potato",
    "roti",
    "salad",
    "soya",
    "tomato",
    "veg",
];
const nonVegKeywords = [
    "chicken",
    "chops",
    "egg",
    "fish",
    "gosht",
    "harees",
    "keema",
    "kodi",
    "lamb",
    "marag",
    "murgh",
    "mutton",
    "non veg",
    "non-veg",
    "nonveg",
    "paya",
    "prawn",
    "sea prawns",
    "tangdi",
];

function readRawMenuData() {
    const source = fs.readFileSync(path.join(__dirname, "replace-menu-final.mjs"), "utf8");
    const match = source.match(/const newMenuData = (\[[\s\S]*?\]);/);
    if (!match) {
        throw new Error("Could not read newMenuData from replace-menu-final.mjs");
    }

    return Function(`"use strict"; return ${match[1]};`)();
}

function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeName(name) {
    return String(name || "")
        .replace(/\s*-\s*/g, " - ")
        .replace(/\s+/g, " ")
        .trim();
}

function canonicalName(name) {
    const compact = normalizeText(name);
    if (compact === "bbq setup") return "Assorted BBQ Setup";
    if (compact === "sholey kebab") return "Chilli Sholey Kebab";
    if (compact === "chelo kebab ( mutton & chicken )") return "Chelo Kebab";
    if (compact === "tandoori non veg platter ( 5 items )" || compact === "tandoori mix non veg platter") return "Tandoori Non Veg Platter";
    if (compact === "mutton sikandari run") return "Mutton Sikandari Raan";

    return normalizeName(name)
        .replace(/\bBiyani\b/gi, "Biryani")
        .replace(/\bMajestick\b/gi, "Majestic")
        .replace(/\bThaipai\b/gi, "Tai Pai")
        .replace(/\bApolo\b/gi, "Apollo")
        .replace(/\bBrocooli\b/gi, "Broccoli")
        .replace(/\bBrocooli\b/gi, "Broccoli")
        .replace(/\bAmlet\b/gi, "Omelette")
        .replace(/\bTamoto\b/gi, "Tomato")
        .replace(/\bAalu Parata\b/gi, "Aloo Paratha")
        .replace(/Mutton Sikandari Run/gi, "Mutton Sikandari Raan");
}

function mapCategory(category) {
    const value = normalizeText(category);
    if (value.includes("soup")) return "Soups";
    if (value.includes("tandoori")) return "Tandoori";
    if (value.includes("chinese")) return "Chinese";
    if (value.includes("main course")) return "Main Course";
    if (value.includes("biryani")) return "Biryani";
    if (value.includes("noodles") || value.includes("fried rice")) return "Rice & Noodles";
    if (value.includes("bread")) return "Breads";
    if (value.includes("sizzler")) return "Sizzlers";
    if (value.includes("dessert") || value.includes("sweet")) return "Desserts";
    if (value.includes("mocktail")) return "Drinks";
    if (value.includes("special")) return "Recommended";
    throw new Error(`Unknown category: ${category}`);
}

function slugify(value) {
    return normalizeText(value)
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function imageFor(item) {
    const filename = `${slugify(item.name)}.jpg`;
    return `${SUPABASE_PUBLIC_BASE}/${encodeURIComponent(item.category)}/${filename || CATEGORY_FALLBACK_SLUG[item.category]}`;
}

function determineVeg(item) {
    const lower = normalizeText(item.name);
    if (vegCategories.has(item.category)) return true;
    for (const keyword of nonVegKeywords) {
        if (lower.includes(keyword)) return false;
    }
    for (const keyword of vegKeywords) {
        if (lower.includes(keyword)) return true;
    }
    return false;
}

function makeItem({ name, category, price, variants }) {
    const cleanName = canonicalName(name);
    const lower = normalizeText(cleanName)
        .replace(/\([^)]*\)/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const special = SPECIAL_ITEMS.has(lower);
    const item = {
        name: cleanName,
        category,
        price: variants?.length ? undefined : Number(price || 0),
        variants: variants || [],
        image: "",
        isVeg: false,
        isPopular: RECOMMENDED_ITEMS.has(lower),
        isBestSeller: RECOMMENDED_ITEMS.has(lower),
        isSpecial: special,
        isSoldOut: false,
        tags: [
            determineVeg({ name: cleanName, category }) ? "veg" : "non-veg",
            special ? "special" : "",
            RECOMMENDED_ITEMS.has(lower) ? "recommended" : "",
        ].filter(Boolean),
    };

    item.isVeg = determineVeg(item);
    item.image = imageFor(item);
    return item;
}

function buildMenu() {
    const rawItems = readRawMenuData();
    const skipNames = new Set([
        "malai chicken tikka",
        "zafrani chicken tikka",
        "hariyali chicken tikka",
        "tandoori chicken (half)",
        "tandoori chicken (full)",
        "chilli chicken - dry",
        "chilli chicken - wet",
        "chicken manchurian - dry",
        "chicken manchurian - wet",
        "veg manchurian - dry",
        "veg manchurian -wet",
        "chilli paneer- dry",
        "chilli paneer-wet",
        "veg fried rice",
        "chicken fried rice",
        "mix fried rice",
        "veg hakka noodles",
        "chicken hakka noodles",
        "mix hakka noodles",
    ]);

    const items = [
        makeItem({
            name: "Chicken Tikka",
            category: "Tandoori",
            variants: [
                { name: "Malai", price: 359 },
                { name: "Zafrani", price: 329 },
                { name: "Hariyali", price: 339 },
            ],
        }),
        makeItem({
            name: "Tandoori Chicken",
            category: "Tandoori",
            variants: [
                { name: "Half", price: 319 },
                { name: "Full", price: 589 },
            ],
        }),
        makeItem({
            name: "Chilli Chicken",
            category: "Chinese",
            variants: [
                { name: "Dry", price: 309 },
                { name: "Wet", price: 329 },
            ],
        }),
        makeItem({
            name: "Chicken Manchurian",
            category: "Chinese",
            variants: [
                { name: "Dry", price: 299 },
                { name: "Wet", price: 309 },
            ],
        }),
        makeItem({
            name: "Veg Manchurian",
            category: "Chinese",
            variants: [
                { name: "Dry", price: 219 },
                { name: "Wet", price: 249 },
            ],
        }),
        makeItem({
            name: "Chilli Paneer",
            category: "Chinese",
            variants: [
                { name: "Dry", price: 269 },
                { name: "Wet", price: 289 },
            ],
        }),
        makeItem({
            name: "Fried Rice",
            category: "Rice & Noodles",
            variants: [
                { name: "Veg", price: 199 },
                { name: "Chicken", price: 259 },
                { name: "Mix", price: 339 },
            ],
        }),
        makeItem({
            name: "Hakka Noodles",
            category: "Rice & Noodles",
            variants: [
                { name: "Veg", price: 199 },
                { name: "Chicken", price: 259 },
                { name: "Mix", price: 339 },
            ],
        }),
    ];

    for (const raw of rawItems) {
        const cleanName = canonicalName(raw.name);
        const lower = normalizeText(raw.name);
        if (skipNames.has(lower)) continue;

        const category = mapCategory(raw.category);
        const item = makeItem({ name: cleanName, category, price: raw.price });
        items.push(item);
    }

    const seen = new Set();
    const unique = [];
    for (const item of items) {
        const key = normalizeText(item.name);
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(item);
    }

    return unique.sort((a, b) => {
        const categorySort = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
        return categorySort || a.name.localeCompare(b.name);
    });
}

function assertStrictMenu(items) {
    const allowedCategories = new Set(CATEGORY_ORDER);
    const names = new Set();

    for (const item of items) {
        if (!allowedCategories.has(item.category)) {
            throw new Error(`Invalid category for ${item.name}: ${item.category}`);
        }
        if (names.has(normalizeText(item.name))) {
            throw new Error(`Duplicate dish: ${item.name}`);
        }
        names.add(normalizeText(item.name));
        if (!item.image || !item.image.startsWith("https://nrhtpkjiyjwypxdwthgq.supabase.co/storage/v1/object/public/")) {
            throw new Error(`Invalid Supabase image URL for ${item.name}`);
        }
        if (item.variants?.length) {
            for (const variant of item.variants) {
                if (!variant.name || !Number.isFinite(Number(variant.price))) {
                    throw new Error(`Invalid variant for ${item.name}`);
                }
            }
        } else if (!Number.isFinite(Number(item.price))) {
            throw new Error(`Invalid price for ${item.name}`);
        }
    }
}

async function resetMenu() {
    const items = buildMenu();
    assertStrictMenu(items);

    await mongoose.connect(MONGODB_URI);
    console.log(`Connected to ${MONGODB_URI}`);

    const deleted = await MenuItem.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} old menu items`);

    const inserted = await MenuItem.insertMany(items, { ordered: true });
    console.log(`Inserted ${inserted.length} updated menu items`);

    const dbCount = await MenuItem.countDocuments();
    const categories = await MenuItem.distinct("category");
    const duplicateGroups = await MenuItem.aggregate([
        { $group: { _id: { $toLower: "$name" }, count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
    ]);

    console.log("\nVerification:");
    console.log(`Total items: ${dbCount}`);
    console.log(`Duplicate dish groups: ${duplicateGroups.length}`);
    for (const category of CATEGORY_ORDER) {
        const count = await MenuItem.countDocuments({ category });
        if (count > 0) {
            console.log(`${category}: ${count}`);
        }
    }
    console.log(`Stored categories: ${categories.sort().join(", ")}`);

    if (dbCount !== inserted.length || duplicateGroups.length) {
        throw new Error("Post-insert verification failed");
    }

    await mongoose.disconnect();
}

resetMenu().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
});
