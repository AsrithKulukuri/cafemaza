import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./routes/auth.js";
import menuRoutes from "./routes/menu.js";
import orderRoutes from "./routes/orders.js";
import reservationRoutes from "./routes/reservations.js";
import screeningRoutes from "./routes/screening.js";
import adminRoutes from "./routes/admin.js";
import promoBannerRoutes from "./routes/promoBanners.js";
import whatsappWebhookRoutes from "./routes/whatsappWebhook.js";
import membershipRoutes from "./routes/membership.js";
import { errorHandler } from "./middlewares/error.js";
import {
    globalApiLimiter,
    authLimiter,
    orderLimiter,
    membershipLimiter,
} from "./middlewares/rateLimiter.js";
import { isAllowedOrigin } from "./utils/corsOrigins.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const logLevel = String(process.env.LOG_LEVEL || "").toLowerCase();

// 1. Security Headers (Helmet)
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        contentSecurityPolicy: isProduction ? undefined : false,
    })
);

// 2. CORS Handling
app.use(
    cors({
        origin: (origin, callback) => {
            if (isAllowedOrigin(origin)) {
                return callback(null, true);
            }

            console.warn(`[CORS Blocked] Unauthorized origin attempted access: ${origin}`);
            return callback(new Error(`CORS policy violation: Origin ${origin} not allowed.`));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    })
);

// 3. Body parser & static assets
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));

if (!isProduction || logLevel === "debug") {
    app.use(morgan("dev"));
}

// 4. Rate Limiting
app.use("/api", globalApiLimiter);

// 5. Health Check
app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "cafe-maza-backend" });
});

// 6. Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderLimiter, orderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/promo-banners", promoBannerRoutes);
app.use("/api/whatsapp", whatsappWebhookRoutes);
app.use("/api/membership", membershipLimiter, membershipRoutes);

// 7. Global Error Handler
app.use(errorHandler);

// 8. Next.js Frontend Proxy (Routes all non-API web traffic to Next.js on port 3000)
app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
    }
    const nextServerUrl = `http://127.0.0.1:3000${req.url}`;
    const proxyReq = http.request(
        nextServerUrl,
        {
            method: req.method,
            headers: {
                ...req.headers,
                host: "127.0.0.1:3000",
            },
        },
        (proxyRes) => {
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
        }
    );
    proxyReq.on("error", () => {
        next();
    });
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {
        proxyReq.write(JSON.stringify(req.body));
    }
    proxyReq.end();
});

export default app;
