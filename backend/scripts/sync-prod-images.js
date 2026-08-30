import "dotenv/config";
import mongoose from "mongoose";
import { MenuItem } from "../src/models/MenuItem.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

function getLocalDishImage(name, category) {
    const n = (name || "").toLowerCase();
    const c = (category || "").toLowerCase();

    // Biryanis
    if (n.includes("mutton") && n.includes("biryani")) return "/images/mutton-biryani.jpg";
    if ((n.includes("veg") || n.includes("paneer")) && n.includes("biryani")) return "/images/veg-biryani.jpg";
    if (n.includes("biryani")) return "/images/chicken-dum-biryani.jpg";

    // Starters / Tandoori
    if (n.includes("lamb") || n.includes("boti") || n.includes("chop")) return "/images/lamb-chops.jpg";
    if (n.includes("fish") || n.includes("prawn")) return "/images/fish-tikka.jpg";
    if (n.includes("paneer tikka")) return "/images/paneer-tikka.jpg";
    if (n.includes("tikka") || n.includes("kabab") || n.includes("kebab") || n.includes("tangdi") || n.includes("tandoori")) return "/images/chicken-tikka.jpg";
    if (n.includes("platter") || n.includes("bbq")) return "/images/starter.jpg";

    // Chinese Starters
    if (n.includes("65")) return "/images/hyderabadi-65.jpg";
    if (n.includes("majestic")) return "/images/chicken-majestic.jpg";
    if (n.includes("manchurian")) return "/images/chicken-manchurian.jpg";
    if (n.includes("chilli") || n.includes("lollypop") || n.includes("thaipai") || n.includes("pepper chicken")) return "/images/chilli-chicken.jpg";

    // Main Courses
    if (n.includes("butter chicken") || n.includes("tikka masala") || n.includes("chettinad") || n.includes("afghani chicken") || n.includes("kodi kura") || n.includes("musallam")) return "/images/butter-chicken.jpg";
    if (n.includes("kadai chicken")) return "/images/kadai-chicken.jpg";
    if (n.includes("kadai paneer")) return "/images/kadai-paneer.jpg";
    if (n.includes("paneer")) return "/images/paneer-butter-masala.jpg";
    if (n.includes("mutton") || n.includes("gosht") || n.includes("raan") || n.includes("rogan") || n.includes("rara")) return "/images/mutton-rogan-josh.jpg";
    if (n.includes("veg korma") || n.includes("mix veg") || n.includes("kadai veg") || n.includes("methi")) return "/images/veg-korma.jpg";
    if (n.includes("mushroom")) return "/images/soup.jpg";

    // Breads
    if (n.includes("roti") || n.includes("naan") || n.includes("kulcha") || n.includes("paratha") || c.includes("bread")) return "/images/roti.jpg";

    // Rice & Noodles
    if (n.includes("noodle") || n.includes("fried rice") || n.includes("chopsy") || n.includes("pulao") || n.includes("rice")) return "/images/chilli-chicken.jpg";

    // Soups
    if (n.includes("soup") || n.includes("shorba") || c.includes("soup")) return "/images/soup.jpg";

    // Desserts
    if (n.includes("jamun")) return "/images/gulab-jamun.jpg";
    if (n.includes("meetha") || n.includes("meeta") || c.includes("desert") || c.includes("sweet")) return "/images/dessert.jpg";

    // Beverages
    if (n.includes("mojito")) return "/images/virgin-mojito.jpg";
    if (n.includes("soda") || n.includes("lime")) return "/images/fresh-lime-soda.jpg";
    if (c.includes("beverage") || c.includes("mocktail") || n.includes("delight") || n.includes("moon") || n.includes("pop") || n.includes("bliss") || n.includes("lassi") || n.includes("milk")) return "/images/mocktail.jpg";

    if (c.includes("chinese")) return "/images/chilli-chicken.jpg";
    if (c.includes("tandoori")) return "/images/chicken-tikka.jpg";
    if (c.includes("main course")) return "/images/butter-chicken.jpg";

    return "/images/starter.jpg";
}

async function syncLocalImages() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const items = await MenuItem.find({});
    console.log(`Updating ${items.length} items with exact production images...`);

    let count = 0;
    for (const item of items) {
        const imagePath = getLocalDishImage(item.name, item.category);
        await MenuItem.findByIdAndUpdate(item._id, {
            image: imagePath
        });
        count++;
    }

    console.log(`✓ Successfully updated ${count} dishes to production images in MongoDB!`);
    await mongoose.disconnect();
}

syncLocalImages().catch(console.error);
