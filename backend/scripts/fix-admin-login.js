import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User } from "../src/models/User.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function fixAdminLogin() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    const email = "admin.test@cafemaza.local";
    const rawPassword = "Admin@123456";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await User.findOneAndUpdate(
        { email },
        {
            $set: {
                name: "Cafe Maza Admin",
                email,
                password: hashedPassword,
                role: "admin",
            },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log("✓ Admin user saved:", {
        id: String(user._id),
        email: user.email,
        name: user.name,
        role: user.role,
    });

    const isMatch = await bcrypt.compare(rawPassword, user.password);
    console.log(`✓ Verification test for '${rawPassword}': ${isMatch ? "SUCCESS (PASSWORD VALID)" : "FAILED"}`);

    await mongoose.disconnect();
}

fixAdminLogin().catch(console.error);
