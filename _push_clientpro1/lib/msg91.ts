import "server-only";

import { getRequiredServerEnv } from "@/lib/env";
import { normalizeE164 } from "@/lib/phone";

// MSG91 WhatsApp API endpoint for template-based OTP delivery
const MSG91_WHATSAPP_API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

type WhatsAppMessagePayload = {
    type?: string;
    message?: string;
    error?: string;
    request_id?: string;
};

export class Msg91Error extends Error {
    status: number;

    constructor(message: string, status = 502) {
        super(message);
        this.name = "Msg91Error";
        this.status = status;
    }
}

function getRequiredEnv(name: string): string {
    const value = process.env[name]?.trim();
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getOptionalServerEnv(name: string): string | undefined {
    const value = process.env[name]?.trim();
    return value ? value : undefined;
}

function toMsg91Mobile(phoneE164: string): string {
    // Convert E164 format (+91XXXXXXXXXX) to 91XXXXXXXXXX format
    return normalizeE164(phoneE164).replace(/^\+/, "");
}

/**
 * DEPRECATED: Use backend /api/auth/otp/send instead
 * @deprecated Backend now handles all OTP delivery via MSG91 WhatsApp API
 */
export async function sendMsg91Otp(phoneE164: string): Promise<WhatsAppMessagePayload> {
    throw new Error(
        "[DEPRECATED] sendMsg91Otp is no longer supported. Use backend POST /api/auth/otp/send instead."
    );
}

/**
 * DEPRECATED: Use backend /api/auth/otp/verify instead
 * @deprecated Backend now handles all OTP verification
 */
export async function verifyMsg91Otp(phoneE164: string, otp: string): Promise<WhatsAppMessagePayload> {
    throw new Error(
        "[DEPRECATED] verifyMsg91Otp is no longer supported. Use backend POST /api/auth/otp/verify instead."
    );
}
