import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        phone: { type: String, trim: true },
        savedAddress: { type: String, trim: true },
        savedLocation: {
            latitude: { type: Number, min: -90, max: 90 },
            longitude: { type: Number, min: -180, max: 180 },
            updatedAt: { type: Date },
        },
        password: { type: String, required: true },
        role: {
            type: String,
            enum: ["customer", "staff", "bearer", "kitchen", "manager", "delivery", "admin"],
            default: "customer",
            required: true,
        },
        deliveryProfile: {
            vehicleNumber: { type: String, trim: true },
            licenseNumber: { type: String, trim: true },
            isActive: { type: Boolean, default: true },
        },
    },
    { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
