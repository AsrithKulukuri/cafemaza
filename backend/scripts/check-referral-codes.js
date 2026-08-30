import "dotenv/config";
import mongoose from "mongoose";
import { Customer } from "../src/models/Customer.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function inspect() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const customersWithRef = await Customer.find({ referralCode: { $exists: true, $ne: null } });
    console.log("Customers with non-null referralCode:", customersWithRef.map(c => ({
        id: String(c._id),
        name: c.name,
        phone: c.phone,
        cardCode: c.cardCode,
        referralCode: c.referralCode
    })));

    await mongoose.disconnect();
}

inspect().catch(console.error);
