import "dotenv/config";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function verifyDb() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("\n=================================");
    console.log("📊 Active MongoDB Collections:");
    console.log("=================================");
    for (const c of collections) {
        const count = await mongoose.connection.db.collection(c.name).countDocuments();
        console.log(` • ${c.name.padEnd(24)} : ${count} documents`);
    }
    console.log("=================================\n");

    await mongoose.disconnect();
}

verifyDb().catch(console.error);
