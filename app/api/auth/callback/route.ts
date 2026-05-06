import { NextRequest, NextResponse } from "next/server";

import { buildRedirectUrl, sanitizeNextPath } from "@/lib/auth/redirect";
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
    const code = request.nextUrl.searchParams.get("code");
    const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get("next"), "/login");
    const publicOrigin = getPublicOrigin(request);

    if (!code) {
        return NextResponse.redirect(
            buildRedirectUrl(publicOrigin, nextPath, { oauth: "error", reason: "missing_code" }),
        );
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        return NextResponse.redirect(
            buildRedirectUrl(publicOrigin, nextPath, { oauth: "error", reason: "session_exchange_failed" }),
        );
    }

    return NextResponse.redirect(buildRedirectUrl(publicOrigin, nextPath, { oauth: "success" }));
}
