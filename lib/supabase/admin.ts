import { createClient } from "@supabase/supabase-js";

import { getRequiredServerEnv } from "@/lib/env";

const supabaseUrl = getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL");
// Support either SUPABASE_SERVICE_ROLE_KEY (preferred) or legacy SUPABASE_SERVICE_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!serviceKey) {
    throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
