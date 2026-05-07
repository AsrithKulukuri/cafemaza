import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getRequiredServerEnv } from "@/lib/env";

export async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
        getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        },
    );
}
