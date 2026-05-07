import mongoose from "mongoose";

const whatsAppMessageLogSchema = new mongoose.Schema(
    {
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
        recipientType: { type: String, enum: ["customer", "admin"], required: true },
        to: { type: String, required: true, trim: true },
        message: { type: String, required: true },
        status: { type: String, enum: ["sent", "failed"], required: true },
        provider: { type: String, trim: true },
        eventType: { type: String, trim: true },
        templateName: { type: String, trim: true },
        providerMessageId: { type: String, trim: true },
        providerResponse: { type: mongoose.Schema.Types.Mixed },
        error: { type: String },
        providerDeliveryStatus: {
            type: String,
            enum: ["accepted", "sent", "delivered", "read", "failed"],
            default: "accepted",
        },
        providerDeliveryError: { type: String },
        providerDeliveryPayload: { type: mongoose.Schema.Types.Mixed },
        providerDeliveryUpdatedAt: { type: Date },
    },
    { timestamps: true }
);

export const WhatsAppMessageLog = mongoose.model("WhatsAppMessageLog", whatsAppMessageLogSchema);
