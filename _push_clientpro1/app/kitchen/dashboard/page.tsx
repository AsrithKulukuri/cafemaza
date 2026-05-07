"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChefHat, CheckCircle2, Clock3, LogOut, RefreshCw } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";

type KitchenTab = "new" | "preparing" | "ready";

type BackendOrderStatus = "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";

type KitchenOrder = {
    id: string;
    status: BackendOrderStatus;
    createdAt: string;
    totalAmount: number;
    tableNumber?: number;
    orderType?: "dine_in" | "takeaway" | "delivery";
    customerPhone?: string;
    address?: string;
    specialInstructions?: string;
    items: Array<{ name: string; quantity: number }>;
};

type BackendOrder = {
    _id: string;
    status: BackendOrderStatus;
    createdAt: string;
    totalAmount: number;
    tableNumber?: number;
    orderType?: "dine_in" | "takeaway" | "delivery";
    customerPhone?: string;
    address?: string;
    specialInstructions?: string;
    userId?: { phone?: string };
    items: Array<{ quantity: number; menuItemId?: { name?: string } }>;
};

function tabToStatus(tab: KitchenTab): BackendOrderStatus {
    if (tab === "new") return "placed";
    if (tab === "preparing") return "preparing";
    return "ready";
}

const tabLabel: Record<KitchenTab, string> = {
    new: "Incoming",
    preparing: "Preparing",
    ready: "Ready",
};

const orderTypeLabel: Record<NonNullable<KitchenOrder["orderType"]>, string> = {
    dine_in: "Dine-in",
    takeaway: "Takeaway",
    delivery: "Delivery",
};

export default function KitchenDashboardPage() {
    const router = useRouter();
    const [staffName, setStaffName] = useState("Kitchen");
    const [orders, setOrders] = useState<KitchenOrder[]>([]);
    const [tab, setTab] = useState<KitchenTab>("new");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionKey, setActionKey] = useState("");
    const [refreshTick, setRefreshTick] = useState(0);

    useEffect(() => {
        const user = getAuthUser();
        if (!user || !["kitchen", "manager", "admin"].includes(user.role)) {
            router.push("/staff-login");
            return;
        }

        if (user.role !== "kitchen" && user.role !== "manager" && user.role !== "admin") {
            router.push("/staff/dashboard");
            return;
        }

        setStaffName(user.name);
    }, [router]);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;

        async function loadOrders() {
            setError("");
            try {
                const data = await apiFetch<BackendOrder[]>("/api/orders", { token });
                const mapped: KitchenOrder[] = data.map((order) => ({
                    id: order._id,
                    status: order.status,
                    createdAt: order.createdAt,
                    totalAmount: order.totalAmount,
                    tableNumber: order.tableNumber,
                    orderType: order.orderType,
                    customerPhone: order.customerPhone || order.userId?.phone,
                    address: order.address,
                    specialInstructions: order.specialInstructions,
                    items: order.items.map((item) => ({
                        name: item.menuItemId?.name || "Menu Item",
                        quantity: item.quantity,
                    })),
                }));
                setOrders(mapped);
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load kitchen orders");
            } finally {
                setLoading(false);
            }
        }

        void loadOrders();

        if (!socket.connected) {
            socket.connect();
        }

        const refreshOnEvent = () => {
            void loadOrders();
        };

        socket.on("order_created", refreshOnEvent);
        socket.on("order_status_updated", refreshOnEvent);

        return () => {
            socket.off("order_created", refreshOnEvent);
            socket.off("order_status_updated", refreshOnEvent);
        };
    }, [refreshTick]);

    const visibleOrders = useMemo(() => {
        const status = tabToStatus(tab);
        return orders
            .filter((order) => order.status === status)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [orders, tab]);

    const updateStatus = async (orderId: string, status: BackendOrderStatus) => {
        const token = getAuthToken();
        if (!token) return;

        const key = `${orderId}:${status}`;
        setActionKey(key);
        setError("");

        try {
            await apiFetch(`/api/orders/${orderId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status }),
            });

            setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update order status");
        } finally {
            setActionKey("");
        }
    };

    const logout = () => {
        clearAuthSession();
        router.push("/staff-login");
    };

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                        <p className="text-xs uppercase tracking-[0.2em] text-[#CFAF63]">Kitchen Display System</p>
                        <h1 className="font-(--font-heading) text-4xl text-[#F5F5F5]">Hello, {staffName}</h1>
                    </motion.div>

                    <button onClick={logout} className="inline-flex items-center gap-2 rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/15 px-4 py-2 text-sm text-[#FFB37A]">
                        <LogOut size={16} /> Logout
                    </button>
                </div>

                {error ? (
                    <div className="mb-4 rounded-xl border border-[#FF6A00]/40 bg-[#FF6A00]/10 px-4 py-3 text-sm text-[#FFD2AF]">
                        {error}
                    </div>
                ) : null}

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                    {(["new", "preparing", "ready"] as KitchenTab[]).map((item) => (
                        <button
                            key={item}
                            type="button"
                            onClick={() => setTab(item)}
                            className={`rounded-xl border px-4 py-3 text-left ${tab === item ? "border-[#CFAF63] bg-[#CFAF63]/15 text-[#F5F5F5]" : "border-[#2D2D2D] bg-[#121212] text-[#B8B8B8]"}`}
                        >
                            <p className="text-sm uppercase tracking-[0.15em]">{tabLabel[item]}</p>
                            <p className="mt-1 text-xs">{orders.filter((order) => order.status === tabToStatus(item)).length} orders</p>
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="rounded-xl border border-[#2D2D2D] bg-[#121212] p-6 text-sm text-[#B8B8B8]">Loading kitchen queue...</div>
                ) : visibleOrders.length === 0 ? (
                    <div className="rounded-xl border border-[#2D2D2D] bg-[#121212] p-6 text-sm text-[#B8B8B8]">No orders in this queue.</div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {visibleOrders.map((order) => (
                            <div key={order.id} className="rounded-2xl border border-[#2D2D2D] bg-[#121212] p-4">
                                <div className="mb-3 flex items-start justify-between gap-2">
                                    <div>
                                        <p className="text-sm uppercase tracking-[0.15em] text-[#CFAF63]">Order #{order.id.slice(-6).toUpperCase()}</p>
                                        <p className="text-xs text-[#B8B8B8]">{new Date(order.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                    <span className="rounded-full border border-[#CFAF63]/40 px-2 py-1 text-xs text-[#CFAF63]">
                                        {order.orderType ? orderTypeLabel[order.orderType] : "Order"}
                                    </span>
                                </div>

                                <div className="mb-3 space-y-1 text-xs text-[#B8B8B8]">
                                    {order.tableNumber ? <p>Table: {order.tableNumber}</p> : null}
                                    {order.customerPhone ? <p>Phone: {order.customerPhone}</p> : null}
                                    {order.address ? <p>Address: {order.address}</p> : null}
                                    {order.specialInstructions ? <p>Note: {order.specialInstructions}</p> : null}
                                </div>

                                <div className="mb-3 rounded-xl bg-[#0D0D0D] p-3">
                                    <p className="mb-2 text-xs uppercase tracking-[0.15em] text-[#8A8A8A]">Items</p>
                                    <div className="space-y-1 text-sm text-[#F5F5F5]">
                                        {order.items.map((item, idx) => (
                                            <p key={`${order.id}-${idx}`}>{item.quantity} x {item.name}</p>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-3 flex items-center justify-between text-sm text-[#D4D4D4]">
                                    <span className="inline-flex items-center gap-1"><ChefHat size={14} /> Kitchen total</span>
                                    <span>₹{order.totalAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {order.status === "placed" ? (
                                        <button
                                            type="button"
                                            onClick={() => void updateStatus(order.id, "preparing")}
                                            disabled={actionKey === `${order.id}:preparing`}
                                            className="inline-flex items-center gap-1 rounded-full bg-[#CFAF63] px-3 py-2 text-xs font-semibold text-[#111] disabled:opacity-60"
                                        >
                                            <Clock3 size={14} /> Accept
                                        </button>
                                    ) : null}

                                    {order.status === "preparing" ? (
                                        <button
                                            type="button"
                                            onClick={() => void updateStatus(order.id, "ready")}
                                            disabled={actionKey === `${order.id}:ready`}
                                            className="inline-flex items-center gap-1 rounded-full bg-[#00D98E] px-3 py-2 text-xs font-semibold text-[#0A291B] disabled:opacity-60"
                                        >
                                            <CheckCircle2 size={14} /> Mark Ready
                                        </button>
                                    ) : null}

                                    <button
                                        type="button"
                                        onClick={() => setRefreshTick((prev) => prev + 1)}
                                        className="inline-flex items-center gap-1 rounded-full border border-[#444] px-3 py-2 text-xs text-[#D4D4D4]"
                                    >
                                        <RefreshCw size={13} /> Refresh
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
