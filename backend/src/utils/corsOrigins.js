/**
 * Unified CORS & WebSocket Origin Validator for CafeMaza
 */

export function isAllowedOrigin(origin) {
    if (!origin) return true; // Allow server-to-server, curl, SSR, mobile apps, or same-origin requests

    const cleanOrigin = String(origin).trim().replace(/\/+$/, "").toLowerCase();

    // 1. Check configured environment origins (FRONTEND_URL, ALLOWED_ORIGINS, NEXT_PUBLIC_SITE_URL)
    const envOrigins = [
        ...(process.env.FRONTEND_URL || "").split(","),
        ...(process.env.ALLOWED_ORIGINS || "").split(","),
        ...(process.env.NEXT_PUBLIC_SITE_URL || "").split(","),
    ]
        .map((s) => s.trim().replace(/\/+$/, "").toLowerCase())
        .filter(Boolean);

    if (envOrigins.includes(cleanOrigin)) {
        return true;
    }

    // 2. Production & Staging standard domains for CafeMaza (Vercel, custom domains, ngrok, localtunnels)
    const trustedHostPatterns = [
        /^https?:\/\/([a-z0-9-]+\.)*vercel\.app$/, // All Vercel production & preview branches
        /^https?:\/\/([a-z0-9-]+\.)*cafemaza\.in$/,
        /^https?:\/\/([a-z0-9-]+\.)*cafemaza\.com$/,
        /^https?:\/\/([a-z0-9-]+\.)*cafemaza\.co$/,
        /^https?:\/\/([a-z0-9-]+\.)*ngrok-free\.app$/,
        /^https?:\/\/([a-z0-9-]+\.)*ngrok-free\.dev$/,
        /^https?:\/\/([a-z0-9-]+\.)*ngrok\.io$/,
        /^https?:\/\/([a-z0-9-]+\.)*loca\.lt$/,
    ];

    for (const pattern of trustedHostPatterns) {
        if (pattern.test(cleanOrigin)) {
            return true;
        }
    }

    // 3. Localhost & Private Network IPs (always allowed for local POS, admin tabs, and internal testing)
    if (
        cleanOrigin.startsWith("http://localhost:") ||
        cleanOrigin.startsWith("https://localhost:") ||
        cleanOrigin.startsWith("http://127.0.0.1:") ||
        cleanOrigin.startsWith("https://127.0.0.1:") ||
        cleanOrigin.startsWith("http://192.168.") ||
        cleanOrigin.startsWith("http://10.") ||
        cleanOrigin.startsWith("http://172.")
    ) {
        return true;
    }

    return false;
}
