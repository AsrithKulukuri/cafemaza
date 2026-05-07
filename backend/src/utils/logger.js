const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const configuredLevel = String(process.env.LOG_LEVEL || defaultLevel).toLowerCase();
const currentLevel = LEVELS[configuredLevel] ?? LEVELS[defaultLevel];

function canLog(level) {
    return LEVELS[level] <= currentLevel;
}

function sanitizeMeta(meta) {
    if (!meta || typeof meta !== "object") {
        return meta;
    }

    const blockedKeys = ["password", "token", "authkey", "authorization", "otp", "smtp_pass", "supabase_service_key"];
    const output = {};

    for (const [key, value] of Object.entries(meta)) {
        if (blockedKeys.some((blocked) => key.toLowerCase().includes(blocked))) {
            output[key] = "[REDACTED]";
        } else if (typeof value === "object" && value !== null) {
            output[key] = "[OBJECT]";
        } else {
            output[key] = value;
        }
    }

    return output;
}

export function maskPhone(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "unknown";
    if (digits.length <= 4) return `****${digits}`;
    return `${digits.slice(0, 2)}****${digits.slice(-2)}`;
}

export const logger = {
    error(message, meta) {
        if (!canLog("error")) return;
        console.error(message, sanitizeMeta(meta));
    },
    warn(message, meta) {
        if (!canLog("warn")) return;
        console.warn(message, sanitizeMeta(meta));
    },
    info(message, meta) {
        if (!canLog("info")) return;
        console.log(message, sanitizeMeta(meta));
    },
    debug(message, meta) {
        if (!canLog("debug")) return;
        console.log(message, sanitizeMeta(meta));
    },
};
