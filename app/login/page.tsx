"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { setAuthSession } from "@/lib/authToken";

type OtpVerifyResponse = {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        phone: string;
        role: "customer" | "staff" | "bearer" | "kitchen" | "manager" | "delivery" | "admin";
    };
};

export default function LoginPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const nextPath = (() => {
        const rawNext = searchParams.get("next") || "/portals";
        return rawNext.startsWith("/") ? rawNext : "/portals";
    })();

    const [phone, setPhone] = useState("");
    const [otpCode, setOtpCode] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [busy, setBusy] = useState(false);
    const [resendIn, setResendIn] = useState(0);
    const [info, setInfo] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        if (resendIn <= 0) {
            return;
        }

        const timer = setInterval(() => {
            setResendIn((previous) => Math.max(0, previous - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [resendIn]);

    async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!phone.trim()) {
            setError("Phone number is required.");
            return;
        }

        setBusy(true);
        setInfo("");
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "login",
                    phone,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message ?? "Failed to send OTP");
            }

            const requestRef =
                typeof result.providerRequestId === "string" && result.providerRequestId.trim()
                    ? ` Ref: ${result.providerRequestId}`
                    : "";
            const destinationInfo =
                typeof result.sentTo === "string" && result.sentTo.trim()
                    ? ` SentTo: ${result.sentTo}`
                    : "";

            setOtpSent(true);
            setResendIn(typeof result.resendInSeconds === "number" ? result.resendInSeconds : 30);
            setInfo(`OTP sent. Enter the code to login.${requestRef}${destinationInfo ? ` ${destinationInfo}` : ""}`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to send OTP");
        } finally {
            setBusy(false);
        }
    }

    async function handleResendOtp() {
        if (!phone.trim() || resendIn > 0) {
            return;
        }

        setBusy(true);
        setInfo("");
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "login",
                    phone,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message ?? "Failed to resend OTP");
            }

            const requestRef =
                typeof result.providerRequestId === "string" && result.providerRequestId.trim()
                    ? ` Ref: ${result.providerRequestId}`
                    : "";
            const destinationInfo =
                typeof result.sentTo === "string" && result.sentTo.trim()
                    ? ` SentTo: ${result.sentTo}`
                    : "";

            setResendIn(typeof result.resendInSeconds === "number" ? result.resendInSeconds : 30);
            setInfo(`A new OTP has been sent.${requestRef}${destinationInfo ? ` ${destinationInfo}` : ""}`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to resend OTP");
        } finally {
            setBusy(false);
        }
    }

    async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!otpCode.trim()) {
            setError("Enter OTP code.");
            return;
        }

        setBusy(true);
        setInfo("");
        setError("");

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    intent: "login",
                    phone,
                    code: otpCode.trim(),
                }),
            });

            const result = (await response.json()) as Partial<OtpVerifyResponse> & { message?: string };

            if (!response.ok) {
                throw new Error(result.message ?? "OTP verification failed");
            }

            if (!result.token || !result.user) {
                throw new Error("Invalid login response from server");
            }

            setAuthSession(result.token, result.user);
            setInfo("Login successful. Redirecting...");
            router.replace(nextPath);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "OTP verification failed");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="grid min-h-screen md:grid-cols-2">
            <div className="relative hidden md:block">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,106,0,0.45),transparent_45%),radial-gradient(circle_at_70%_80%,rgba(207,175,99,0.4),transparent_55%),#141414]" />
            </div>
            <div className="flex items-center justify-center bg-[#0B0B0B] p-6">
                <div className="glass-card w-full max-w-md rounded-3xl border border-[#CFAF63]/25 p-7">
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Login</p>
                    <h1 className="mt-2 font-(--font-heading) text-4xl text-[#F5F5F5]">Phone OTP Login</h1>

                    <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
                        <input
                            type="tel"
                            placeholder="Phone (+919876543210)"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                        />
                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-4 py-3 font-semibold text-[#111] disabled:opacity-70"
                        >
                            {busy ? "Please wait..." : otpSent ? "Send OTP Again" : "Send OTP"}
                        </button>
                    </form>

                    {otpSent && (
                        <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                value={otpCode}
                                onChange={(event) => setOtpCode(event.target.value)}
                                className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                            />
                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full rounded-full border border-[#CFAF63]/40 px-4 py-3 font-semibold text-[#F5F5F5] disabled:opacity-70"
                            >
                                {busy ? "Verifying..." : "Verify OTP & Login"}
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={busy || resendIn > 0}
                                className="w-full rounded-full border border-[#CFAF63]/20 px-4 py-3 text-sm font-semibold text-[#F5F5F5]/90 disabled:opacity-60"
                            >
                                {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                            </button>
                        </form>
                    )}

                    <p className="mt-4 text-sm text-[#F5F5F5]/70">
                        New user?{" "}
                        <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="text-[#CFAF63] hover:text-[#FF6A00]">
                            Create account
                        </Link>
                    </p>

                    {info && <p className="mt-4 text-sm text-emerald-300">{info}</p>}
                    {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
                </div>
            </div>
        </div>
    );
}
