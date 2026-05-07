import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

async function resolveUserFromAuthorizationHeader(header) {
    if (!header || !header.startsWith("Bearer ")) {
        return null;
    }

    const token = header.replace("Bearer ", "").trim();
    if (!token) {
        return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    return user || null;
}

export async function auth(req, res, next) {
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const user = await resolveUserFromAuthorizationHeader(req.headers.authorization);

        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.user = user;
        next();
    } catch {
        return res.status(401).json({ message: "Invalid token" });
    }
}

export async function optionalAuth(req, _res, next) {
    try {
        const user = await resolveUserFromAuthorizationHeader(req.headers.authorization);
        if (user) {
            req.user = user;
        }
        return next();
    } catch {
        req.user = undefined;
        return next();
    }
}
