import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

async function inspect() {
    await mongoose.connect(process.env.MONGODB_URI);
    const { Customer } = await import("../src/models/Customer.js");
    const { MembershipCard } = await import("../src/models/MembershipCard.js");

    const card = await MembershipCard.findOne({ cardCode: "CMM001" }).lean();
    console.log("CARD CMM001:", card);

    const customersWithCMM001 = await Customer.find({ cardCode: "CMM001" }).lean();
    console.log("Customers with cardCode CMM001:", customersWithCMM001);

    const customersWith8977 = await Customer.find({ phone: { $regex: "8977311418" } }).lean();
    console.log("Customers with phone 8977311418:", customersWith8977);

    const allCustomers = await Customer.find().lean();
    console.log("Total Customers:", allCustomers.length);

    await mongoose.disconnect();
}

inspect();
