import mongoose from "mongoose";

const notificationSettingSchema = new mongoose.Schema(
    {
        key: { type: String, required: true, unique: true, trim: true },
        value: { type: String, default: "" },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

export const NotificationSetting = mongoose.model("NotificationSetting", notificationSettingSchema);
