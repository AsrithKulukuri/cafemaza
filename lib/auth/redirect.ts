export function sanitizeNextPath(rawPath: string | null, fallback = "/"): string {
    if (!rawPath) {
        return fallback;
    }

    if (!rawPath.startsWith("/") || rawPath.startsWith("//")) {
        return fallback;
    }

    return rawPath;
}

export function buildRedirectUrl(baseOrigin: string, path: string, query: Record<string, string>): string {
    const url = new URL(path, baseOrigin);

    Object.entries(query).forEach(([key, value]) => {
        if (value) {
            url.searchParams.set(key, value);
        }
    });

    return url.toString();
}
