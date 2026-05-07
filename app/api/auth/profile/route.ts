import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/user";
import { normalizeE164 } from "@/lib/phone";
import { supabaseAdmin } from "@/lib/supabase/admin";

type AuthIntent = "signup" | "login";

type UpsertProfilePayload = {
    fullName?: string;
    phone: string;
    intent: AuthIntent;
};

export async function GET() {
    const user = await getAuthenticatedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .select("id, full_name, email, phone_e164, pending_phone_e164, phone_verified, last_login_phone_verified_at")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        profile: data,
        user: {
            id: user.id,
            email: user.email,
            fullName: user.user_metadata.full_name ?? user.user_metadata.name ?? null,
        },
    });
}

export async function POST(request: NextRequest) {
    const user = await getAuthenticatedUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let payload: UpsertProfilePayload;

    try {
        payload = (await request.json()) as UpsertProfilePayload;
    } catch {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    if (!payload.intent || !["signup", "login"].includes(payload.intent)) {
        return NextResponse.json({ error: "Invalid auth intent" }, { status: 400 });
    }

    if (!payload.phone) {
        return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const fullNameFromGoogle = (user.user_metadata.full_name ?? user.user_metadata.name ?? "").toString().trim();
    const requestedFullName = (payload.fullName ?? "").trim();
    const fullName = requestedFullName || fullNameFromGoogle;

    if (!fullName) {
        return NextResponse.json({ error: "Full name is required" }, { status: 400 });
    }

    let normalizedPhone: string;

    try {
        normalizedPhone = normalizeE164(payload.phone);
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Invalid phone number" },
            { status: 400 },
        );
    }

    const { data, error } = await supabaseAdmin
        .from("user_profiles")
        .upsert(
            {
                id: user.id,
                email: user.email,
                full_name: fullName,
                pending_phone_e164: normalizedPhone,
                phone_verified: false,
            },
            { onConflict: "id" },
        )
        .select("id, full_name, email, phone_e164, pending_phone_e164, phone_verified, last_login_phone_verified_at")
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile: data, intent: payload.intent });
}
