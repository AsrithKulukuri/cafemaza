import express from "express";
import cors from "cors";
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
import { errorHandler } from "./middlewares/error.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = String(process.env.NODE_ENV || "").toLowerCase() === "production";
const logLevel = String(process.env.LOG_LEVEL || "").toLowerCase();

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000", credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.resolve(__dirname, "../../uploads")));
if (!isProduction || logLevel === "debug") {
    app.use(morgan("dev"));
}

app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "cafe-maza-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/screening", screeningRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/promo-banners", promoBannerRoutes);
app.use("/api/whatsapp", whatsappWebhookRoutes);

app.use(errorHandler);

export default app;
