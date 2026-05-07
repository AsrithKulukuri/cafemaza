export function getRequiredServerEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export function getRequiredPublicEnv(name: string): string {
    // Use static env references so Next.js can inline values in client bundles.
    const publicEnv: Record<string, string | undefined> = {
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    };

    const value = publicEnv[name];

    if (!value) {
        throw new Error(`Missing required public environment variable: ${name}`);
    }

    return value;
}
