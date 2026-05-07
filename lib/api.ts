export const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL || "/backend";

type ApiOptions = RequestInit & {
    token?: string | null;
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    const token = options.token ?? (typeof window !== "undefined" ? window.localStorage.getItem("cm_token") : null);
    const method = String(options.method || "GET").toUpperCase();
    const cacheMode = options.cache ?? (method === "GET" && !token ? "force-cache" : "no-store");

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
        cache: cacheMode,
    });

    let body: unknown = null;
    try {
        body = await response.json();
    } catch {
        body = null;
    }

    if (!response.ok) {
        const message =
            body && typeof body === "object" && "message" in body
                ? String((body as { message?: string }).message)
                : `Request failed with status ${response.status}`;
        throw new Error(message);
    }

    return body as T;
}
