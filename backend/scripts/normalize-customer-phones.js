import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "../src/models/Customer.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function normalizeAllCustomerPhones() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const customers = await Customer.find({});
    for (const c of customers) {
        const raw = String(c.phone || "").replace(/\D/g, "");
        if (raw.length >= 10) {
            const last10 = raw.slice(-10);
            const standard = `+91${last10}`;
            if (c.phone !== standard) {
                console.log(`Updating customer ${c.name}: ${c.phone} -> ${standard}`);
                c.phone = standard;
                await c.save();
            }
        }
    }
    console.log("✓ All customer phone numbers normalized.");
    await mongoose.disconnect();
}

normalizeAllCustomerPhones().catch(console.error);
