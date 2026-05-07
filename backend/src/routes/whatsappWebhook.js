import express from "express";

import { WhatsAppMessageLog } from "../models/WhatsAppMessageLog.js";

const router = express.Router();

// Meta webhook verification endpoint.
router.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    const expectedToken = String(process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "").trim();

    if (mode === "subscribe" && expectedToken && token === expectedToken) {
        return res.status(200).send(challenge);
    }

    return res.status(403).json({ message: "Webhook verification failed" });
});

function extractDeliveryError(statusItem) {
    if (!statusItem || !Array.isArray(statusItem.errors) || statusItem.errors.length === 0) {
        return null;
    }

    const firstError = statusItem.errors[0];
    const code = firstError?.code ? `code:${firstError.code}` : null;
    const title = firstError?.title || firstError?.message || null;

    return [code, title].filter(Boolean).join(" ") || "Unknown delivery error";
}

async function applyStatusUpdate(statusItem) {
    const providerMessageId = String(statusItem?.id || "").trim();
    if (!providerMessageId) {
        return;
    }

    const rawStatus = String(statusItem?.status || "").trim().toLowerCase();
    const mappedStatus = ["sent", "delivered", "read", "failed"].includes(rawStatus) ? rawStatus : "accepted";
    const deliveryError = extractDeliveryError(statusItem);

    const update = {
        providerDeliveryStatus: mappedStatus,
        providerDeliveryUpdatedAt: new Date(),
        providerDeliveryPayload: statusItem,
    };

    if (deliveryError) {
        update.providerDeliveryError = deliveryError;
        update.error = deliveryError;
        if (mappedStatus === "failed") {
            update.status = "failed";
        }
    }

    await WhatsAppMessageLog.findOneAndUpdate(
        { providerMessageId },
        { $set: update },
        { sort: { createdAt: -1 } },
    );
}

router.post("/webhook", async (req, res) => {
    try {
        const entries = Array.isArray(req.body?.entry) ? req.body.entry : [];

        for (const entry of entries) {
            const changes = Array.isArray(entry?.changes) ? entry.changes : [];

            for (const change of changes) {
                const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];

                for (const statusItem of statuses) {
                    await applyStatusUpdate(statusItem);
                }
            }
        }

        return res.status(200).json({ received: true });
    } catch (error) {
        console.error("WhatsApp webhook processing failed", error);
        return res.status(200).json({ received: true });
    }
});

export default router;
