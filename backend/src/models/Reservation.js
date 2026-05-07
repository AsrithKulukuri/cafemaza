import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
        guests: { type: Number, required: true, min: 1 },
        date: { type: String, required: true },
        time: { type: String, required: true },
        tableNumber: { type: Number, required: true, min: 1 },
        durationMinutes: { type: Number, min: 15, default: 90 },
        reservedUntil: { type: Date },
        specialRequest: { type: String, trim: true },
        status: {
            type: String,
            enum: ["confirmed", "completed", "cancelled"],
            default: "confirmed",
        },
    },
    { timestamps: true }
);

export const Reservation = mongoose.model("Reservation", reservationSchema);
