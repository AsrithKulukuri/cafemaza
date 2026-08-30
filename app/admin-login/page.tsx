"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { setAuthSession } from "@/lib/authToken";

export default function AdminLoginPage() {
    const [adminEmail, setAdminEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminEmail.trim() || !password.trim()) {
            setError("Please fill in all fields");
            return;
        }

        try {
            const response = await apiFetch<{ token: string; user: { id: string; name: string; email: string; role: string } }>("/api/auth/login", {
                method: "POST",
                body: JSON.stringify({ email: adminEmail, password }),
            });

            if (response.user.role !== "admin") {
                setError("Only admin accounts can access this portal");
                return;
            }

            setAuthSession(response.token, {
                id: response.user.id,
                name: response.user.name,
                email: response.user.email,
                role: "admin",
            });

            router.push("/admin/dashboard");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Login failed");
        }
    };

    return (
        <div className="grid min-h-screen place-items-center bg-[#0B0B0B] p-4 sm:p-6 py-12">
            <motion.form
                onSubmit={handleSubmit}
                onFocus={() => setError("")}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-5 sm:p-8"
            >
                <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Admin Portal</p>
                <h1 className="mt-1.5 font-[var(--font-heading)] text-2xl sm:text-4xl text-[#F5F5F5]">Admin Login</h1>

                {error && <p className="mt-3 text-center text-xs sm:text-sm text-[#FF6A00]">{error}</p>}

                <div className="mt-5 sm:mt-6 space-y-3.5 sm:space-y-4">
                    <input
                        type="email"
                        placeholder="Admin Email (e.g., admin@cafemaza.com)"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#666] focus:border-[#CFAF63] focus:outline-none transition"
                        suppressHydrationWarning
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#666] focus:border-[#CFAF63] focus:outline-none transition"
                        suppressHydrationWarning
                    />
                    <button
                        type="submit"
                        className="luxury-button w-full min-h-[44px] rounded-full bg-gradient-to-r from-[#CFAF63] via-[#FFD78B] to-[#FF6A00] px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#111] hover:shadow-lg transition cursor-pointer"
                        suppressHydrationWarning
                    >
                        Access Admin Dashboard
                    </button>
                </div>

                <p className="mt-5 sm:mt-6 text-center text-[11px] sm:text-xs text-[#999]">
                    Use backend admin credentials created via /api/auth/register
                </p>
            </motion.form>
        </div>
    );
}
