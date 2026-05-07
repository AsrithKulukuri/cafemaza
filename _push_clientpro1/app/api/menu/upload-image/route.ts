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

    const { error: uploadError } = await supabaseAdmin.storage
        .from(bucket)
        .upload(filePath, new Uint8Array(bytes), {
            contentType: file.type,
            upsert: false,
        });

    if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
        publicUrl: data.publicUrl,
        path: filePath,
        bucket,
    });
}
