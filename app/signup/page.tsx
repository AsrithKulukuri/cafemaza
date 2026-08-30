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

export default function SignupPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const nextPath = (() => {
        const rawNext = searchParams.get("next") || "/portals";
        return rawNext.startsWith("/") ? rawNext : "/portals";
    })();

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
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

        if (!fullName.trim()) {
            setError("Full name is required.");
            return;
        }

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
                    intent: "signup",
                    fullName,
                    email,
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
            setInfo(`OTP sent. Verify to complete signup.${requestRef}${destinationInfo ? ` ${destinationInfo}` : ""}`);
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
                    intent: "signup",
                    fullName,
                    email,
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
                    intent: "signup",
                    phone,
                    code: otpCode.trim(),
                }),
            });

            const result = (await response.json()) as Partial<OtpVerifyResponse> & { message?: string };

            if (!response.ok) {
                throw new Error(result.message ?? "OTP verification failed");
            }

            if (!result.token || !result.user) {
                throw new Error("Invalid signup response from server");
            }

            setAuthSession(result.token, result.user);
            setInfo("Signup successful. Redirecting...");
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
            <div className="flex items-center justify-center bg-[#0B0B0B] p-4 sm:p-6 py-12">
                <div className="glass-card w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-5 sm:p-7">
                    <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Join Us</p>
                    <h1 className="mt-1.5 font-(--font-heading) text-2xl sm:text-4xl text-[#F5F5F5]">Phone OTP Signup</h1>

                    <form onSubmit={handleSendOtp} className="mt-5 sm:mt-6 space-y-3.5 sm:space-y-4" suppressHydrationWarning>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#FF6A00]"
                            suppressHydrationWarning
                        />
                        <input
                            type="email"
                            placeholder="Email (optional)"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#FF6A00]"
                            suppressHydrationWarning
                        />
                        <input
                            type="tel"
                            placeholder="Phone (+919876543210)"
                            value={phone}
                            onChange={(event) => setPhone(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#FF6A00]"
                            suppressHydrationWarning
                        />
                        <button
                            type="submit"
                            disabled={busy}
                            className="w-full min-h-[44px] rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#111] disabled:opacity-70 cursor-pointer"
                            suppressHydrationWarning
                        >
                            {busy ? "Please wait..." : otpSent ? "Send OTP Again" : "Send OTP"}
                        </button>
                    </form>

                    {otpSent && (
                        <form onSubmit={handleVerifyOtp} className="mt-4 space-y-3.5 sm:space-y-4" suppressHydrationWarning>
                            <input
                                type="text"
                                placeholder="Enter OTP"
                                value={otpCode}
                                onChange={(event) => setOtpCode(event.target.value)}
                                className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-[#FF6A00]"
                                suppressHydrationWarning
                            />
                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full min-h-[44px] rounded-full border border-[#CFAF63]/40 px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-[#F5F5F5] disabled:opacity-70 cursor-pointer"
                                suppressHydrationWarning
                            >
                                {busy ? "Verifying..." : "Verify OTP & Create Session"}
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={busy || resendIn > 0}
                                className="w-full min-h-[40px] rounded-full border border-[#CFAF63]/20 px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-[#F5F5F5]/90 disabled:opacity-60 cursor-pointer"
                                suppressHydrationWarning
                            >
                                {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                            </button>
                        </form>
                    )}

                    <p className="mt-4 text-xs sm:text-sm text-[#F5F5F5]/70">
                        Already registered?{" "}
                        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[#CFAF63] hover:text-[#FF6A00] font-medium">
                            Login here
                        </Link>
                    </p>

                    {info && <p className="mt-4 text-xs sm:text-sm text-emerald-300">{info}</p>}
                    {error && <p className="mt-3 text-xs sm:text-sm text-rose-300">{error}</p>}
                </div>
            </div>
        </div>
    );
}
