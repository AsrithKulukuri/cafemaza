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
    window.localStorage.setItem("cm_token", token);
    window.localStorage.setItem("cm_user", JSON.stringify(user));
}

export function getAuthToken() {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem("cm_token");
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
