import "dotenv/config";
import mongoose from "mongoose";
import { Coupon } from "../src/models/Coupon.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function fixCoupon() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    await Coupon.updateOne(
        { code: "SAVE50" },
        {
            $set: {
                value: 50,
                maxDiscount: 200,
                type: "percent",
            }
        }
    );
    console.log("✓ Updated SAVE50 to 50% off (max ₹200)");

    await mongoose.disconnect();
}

fixCoupon().catch(console.error);
