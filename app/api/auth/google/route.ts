import { NextRequest, NextResponse } from "next/server";

import { sanitizeNextPath } from "@/lib/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function getPublicOrigin(request: NextRequest): string {
    const forwardedProto = request.headers.get("x-forwarded-proto");
    const forwardedHost = request.headers.get("x-forwarded-host");

    if (forwardedHost) {
        return `${forwardedProto ?? "https"}://${forwardedHost}`;
    }

    return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"), "/login");
    const supabase = await createSupabaseServerClient();
    const callbackUrl = new URL("/api/auth/callback", getPublicOrigin(request));

    callbackUrl.searchParams.set("next", nextPath);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: callbackUrl.toString(),
            queryParams: {
                access_type: "offline",
                prompt: "consent",
            },
        },
    });

    if (error || !data.url) {
        return NextResponse.json(
            { error: error?.message ?? "Unable to start Google authentication." },
            { status: 400 },
        );
    }

    return NextResponse.redirect(data.url);
}
