import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "../src/models/Customer.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function cleanup() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    // Unset referralCode on any customer that doesn't have an active master card
    const staleCustomers = await Customer.find({
        $or: [
            { cardType: { $ne: "master" }, referralCode: { $exists: true, $ne: null } },
            { cardCode: "", referralCode: { $exists: true, $ne: null } },
            { referralCode: null },
        ],
    });

    console.log(`Cleaning up ${staleCustomers.length} stale customer referralCode entries...`);
    for (const c of staleCustomers) {
        await Customer.updateOne({ _id: c._id }, { $unset: { referralCode: 1 } });
    }

    // Rebuild sparse index
    try {
        await Customer.collection.dropIndex("referralCode_1");
        console.log("Dropped existing referralCode_1 index");
    } catch (e) {
        // index might not exist
    }

    await Customer.collection.createIndex({ referralCode: 1 }, { unique: true, sparse: true });
    console.log("✓ Created clean sparse unique index on referralCode");

    await mongoose.disconnect();
}

cleanup().catch(console.error);
