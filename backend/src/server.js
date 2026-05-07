import http from "http";
import dotenv from "dotenv";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDatabase } from "./config/db.js";
import { setSocketIO } from "./config/socket.js";
import { logger } from "./utils/logger.js";

dotenv.config({ override: true });

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

            if (configuredOrigins.includes(origin) || origin.endsWith(".ngrok-free.app") || origin.endsWith(".ngrok-free.dev")) {
                callback(null, true);
                return;
            }

            callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    },
});

const latestOrderLocationById = new Map();

function validateRuntimeEnv() {
    const required = ["MONGODB_URI", "JWT_SECRET", "FRONTEND_URL"];
    const missing = required.filter((key) => !String(process.env[key] || "").trim());

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
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

io.on("connection", (socket) => {
    socket.on("join_order", (orderId) => {
        socket.join(`order:${orderId}`);

        const latest = latestOrderLocationById.get(String(orderId));
        if (latest) {
            socket.emit("location_update", latest);
        }
    });

    // Location tracking: delivery partner sends location to customer and vice versa
    socket.on("location_update", (data) => {
        const { orderId, userType, latitude, longitude, accuracy, timestamp } = data;

        if (!orderId || !userType || latitude === undefined || longitude === undefined) {
            socket.emit("error", { message: "Invalid location data" });
            return;
        }

        const payload = {
            orderId,
            userType,
            latitude,
            longitude,
            accuracy,
            timestamp,
            userId: data.userId,
            deliveryPartnerName: data.deliveryPartnerName,
            deliveryPartnerPhone: data.deliveryPartnerPhone,
            deliveryAddress: data.deliveryAddress,
        };

        latestOrderLocationById.set(String(orderId), payload);

        // Broadcast location to all users in the order room
        // Delivery partner location goes to customer(s), customer location goes to delivery partner
        io.to(`order:${orderId}`).emit("location_update", payload);
    });

    socket.on("disconnect", () => {
        // No-op
    });
});

connectDatabase()
    .then(() => {
        validateRuntimeEnv();
        startServer(configuredPort);
    })
    .catch((error) => {
        logger.error("Database connection failed", { message: error?.message });
        process.exit(1);
    });
