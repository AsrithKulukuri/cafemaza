import rateLimit from "express-rate-limit";

const isDevelopment = process.env.NODE_ENV !== "production";

// 1. General API Limiter (300 requests per 15 minutes per IP)
export const globalApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 1000 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests from this IP, please try again later." },
});

// 2. Auth Limiter: Login, Register, OTP (20 attempts per 15 minutes)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 200 : 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many authentication attempts, please try again after 15 minutes." },
});

// 3. OTP Send Limiter: (5 requests per 10 minutes)
export const otpSendLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: isDevelopment ? 50 : 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many OTP requests. Please wait a few minutes before trying again." },
});

// 4. Payment & Order Creation Limiter (30 requests per 15 minutes)
export const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isDevelopment ? 300 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Order creation rate limit reached. Please wait a moment." },
});

// 5. Membership POS / Lookup Limiter (120 requests per minute)
export const membershipLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: isDevelopment ? 500 : 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many membership lookup requests. Please slow down." },
});
