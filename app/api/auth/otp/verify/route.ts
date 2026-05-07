import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/user";
import { Msg91Error, verifyMsg91Otp } from "@/lib/msg91";
import { supabaseAdmin } from "@/lib/supabase/admin";

type VerifyOtpPayload = {
    code: string;
};

const MAX_VERIFY_FAILURES = 5;
const LOCKOUT_MINUTES = 15;

export async function POST(request: NextRequest) {
    const user = await getAuthenticatedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: VerifyOtpPayload;

    try {
        payload = (await request.json()) as VerifyOtpPayload;
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const code = payload.code?.trim();

    if (!code || !/^\d{4,8}$/.test(code)) {
        return NextResponse.json({ error: "OTP code must be 4 to 8 digits" }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("full_name, pending_phone_e164, phone_e164, otp_verify_fail_count, otp_locked_until")
        .eq("id", user.id)
        .single();

    if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const targetPhone = profile.pending_phone_e164 ?? profile.phone_e164;

    if (!targetPhone) {
        return NextResponse.json({ error: "No phone found to verify" }, { status: 400 });
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

    try {
        await verifyMsg91Otp(targetPhone, code);
    } catch (error) {
        if (error instanceof Msg91Error && error.status >= 500) {
            return NextResponse.json({ error: error.message }, { status: 502 });
        }

        const currentFailures = profile.otp_verify_fail_count ?? 0;
        const updatedFailures = currentFailures + 1;
        const shouldLock = updatedFailures >= MAX_VERIFY_FAILURES;
        const newLockUntil = shouldLock ? new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000).toISOString() : null;

        await supabaseAdmin
            .from("user_profiles")
            .update({
                otp_verify_fail_count: shouldLock ? 0 : updatedFailures,
                otp_locked_until: newLockUntil,
            })
            .eq("id", user.id);

        if (shouldLock) {
            return NextResponse.json(
                { error: `Too many invalid OTP attempts. Account locked for ${LOCKOUT_MINUTES} minutes.` },
                { status: 429 },
            );
        }

        const remainingAttempts = Math.max(0, MAX_VERIFY_FAILURES - updatedFailures);
        const message = error instanceof Msg91Error ? error.message : "OTP verification failed";

        return NextResponse.json(
            { error: `${message} ${remainingAttempts} attempt(s) remaining.` },
            { status: 400 },
        );
    }

    const fallbackFullName = (user.user_metadata.full_name ?? user.user_metadata.name ?? "").toString().trim();

    const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .upsert(
            {
                id: user.id,
                email: user.email,
                full_name: profile.full_name || fallbackFullName || "Guest",
                phone_e164: targetPhone,
                pending_phone_e164: null,
                phone_verified: true,
                last_login_phone_verified_at: now.toISOString(),
                otp_verify_fail_count: 0,
                otp_locked_until: null,
                otp_send_count: 0,
                otp_send_window_started_at: null,
                last_otp_sent_at: null,
            },
            { onConflict: "id" },
        )
        .select("id, full_name, email, phone_e164, phone_verified, last_login_phone_verified_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        profile: data,
    });
}
