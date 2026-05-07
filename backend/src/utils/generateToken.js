import jwt from "jsonwebtoken";

export function generateToken(user) {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("Missing JWT_SECRET in backend environment variables.");
    }

    return jwt.sign(
        { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
        secret,
        { expiresIn: "7d" }
    );
}
