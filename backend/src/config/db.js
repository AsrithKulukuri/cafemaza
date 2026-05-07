import mongoose from "mongoose";

export async function connectDatabase() {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        throw new Error("Missing MONGODB_URI in backend environment variables.");
    }

    await mongoose.connect(uri);
}
