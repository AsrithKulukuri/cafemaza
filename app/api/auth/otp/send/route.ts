import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/user";
import { Msg91Error, sendMsg91Otp } from "@/lib/msg91";
import { normalizeE164 } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SendOtpPayload = {
    phone?: string;
};

const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 15;
const MIN_SECONDS_BETWEEN_SENDS = 30;

export async function POST(request: NextRequest) {
    const user = await getAuthenticatedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: SendOtpPayload = {};

    try {
        const rawBody = await request.text();
        payload = rawBody ? (JSON.parse(rawBody) as SendOtpPayload) : {};
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("pending_phone_e164, phone_e164, otp_send_count, otp_send_window_started_at, otp_locked_until, last_otp_sent_at")
        .eq("id", user.id)
        .single();

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const storedPhone = profile.pending_phone_e164 ?? profile.phone_e164;

    if (!storedPhone) {
        return NextResponse.json({ error: "No phone number found to verify. Save your profile first." }, { status: 400 });
    }

    if (payload.phone) {
        let requestedPhone: string;

        try {
            requestedPhone = normalizeE164(payload.phone);
        } catch (error) {
            return NextResponse.json(
                { error: error instanceof Error ? error.message : "Invalid phone number" },
                { status: 400 },
            );
        }

        if (requestedPhone !== storedPhone) {
            return NextResponse.json(
                { error: "Phone number changed. Save your profile again before requesting OTP." },
                { status: 409 },
            );
        }
    }

    const now = new Date();
    const lockedUntil = profile.otp_locked_until ? new Date(profile.otp_locked_until) : null;

    if (lockedUntil && lockedUntil > now) {
        const minutesRemaining = Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000));

        return NextResponse.json(
            { error: `Too many invalid OTP attempts. Try again in ${minutesRemaining} minute(s).` },
            { status: 429 },
        );
    }

    const lastSentAt = profile.last_otp_sent_at ? new Date(profile.last_otp_sent_at) : null;

    if (lastSentAt) {
        const secondsSinceLastSend = Math.floor((now.getTime() - lastSentAt.getTime()) / 1000);

        if (secondsSinceLastSend < MIN_SECONDS_BETWEEN_SENDS) {
            return NextResponse.json(
                { error: `Please wait ${MIN_SECONDS_BETWEEN_SENDS - secondsSinceLastSend}s before requesting another OTP.` },
                { status: 429 },
            );
        }
    }

    const windowStartedAt = profile.otp_send_window_started_at ? new Date(profile.otp_send_window_started_at) : null;
    const activeWindow =
        windowStartedAt && now.getTime() - windowStartedAt.getTime() < SEND_WINDOW_MINUTES * 60 * 1000;
    const sendCount = activeWindow ? profile.otp_send_count ?? 0 : 0;
    const nextWindowStartedAt = activeWindow ? windowStartedAt.toISOString() : now.toISOString();

    if (sendCount >= MAX_SENDS_PER_WINDOW) {
        const minutesRemaining = windowStartedAt
            ? Math.max(1, Math.ceil((windowStartedAt.getTime() + SEND_WINDOW_MINUTES * 60 * 1000 - now.getTime()) / 60000))
            : SEND_WINDOW_MINUTES;

        return NextResponse.json(
            { error: `OTP limit reached. Try again in ${minutesRemaining} minute(s).` },
            { status: 429 },
        );
    }

    try {
        await sendMsg91Otp(storedPhone);
    } catch (error) {
        const message = error instanceof Msg91Error ? error.message : "Failed to send OTP";
        const status = error instanceof Msg91Error && error.status >= 400 ? error.status : 502;

        return NextResponse.json({ error: message }, { status });
    }

    const { error: updateError } = await supabaseAdmin
        .from("user_profiles")
        .update({
            otp_send_count: sendCount + 1,
            otp_send_window_started_at: nextWindowStartedAt,
            last_otp_sent_at: now.toISOString(),
        })
        .eq("id", user.id);

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        phone: storedPhone,
        resendInSeconds: MIN_SECONDS_BETWEEN_SENDS,
    });
}
