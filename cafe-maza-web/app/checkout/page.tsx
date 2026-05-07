"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { Dish } from "@/data/mockData";
import { apiFetch } from "@/lib/api";
import { getAuthToken, getAuthUser } from "@/lib/authToken";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const CheckoutLocationPicker = dynamic(
    () => import("@/components/map/CheckoutLocationPicker").then((mod) => mod.CheckoutLocationPicker),
    { ssr: false },
);

type CartItem = Dish & { qty: number; selectedVariant?: { name: string; price: number }; key?: string };

type BackendMenuItem = {
    _id: string;
    name: string;
};

type CheckoutOrderItem = {
    menuItemId?: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    isVeg?: boolean;
    isBestSeller?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

type CreatedOrder = {
    _id: string;
    paymentStatus: "success" | "paid" | "pending";
};

type RazorpayOrderResponse = {
    keyId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    totalAmount: number;
    subtotal?: number;
    delivery?: number;
    gst?: number;
    total?: number;
};

type PaymentSuccessResponse = {
    orderId: string;
    paymentStatus: "success" | "paid" | "pending";
    subtotal?: number;
    delivery?: number;
    gst?: number;
    total?: number;
};

type AppliedCouponResponse = {
    code: string;
    type: "flat" | "percent" | "free_delivery";
    discount: number;
    delivery: number;
    subtotal: number;
    gst: number;
    total: number;
    message: string;
};

type BestCouponResponse = {
    bestCoupon: {
        code: string;
        type: "flat" | "percent" | "free_delivery";
        discount: number;
        total: number;
    } | null;
};

type AvailableCouponItem = {
    code: string;
    type: "flat" | "percent" | "free_delivery";
    value: number;
    minOrder: number;
    maxDiscount: number | null;
    usageLimit?: number | null;
    perUserLimit?: number | null;
    usageCount?: number;
    canApply: boolean;
    reason: string | null;
    estimatedDiscount: number;
    expiryDate: string;
};

type AvailableCouponsResponse = {
    coupons: AvailableCouponItem[];
};

const MINIMUM_ORDER = 99;
const DELIVERY_CHARGE = 40;
const GST_RATE = 0.05;

const currencyFormatter = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
    return currencyFormatter.format(value);
}

function normalizeDishName(value: string) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

function isAuthFailureMessage(error: unknown) {
    const message = error instanceof Error ? error.message : String(error || "");
    return /unauthorized|invalid token|forbidden|not authorized/i.test(message);
}

type RazorpayPaymentResult = {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
};

type RazorpayInstance = {
    open: () => void;
    on: (event: "payment.failed", callback: (response: { error?: { description?: string } }) => void) => void;
};

type RazorpayConstructor = new (options: {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: {
        name?: string;
        email?: string;
        contact?: string;
    };
    notes: {
        source: string;
    };
    theme: {
        color: string;
    };
    modal: {
        ondismiss: () => void;
    };
    handler: (response: RazorpayPaymentResult) => void;
}) => RazorpayInstance;

type ProfileResponse = {
    user: {
        name?: string;
        phone?: string;
        savedAddress?: string;
        savedLocation?: {
            latitude: number;
            longitude: number;
        } | null;
    };
};

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

function parseCoordsFromAddress(rawAddress: string | undefined): { latitude: number; longitude: number } | null {
    if (!rawAddress) return null;

    const match = rawAddress.match(/coords:([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/i);
    if (!match) return null;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return { latitude, longitude };
}

function loadRazorpayCheckoutScript(): Promise<boolean> {
    if (typeof window === "undefined") {
        return Promise.resolve(false);
    }

    const existingRazorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;
    if (existingRazorpay) {
        return Promise.resolve(true);
    }

    return new Promise((resolve) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        document.body.appendChild(script);
    });
}

function openRazorpayCheckout({
    keyId,
    amount,
    currency,
    razorpayOrderId,
    customerName,
    customerEmail,
    customerPhone,
}: {
    keyId: string;
    amount: number;
    currency: string;
    razorpayOrderId: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
}): Promise<RazorpayPaymentResult> {
    return new Promise((resolve, reject) => {
        const Razorpay = (window as Window & { Razorpay?: RazorpayConstructor }).Razorpay;

        if (!Razorpay) {
            reject(new Error("Unable to load Razorpay checkout"));
            return;
        }

        const instance = new Razorpay({
            key: keyId,
            amount,
            currency,
            name: "Cafe Maza",
            description: "Food Order Payment",
            order_id: razorpayOrderId,
            prefill: {
                name: customerName,
                email: customerEmail,
                contact: customerPhone,
            },
            notes: {
                source: "cafe_maza_web_checkout",
            },
            theme: {
                color: "#CFAF63",
            },
            modal: {
                ondismiss: () => {
                    reject(new Error("Payment was cancelled"));
                },
            },
            handler: (response) => {
                resolve(response);
            },
        });

        instance.on("payment.failed", (response) => {
            reject(new Error(response.error?.description || "Payment failed"));
        });

        instance.open();
    });
}

export default function CheckoutPage() {
    const router = useRouter();
    const hasTriedAutoAddressRef = useRef(false);
    const lastAutoAppliedCouponRef = useRef("");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [placed, setPlaced] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [error, setError] = useState("");
    const [locationMessage, setLocationMessage] = useState("");
    const [locatingAddress, setLocatingAddress] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState<{ latitude: number; longitude: number } | null>(null);
    const [savedAddressOption, setSavedAddressOption] = useState("");
    const [savedLocationOption, setSavedLocationOption] = useState<{ latitude: number; longitude: number } | null>(null);
    const [orderId, setOrderId] = useState("");
    const [couponInput, setCouponInput] = useState("");
    const [couponApplying, setCouponApplying] = useState(false);
    const [couponMessage, setCouponMessage] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponResponse | null>(null);
    const [bestCoupon, setBestCoupon] = useState<BestCouponResponse["bestCoupon"]>(null);
    const [showAvailableCoupons, setShowAvailableCoupons] = useState(false);
    const [loadingAvailableCoupons, setLoadingAvailableCoupons] = useState(false);
    const [availableCoupons, setAvailableCoupons] = useState<AvailableCouponItem[]>([]);
    const [form, setForm] = useState({
        name: "",
        phone: "",
        address: "",
        instructions: "",
        payment: "UPI",
    });

    useEffect(() => {
        try {
            const raw = localStorage.getItem("cafeMazaCart");
            if (!raw) return;
            const parsed = JSON.parse(raw) as CartItem[];
            setCart(Array.isArray(parsed) ? parsed : []);
        } catch {
            setCart([]);
        }
    }, []);

    useEffect(() => {
        const cached = getAuthUser();

        if (cached) {
            setForm((prev) => ({
                ...prev,
                name: prev.name || cached.name || "",
                phone: prev.phone || cached.phone || "",
            }));

            const cachedSavedAddress = String(cached.savedAddress || "").trim();
            const cachedSavedLocation =
                cached.savedLocation && typeof cached.savedLocation.latitude === "number" && typeof cached.savedLocation.longitude === "number"
                    ? { latitude: cached.savedLocation.latitude, longitude: cached.savedLocation.longitude }
                    : null;

            if (cachedSavedAddress) {
                setSavedAddressOption(cachedSavedAddress);
                setSavedLocationOption(cachedSavedLocation || parseCoordsFromAddress(cachedSavedAddress));
                setForm((prev) => (prev.address ? prev : { ...prev, address: cachedSavedAddress }));
                setSelectedPoint((prev) => prev || cachedSavedLocation || parseCoordsFromAddress(cachedSavedAddress));
                hasTriedAutoAddressRef.current = true;
            }
        }

        const token = getAuthToken();
        if (!token) {
            return;
        }

        let isMounted = true;
        async function loadProfileDefaults() {
            try {
                const result = await apiFetch<ProfileResponse>("/api/auth/profile", { token });
                if (!isMounted) {
                    return;
                }

                const profile = result.user || {};
                const profileSavedAddress = String(profile.savedAddress || "").trim();
                const profileSavedLocation =
                    profile.savedLocation &&
                        typeof profile.savedLocation.latitude === "number" &&
                        typeof profile.savedLocation.longitude === "number"
                        ? {
                            latitude: profile.savedLocation.latitude,
                            longitude: profile.savedLocation.longitude,
                        }
                        : null;

                setForm((prev) => ({
                    ...prev,
                    name: prev.name || profile.name || "",
                    phone: prev.phone || profile.phone || "",
                    address: prev.address || profileSavedAddress || "",
                }));

                if (profileSavedAddress) {
                    const fallbackCoords = parseCoordsFromAddress(profileSavedAddress);
                    const resolvedCoords = profileSavedLocation || fallbackCoords;
                    setSavedAddressOption(profileSavedAddress);
                    setSavedLocationOption(resolvedCoords);
                    setSelectedPoint((prev) => prev || resolvedCoords);
                    hasTriedAutoAddressRef.current = true;
                }
            } catch {
                // Ignore profile prefill failures; checkout still works with manual address input.
            }
        }

        void loadProfileDefaults();

        return () => {
            isMounted = false;
        };
    }, []);

    const subtotal = useMemo(() => cart.reduce((sum, item) => sum + ((item.selectedVariant?.price ?? item.price ?? 0) * item.qty), 0), [cart]);
    const minimumOrderMet = subtotal >= MINIMUM_ORDER;
    const discountAmount = minimumOrderMet ? Math.min(appliedCoupon?.discount || 0, subtotal) : 0;
    const deliveryCharge = minimumOrderMet ? (appliedCoupon?.delivery ?? DELIVERY_CHARGE) : 0;
    const gstAmount = minimumOrderMet ? (subtotal - discountAmount + deliveryCharge) * GST_RATE : 0;
    const total = subtotal - discountAmount + deliveryCharge + gstAmount;
    const minimumShortfall = Math.max(0, MINIMUM_ORDER - subtotal);

    useEffect(() => {
        if (!minimumOrderMet) {
            setAppliedCoupon(null);
            setCouponMessage("");
            return;
        }

        let cancelled = false;
        async function loadBestCoupon() {
            try {
                const result = await apiFetch<BestCouponResponse>(`/api/orders/best-coupon?subtotal=${subtotal}`, { cache: "no-store" });
                if (cancelled) return;
                setBestCoupon(result.bestCoupon);
            } catch {
                if (cancelled) return;
                setBestCoupon(null);
            }
        }

        void loadBestCoupon();

        return () => {
            cancelled = true;
        };
    }, [minimumOrderMet, subtotal]);

    useEffect(() => {
        setAppliedCoupon(null);
        setCouponMessage("");
    }, [cart.length, subtotal]);

    const fillCurrentAddress = useCallback(async (userInitiated: boolean) => {
        setLocationMessage("");
        setLocatingAddress(true);

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

            setForm((prev) => ({ ...prev, address: resolvedAddress }));
            setSelectedPoint({ latitude, longitude });
            setLocationMessage(
                userInitiated
                    ? "Current address captured. You can edit it before placing the order."
                    : "Current address auto-filled. You can edit it before placing the order.",
            );
        } catch (geoError) {
            if (userInitiated) {
                const message = geoError instanceof Error ? geoError.message : "Could not read your current location";
                setLocationMessage(message);
            }
        } finally {
            setLocatingAddress(false);
        }
    }, []);

    useEffect(() => {
        if (hasTriedAutoAddressRef.current) {
            return;
        }

        if (form.address.trim()) {
            return;
        }

        hasTriedAutoAddressRef.current = true;
        void fillCurrentAddress(false);
    }, [fillCurrentAddress, form.address]);

    const useCurrentAddress = async () => {
        await fillCurrentAddress(true);
    };

    const useSavedAddress = () => {
        const normalizedSavedAddress = savedAddressOption.trim();
        if (!normalizedSavedAddress) {
            setLocationMessage("No saved address found in your profile.");
            return;
        }

        setForm((prev) => ({ ...prev, address: normalizedSavedAddress }));
        if (savedLocationOption) {
            setSelectedPoint(savedLocationOption);
        }
        setLocationMessage("Saved profile address applied.");
    };

    const updateAddressFromPoint = useCallback(async (latitude: number, longitude: number) => {
        setLocatingAddress(true);

        try {
            const address = await reverseGeocode(latitude, longitude);
            const resolvedAddress = address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            setForm((prev) => ({ ...prev, address: resolvedAddress }));
            setLocationMessage("Map location updated. Address refreshed.");
        } catch {
            setForm((prev) => ({ ...prev, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` }));
            setLocationMessage("Map location updated with coordinates.");
        } finally {
            setLocatingAddress(false);
        }
    }, []);

    const onMapPointChange = useCallback(
        (point: { latitude: number; longitude: number }) => {
            setSelectedPoint(point);
            void updateAddressFromPoint(point.latitude, point.longitude);
        },
        [updateAddressFromPoint],
    );

    const resolveBackendItems = useCallback(async (): Promise<CheckoutOrderItem[]> => {
        try {
            const menu = await apiFetch<BackendMenuItem[]>("/api/menu", { cache: "no-store" });
            const menuIdByName = new Map(menu.map((item) => [normalizeDishName(item.name), item._id]));
            const validMenuIds = new Set(menu.map((item) => item._id));

            return cart.map((item) => {
                const menuItemId = item._id && validMenuIds.has(item._id)
                    ? item._id
                    : menuIdByName.get(normalizeDishName(item.name));

                if (menuItemId) {
                    return { menuItemId, quantity: item.qty, name: item.name, price: Number(item.selectedVariant?.price ?? item.price ?? 0) };
                }

                return {
                    name: item.name,
                    price: Number(item.selectedVariant?.price ?? item.price ?? 0),
                    quantity: item.qty,
                    image: item.image,
                    isVeg: item.isVeg,
                    isBestSeller: item.isBestSeller,
                    isSoldOut: item.isSoldOut,
                    tags: item.tags,
                };
            });
        } catch {
            return cart.map((item) => ({
                name: item.name,
                price: Number(item.selectedVariant?.price ?? item.price ?? 0),
                quantity: item.qty,
                image: item.image,
                isVeg: item.isVeg,
                isBestSeller: item.isBestSeller,
                isSoldOut: item.isSoldOut,
                tags: item.tags,
            }));
        }
    }, [cart]);

    const applyCoupon = useCallback(async (manualCode?: string) => {
        const normalizedCode = (manualCode || couponInput).trim().toUpperCase();
        if (!normalizedCode) {
            setCouponMessage("Enter a coupon code");
            return;
        }

        if (!cart.length) {
            setCouponMessage("Add items to cart before applying a coupon");
            return;
        }

        if (!minimumOrderMet) {
            setCouponMessage(`Minimum order is ₹${MINIMUM_ORDER}. Add ₹${formatCurrency(minimumShortfall)} more to continue.`);
            return;
        }

        setCouponApplying(true);
        setCouponMessage("");

        try {
            const items = await resolveBackendItems();

            const payload = JSON.stringify({ code: normalizedCode, items, subtotal });
            const response = await apiFetch<AppliedCouponResponse>("/api/orders/apply-coupon/public", {
                method: "POST",
                token: "",
                body: payload,
            });

            setAppliedCoupon(response);
            setCouponInput(response.code);
            setCouponMessage(response.message || `Coupon Applied! You saved ₹${formatCurrency(response.discount)}`);
        } catch (requestError) {
            setAppliedCoupon(null);
            setCouponMessage(requestError instanceof Error ? requestError.message : "Failed to apply coupon");
        } finally {
            setCouponApplying(false);
        }
    }, [couponInput, cart.length, minimumOrderMet, minimumShortfall, resolveBackendItems]);

    useEffect(() => {
        if (!minimumOrderMet || !bestCoupon || appliedCoupon || couponApplying || !cart.length) {
            return;
        }

        const stamp = `${bestCoupon.code}:${subtotal}`;
        if (lastAutoAppliedCouponRef.current === stamp) {
            return;
        }

        lastAutoAppliedCouponRef.current = stamp;
        void applyCoupon(bestCoupon.code);
    }, [applyCoupon, appliedCoupon, bestCoupon, cart.length, couponApplying, minimumOrderMet, subtotal]);

    const loadAvailableCoupons = useCallback(async () => {
        if (!cart.length) {
            setAvailableCoupons([]);
            return;
        }

        setLoadingAvailableCoupons(true);
        try {
            const response = await apiFetch<AvailableCouponsResponse>(`/api/orders/available-coupons/public?subtotal=${subtotal}`, {
                token: "",
                cache: "no-store",
            });

            setAvailableCoupons(response.coupons || []);
        } catch {
            setAvailableCoupons([]);
        } finally {
            setLoadingAvailableCoupons(false);
        }
    }, [cart.length, subtotal]);

    useEffect(() => {
        if (!showAvailableCoupons) {
            return;
        }

        void loadAvailableCoupons();
    }, [showAvailableCoupons, loadAvailableCoupons]);

    const copyCouponCode = useCallback(async (code: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCouponMessage(`Copied ${code}`);
        } catch {
            setCouponMessage(`Copy failed. Coupon: ${code}`);
        }
    }, []);

    const placeOrder = async () => {
        if (!form.name || !form.phone || !form.address || !cart.length) {
            setError("Please fill name, phone, address, and add at least one item.");
            return;
        }

        if (!minimumOrderMet) {
            setError(`Minimum order is ₹${MINIMUM_ORDER}. Add ₹${formatCurrency(minimumShortfall)} more to continue.`);
            return;
        }

        setError("");
        setPlacing(true);

        try {
            const token = getAuthToken();
            const supabase = createSupabaseBrowserClient();
            const {
                data: { user: supabaseUser },
            } = await supabase.auth.getUser();

            if (!token && !supabaseUser) {
                router.push("/login?next=/checkout");
                return;
            }

            const items = await resolveBackendItems();

            const payload = {
                items,
                address: `${form.address}${selectedPoint ? ` | coords:${selectedPoint.latitude.toFixed(6)},${selectedPoint.longitude.toFixed(6)}` : ""}${form.instructions ? ` | ${form.instructions}` : ""}`,
                customerPhone: form.phone,
                paymentMethod: form.payment,
                couponCode: appliedCoupon?.code || undefined,
            };

            const customerName = form.name || supabaseUser?.user_metadata?.name || "Customer";
            const customerEmail = supabaseUser?.email || undefined;

            let createdOrderId = "";

            if (form.payment === "Cash") {
                const created = token
                    ? await apiFetch<CreatedOrder>("/api/orders", {
                        method: "POST",
                        token,
                        body: JSON.stringify(payload),
                    })
                    : await apiFetch<CreatedOrder>("/api/orders/public", {
                        method: "POST",
                        body: JSON.stringify({
                            ...payload,
                            customerName,
                            customerEmail: customerEmail || null,
                        }),
                    });

                createdOrderId = created._id;
            } else {
                const loaded = await loadRazorpayCheckoutScript();
                if (!loaded) {
                    throw new Error("Unable to load payment gateway. Please try again.");
                }

                const razorpayOrder = token
                    ? await apiFetch<RazorpayOrderResponse>("/api/orders/create-razorpay-order", {
                        method: "POST",
                        token,
                        body: JSON.stringify(payload),
                    })
                    : await apiFetch<RazorpayOrderResponse>("/api/orders/create-razorpay-order/public", {
                        method: "POST",
                        body: JSON.stringify({
                            ...payload,
                            customerName,
                            customerEmail: customerEmail || null,
                        }),
                    });

                const paymentResult = await openRazorpayCheckout({
                    keyId: razorpayOrder.keyId,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    razorpayOrderId: razorpayOrder.razorpayOrderId,
                    customerName,
                    customerEmail,
                    customerPhone: form.phone,
                });

                const verificationPayload = {
                    ...payload,
                    razorpayOrderId: paymentResult.razorpay_order_id,
                    razorpayPaymentId: paymentResult.razorpay_payment_id,
                    razorpaySignature: paymentResult.razorpay_signature,
                };

                const verified = token
                    ? await apiFetch<PaymentSuccessResponse>("/api/orders/payment-success-callback", {
                        method: "POST",
                        token,
                        body: JSON.stringify(verificationPayload),
                    })
                    : await apiFetch<PaymentSuccessResponse>("/api/orders/payment-success-callback/public", {
                        method: "POST",
                        body: JSON.stringify({
                            ...verificationPayload,
                            customerName,
                            customerEmail: customerEmail || null,
                        }),
                    });

                createdOrderId = verified.orderId;
            }

            setOrderId(createdOrderId);
            setPlaced(true);
            localStorage.removeItem("cafeMazaCart");
            router.push(`/my-orders?orderId=${createdOrderId}`);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to place order");
        } finally {
            setPlacing(false);
        }
    };

    if (placed) {
        return (
            <div className="mx-auto max-w-3xl px-6 pb-20 md:px-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card mt-10 rounded-3xl border border-[#CFAF63]/25 p-8 text-center"
                >
                    <p className="text-sm uppercase tracking-[0.2em] text-[#00D98E]">Order Confirmed</p>
                    <h1 className="mt-2 font-(--font-heading) text-5xl text-[#F5F5F5]">Thank You</h1>
                    <p className="mt-4 text-[#F5F5F5]/75">
                        Your order has been placed successfully. You can track it live from the order tracking page.
                    </p>
                    {orderId ? <p className="mt-2 text-sm text-[#CFAF63]">Order ID: {orderId}</p> : null}
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link href={orderId ? `/order-tracking?orderId=${orderId}` : "/order-tracking"} className="luxury-button px-6 py-3 text-sm">Track Order</Link>
                        <Link href="/menu" className="rounded-full border border-[#CFAF63]/30 px-6 py-3 text-sm text-[#F5F5F5]">Back to Menu</Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="mx-auto grid max-w-6xl gap-8 px-6 pb-20 md:grid-cols-[1.1fr_0.9fr] md:px-10">
            <section className="glass-card rounded-3xl border border-[#CFAF63]/20 p-7">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Checkout</p>
                <h1 className="mt-2 font-(--font-heading) text-4xl text-[#F5F5F5]">Complete Your Order</h1>

                <div className="mt-6 space-y-4">
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Name
                        <input
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                        />
                    </label>
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Phone
                        <input
                            value={form.phone}
                            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                        />
                    </label>
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Address
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={useCurrentAddress}
                                disabled={locatingAddress}
                                className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-xs text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00] disabled:opacity-60"
                            >
                                {locatingAddress ? "Detecting..." : "Use Current Address"}
                            </button>
                            {savedAddressOption.trim() ? (
                                <button
                                    type="button"
                                    onClick={useSavedAddress}
                                    className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-xs text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00]"
                                >
                                    Use Saved Address
                                </button>
                            ) : null}
                            {locationMessage ? <span className="text-xs text-[#F5F5F5]/70">{locationMessage}</span> : null}
                        </div>
                        <textarea
                            rows={3}
                            value={form.address}
                            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                        />
                    </label>
                    {selectedPoint ? (
                        <div className="space-y-2">
                            <p className="text-sm text-[#F5F5F5]/75">Map View (move pin to edit location)</p>
                            <CheckoutLocationPicker value={selectedPoint} onChange={onMapPointChange} />
                            <p className="text-xs text-[#F5F5F5]/65">
                                Lat: {selectedPoint.latitude.toFixed(6)}, Lng: {selectedPoint.longitude.toFixed(6)}
                            </p>
                        </div>
                    ) : null}
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Delivery Instructions
                        <textarea
                            rows={2}
                            value={form.instructions}
                            onChange={(e) => setForm((prev) => ({ ...prev, instructions: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                            placeholder="Gate number, landmark, call on arrival..."
                        />
                    </label>
                    <label className="block text-sm text-[#F5F5F5]/75">
                        Payment Option
                        <select
                            value={form.payment}
                            onChange={(e) => setForm((prev) => ({ ...prev, payment: e.target.value }))}
                            className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                        >
                            <option value="UPI">UPI</option>
                            <option value="Card">Card</option>
                            <option value="Cash">Cash on delivery</option>
                        </select>
                    </label>
                </div>
            </section>

            <aside className="glass-card h-fit rounded-3xl border border-[#CFAF63]/20 p-7">
                <h2 className="font-(--font-heading) text-3xl text-[#F5F5F5]">Order Summary</h2>
                <div className="mt-4 rounded-2xl border border-[#CFAF63]/20 bg-[#121212] p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-[#CFAF63]">Coupon</p>
                        <button
                            type="button"
                            onClick={() => {
                                setShowAvailableCoupons((prev) => !prev);
                            }}
                            className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-[11px] text-[#CFAF63]"
                        >
                            {showAvailableCoupons ? "Hide Coupons" : "Available Coupons"}
                        </button>
                    </div>
                    {bestCoupon && !appliedCoupon ? (
                        <p className="mb-2 text-xs text-[#4FE0A6]">
                            Best Coupon Available: {bestCoupon.code} (Save ₹{formatCurrency(bestCoupon.discount)})
                        </p>
                    ) : null}
                    <div className="flex gap-2">
                        <input
                            value={couponInput}
                            onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                            placeholder="Enter Coupon Code"
                            disabled={Boolean(appliedCoupon)}
                            className="flex-1 rounded-xl border border-[#CFAF63]/25 bg-[#0F0F0F] px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#777] disabled:opacity-70"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                void applyCoupon();
                            }}
                            disabled={couponApplying || Boolean(appliedCoupon)}
                            className="rounded-xl border border-[#CFAF63]/35 px-4 py-2 text-sm text-[#CFAF63] disabled:opacity-60"
                        >
                            {couponApplying ? "Applying..." : "Apply"}
                        </button>
                        {appliedCoupon ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setAppliedCoupon(null);
                                    setCouponMessage("Coupon removed");
                                }}
                                className="rounded-xl border border-rose-400/35 px-3 py-2 text-sm text-rose-300"
                            >
                                Remove
                            </button>
                        ) : null}
                    </div>
                    {showAvailableCoupons ? (
                        <div className="mt-3 space-y-2 rounded-xl border border-[#CFAF63]/20 bg-[#0E0E0E] p-2">
                            {loadingAvailableCoupons ? (
                                <p className="px-2 py-2 text-xs text-[#F5F5F5]/70">Loading coupons...</p>
                            ) : null}
                            {!loadingAvailableCoupons && !availableCoupons.length ? (
                                <p className="px-2 py-2 text-xs text-[#F5F5F5]/70">No active coupons right now.</p>
                            ) : null}
                            {!loadingAvailableCoupons
                                ? availableCoupons.map((coupon) => (
                                    <div key={coupon.code} className="rounded-lg border border-[#CFAF63]/20 bg-[#121212] p-2 text-xs text-[#F5F5F5]/80">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="rounded-md border border-[#CFAF63]/35 px-2 py-1 font-semibold tracking-wide text-[#F5F5F5]">
                                                {coupon.code}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void copyCouponCode(coupon.code);
                                                    }}
                                                    className="rounded-md border border-[#CFAF63]/35 px-2 py-1 text-[#CFAF63]"
                                                >
                                                    Copy
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={!coupon.canApply || couponApplying}
                                                    onClick={() => {
                                                        setCouponInput(coupon.code);
                                                        void applyCoupon(coupon.code);
                                                    }}
                                                    className="rounded-md border border-[#4FE0A6]/40 px-2 py-1 text-[#4FE0A6] disabled:opacity-50"
                                                >
                                                    Use
                                                </button>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-[#F5F5F5]/65">
                                            {coupon.type === "free_delivery"
                                                ? "Free delivery"
                                                : coupon.type === "flat"
                                                    ? `Flat ₹${formatCurrency(coupon.value)} off`
                                                    : `${coupon.value}% off${coupon.maxDiscount ? ` (max ₹${formatCurrency(coupon.maxDiscount)})` : ""}`}
                                        </p>
                                        <p className="mt-1 text-[#F5F5F5]/55">
                                            Min order ₹{formatCurrency(coupon.minOrder)} · Est. save ₹{formatCurrency(coupon.estimatedDiscount)}
                                        </p>
                                        {coupon.usageLimit ? (
                                            <p className="mt-1 text-[#F5F5F5]/55">
                                                Uses: {coupon.usageCount || 0}/{coupon.usageLimit}
                                                {coupon.perUserLimit ? ` · Per user: ${coupon.perUserLimit}` : ""}
                                            </p>
                                        ) : null}
                                        {!coupon.canApply && coupon.reason ? (
                                            <p className="mt-1 text-rose-300">{coupon.reason}</p>
                                        ) : null}
                                    </div>
                                ))
                                : null}
                        </div>
                    ) : null}
                    {couponMessage ? (
                        <p className={`mt-2 text-xs ${appliedCoupon ? "text-[#4FE0A6]" : "text-rose-300"}`}>{couponMessage}</p>
                    ) : null}
                </div>
                <ul className="mt-4 space-y-2 text-sm">
                    {cart.length ? (
                        cart.map((item) => (
                            <li key={item.key ?? item.name} className="flex items-center justify-between rounded-lg bg-[#151515] px-3 py-2 text-[#F5F5F5]/85">
                                <div>
                                    <span>{item.name} x {item.qty}</span>
                                    {item.selectedVariant ? <div className="text-xs text-[#F5F5F5]/65">{item.selectedVariant.name}</div> : null}
                                </div>
                                <span>₹{(item.selectedVariant?.price ?? item.price ?? 0) * item.qty}</span>
                            </li>
                        ))
                    ) : (
                        <li className="text-[#F5F5F5]/60">No items in cart.</li>
                    )}
                </ul>
                <div className="mt-5 flex items-center justify-between border-t border-[#CFAF63]/15 pt-3">
                    <span className="text-[#F5F5F5]/75">Subtotal</span>
                    <span className="text-[#F5F5F5]">₹{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[#F5F5F5]/75">Discount</span>
                    <span className="text-[#4FE0A6]">-₹{formatCurrency(discountAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[#F5F5F5]/75">Delivery Charge</span>
                    <span className="text-[#F5F5F5]">₹{formatCurrency(deliveryCharge)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                    <span className="text-[#F5F5F5]/75">GST (5%)</span>
                    <span className="text-[#F5F5F5]">₹{formatCurrency(gstAmount)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#CFAF63]/15 pt-3">
                    <span className="text-[#F5F5F5]/75">Total Amount</span>
                    <span className="text-2xl text-[#CFAF63]">₹{formatCurrency(total)}</span>
                </div>
                {appliedCoupon ? (
                    <p className="mt-2 text-xs text-[#4FE0A6]">You saved ₹{formatCurrency(discountAmount)}</p>
                ) : null}
                {!minimumOrderMet && cart.length ? (
                    <p className="mt-3 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                        Minimum order is ₹99. Add ₹{formatCurrency(minimumShortfall)} more to continue.
                    </p>
                ) : null}
                {!minimumOrderMet && cart.length ? (
                    <p className="mt-2 text-xs text-[#F5F5F5]/70">Add ₹{formatCurrency(minimumShortfall)} more to place order.</p>
                ) : null}
                <button
                    onClick={placeOrder}
                    disabled={!cart.length || placing || !minimumOrderMet}
                    className="mt-5 w-full rounded-full bg-linear-to-r from-[#CFAF63] via-[#FFD78B] to-[#FF6A00] px-4 py-3 font-semibold text-[#111] disabled:opacity-50"
                >
                    {placing ? "Processing..." : form.payment === "Cash" ? "Place Order" : "Pay & Place Order"}
                </button>
                {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            </aside>
        </div>
    );
}
