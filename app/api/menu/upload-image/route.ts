import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
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
            hint: "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and NEXT_PUBLIC_SUPABASE_MENU_BUCKET in production. Local filesystem uploads are disabled in production because serverless storage is temporary.",
        },
        { status: 500 },
    );
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "Image file is required" }, { status: 400 });
        }

        if (!file.type.startsWith("image/") || !ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: "Only JPG, PNG, WebP, or GIF image uploads are allowed" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
            return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            if (isProduction) {
                return productionStorageError("Production image upload storage is not configured");
            }

            const local = await uploadLocally(file, bytes);
            return NextResponse.json(local);
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
                return productionStorageError("Supabase did not return a public image URL");
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
                warning: error instanceof Error ? error.message : "Supabase upload failed; stored locally",
            });
        }
    } catch (error) {
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Image upload failed" },
            { status: 500 },
        );
    }
}
