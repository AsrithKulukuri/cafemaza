import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { setSocketIO } from "./config/socket.js";
import { logger, maskPhone } from "./utils/logger.js";
import { scheduleDailyAnalytics } from "./jobs/computeAnalytics.js";
import { User } from "./models/User.js";
import { seedMembershipCards } from "../scripts/seed-membership-cards.js";

dotenv.config({ override: true });

const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const configuredPort = Number(process.env.PORT || 5000);
const enablePortFallback = String(process.env.PORT_AUTO_FALLBACK || "false").toLowerCase() === "true";
const server = http.createServer(app);

const configuredOrigins = String(process.env.FRONTEND_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (configuredOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            // In development only, allow localhost and dev tunneling
            if (!isProduction) {
                if (
                    origin.startsWith("http://localhost:") ||
                    origin.startsWith("http://127.0.0.1:") ||
                    origin.endsWith(".ngrok-free.app") ||
                    origin.endsWith(".ngrok-free.dev")
                ) {
                    callback(null, true);
                    return;
                }
            }

            callback(new Error("Socket CORS: Not allowed"));
        },
        methods: ["GET", "POST"],
        credentials: true,
    },
    transports: ["websocket", "polling"],
});

const latestOrderLocationById = new Map();

function validateRuntimeEnv() {
    const required = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];
    const missing = required.filter((key) => !String(process.env[key] || "").trim());

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (isProduction) {
        const jwtSecret = String(process.env.JWT_SECRET || "");
        if (jwtSecret.length < 32 || /change_me|replace_with|dev_/i.test(jwtSecret)) {
            throw new Error("JWT_SECRET is weak or placeholder-like for production. Use a high-entropy secret (>= 32 chars).");
        }
    }
}

function startServer(initialPort) {
    let portToUse = initialPort;
    let hasStarted = false;

    const tryListen = () => {
        server.listen(portToUse, () => {
            if (hasStarted) {
                return;
            }
            hasStarted = true;
            logger.info("Backend server started", { port: portToUse, env: process.env.NODE_ENV || "development" });
        });
    };

    server.on("error", (error) => {
        if (error && error.code === "EADDRINUSE" && enablePortFallback && portToUse < initialPort + 20) {
            logger.warn("Requested port is already in use, trying next port", { attemptedPort: portToUse });
            portToUse += 1;
            setTimeout(tryListen, 250);
            return;
        }

        logger.error("Backend failed to bind port", { code: error?.code, message: error?.message, port: portToUse });
        process.exit(1);
    });

    tryListen();
}

setSocketIO(io);

// Socket JWT Authentication Middleware
io.use(async (socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.replace("Bearer ", "");

        if (token) {
            const jwtSecret = String(process.env.JWT_SECRET || "").trim();
            if (jwtSecret) {
                const decoded = jwt.verify(token, jwtSecret);
                if (decoded && decoded.id) {
                    const user = await User.findById(decoded.id).select("-password");
                    if (user) {
                        socket.user = user;
                    }
                }
            }
        }
    } catch {
        socket.user = null;
    }
    next();
});

io.on("connection", (socket) => {
    logger.info("Socket connected", {
        id: socket.id,
        user: socket.user ? { id: socket.user._id, role: socket.user.role } : "anonymous",
    });

    // 1. Join Order Room for Live Updates
    socket.on("join_order", (orderId) => {
        if (!orderId) return;
        const cleanId = String(orderId).trim();
        socket.join(`order:${cleanId}`);

        const latest = latestOrderLocationById.get(cleanId);
        if (latest) {
            socket.emit("location_update", latest);
        }
    });

    // 2. Join Admin Room (Requires Staff / Admin Role)
    socket.on("join_admin", () => {
        if (!socket.user || !["admin", "manager", "staff", "kitchen", "bearer"].includes(socket.user.role)) {
            socket.emit("error", { message: "Unauthorized: Staff permission required to join admin room" });
            return;
        }
        socket.join("admins");
    });

    // 3. Location tracking: delivery partner sends location to customer and vice versa
    socket.on("location_update", (data) => {
        const { orderId, userType, latitude, longitude, accuracy, timestamp } = data || {};

        if (!orderId || !userType || latitude === undefined || longitude === undefined) {
            socket.emit("error", { message: "Invalid location data" });
            return;
        }

        const lat = Number(latitude);
        const lng = Number(longitude);
        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            socket.emit("error", { message: "Invalid GPS coordinates" });
            return;
        }

        // Only allow delivery partners or admins to broadcast delivery location
        if (userType === "delivery") {
            if (!socket.user || !["delivery", "admin", "manager"].includes(socket.user.role)) {
                socket.emit("error", { message: "Unauthorized delivery location broadcast" });
                return;
            }
        }

        const payload = {
            orderId: String(orderId),
            userType,
            latitude: lat,
            longitude: lng,
            accuracy: Number(accuracy) || 0,
            timestamp: timestamp || Date.now(),
            userId: socket.user?._id || data.userId,
            deliveryPartnerName: socket.user?.name || data.deliveryPartnerName,
            deliveryPartnerPhone: maskPhone(socket.user?.phone || data.deliveryPartnerPhone),
            deliveryAddress: data.deliveryAddress,
        };

        latestOrderLocationById.set(String(orderId), payload);

        // Broadcast location to all authorized users in the order room
        io.to(`order:${orderId}`).emit("location_update", payload);
    });

    socket.on("disconnect", () => {
        logger.info("Socket disconnected", { id: socket.id });
    });
});

connectDatabase()
    .then(async () => {
        validateRuntimeEnv();
        startServer(configuredPort);
        try {
            scheduleDailyAnalytics(Number(process.env.ANALYTICS_DAYS || 90));
        } catch (err) {
            logger.warn("Failed to start analytics scheduler", { message: err?.message });
        }
        try {
            await seedMembershipCards(false);
        } catch (err) {
            logger.warn("Failed to auto-seed membership cards", { message: err?.message });
        }
    })
    .catch((error) => {
        logger.error("Database connection failed", { message: error?.message });
        process.exit(1);
    });
