import "dotenv/config";
import mongoose from "mongoose";
import { User } from "../src/models/User.js";
import { Customer } from "../src/models/Customer.js";
import { MembershipCard } from "../src/models/MembershipCard.js";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cafe_maza";

async function inspectUser() {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB:", mongoUri);

    console.log("\n--- Users matching 8977311418 or 9032674228 ---");
    const users = await User.find({
        $or: [
            { phone: /8977311418/ },
            { phone: /9032674228/ },
            { email: /8977311418/ },
            { email: /9032674228/ },
        ]
    });
    console.log(users.map(u => ({ id: u._id, name: u.name, phone: u.phone, email: u.email, role: u.role })));

    console.log("\n--- Customers matching 8977311418 or 9032674228 ---");
    const customers = await Customer.find({
        $or: [
            { phone: /8977311418/ },
            { phone: /9032674228/ },
        ]
    });
    console.log(customers.map(c => ({
        id: c._id,
        name: c.name,
        phone: c.phone,
        cardCode: c.cardCode,
        cardType: c.cardType,
        pointsBalance: c.pointsBalance,
        referralCode: c.referralCode,
    })));

    console.log("\n--- All Assigned Cards ---");
    const assignedCards = await MembershipCard.find({ status: { $ne: "unassigned" } });
    console.log(assignedCards.map(c => ({
        cardCode: c.cardCode,
        cardType: c.cardType,
        status: c.status,
        assignedToCustomer: c.assignedToCustomer,
    })));

    await mongoose.disconnect();
}

inspectUser().catch(console.error);
