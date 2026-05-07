"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { API_BASE_URL } from "@/lib/api";
import { getAuthToken, getAuthUser, setAuthSession } from "@/lib/authToken";

async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        {
            headers: {
                Accept: "application/json",
            },
        },
    );

    if (!response.ok) {
        throw new Error("Unable to fetch address from current location");
    }

    const body = (await response.json()) as { display_name?: string };
    return body.display_name?.trim() || "";
}

function getCurrentPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported in this browser"));
            return;
        }

        navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
        });
    });
}

type ProfileUser = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    savedAddress?: string;
    savedLocation?: {
        latitude: number;
        longitude: number;
        updatedAt?: string;
    } | null;
    role: "customer" | "staff" | "bearer" | "kitchen" | "manager" | "delivery" | "admin";
};

export default function ProfilePage() {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [savedAddress, setSavedAddress] = useState("");
    const [savedLocation, setSavedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [locatingAddress, setLocatingAddress] = useState(false);
    const [info, setInfo] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const token = getAuthToken();
        const cached = getAuthUser();

        if (!token) {
            router.replace("/login");
            return;
        }

        if (cached) {
            setName(cached.name || "");
            setEmail(cached.email || "");
            setPhone(cached.phone || "");
            setSavedAddress(cached.savedAddress || "");
            setSavedLocation(
                cached.savedLocation && typeof cached.savedLocation.latitude === "number" && typeof cached.savedLocation.longitude === "number"
                    ? {
                        latitude: cached.savedLocation.latitude,
                        longitude: cached.savedLocation.longitude,
                    }
                    : null,
            );
        }

        async function loadProfile() {
            try {
                const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                });

                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.message ?? "Failed to load profile");
                }

                const user = result.user as ProfileUser;
                setName(user.name || "");
                setEmail(user.email || "");
                setPhone(user.phone || "");
                setSavedAddress(user.savedAddress || "");
                setSavedLocation(
                    user.savedLocation && typeof user.savedLocation.latitude === "number" && typeof user.savedLocation.longitude === "number"
                        ? {
                            latitude: user.savedLocation.latitude,
                            longitude: user.savedLocation.longitude,
                        }
                        : null,
                );
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load profile");
            } finally {
                setLoading(false);
            }
        }

        void loadProfile();
    }, [router]);

    async function handleSave(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const token = getAuthToken();
        if (!token) {
            router.replace("/login");
            return;
        }

        setBusy(true);
        setInfo("");
        setError("");

        try {
            const normalizedAddress = savedAddress.trim();
            const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    email,
                    savedAddress: normalizedAddress,
                    savedLocation: normalizedAddress ? savedLocation : null,
                }),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message ?? "Failed to update profile");
            }

            setAuthSession(result.token, result.user as ProfileUser);
            setInfo("Profile updated successfully.");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update profile");
        } finally {
            setBusy(false);
        }
    }

    async function handleUseCurrentLocation() {
        setLocatingAddress(true);
        setInfo("");
        setError("");

        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;

            let address = "";
            try {
                address = await reverseGeocode(latitude, longitude);
            } catch {
                address = "";
            }

            const resolvedAddress = address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setSavedAddress(resolvedAddress);
            setSavedLocation({ latitude, longitude });
            setInfo("Current location captured. Save profile to keep it for delivery.");
        } catch (locationError) {
            setError(locationError instanceof Error ? locationError.message : "Could not read your current location");
        } finally {
            setLocatingAddress(false);
        }
    }

    if (loading) {
        return (
            <main className="mx-auto max-w-2xl px-4 py-28 text-[#F5F5F5]">
                <p>Loading profile...</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl px-4 py-28 text-[#F5F5F5]">
            <div className="rounded-3xl border border-[#CFAF63]/25 bg-[#111]/70 p-6 md:p-8">
                <h1 className="font-(--font-heading) text-3xl">My Profile</h1>
                <p className="mt-2 text-sm text-[#F5F5F5]/70">Update your details and save a default delivery address for faster checkout. Phone number is locked after verification.</p>

                <form onSubmit={handleSave} className="mt-6 space-y-4">
                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Name</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="Your name"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Email</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="you@example.com"
                        />
                    </label>

                    <label className="block">
                        <span className="mb-1 block text-xs uppercase tracking-wide text-[#CFAF63]">Phone</span>
                        <input
                            value={phone}
                            readOnly
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#171717] px-4 py-3 text-[#F5F5F5]/70"
                            placeholder="+919876543210 or 9876543210"
                        />
                    </label>

                    <label className="block">
                        <div className="mb-1 flex items-center justify-between gap-3">
                            <span className="block text-xs uppercase tracking-wide text-[#CFAF63]">Saved Delivery Address</span>
                            <button
                                type="button"
                                onClick={() => void handleUseCurrentLocation()}
                                disabled={locatingAddress}
                                className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-[11px] text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00] disabled:opacity-60"
                            >
                                {locatingAddress ? "Detecting..." : "Use Current Location"}
                            </button>
                        </div>
                        <textarea
                            rows={3}
                            value={savedAddress}
                            onChange={(event) => setSavedAddress(event.target.value)}
                            className="w-full rounded-xl border border-[#CFAF63]/20 bg-[#121212] px-4 py-3"
                            placeholder="House no, street, landmark"
                        />
                        {savedLocation ? (
                            <p className="mt-2 text-xs text-[#F5F5F5]/65">
                                Coordinates: {savedLocation.latitude.toFixed(6)}, {savedLocation.longitude.toFixed(6)}
                            </p>
                        ) : null}
                    </label>

                    <button
                        type="submit"
                        disabled={busy}
                        className="rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-5 py-2 text-sm font-semibold text-[#111] disabled:opacity-70"
                    >
                        {busy ? "Saving..." : "Save Profile"}
                    </button>
                </form>

                {info ? <p className="mt-4 text-sm text-emerald-300">{info}</p> : null}
                {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            </div>
        </main>
    );
}
