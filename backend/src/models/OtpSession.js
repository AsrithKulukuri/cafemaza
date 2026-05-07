import mongoose from "mongoose";

const otpSessionSchema = new mongoose.Schema(
    {
        phoneE164: { type: String, required: true, trim: true, index: true },
        intent: { type: String, enum: ["login", "signup"], required: true, index: true },
        fullName: { type: String, default: "", trim: true },
        email: { type: String, default: "", trim: true, lowercase: true },
        otpHash: { type: String, default: null },
        otpExpiresAt: { type: Date, default: null },
        otpSendCount: { type: Number, default: 0 },
        otpSendWindowStartedAt: { type: Date, default: null },
        lastOtpSentAt: { type: Date, default: null },
        otpVerifyFailCount: { type: Number, default: 0 },
        otpLockedUntil: { type: Date, default: null },
    },
    { timestamps: true }
);

otpSessionSchema.index({ phoneE164: 1, intent: 1 }, { unique: true });

export const OtpSession = mongoose.model("OtpSession", otpSessionSchema);
