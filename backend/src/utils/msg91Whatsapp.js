import { WhatsAppMessageLog } from "../models/WhatsAppMessageLog.js";
import { logger, maskPhone } from "./logger.js";

const MSG91_WHATSAPP_API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
const MSG91_WHATSAPP_TEXT_API_URL = "https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";
const MSG91_PROVIDER_NAME = "msg91";
const MSG91_EVENT_DEDUPE_MINUTES = Math.max(1, Number(process.env.MSG91_EVENT_DEDUPE_MINUTES || 180));
const MSG91_ORDER_DELIVERED_DEDUPE_MINUTES = Math.max(
    1,
    Number(process.env.MSG91_ORDER_DELIVERED_DEDUPE_MINUTES || 1440)
);

export const ORDER_LIFECYCLE_TEMPLATE_ENV = {
    order_placed: "MSG91_ORDER_PLACED_TEMPLATE",
    order_accepted: "MSG91_ORDER_ACCEPTED_TEMPLATE",
    delivery_assigned: "MSG91_DELIVERY_ASSIGNED_TEMPLATE",
    out_for_delivery: "MSG91_OUT_FOR_DELIVERY_TEMPLATE",
    order_delivered: "MSG91_ORDER_DELIVERED_TEMPLATE",
    order_received_admin: "MSG91_ORDER_RECEIVED_TEMPLATE",
};

const ORDER_LIFECYCLE_PARAMETER_NAMES = {
    order_placed: ["customer_name", "order_id", "amount"],
    order_accepted: ["customer_name", "order_id"],
    delivery_assigned: ["customer_name", "order_id", "delivery_name"],
    out_for_delivery: ["customer_name", "order_id"],
    order_delivered: ["customer_name", "order_id"],
    order_received_admin: ["order_id", "customer_name", "customer_email", "amount", "payment_method", "address", "items"],
};

function normalizeMsg91Phone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (/^91\d{10}$/.test(digits)) {
        return digits;
    }

    if (/^[6-9]\d{9}$/.test(digits)) {
        return `91${digits}`;
    }

    if (/^0\d{10}$/.test(digits)) {
        return `91${digits.slice(1)}`;
    }

    throw new Error("Phone number must be sent as 91XXXXXXXXXX for MSG91 WhatsApp templates.");
}

function getMsg91ErrorMessage(payload, fallback) {
    if (payload && typeof payload === "object") {
        const record = payload;

        if (typeof record.message === "string" && record.message.trim()) {
            return record.message;
        }

        if (typeof record.error === "string" && record.error.trim()) {
            return record.error;
        }

        if (typeof record.errors === "string" && record.errors.trim()) {
            return record.errors;
        }

        if (Array.isArray(record.errors) && record.errors.length > 0) {
            const firstError = record.errors[0];
            if (typeof firstError === "string" && firstError.trim()) {
                return firstError;
            }
        }
    }

    return fallback;
}

function getTemplateName(eventType) {
    const envKey = ORDER_LIFECYCLE_TEMPLATE_ENV[eventType];

    if (!envKey) {
        return "";
    }

    // Backward-safe handling: delivered template was intentionally renamed to `order_deliveredd`.
    if (eventType === "order_delivered") {
        const explicitDoubleD = String(process.env.MSG91_ORDER_DELIVEREDD_TEMPLATE || "").trim();
        const legacyValue = String(process.env[envKey] || "").trim();
        const resolved = explicitDoubleD || legacyValue;

        if (resolved === "order_delivered") {
            return "order_deliveredd";
        }

        return resolved;
    }

    return String(process.env[envKey] || "").trim();
}

function getTemplateLanguage() {
    return String(process.env.MSG91_ORDER_LANGUAGE || process.env.MSG91_OTP_LANGUAGE || "en").trim();
}

function normalizeWhatsappPhone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (/^91\d{10}$/.test(digits)) {
        return digits;
    }

    if (/^[6-9]\d{9}$/.test(digits)) {
        return `91${digits}`;
    }

    if (/^0\d{10}$/.test(digits)) {
        return `91${digits.slice(1)}`;
    }

    throw new Error("Phone number must be sent as 91XXXXXXXXXX for MSG91 WhatsApp messages.");
}

function formatCurrency(amount) {
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount)) {
        return "N/A";
    }

    return `Rs ${numericAmount.toFixed(2)}`;
}

function buildBodyParameters({ eventType, order, deliveryPartnerName }) {
    const customerName = String(order?.userId?.name || order?.customerName || "Customer").trim() || "Customer";
    const orderId = String(order?._id || order?.orderId || "").trim();
    const totalAmount = formatCurrency(order?.totalAmount);
    const customerEmail = String(order?.userId?.email || order?.customerEmail || "N/A").trim() || "N/A";
    const paymentMethod = String(order?.paymentMethod || "N/A").trim() || "N/A";
    const address = String(order?.address || "N/A").trim() || "N/A";
    const items = String(order?.itemSummary || order?.itemsSummary || "N/A").trim() || "N/A";

    switch (eventType) {
        case "order_placed":
            return [customerName, orderId, totalAmount];
        case "order_accepted":
            return [customerName, orderId];
        case "delivery_assigned":
            return [customerName, orderId, deliveryPartnerName || "Assigned delivery partner"];
        case "out_for_delivery":
            return [customerName, orderId];
        case "order_delivered":
            return [customerName, orderId];
        case "order_received_admin":
            return [orderId, customerName, customerEmail, totalAmount, paymentMethod, address, items];
        default:
            return [];
    }
}

function buildOrderedParameters(eventType, textValues) {
    const names = ORDER_LIFECYCLE_PARAMETER_NAMES[eventType] || [];

    return textValues.map((text, index) => ({
        type: "text",
        parameter_name: names[index] || `param_${index + 1}`,
        text: String(text ?? ""),
    }));
}

function buildMessageSummary({ eventType, order, deliveryPartnerName }) {
    const orderId = String(order?._id || order?.orderId || "").trim();
    const totalAmount = formatCurrency(order?.totalAmount);
    const status = String(order?.status || eventType || "update").trim();
    const customerName = String(order?.userId?.name || order?.customerName || "Customer").trim() || "Customer";

    switch (eventType) {
        case "order_placed":
            return `Order placed for ${customerName} (${orderId}) at ${totalAmount}`;
        case "order_accepted":
            return `Order accepted for ${customerName} (${orderId})`;
        case "delivery_assigned":
            return `Delivery assigned for ${customerName} (${orderId})${deliveryPartnerName ? ` to ${deliveryPartnerName}` : ""}`;
        case "out_for_delivery":
            return `Order out for delivery for ${customerName} (${orderId})`;
        case "order_delivered":
            return `Order delivered for ${customerName} (${orderId})`;
        default:
            return `Order notification (${status}) for ${customerName} (${orderId})`;
    }
}

function getOrderNotificationSkipReason(order) {
    const createdByRole = String(order?.createdByRole || "").trim().toLowerCase();
    const orderType = String(order?.orderType || "").trim().toLowerCase();
    const tableNumber = Number(order?.tableNumber);

    if (createdByRole === "bearer") {
        return "bearer_created_order";
    }

    if (orderType === "dine_in") {
        return "dine_in_order";
    }

    if (Number.isFinite(tableNumber) && tableNumber > 0) {
        return "table_order";
    }

    return "";
}

async function createMessageLog({
    orderId,
    recipientType,
    to,
    message,
    status,
    provider,
    eventType,
    templateName,
    providerMessageId,
    providerResponse,
    error,
    providerDeliveryStatus,
    providerDeliveryError,
    providerDeliveryPayload,
}) {
    try {
        return await WhatsAppMessageLog.create({
            orderId,
            recipientType,
            to,
            message,
            status,
            provider,
            eventType,
            templateName,
            providerMessageId,
            providerResponse,
            error,
            providerDeliveryStatus,
            providerDeliveryError,
            providerDeliveryPayload,
        });
    } catch (logError) {
        logger.error("[MSG91 WhatsApp] Failed to persist message log", { message: logError?.message });
        return null;
    }
}

async function hasRecentSuccessfulEvent({ orderId, recipientType, eventType }) {
    try {
        const dedupeWindowMinutes = eventType === "order_delivered"
            ? MSG91_ORDER_DELIVERED_DEDUPE_MINUTES
            : MSG91_EVENT_DEDUPE_MINUTES;
        const threshold = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000);
        const existing = await WhatsAppMessageLog.findOne({
            orderId,
            recipientType,
            eventType,
            status: { $ne: "failed" },
            providerDeliveryStatus: { $in: ["accepted", "sent", "delivered", "read"] },
            createdAt: { $gte: threshold },
        })
            .sort({ createdAt: -1 })
            .lean();

        return {
            exists: Boolean(existing),
            dedupeWindowMinutes,
            lastEventStatus: existing?.providerDeliveryStatus || null,
        };
    } catch (error) {
        logger.error("[MSG91 WhatsApp] Failed duplicate-check query", { message: error?.message });
        return {
            exists: false,
            dedupeWindowMinutes: eventType === "order_delivered"
                ? MSG91_ORDER_DELIVERED_DEDUPE_MINUTES
                : MSG91_EVENT_DEDUPE_MINUTES,
            lastEventStatus: null,
        };
    }
}

async function sendMsg91TemplateMessage({
    orderId,
    recipientType,
    to,
    eventType,
    order,
    deliveryPartnerName,
}) {
    const authKey = String(process.env.MSG91_AUTH_KEY || "").trim();
    const integratedNumber = String(process.env.MSG91_INTEGRATED_NUMBER || "").trim();
    let templateName = getTemplateName(eventType);

    // Hard guarantee for delivered event naming expected by MSG91 account setup.
    if (eventType === "order_delivered" && (!templateName || templateName === "order_delivered")) {
        templateName = "order_deliveredd";
    }

    const skipReason = getOrderNotificationSkipReason(order);
    if (skipReason) {
        logger.info(`[MSG91 WhatsApp] Skipping ${eventType} notification`, {
            orderId: String(orderId),
            recipientType,
            reason: skipReason,
        });

        return {
            ok: true,
            skipped: true,
            reason: skipReason,
            eventType,
            to: null,
        };
    }

    const language = getTemplateLanguage();
    const normalizedTo = normalizeMsg91Phone(to);
    const message = buildMessageSummary({ eventType, order, deliveryPartnerName });

    const dedupeInfo = await hasRecentSuccessfulEvent({
        orderId,
        recipientType,
        eventType,
    });

    if (dedupeInfo.exists) {
        logger.info(`[MSG91 WhatsApp] Skipping duplicate ${eventType} notification`, {
            orderId: String(orderId),
            recipientType,
            to: maskPhone(normalizedTo),
            dedupeWindowMinutes: dedupeInfo.dedupeWindowMinutes,
            lastEventStatus: dedupeInfo.lastEventStatus,
        });

        return {
            ok: true,
            skipped: true,
            reason: "duplicate_event_suppressed",
            eventType,
            to: normalizedTo,
        };
    }

    logger.debug(`[MSG91 WhatsApp] Preparing ${eventType} notification`, {
        orderId: String(orderId),
        recipientType,
        to: maskPhone(normalizedTo),
        templateName,
        language,
    });

    if (!authKey || !integratedNumber || !templateName) {
        const errorMessage = !authKey
            ? "Missing MSG91_AUTH_KEY in backend environment."
            : !integratedNumber
                ? "Missing MSG91_INTEGRATED_NUMBER in backend environment."
                : `Missing MSG91 template name for event ${eventType}.`;

        logger.error(`[MSG91 WhatsApp] Configuration error for ${eventType}`, { error: errorMessage });

        await createMessageLog({
            orderId,
            recipientType,
            to: normalizedTo,
            message,
            status: "failed",
            provider: MSG91_PROVIDER_NAME,
            eventType,
            templateName,
            error: errorMessage,
            providerDeliveryStatus: "failed",
            providerDeliveryError: errorMessage,
        });

        return { ok: false, reason: "missing_config", error: errorMessage, eventType, templateName, to: normalizedTo };
    }

    const bodyParameters = buildBodyParameters({ eventType, order, deliveryPartnerName });
    const payload = {
        integrated_number: integratedNumber,
        messaging_product: "whatsapp",
        content_type: "template",
        payload: {
            messaging_product: "whatsapp",
            type: "template",
            to: normalizedTo,
            template: {
                name: templateName,
                language: {
                    code: language,
                },
                components: [
                    {
                        type: "body",
                        parameters: buildOrderedParameters(eventType, bodyParameters),
                    },
                ],
            },
        },
        to: normalizedTo,
    };

    logger.debug(`[MSG91 WhatsApp] Sending ${eventType} request`, {
        eventType,
        orderId: String(orderId),
        templateName,
        to: maskPhone(normalizedTo),
    });

    try {
        const response = await fetch(MSG91_WHATSAPP_API_URL, {
            method: "POST",
            headers: {
                authkey: authKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        let responseBody = null;

        if (rawBody) {
            try {
                responseBody = JSON.parse(rawBody);
            } catch {
                responseBody = { message: rawBody };
            }
        }

        logger.debug(`[MSG91 WhatsApp] Response (${eventType})`, {
            status: response.status,
            ok: response.ok,
        });

        if (!response.ok) {
            const errorMessage = getMsg91ErrorMessage(
                responseBody,
                `MSG91 WhatsApp API failed with status ${response.status}`
            );

            const apiErrorCode =
                responseBody && typeof responseBody === "object"
                    ? responseBody.apiError || responseBody.api_error || responseBody.code
                    : undefined;

            const detailedErrorMessage =
                response.status === 401
                    ? `MSG91 unauthorized for WhatsApp API (status 401, apiError: ${String(apiErrorCode ?? "unknown")}). Check MSG91 channel access, integrated number, template approval, and API key permissions.`
                    : errorMessage;

            logger.error(`[MSG91 WhatsApp] Error response (${eventType})`, {
                status: response.status,
                to: maskPhone(normalizedTo),
                apiErrorCode,
            });

            await createMessageLog({
                orderId,
                recipientType,
                to: normalizedTo,
                message,
                status: "failed",
                provider: MSG91_PROVIDER_NAME,
                eventType,
                templateName,
                providerResponse: responseBody ?? rawBody,
                error: detailedErrorMessage,
                providerDeliveryStatus: "failed",
                providerDeliveryError: detailedErrorMessage,
                providerDeliveryPayload: payload,
            });

            return {
                ok: false,
                reason: detailedErrorMessage,
                eventType,
                templateName,
                to: normalizedTo,
                providerResponse: responseBody,
            };
        }

        const providerMessageId = responseBody && typeof responseBody === "object"
            ? responseBody.request_id || responseBody.requestId || responseBody.message_uuid || responseBody.message_uuid || responseBody.data?.message_uuid || responseBody.data?.messageId || responseBody.message_id || responseBody.messageId
            : undefined;

        await createMessageLog({
            orderId,
            recipientType,
            to: normalizedTo,
            message,
            status: "sent",
            provider: MSG91_PROVIDER_NAME,
            eventType,
            templateName,
            providerMessageId: providerMessageId ? String(providerMessageId) : undefined,
            providerResponse: responseBody ?? rawBody,
            providerDeliveryStatus: "accepted",
            providerDeliveryPayload: payload,
        });

        logger.info(`[MSG91 WhatsApp] Success (${eventType})`, {
            orderId: String(orderId),
            recipientType,
            to: maskPhone(normalizedTo),
            templateName,
            providerMessageId,
        });

        return {
            ok: true,
            eventType,
            templateName,
            to: normalizedTo,
            providerMessageId: providerMessageId ? String(providerMessageId) : undefined,
            providerResponse: responseBody,
        };
    } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unexpected MSG91 WhatsApp send error";

        logger.error(`[MSG91 WhatsApp] Exception (${eventType})`, {
            error: messageText,
            to: maskPhone(normalizedTo),
        });

        await createMessageLog({
            orderId,
            recipientType,
            to: normalizedTo,
            message,
            status: "failed",
            provider: MSG91_PROVIDER_NAME,
            eventType,
            templateName,
            error: messageText,
            providerDeliveryStatus: "failed",
            providerDeliveryError: messageText,
            providerDeliveryPayload: payload,
        });

        return { ok: false, reason: messageText, eventType, templateName, to: normalizedTo };
    }
}

export function sendMsg91OrderPlacedNotification({ orderId, recipientType = "customer", to, order }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "order_placed",
        order,
    });
}

export function sendMsg91OrderAcceptedNotification({ orderId, recipientType = "customer", to, order }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "order_accepted",
        order,
    });
}

export function sendMsg91DeliveryAssignedNotification({ orderId, recipientType = "customer", to, order, deliveryPartnerName }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "delivery_assigned",
        order,
        deliveryPartnerName,
    });
}

export function sendMsg91OutForDeliveryNotification({ orderId, recipientType = "customer", to, order, deliveryPartnerName }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "out_for_delivery",
        order,
        deliveryPartnerName,
    });
}

export function sendMsg91OrderDeliveredNotification({ orderId, recipientType = "customer", to, order }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "order_delivered",
        order,
    });
}

export function sendMsg91OrderReceivedNotification({ orderId, recipientType = "admin", to, order }) {
    return sendMsg91TemplateMessage({
        orderId,
        recipientType,
        to,
        eventType: "order_received_admin",
        order,
    });
}

export async function sendMsg91WhatsAppTextMessage({ to, text }) {
    const authKey = String(process.env.MSG91_AUTH_KEY || "").trim();
    const integratedNumber = String(process.env.MSG91_INTEGRATED_NUMBER || "").trim();

    if (!authKey || !integratedNumber) {
        return { ok: false, reason: "missing_config" };
    }

    const recipientNumber = normalizeWhatsappPhone(to);
    const endpoint = new URL(MSG91_WHATSAPP_TEXT_API_URL);
    endpoint.searchParams.set("integrated_number", integratedNumber);
    endpoint.searchParams.set("recipient_number", recipientNumber);
    endpoint.searchParams.set("content_type", "text");
    endpoint.searchParams.set("text", String(text || "").trim());

    const response = await fetch(endpoint.toString(), {
        method: "POST",
        headers: {
            authkey: authKey,
            "Content-Type": "application/json",
            accept: "application/json",
        },
        body: null,
    });

    const rawBody = await response.text();
    let responseBody = null;

    if (rawBody) {
        try {
            responseBody = JSON.parse(rawBody);
        } catch {
            responseBody = { message: rawBody };
        }
    }

    if (!response.ok) {
        const errorMessage = getMsg91ErrorMessage(responseBody, `MSG91 WhatsApp text API failed with status ${response.status}`);
        logger.error("[MSG91 WhatsApp] Text message send failed", { status: response.status, to: maskPhone(recipientNumber) });
        return { ok: false, reason: errorMessage, providerResponse: responseBody };
    }

    return { ok: true, to: recipientNumber, providerResponse: responseBody };
}