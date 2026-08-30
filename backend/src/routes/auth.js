import express from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { User } from "../models/User.js";
import { Customer } from "../models/Customer.js";
import { MembershipCard } from "../models/MembershipCard.js";
import { OtpSession } from "../models/OtpSession.js";
import { generateToken } from "../utils/generateToken.js";
import { auth } from "../middlewares/auth.js";
import { permit } from "../middlewares/roles.js";
import { logger, maskPhone } from "../utils/logger.js";

function getPhoneVariants(phone) {
    if (!phone) return [];
    const digits = String(phone).replace(/\D/g, "");
    if (!digits) return [];
    const last10 = digits.slice(-10);
    return [
        phone,
        last10,
        `+91${last10}`,
        `91${last10}`,
        `0${last10}`,
    ];
}

const router = express.Router();

const OTP_LENGTH = Math.min(8, Math.max(4, Number(process.env.MSG91_OTP_LENGTH || 6)));
const OTP_EXPIRY_MINUTES = Math.max(1, Number(process.env.MSG91_OTP_EXPIRY_MINUTES || 10));
const MAX_SENDS_PER_WINDOW = 5;
const SEND_WINDOW_MINUTES = 15;
const MIN_SECONDS_BETWEEN_SENDS = 30;
const MAX_VERIFY_FAILURES = 5;
const VERIFY_LOCK_MINUTES = 15;
const MSG91_WHATSAPP_API_URL = "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/";

function normalizePhoneE164(input) {
    const trimmed = String(input || "").trim();
    const compact = trimmed.replace(/[\s()-]/g, "");
    const digitsOnly = compact.replace(/\D/g, "");

    let formatted = compact;
    if (formatted.startsWith("00")) {
        formatted = `+${formatted.slice(2)}`;
    }

    if (!formatted.startsWith("+")) {
        if (/^[6-9]\d{9}$/.test(digitsOnly)) {
            formatted = `+91${digitsOnly}`;
        } else if (/^91\d{10}$/.test(digitsOnly)) {
            formatted = `+${digitsOnly}`;
        }
    }

    if (!/^\+91[6-9]\d{9}$/.test(formatted)) {
        throw new Error("Phone number must be Indian and in +91XXXXXXXXXX or 10-digit format.");
    }

    return formatted;
}

function generateOtpCode() {
    const min = 10 ** (OTP_LENGTH - 1);
    const max = 10 ** OTP_LENGTH - 1;
    return String(crypto.randomInt(min, max + 1));
}

function getMsg91ErrorMessage(payload, fallback) {
    if (payload && typeof payload === "object") {
        if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
        if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
        if (typeof payload.errors === "string" && payload.errors.trim()) return payload.errors;

        if (Array.isArray(payload.errors) && payload.errors.length > 0) {
            const firstError = payload.errors[0];
            if (typeof firstError === "string" && firstError.trim()) {
                return firstError;
            }
        }
    }
    return fallback;
}

function normalizeMsg91Phone(rawPhone) {
    const digits = String(rawPhone || "").replace(/\D/g, "");

    if (/^91\d{10}$/.test(digits)) {
        return digits;
    }

    if (/^[6-9]\d{9}$/.test(digits)) {
        return `91${digits}`;
    }

    if (/^0\d{10}$/.test(digits)) {
        return `91${digits.slice(1)}`;
    }

    throw new Error("Phone number must be sent as 91XXXXXXXXXX for MSG91 WhatsApp OTP.");
}

function normalizeSavedLocation(input) {
    if (input === null || input === undefined || input === "") {
        return null;
    }

    if (typeof input !== "object") {
        throw new Error("savedLocation must be an object with latitude and longitude");
    }

    const latitude = Number(input.latitude);
    const longitude = Number(input.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error("savedLocation latitude and longitude must be valid numbers");
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        throw new Error("savedLocation coordinates are out of range");
    }

    return {
        latitude,
        longitude,
        updatedAt: new Date(),
    };
}

class Msg91WhatsappError extends Error {
    constructor(message, status, body) {
        super(message);
        this.name = "Msg91WhatsappError";
        this.status = status;
        this.body = body;
    }
}

/**
 * Send OTP via MSG91 WhatsApp API using template-based delivery
 * @param {string} phoneE164 - Phone number in E164 format (e.g., +919876543210)
 * @param {string} otpCode - 6-digit OTP code
 * @returns {Object} Response payload from MSG91 API
 */
async function sendOtpWithMsg91(phoneE164, otpCode) {
    const authKey = String(process.env.MSG91_AUTH_KEY || "").trim();
    if (!authKey) {
        throw new Error("Missing MSG91_AUTH_KEY in backend environment.");
    }

    const templateName = String(process.env.MSG91_TEMPLATE_NAME || "cafe_maza_otp").trim();
    const integratedNumber = String(process.env.MSG91_INTEGRATED_NUMBER || "15559363844").trim();
    const language = String(process.env.MSG91_OTP_LANGUAGE || "en").trim();
    const buttonUrlParam = String(process.env.MSG91_OTP_BUTTON_URL_PARAM || otpCode).trim();

    const mobile = normalizeMsg91Phone(phoneE164);

    if (!templateName) {
        throw new Error("Missing MSG91_TEMPLATE_NAME in backend environment.");
    }

    if (!integratedNumber) {
        throw new Error("Missing MSG91_INTEGRATED_NUMBER in backend environment.");
    }

    logger.debug("[MSG91 WhatsApp OTP] Preparing request", {
        endpoint: MSG91_WHATSAPP_API_URL,
        to: maskPhone(mobile),
        templateName,
        language,
    });

    const payload = {
        integrated_number: integratedNumber,
        messaging_product: "whatsapp",
        content_type: "template",
        payload: {
            messaging_product: "whatsapp",
            type: "template",
            to: mobile,
            template: {
                name: templateName,
                language: {
                    code: language,
                },
                components: [
                    {
                        type: "body",
                        parameters: [
                            {
                                type: "text",
                                text: otpCode,
                            },
                        ],
                    },
                    {
                        type: "button",
                        sub_type: "url",
                        index: "0",
                        parameters: [
                            {
                                type: "text",
                                text: buttonUrlParam,
                            },
                        ],
                    },
                ],
            },
        },
        to: mobile,
    };

    logger.debug("[MSG91 WhatsApp OTP] Request payload created", {
        templateName,
        to: maskPhone(mobile),
        hasButtonParam: Boolean(buttonUrlParam),
    });

    try {
        const response = await fetch(MSG91_WHATSAPP_API_URL, {
            method: "POST",
            headers: {
                authkey: authKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const rawBody = await response.text();
        let responsePayload = null;

        if (rawBody) {
            try {
                responsePayload = JSON.parse(rawBody);
            } catch {
                responsePayload = { message: rawBody };
            }
        }

        logger.debug("[MSG91 WhatsApp OTP] Response received", {
            status: response.status,
            ok: response.ok,
        });

        const providerStatus =
            responsePayload && typeof responsePayload === "object" && typeof responsePayload.status === "string"
                ? responsePayload.status.toLowerCase()
                : null;
        const hasProviderError =
            responsePayload && typeof responsePayload === "object" && responsePayload.hasError === true;

        if (!response.ok || hasProviderError || providerStatus === "fail") {
            const errorMessage = getMsg91ErrorMessage(
                responsePayload,
                `MSG91 WhatsApp API failed with status ${response.status}`
            );

            const apiErrorCode =
                responsePayload && typeof responsePayload === "object"
                    ? responsePayload.apiError || responsePayload.api_error || responsePayload.code
                    : undefined;

            const detailedErrorMessage =
                response.status === 401
                    ? `MSG91 unauthorized for WhatsApp API (status 401, apiError: ${apiErrorCode || "unknown"}). Check MSG91 WhatsApp channel access, integrated number, template approval, and API key permissions.`
                    : errorMessage;

            logger.error("[MSG91 WhatsApp OTP] Error response", {
                status: response.status,
                phone: maskPhone(phoneE164),
                apiErrorCode,
            });

            throw new Msg91WhatsappError(detailedErrorMessage, response.status, responsePayload ?? rawBody);
        }

        logger.info("[MSG91 WhatsApp OTP] Request accepted", {
            phone: maskPhone(phoneE164),
            status: response.status,
            requestId:
                responsePayload?.data?.message_uuid ||
                responsePayload?.request_id ||
                responsePayload?.requestId ||
                responsePayload?.message,
        });

        return responsePayload;
    } catch (error) {
        if (error instanceof Error) {
            logger.error("[MSG91 WhatsApp OTP] Exception", {
                error: error.message,
                phone: maskPhone(phoneE164),
            });

            if (error instanceof Msg91WhatsappError) {
                throw error;
            }

            throw error;
        }

        const msg = "Unknown error when calling MSG91 WhatsApp API";
        logger.error("[MSG91 WhatsApp OTP] Unknown error", { message: msg });
        throw new Error(msg);
    }
}

function getSafeOtpIntent(rawIntent) {
    const intent = String(rawIntent || "").toLowerCase();
    if (intent !== "login" && intent !== "signup") {
        return null;
    }
    return intent;
}

router.post("/register", async (req, res, next) => {
    try {
        const { name, email, password, role, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: "name, email and password are required" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });

        if (existing) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role: ["customer"].includes(role) ? role : "customer",
        });

        const token = generateToken(user);

        return res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                savedAddress: user.savedAddress,
                savedLocation: user.savedLocation,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/register-staff", auth, permit("admin"), async (req, res, next) => {
    try {
        const { name, email, password, phone, role } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ message: "name, email, password and role are required" });
        }

        const allowedRoles = ["staff", "bearer", "kitchen", "manager", "delivery"];
        if (!allowedRoles.includes(role)) {
            return res.status(400).json({ message: "Invalid staff role" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });

        if (existing) {
            return res.status(409).json({ message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            phone,
            password: hashedPassword,
            role,
        });

        return res.status(201).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                savedAddress: user.savedAddress,
                savedLocation: user.savedLocation,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/login", async (req, res, next) => {
    try {
        const rawIdentifier = String(req.body?.email || req.body?.identifier || "").trim();
        const password = String(req.body?.password || "");

        if (!rawIdentifier || !password) {
            return res.status(400).json({ message: "email and password are required" });
        }

        const normalizedEmail = rawIdentifier.toLowerCase();
        const user = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: rawIdentifier },
            ],
        });

        if (!user) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        const storedPassword = String(user.password || "");
        const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedPassword);
        const matched = isBcryptHash
            ? await bcrypt.compare(password, storedPassword)
            : password === storedPassword;

        if (!matched) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // One-time migration path for legacy plaintext passwords.
        if (!isBcryptHash) {
            user.password = await bcrypt.hash(password, 10);
            await user.save();
        }

        const token = generateToken(user);

        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                savedAddress: user.savedAddress,
                savedLocation: user.savedLocation,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/otp/send", (req, res) => {
    return res.status(405).json({
        message: "Method not allowed. Use POST /api/auth/otp/send with JSON body: { intent: 'login'|'signup', phone: '+919876543210' }",
    });
});

router.post("/otp/send", async (req, res, next) => {
    try {
        const intent = getSafeOtpIntent(req.body?.intent);
        const fullName = String(req.body?.fullName || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();
        const phone = String(req.body?.phone || "").trim();

        if (!intent) {
            return res.status(400).json({ message: "intent must be either login or signup" });
        }

        if (!phone) {
            return res.status(400).json({ message: "phone is required" });
        }

        const phoneE164 = normalizePhoneE164(phone);

        if (intent === "signup" && !fullName) {
            return res.status(400).json({ message: "fullName is required for signup" });
        }

        if (intent === "login") {
            const existingUser = await User.findOne({ phone: phoneE164 });
            if (!existingUser) {
                return res.status(404).json({ message: "No account found for this phone. Please sign up first." });
            }
        }

        const now = new Date();
        const session = (await OtpSession.findOne({ phoneE164, intent })) ||
            new OtpSession({
                phoneE164,
                intent,
                otpSendCount: 0,
                otpVerifyFailCount: 0,
            });

        if (session.otpLockedUntil && session.otpLockedUntil > now) {
            const minutesRemaining = Math.max(1, Math.ceil((session.otpLockedUntil.getTime() - now.getTime()) / 60000));
            return res.status(429).json({ message: `Too many invalid attempts. Try again in ${minutesRemaining} minute(s).` });
        }

        if (session.lastOtpSentAt) {
            const secondsSinceLastSend = Math.floor((now.getTime() - session.lastOtpSentAt.getTime()) / 1000);
            if (secondsSinceLastSend < MIN_SECONDS_BETWEEN_SENDS) {
                return res.status(429).json({
                    message: `Please wait ${MIN_SECONDS_BETWEEN_SENDS - secondsSinceLastSend}s before requesting another OTP.`,
                });
            }
        }

        const activeWindow =
            session.otpSendWindowStartedAt &&
            now.getTime() - session.otpSendWindowStartedAt.getTime() < SEND_WINDOW_MINUTES * 60 * 1000;

        const sendCountInWindow = activeWindow ? session.otpSendCount || 0 : 0;
        if (sendCountInWindow >= MAX_SENDS_PER_WINDOW) {
            const windowStartedAt = session.otpSendWindowStartedAt || now;
            const minutesRemaining = Math.max(
                1,
                Math.ceil((windowStartedAt.getTime() + SEND_WINDOW_MINUTES * 60 * 1000 - now.getTime()) / 60000)
            );
            return res.status(429).json({ message: `OTP limit reached. Try again in ${minutesRemaining} minute(s).` });
        }

        const otpCode = generateOtpCode();
        const providerPayload = await sendOtpWithMsg91(phoneE164, otpCode);

        // Extract MSG91 tracking id for delivery follow-up.
        const providerRequestId =
            providerPayload?.data?.message_uuid ||
            providerPayload?.request_id ||
            providerPayload?.requestId ||
            (providerPayload && typeof providerPayload === "object" && typeof providerPayload.message === "string"
                ? providerPayload.message
                : null);

        logger.info("[MSG91 OTP] send accepted", {
            phone: maskPhone(phoneE164),
            intent,
            providerRequestId,
        });

        session.phoneE164 = phoneE164;
        session.intent = intent;
        session.fullName = fullName || session.fullName || "";
        session.email = email || session.email || "";
        session.otpHash = await bcrypt.hash(otpCode, 10);
        session.otpExpiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
        session.lastOtpSentAt = now;
        session.otpSendWindowStartedAt = activeWindow ? session.otpSendWindowStartedAt : now;
        session.otpSendCount = sendCountInWindow + 1;
        session.otpVerifyFailCount = 0;
        session.otpLockedUntil = null;

        await session.save();

        return res.json({
            success: true,
            resendInSeconds: MIN_SECONDS_BETWEEN_SENDS,
            expiresInMinutes: OTP_EXPIRY_MINUTES,
            sentTo: normalizeMsg91Phone(phoneE164),
            providerRequestId,
            ...(process.env.NODE_ENV !== "production" ? { debugOtp: otpCode } : {}),
        });
    } catch (error) {
        return next(error);
    }
});

router.post("/otp/verify", async (req, res, next) => {
    try {
        const intent = getSafeOtpIntent(req.body?.intent);
        const code = String(req.body?.code || "").trim();

        if (!intent) {
            return res.status(400).json({ message: "intent must be either login or signup" });
        }

        if (!req.body?.phone) {
            return res.status(400).json({ message: "phone is required" });
        }

        if (!/^\d{4,8}$/.test(code)) {
            return res.status(400).json({ message: "OTP code must be 4 to 8 digits" });
        }

        const phoneE164 = normalizePhoneE164(req.body.phone);
        const session = await OtpSession.findOne({ phoneE164, intent });

        if (!session || !session.otpHash || !session.otpExpiresAt) {
            return res.status(400).json({ message: "No OTP request found. Please request a new OTP." });
        }

        const now = new Date();
        if (session.otpLockedUntil && session.otpLockedUntil > now) {
            const minutesRemaining = Math.max(1, Math.ceil((session.otpLockedUntil.getTime() - now.getTime()) / 60000));
            return res.status(429).json({ message: `Too many invalid attempts. Try again in ${minutesRemaining} minute(s).` });
        }

        if (session.otpExpiresAt < now) {
            await OtpSession.deleteOne({ _id: session._id });
            return res.status(400).json({ message: "OTP expired. Please request a new OTP." });
        }

        const matched = await bcrypt.compare(code, session.otpHash);
        if (!matched) {
            const updatedFailures = (session.otpVerifyFailCount || 0) + 1;
            const shouldLock = updatedFailures >= MAX_VERIFY_FAILURES;
            session.otpVerifyFailCount = shouldLock ? 0 : updatedFailures;
            session.otpLockedUntil = shouldLock ? new Date(now.getTime() + VERIFY_LOCK_MINUTES * 60 * 1000) : null;
            await session.save();

            if (shouldLock) {
                return res.status(429).json({ message: `Too many invalid OTP attempts. Locked for ${VERIFY_LOCK_MINUTES} minutes.` });
            }

            const remaining = Math.max(0, MAX_VERIFY_FAILURES - updatedFailures);
            return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
        }

        let user = await User.findOne({ phone: phoneE164 });

        if (intent === "signup") {
            if (user) {
                return res.status(409).json({ message: "Phone already registered. Please login instead." });
            }

            const name = String(session.fullName || "").trim() || "Customer";
            const fallbackEmail = `${phoneE164.replace(/\D/g, "")}@otp.cafemaza.local`;
            const email = String(session.email || "").trim().toLowerCase() || fallbackEmail;

            const existingEmailUser = await User.findOne({ email });
            if (existingEmailUser) {
                return res.status(409).json({ message: "Email already registered. Please login instead." });
            }

            const randomPasswordHash = await bcrypt.hash(crypto.randomUUID(), 10);
            user = await User.create({
                name,
                email,
                phone: phoneE164,
                password: randomPasswordHash,
                role: "customer",
            });
        }

        if (intent === "login" && !user) {
            return res.status(404).json({ message: "No account found for this phone. Please sign up first." });
        }

        const token = generateToken(user);
        await OtpSession.deleteOne({ _id: session._id });

        return res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                savedAddress: user.savedAddress,
                savedLocation: user.savedLocation,
            },
        });
    } catch (error) {
        return next(error);
    }
});

router.get("/profile", auth, async (req, res, next) => {
    try {
        const userPhoneVariants = getPhoneVariants(req.user.phone);
        const customer = await Customer.findOne({
            $or: [
                ...(userPhoneVariants.length > 0 ? [{ phone: { $in: userPhoneVariants } }] : []),
                ...(req.user.email ? [{ email: req.user.email }] : []),
            ],
        }).populate("cardId");

        let membership = null;
        if (customer && customer.cardCode) {
            const card = customer.cardId || (await MembershipCard.findOne({ cardCode: customer.cardCode }));
            if (card) {
                const limit = card.yearlyDiscountLimit || 3000;
                const used = card.yearlyDiscountUsed || 0;
                const assignedDate = card.assignedAt || card.createdAt || new Date();
                const validDate = card.validUntil || new Date(new Date(assignedDate).setFullYear(new Date(assignedDate).getFullYear() + 1));

                membership = {
                    cardCode: customer.cardCode,
                    cardType: customer.cardType,
                    status: card.status,
                    discountPercent: card.discountPercent,
                    pointsBalance: customer.pointsBalance || 0,
                    referralCode: customer.referralCode || "",
                    referredByMasterCardCode: customer.referredByMasterCardCode || "",
                    referralFirstVisitDiscountPercent: customer.referralFirstVisitDiscountPercent,
                    referralFirstVisitUsed: customer.referralFirstVisitUsed,
                    totalVisits: customer.totalVisits || 0,
                    totalSpend: customer.totalSpend || 0,
                    totalDiscountClaimed: customer.totalDiscountClaimed || 0,
                    yearlyDiscountLimit: limit,
                    yearlyDiscountUsed: used,
                    remainingCredit: Math.max(0, limit - used),
                    assignedAt: assignedDate,
                    validUntil: validDate,
                    currentYear: card.currentYear || new Date().getFullYear(),
                };
            }
        }

        return res.json({
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
                role: req.user.role,
                savedAddress: req.user.savedAddress,
                savedLocation: req.user.savedLocation,
            },
            membership,
        });
    } catch (error) {
        return next(error);
    }
});

router.put("/profile", auth, async (req, res, next) => {
    try {
        const name = String(req.body?.name || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();
        const phoneInput = String(req.body?.phone || "").trim();
        const savedAddress = String(req.body?.savedAddress || "").trim();
        const hasSavedLocationInput = Object.prototype.hasOwnProperty.call(req.body || {}, "savedLocation");

        if (!name || !email) {
            return res.status(400).json({ message: "name and email are required" });
        }

        if (phoneInput) {
            const normalizedPhone = normalizePhoneE164(phoneInput);
            if (normalizedPhone !== req.user.phone) {
                return res.status(400).json({ message: "Phone number cannot be updated from profile" });
            }
        }

        const existingEmail = await User.findOne({ email, _id: { $ne: req.user._id } }).select("_id");
        if (existingEmail) {
            return res.status(409).json({ message: "Email already in use" });
        }

        let normalizedSavedLocation;
        if (hasSavedLocationInput) {
            try {
                normalizedSavedLocation = normalizeSavedLocation(req.body.savedLocation);
            } catch (locationError) {
                return res.status(400).json({
                    message:
                        locationError instanceof Error
                            ? locationError.message
                            : "Invalid saved location",
                });
            }
        }

        const updateQuery = {
            $set: {
                name,
                email,
                savedAddress,
            },
            $unset: {},
        };

        if (!savedAddress) {
            updateQuery.$unset.savedLocation = "";
        } else if (hasSavedLocationInput) {
            if (normalizedSavedLocation) {
                updateQuery.$set.savedLocation = normalizedSavedLocation;
            } else {
                updateQuery.$unset.savedLocation = "";
            }
        }

        if (Object.keys(updateQuery.$unset).length === 0) {
            delete updateQuery.$unset;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            updateQuery,
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const token = generateToken(updatedUser);

        return res.json({
            token,
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                savedAddress: updatedUser.savedAddress,
                savedLocation: updatedUser.savedLocation,
            },
        });
    } catch (error) {
        return next(error);
    }
});

export default router;
