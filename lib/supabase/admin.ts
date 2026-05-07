import { createClient } from "@supabase/supabase-js";

import { getRequiredServerEnv } from "@/lib/env";

export const supabaseAdmin = createClient(
    getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    },
);
