"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, Navigation, PackageCheck, Truck } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";

type DeliveryOrder = {
    _id: string;
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
    address: string;
    userId?: { name?: string; email?: string };
    items: Array<{ quantity: number; menuItemId?: { name?: string } }>;
    deliveryPartnerId?: { _id?: string; name?: string; phone?: string } | null;
};

type Tab = "available" | "assigned" | "delivered";

function extractCoordsFromAddress(rawAddress: string): { latitude: number; longitude: number } | null {
    const match = rawAddress.match(/coords:([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/i);
    if (!match) {
        return null;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
    }

    return { latitude, longitude };
}

function getDisplayAddress(rawAddress: string): string {
    return rawAddress
        .replace(/\s*\|\s*coords:[+-]?\d+(?:\.\d+)?,[+-]?\d+(?:\.\d+)?/i, "")
        .trim();
}

export default function DeliveryDashboard() {
    const router = useRouter();
    const [tab, setTab] = useState<Tab>("available");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [partnerName, setPartnerName] = useState("");
    const [availableOrders, setAvailableOrders] = useState<DeliveryOrder[]>([]);
    const [myOrders, setMyOrders] = useState<DeliveryOrder[]>([]);
    const [pendingDeliveryOrder, setPendingDeliveryOrder] = useState<DeliveryOrder | null>(null);
    const [deliveryOtp, setDeliveryOtp] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    const PAGE_SIZE = 6;

    const assignedOrders = useMemo(
        () => myOrders.filter((order) => order.status === "ready" || order.status === "out_for_delivery"),
        [myOrders],
    );

    const deliveredOrders = useMemo(() => myOrders.filter((order) => order.status === "delivered"), [myOrders]);

    useEffect(() => {
        const user = getAuthUser();

        if (!user || (user.role !== "delivery" && user.role !== "admin")) {
            router.push("/delivery-login");
            return;
        }

        setPartnerName(user.name || "Delivery Partner");
    }, [router]);

    const loadOrders = async () => {
        const token = getAuthToken();
        if (!token) return;

        setLoading(true);
        setError("");

        try {
            const [available, mine] = await Promise.all([
                apiFetch<DeliveryOrder[]>("/api/orders/delivery/available", { token }),
                apiFetch<DeliveryOrder[]>("/api/orders/delivery/mine", { token }),
            ]);

            setAvailableOrders(available);
            setMyOrders(mine);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to load delivery orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadOrders();

        if (!socket.connected) {
            socket.connect();
        }

        const refreshOrders = () => {
            if (typeof document !== "undefined" && document.visibilityState !== "visible") {
                return;
            }
            void loadOrders();
        };

        socket.on("order_created", refreshOrders);
        socket.on("order_status_updated", refreshOrders);

        const timer = window.setInterval(refreshOrders, 20000);

        return () => {
            socket.off("order_created", refreshOrders);
            socket.off("order_status_updated", refreshOrders);
            window.clearInterval(timer);
        };
    }, []);

    const takeOrder = async (orderId: string) => {
        const token = getAuthToken();
        if (!token) return;

        setError("");

        try {
            await apiFetch(`/api/orders/${orderId}/take`, {
                method: "PUT",
                token,
            });

            await loadOrders();
            setTab("assigned");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to take order");
        }
    };

    const updateStatus = async (orderId: string, status: "out_for_delivery" | "delivered", otp?: string) => {
        const token = getAuthToken();
        if (!token) return;

        setError("");

        try {
            await apiFetch(`/api/orders/${orderId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status, otp }),
            });

            await loadOrders();
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update order status");
            return false;
        }
    };

    const openDeliveredDialog = (order: DeliveryOrder) => {
        setPendingDeliveryOrder(order);
        setDeliveryOtp("");
        setError("");
    };

    const confirmDelivered = async () => {
        if (!pendingDeliveryOrder) {
            return;
        }

        if (!deliveryOtp.trim()) {
            setError("Enter the OTP shared by the customer");
            return;
        }

        const updated = await updateStatus(pendingDeliveryOrder._id, "delivered", deliveryOtp.trim());

        if (!updated) {
            return;
        }

        setPendingDeliveryOrder(null);
        setDeliveryOtp("");
    };

    const handleLogout = () => {
        clearAuthSession();
        router.push("/delivery-login");
    };

    const cards: Array<{ id: Tab; label: string; count: number }> = [
        { id: "available", label: "Available Orders", count: availableOrders.length },
        { id: "assigned", label: "My Active Orders", count: assignedOrders.length },
        { id: "delivered", label: "Delivered", count: deliveredOrders.length },
    ];

    const list = tab === "available" ? availableOrders : tab === "assigned" ? assignedOrders : deliveredOrders;

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 220);

        return () => {
            window.clearTimeout(timer);
        };
    }, [searchQuery]);

    const filteredList = useMemo(() => {
        const query = debouncedSearchQuery.trim().toLowerCase();
        if (!query) {
            return list;
        }

        return list.filter((order) => {
            const customerName = order.userId?.name || order.userId?.email || "";
            const orderCode = order._id.slice(-6).toLowerCase();
            const itemText = order.items.map((item) => item.menuItemId?.name || "").join(" ").toLowerCase();
            const address = order.address.toLowerCase();

            return (
                customerName.toLowerCase().includes(query) ||
                orderCode.includes(query) ||
                itemText.includes(query) ||
                address.includes(query)
            );
        });
    }, [list, debouncedSearchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
    const paginatedList = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredList.slice(start, start + PAGE_SIZE);
    }, [filteredList, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [tab, debouncedSearchQuery]);

    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-3.5 sm:p-6 pt-16 sm:pt-20 pb-16">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#FF6A00]">Delivery Hub</p>
                    <h1 className="font-[var(--font-heading)] text-2xl sm:text-4xl text-[#F5F5F5] mt-0.5">{partnerName}</h1>
                    <p className="mt-1 text-xs sm:text-sm text-[#999]">Take orders, start live tracking, and mark deliveries.</p>
                </motion.div>
                <button
                    onClick={handleLogout}
                    className="self-start sm:self-auto flex items-center gap-2 rounded-full bg-[#FF6A00]/20 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[#FF6A00] hover:bg-[#FF6A00]/30 transition min-h-[38px] cursor-pointer"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-2.5 sm:gap-4">
                {cards.map((card) => (
                    <button
                        key={card.id}
                        onClick={() => setTab(card.id)}
                        className={`rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 text-left transition cursor-pointer min-h-[64px] ${tab === card.id
                            ? "border-[#CFAF63] bg-[#CFAF63]/10"
                            : "border-[#333] bg-[#111] hover:border-[#CFAF63]/40"
                            }`}
                    >
                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.12em] text-[#999] font-medium">{card.label}</p>
                        <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-[#F5F5F5]">{card.count}</p>
                    </button>
                ))}
            </div>

            {error ? <p className="mb-4 text-xs sm:text-sm text-rose-300">{error}</p> : null}
            {loading ? <p className="text-xs sm:text-sm text-[#F5F5F5]/70">Loading delivery orders...</p> : null}

            <div className="mb-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search by customer, order id, item, or address"
                    className="w-full rounded-xl sm:rounded-2xl border border-[#CFAF63]/25 bg-[#111] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#F5F5F5] placeholder-[#777] outline-none focus:border-[#FF6A00]"
                />
            </div>

            {!loading && filteredList.length === 0 ? (
                <div className="glass-card rounded-2xl border border-[#333] p-6 sm:p-8 text-center text-xs sm:text-sm text-[#999]">No orders in this section.</div>
            ) : null}

            {!loading && filteredList.length > 0 ? (
                <p className="mb-3 text-[11px] sm:text-xs text-[#999]">
                    Showing {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredList.length)} of {filteredList.length}
                </p>
            ) : null}

            <div className="space-y-3 sm:space-y-4">
                {!loading &&
                    paginatedList.map((order) => {
                        const coords = extractCoordsFromAddress(order.address);
                        const displayAddress = getDisplayAddress(order.address);

                        return (
                            <div key={order._id} className="glass-card rounded-2xl border border-[#CFAF63]/25 p-4 sm:p-5">
                                <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                                    <div>
                                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] text-[#999]">Customer</p>
                                        <p className="text-[#F5F5F5] text-xs sm:text-sm font-semibold">{order.userId?.name || order.userId?.email || "Customer"}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] text-[#999]">Order</p>
                                        <p className="text-[#CFAF63] font-mono text-xs sm:text-sm">#{order._id.slice(-6).toUpperCase()}</p>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] text-[#999]">Items</p>
                                    <p className="text-xs sm:text-sm text-[#CCC]">
                                        {order.items.map((item) => `${item.menuItemId?.name || "Item"} x${item.quantity}`).join(", ")}
                                    </p>
                                </div>

                                <div className="mb-4">
                                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] text-[#999]">Delivery Address</p>
                                    <p className="text-xs sm:text-sm text-[#F5F5F5] leading-snug">{displayAddress || order.address}</p>
                                    {coords ? (
                                        <a
                                            href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1.5 inline-block text-xs text-[#CFAF63] hover:text-[#FF6A00]"
                                        >
                                            Open in Maps ({coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)})
                                        </a>
                                    ) : null}
                                </div>

                                {tab === "available" ? (
                                    <button
                                        onClick={() => takeOrder(order._id)}
                                        className="w-full rounded-xl bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#111] hover:shadow-lg min-h-[40px] cursor-pointer"
                                    >
                                        <PackageCheck size={15} className="mr-1.5 inline" />
                                        Take This Order
                                    </button>
                                ) : null}

                                {tab === "assigned" ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                        <button
                                            onClick={() => updateStatus(order._id, "out_for_delivery")}
                                            className="rounded-xl bg-[#3B82F6]/20 px-3 py-2 text-xs sm:text-sm font-semibold text-[#6CA3EA] hover:bg-[#3B82F6]/30 min-h-[38px] cursor-pointer"
                                        >
                                            <Truck size={15} className="mr-1 inline" />
                                            Out for Delivery
                                        </button>
                                        <button
                                            onClick={() => router.push(`/delivery/tracking/${order._id}`)}
                                            className="rounded-xl border border-[#CFAF63]/40 px-3 py-2 text-xs sm:text-sm font-semibold text-[#CFAF63] hover:bg-[#CFAF63]/10 min-h-[38px] cursor-pointer"
                                        >
                                            <Navigation size={15} className="mr-1 inline" />
                                            Live Tracking
                                        </button>
                                        <button
                                            onClick={() => openDeliveredDialog(order)}
                                            className="rounded-xl bg-[#00D98E]/20 px-3 py-2 text-xs sm:text-sm font-semibold text-[#00D98E] hover:bg-[#00D98E]/30 min-h-[38px] cursor-pointer"
                                        >
                                            Mark Delivered
                                        </button>
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
            </div>

            {!loading && filteredList.length > PAGE_SIZE ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="rounded-full border border-[#CFAF63]/30 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs text-[#F5F5F5] disabled:opacity-40 min-h-[36px]"
                    >
                        Prev
                    </button>
                    <span className="text-xs text-[#999]">Page {currentPage} / {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="rounded-full border border-[#CFAF63]/30 px-4 py-2 text-xs text-[#F5F5F5] disabled:opacity-40"
                    >
                        Next
                    </button>
                </div>
            ) : null}

            {pendingDeliveryOrder ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="w-full max-w-md rounded-3xl border border-[#CFAF63]/25 bg-[#101010] p-6 shadow-2xl">
                        <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Confirm Delivery</p>
                        <h2 className="mt-2 font-[var(--font-heading)] text-3xl text-[#F5F5F5]">Enter OTP</h2>
                        <p className="mt-2 text-sm text-[#999]">
                            Ask the customer for the code shown on their tracking page.
                        </p>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={deliveryOtp}
                            onChange={(event) => setDeliveryOtp(event.target.value)}
                            placeholder="Enter OTP"
                            className="mt-5 w-full rounded-2xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] outline-none"
                        />
                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={() => {
                                    setPendingDeliveryOrder(null);
                                    setDeliveryOtp("");
                                }}
                                className="flex-1 rounded-full border border-[#CFAF63]/25 px-4 py-3 text-[#F5F5F5]"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => void confirmDelivered()}
                                className="flex-1 rounded-full bg-[#00D98E] px-4 py-3 font-semibold text-[#111]"
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

        </div>
    );
}
