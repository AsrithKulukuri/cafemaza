import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";

const mongoUri = process.env.MONGODB_URI;
const adminName = String(process.env.ADMIN_NAME || "Cafe Maza Admin").trim();
const adminEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const adminPassword = String(process.env.ADMIN_PASSWORD || "");
const adminPhone = String(process.env.ADMIN_PHONE || "").trim();

if (!mongoUri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
}

if (!adminEmail || !adminPassword) {
    console.error("Missing ADMIN_EMAIL or ADMIN_PASSWORD");
    process.exit(1);
}

if (adminPassword.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
}

async function ensureAdmin() {
    await mongoose.connect(mongoUri);

    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const update = {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
    };

    if (adminPhone) {
        update.phone = adminPhone;
    }

    const user = await User.findOneAndUpdate(
        { email: adminEmail },
        { $set: update },
        { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    console.log("Admin user ready", {
        id: String(user._id),
        email: user.email,
        role: user.role,
    });
}

ensureAdmin()
    .then(async () => {
        await mongoose.disconnect();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error("Failed to ensure admin user", { message: error?.message });
        try {
            await mongoose.disconnect();
        } catch {
            // ignore disconnect error
        }
        process.exit(1);
    });
