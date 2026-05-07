const MSG91_WHATSAPP_API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

export type Msg91WhatsAppResponse = {
    request_id?: string;
    requestId?: string;
    message?: string;
    error?: string;
    [key: string]: unknown;
};

export class Msg91WhatsappError extends Error {
    status: number;
    body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = "Msg91WhatsappError";
        this.status = status;
        this.body = body;
    }
}

export function normalizeMsg91Phone(rawPhone: string): string {
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

    throw new Error("Phone number must be sent as 91XXXXXXXXXX for MSG91 WhatsApp OTP.");
}

function getMsg91ErrorMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;

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

export async function sendMsg91WhatsAppOtp(phoneE164: string, otpCode: string): Promise<Msg91WhatsAppResponse> {
    const authKey = String(process.env.MSG91_AUTH_KEY || "").trim();
    const templateName = String(process.env.MSG91_TEMPLATE_NAME || "cafe_maza_otp").trim();
    const integratedNumber = String(process.env.MSG91_INTEGRATED_NUMBER || "15559363844").trim();
    const language = String(process.env.MSG91_OTP_LANGUAGE || "en").trim();
    const buttonUrlParam = String(process.env.MSG91_OTP_BUTTON_URL_PARAM || otpCode).trim();

    if (!authKey) {
        throw new Error("Missing MSG91_AUTH_KEY in backend environment.");
    }

    if (!templateName) {
        throw new Error("Missing MSG91_TEMPLATE_NAME in backend environment.");
    }

    if (!integratedNumber) {
        throw new Error("Missing MSG91_INTEGRATED_NUMBER in backend environment.");
    }

    const to = normalizeMsg91Phone(phoneE164);
    const payload = {
        integrated_number: integratedNumber,
        messaging_product: "whatsapp",
        content_type: "template",
        payload: {
            messaging_product: "whatsapp",
            type: "template",
            to,
            template: {
                name: templateName,
                language: {
                    code: language,
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otpCode,
                            },
                        ],
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: buttonUrlParam,
                            },
                        ],
                    },
                ],
            },
        },
        to,
    };

    console.log("[MSG91 WhatsApp OTP] Preparing request", {
        endpoint: MSG91_WHATSAPP_API_URL,
        phoneE164,
        to,
        templateName,
        integratedNumber,
        language,
        timestamp: new Date().toISOString(),
    });

    console.log("[MSG91 WhatsApp OTP] Request payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(MSG91_WHATSAPP_API_URL, {
        method: "POST",
        headers: {
            authkey: authKey,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const rawBody = await response.text();
    let responseBody: Msg91WhatsAppResponse | { message: string } | null = null;

    if (rawBody) {
        try {
            responseBody = JSON.parse(rawBody) as Msg91WhatsAppResponse;
        } catch {
            responseBody = { message: rawBody };
        }
    }

    console.log("[MSG91 WhatsApp OTP] Response received", {
        status: response.status,
        ok: response.ok,
        body: responseBody,
        rawBody,
        timestamp: new Date().toISOString(),
    });

    if (!response.ok) {
        const errorMessage = getMsg91ErrorMessage(
            responseBody,
            `MSG91 WhatsApp API failed with status ${response.status}`
        );

        const apiErrorCode =
            responseBody && typeof responseBody === "object"
                ? (responseBody as Record<string, unknown>).apiError ||
                (responseBody as Record<string, unknown>).api_error ||
                (responseBody as Record<string, unknown>).code
                : undefined;

        const detailedErrorMessage =
            response.status === 401
                ? `MSG91 unauthorized for WhatsApp API (status 401, apiError: ${String(apiErrorCode ?? "unknown")}). Check MSG91 WhatsApp channel access, integrated number, template approval, and API key permissions.`
                : errorMessage;

        console.error("[MSG91 WhatsApp OTP] Error response", {
            status: response.status,
            body: responseBody,
            rawBody,
            phoneE164,
            apiErrorCode,
        });

        throw new Msg91WhatsappError(detailedErrorMessage, response.status, responseBody ?? rawBody);
    }

    console.log("[MSG91 WhatsApp OTP] Request successful", {
        phoneE164,
        to,
        status: response.status,
        requestId: responseBody?.request_id || responseBody?.requestId,
        message: responseBody?.message,
    });

    return responseBody ?? {};
}
