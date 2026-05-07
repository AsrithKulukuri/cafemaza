"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // In production you'd send this to an error tracking service
        console.error(error);
    }, [error]);

    return (
        <html lang="en">
            <body className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B0B] px-6 text-center font-sans text-[#F5F5F5]">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#FF6A00]/30 bg-[#FF6A00]/10">
                    <span className="text-4xl">⚠️</span>
                </div>
                <p className="text-xs uppercase tracking-[0.24em] text-[#FF6A00] mb-3">Something went wrong</p>
                <h1 className="text-4xl font-bold text-[#F5F5F5] mb-3">Unexpected Error</h1>
                <p className="max-w-sm text-[#F5F5F5]/60 mb-8">
                    An unexpected error occurred. Our team has been notified. Please try again or return home.
                </p>
                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={reset}
                        className="rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-7 py-3 font-semibold text-[#111] hover:opacity-90 transition"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="rounded-full border border-[#CFAF63]/30 px-7 py-3 text-[#F5F5F5] hover:border-[#CFAF63] transition"
                    >
                        Back to Home
                    </Link>
                </div>
            </body>
        </html>
    );
}
