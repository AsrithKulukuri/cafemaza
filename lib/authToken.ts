export type AppUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    savedAddress?: string;
    savedLocation?: {
        latitude: number;
        longitude: number;
        updatedAt?: string;
    } | null;
    role: "customer" | "staff" | "bearer" | "kitchen" | "manager" | "delivery" | "admin";
};

export function setAuthSession(token: string, user: AppUser) {
    if (!isCompactJwt(token)) {
        clearAuthSession();
        throw new Error("Invalid login token received");
    }

    window.localStorage.setItem("cm_token", token);
    window.localStorage.setItem("cm_user", JSON.stringify(user));
}

export function getAuthToken() {
    if (typeof window === "undefined") return null;
    const token = window.localStorage.getItem("cm_token");
    if (token && !isCompactJwt(token)) {
        clearAuthSession();
        return null;
    }

    return token;
}

export function getAuthUser(): AppUser | null {
    if (typeof window === "undefined") return null;

    const raw = window.localStorage.getItem("cm_user");
    if (!raw) return null;

    try {
        return JSON.parse(raw) as AppUser;
    } catch {
        return null;
    }
}

export function clearAuthSession() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem("cm_token");
    window.localStorage.removeItem("cm_user");
}

export function isCompactJwt(token: string | null | undefined) {
    if (!token) return false;
    const parts = token.split(".");
    return parts.length === 3 && parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part));
}

export function clearAuthSessionAndRedirect(loginPath = "/login") {
    clearAuthSession();
    if (typeof window === "undefined") return;
    if (!window.location.pathname.includes("login")) {
        window.location.assign(loginPath);
    }
}
