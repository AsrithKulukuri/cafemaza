import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const isProduction = process.env.NODE_ENV === "production";

export const runtime = "nodejs";
export const maxDuration = 30;

function safeExtension(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension && ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
        return extension;
    }

    if (file.type === "image/png") return "png";
    if (file.type === "image/webp") return "webp";
    if (file.type === "image/gif") return "gif";
    return "jpg";
}

function verifyJwtPayload(token: string, secret: string): { id?: string; role?: string; exp?: number } | null {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    try {
        const expectedSignature = crypto
            .createHmac("sha256", secret)
            .update(`${headerB64}.${payloadB64}`)
            .digest("base64url");

        if (expectedSignature !== signatureB64) {
            return null;
        }

        const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
        const payload = JSON.parse(payloadJson);
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return null; // Expired
        }
        return payload;
    } catch {
        return null;
    }
}

function isValidImageMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (buffer.length < 12) return false;

    // JPEG: FF D8 FF
    if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (mimeType === "image/png") {
        return (
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a
        );
    }

    // GIF: GIF87a or GIF89a
    if (mimeType === "image/gif") {
        const header = buffer.subarray(0, 6).toString("ascii");
        return header === "GIF87a" || header === "GIF89a";
    }

    // WebP: RIFF....WEBP
    if (mimeType === "image/webp") {
        const riff = buffer.subarray(0, 4).toString("ascii");
        const webp = buffer.subarray(8, 12).toString("ascii");
        return riff === "RIFF" && webp === "WEBP";
    }

    return false;
}

async function uploadLocally(file: File, bytes: ArrayBuffer) {
    const extension = safeExtension(file);
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "menu");
    await mkdir(uploadsDir, { recursive: true });

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
    await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));

    return {
        publicUrl: `/uploads/menu/${filename}`,
        path: `uploads/menu/${filename}`,
        bucket: "local-public",
    };
}

function productionStorageError(message: string) {
    return NextResponse.json(
        {
            error: message,
            hint: "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_MENU_BUCKET in production.",
        },
        { status: 500 },
    );
}

function isCompactJwt(value: string | undefined) {
    if (!value) return false;
    const token = value.trim();
    const parts = token.split(".");
    return parts.length === 3 && parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part));
}

export async function POST(request: NextRequest) {
    try {
        // 1. Authenticate Request
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized: Admin authentication required." }, { status: 401 });
        }

        const token = authHeader.replace("Bearer ", "").trim();
        const jwtSecret = process.env.JWT_SECRET?.trim();
        if (!jwtSecret) {
            return NextResponse.json({ error: "Server authentication is not configured." }, { status: 500 });
        }

        const decoded = verifyJwtPayload(token, jwtSecret);
        if (!decoded || !["admin", "manager"].includes(decoded.role || "")) {
            return NextResponse.json({ error: "Forbidden: Only Admin and Manager accounts can upload menu images." }, { status: 403 });
        }

        // 2. Validate Multipart Form & File
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Image file is required." }, { status: 400 });
        }

        if (!file.type.startsWith("image/") || !ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: "Only JPG, PNG, WebP, or GIF image uploads are allowed." }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json({ error: "Image must be 5MB or smaller." }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 3. Validate Magic Bytes (prevent disguised executable uploads)
        if (!isValidImageMagicBytes(buffer, file.type)) {
            return NextResponse.json({ error: "File content does not match a valid image header." }, { status: 400 });
        }

        // 4. Upload to Cloud or Local Storage
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

        if (!supabaseUrl || !serviceRoleKey) {
            if (isProduction) {
                return productionStorageError("Production image upload storage is not configured.");
            }

            const local = await uploadLocally(file, bytes);
            return NextResponse.json(local);
        }

        if (!isCompactJwt(serviceRoleKey)) {
            return productionStorageError("SUPABASE_SERVICE_ROLE_KEY is not a valid Supabase service role JWT.");
        }

        try {
            const { supabaseAdmin } = await import("@/lib/supabase/admin");
            const bucket = process.env.NEXT_PUBLIC_SUPABASE_MENU_BUCKET || "menu-images";
            const extension = safeExtension(file);
            const filePath = `dishes/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from(bucket)
                .upload(filePath, new Uint8Array(bytes), {
                    contentType: file.type,
                    upsert: false,
                });

            if (uploadError) {
                if (isProduction) {
                    return productionStorageError(`Supabase upload failed: ${uploadError.message}`);
                }

                const local = await uploadLocally(file, bytes);
                return NextResponse.json({ ...local, warning: uploadError.message });
            }

            const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);
            if (!data.publicUrl) {
                return productionStorageError("Supabase did not return a public image URL.");
            }

            return NextResponse.json({
                publicUrl: data.publicUrl,
                path: filePath,
                bucket,
            });
        } catch (error) {
            if (isProduction) {
                return productionStorageError(error instanceof Error ? error.message : "Supabase upload failed");
            }

            const local = await uploadLocally(file, bytes);
            return NextResponse.json({
                ...local,
                warning: error instanceof Error ? error.message : "Supabase initialization failed",
            });
        }
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Upload request failed" },
            { status: 500 },
        );
    }
}
