import mongoose from "mongoose";

const screeningBookingSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        guests: { type: Number, required: true, min: 1, max: 4 },
        date: { type: String, required: true },
        time: { type: String, required: true },
        occasion: { type: String, required: true, trim: true },
        contentType: { type: String, enum: ["movie", "sports", "custom"], required: true },
        status: { type: String, enum: ["pending", "confirmed", "completed", "cancelled"], default: "pending" },
    },
    { timestamps: true }
);

export const ScreeningBooking = mongoose.model("ScreeningBooking", screeningBookingSchema);
