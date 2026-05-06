import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
        return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "Only image uploads are allowed" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "Image must be 5MB or smaller" }, { status: 400 });
    }

    const bucket = process.env.NEXT_PUBLIC_SUPABASE_MENU_BUCKET || "menu-images";
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `dishes/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const bytes = await file.arrayBuffer();
    try {
        const { error: uploadError } = await supabaseAdmin.storage
            .from(bucket)
            .upload(filePath, new Uint8Array(bytes), {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

        return NextResponse.json({
            publicUrl: data.publicUrl,
            path: filePath,
            bucket,
        });
    } catch (err) {
        // Fallback for local development: save file to public/uploads/dishes
        try {
            const fs = await import("fs");
            const fsp = fs.promises;
            const p = await import("path");
            const uploadsDir = p.join(process.cwd(), "public", "uploads", "dishes");
            await fsp.mkdir(uploadsDir, { recursive: true });

            const localFileName = `dishes-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
            const localPath = p.join(uploadsDir, localFileName);
            await fsp.writeFile(localPath, Buffer.from(bytes));

            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
            const publicUrl = `${siteUrl}/uploads/dishes/${localFileName}`;

            return NextResponse.json({ publicUrl, path: localPath, bucket: "local" });
        } catch (fsErr) {
            return NextResponse.json({ error: (err as Error).message || String(err) }, { status: 500 });
        }
    }
}
