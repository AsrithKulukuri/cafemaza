"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarClock, CheckCircle, Clock, LogOut, Monitor, UtensilsCrossed, XCircle, Zap } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";
import { QuickOrderPanel } from "@/components/staff/QuickOrderPanel";
import { formatRelative } from "@/lib/time";

type OrderStatus = "new" | "preparing" | "ready" | "out_for_delivery" | "completed";
type ReservationStatus = "confirmed" | "completed" | "cancelled";
type ScreeningStatus = "pending" | "confirmed" | "completed" | "cancelled";

type BackendOrder = {
    _id: string;
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
    totalAmount: number;
    address: string;
    createdAt: string;
    customerPhone?: string;
    userId?: { name?: string; email?: string; phone?: string };
    deliveryOtp?: string;
    deliveryPartnerId?: { name?: string; phone?: string } | null;
    items: Array<{ quantity: number; menuItemId?: { name?: string; price?: number } }>;
};

type StaffOrder = {
    id: string;
    orderNumber: number;
    customerName: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    status: OrderStatus;
    total: number;
    createdAt: string;
    deliveryAddress: string;
    customerPhone?: string;
    deliveryOtp?: string;
    deliveryPartnerName?: string;
    deliveryPartnerPhone?: string;
};

type BackendReservation = {
    _id: string;
    name: string;
    phone: string;
    guests: number;
    date: string;
    time: string;
    tableNumber: number;
    status?: ReservationStatus;
};

type BackendScreening = {
    _id: string;
    name: string;
    phone: string;
    guests: number;
    date: string;
    time: string;
    occasion: string;
    contentType: "movie" | "sports" | "custom";
    status: ScreeningStatus;
};

function fromBackendOrderStatus(status: BackendOrder["status"]): OrderStatus {
    if (status === "placed") return "new";
    if (status === "preparing") return "preparing";
    if (status === "ready") return "ready";
    if (status === "out_for_delivery") return "out_for_delivery";
    return "completed";
}

function toBackendOrderStatus(status: OrderStatus): BackendOrder["status"] {
    if (status === "new") return "placed";
    if (status === "preparing") return "preparing";
    if (status === "ready") return "ready";
    if (status === "out_for_delivery") return "out_for_delivery";
    return "delivered";
}

function contentLabel(contentType: BackendScreening["contentType"]): string {
    if (contentType === "movie") return "Movie";
    if (contentType === "sports") return "Sports Match";
    return "Custom Content";
}

function contentIcon(contentType: BackendScreening["contentType"]): string {
    if (contentType === "movie") return "🎬";
    if (contentType === "sports") return "🏏";
    return "📺";
}

export default function StaffDashboard() {
    const router = useRouter();

    const [staffInfo, setStaffInfo] = useState<{ staffId: string; name: string; role: string } | null>(null);
    const [orders, setOrders] = useState<StaffOrder[]>([]);
    const [reservations, setReservations] = useState<BackendReservation[]>([]);
    const [screenings, setScreenings] = useState<BackendScreening[]>([]);
    const [activeTab, setActiveTab] = useState<OrderStatus>("new");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionKey, setActionKey] = useState("");
    const canQuickOrder = staffInfo ? ["staff", "bearer", "manager", "admin"].includes(staffInfo.role) : false;
    const canSeeOperations = staffInfo ? ["manager", "admin"].includes(staffInfo.role) : false;

    useEffect(() => {
        const logged = getAuthUser();
        if (!logged || !["staff", "bearer", "kitchen", "manager", "admin"].includes(logged.role)) {
            router.push("/staff-login");
            return;
        }

        if (logged.role === "kitchen") {
            router.push("/kitchen/dashboard");
            return;
        }

        if (logged.role === "bearer") {
            router.push("/bearer/dashboard");
            return;
        }

        setStaffInfo({
            staffId: logged.id.slice(-6).toUpperCase(),
            name: logged.name,
            role: logged.role,
        });
    }, [router]);

    useEffect(() => {
        const logged = getAuthUser();
        const token = getAuthToken();
        if (!token) {
            return;
        }

        async function loadDashboardData() {
            setError("");
            try {
                const [ordersRes, reservationsRes, screeningsRes] = await Promise.all([
                    apiFetch<BackendOrder[]>("/api/orders", { token }),
                    logged && ["manager", "admin"].includes(logged.role)
                        ? apiFetch<BackendReservation[]>("/api/reservations", { token })
                        : Promise.resolve([] as BackendReservation[]),
                    logged && ["manager", "admin"].includes(logged.role)
                        ? apiFetch<BackendScreening[]>("/api/screening", { token })
                        : Promise.resolve([] as BackendScreening[]),
                ]);

                setOrders(
                    ordersRes.map((order, index) => ({
                        id: order._id,
                        orderNumber: 1000 + index,
                        customerName: order.userId?.name || order.userId?.email || "Customer",
                        items: order.items.map((item) => ({
                            name: item.menuItemId?.name || "Menu Item",
                            quantity: item.quantity,
                            price: item.menuItemId?.price || 0,
                        })),
                        status: fromBackendOrderStatus(order.status),
                        total: order.totalAmount,
                        createdAt: order.createdAt,
                        deliveryAddress: order.address,
                        customerPhone: order.userId?.phone || order.customerPhone || undefined,
                        deliveryOtp: order.deliveryOtp || undefined,
                        deliveryPartnerName: order.deliveryPartnerId?.name || undefined,
                        deliveryPartnerPhone: order.deliveryPartnerId?.phone || undefined,
                    }))
                );

                setReservations(
                    reservationsRes.map((reservation) => ({
                        ...reservation,
                        status: reservation.status || "confirmed",
                    }))
                );

                setScreenings(screeningsRes);
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        }

        loadDashboardData();

        if (!socket.connected) {
            socket.connect();
        }

        const handleOrderChanged = () => {
            loadDashboardData();
        };

        socket.on("order_created", handleOrderChanged);
        socket.on("order_status_updated", handleOrderChanged);
        socket.on("order_delivery_assigned", handleOrderChanged);

        return () => {
            socket.off("order_created", handleOrderChanged);
            socket.off("order_status_updated", handleOrderChanged);
            socket.off("order_delivery_assigned", handleOrderChanged);
        };
    }, []);

    // refresh relative timestamps every minute
    const [timeTick, setTimeTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTimeTick((t) => t + 1), 60 * 1000);
        return () => clearInterval(id);
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        router.push("/staff-login");
    };

    const updateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
        const token = getAuthToken();
        if (!token) return;

        const key = `order:${orderId}:${newStatus}`;
        setActionKey(key);

        try {
            await apiFetch(`/api/orders/${orderId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status: toBackendOrderStatus(newStatus) }),
            });

            setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order)));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update order");
        } finally {
            setActionKey("");
        }
    };

    const updateReservationStatus = async (reservationId: string, status: ReservationStatus) => {
        const token = getAuthToken();
        if (!token) return;

        const key = `reservation:${reservationId}:${status}`;
        setActionKey(key);

        try {
            const updated = await apiFetch<BackendReservation>(`/api/reservations/${reservationId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status }),
            });

            setReservations((prev) => prev.map((reservation) => (reservation._id === reservationId ? updated : reservation)));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update reservation");
        } finally {
            setActionKey("");
        }
    };

    const updateScreeningStatus = async (screeningId: string, status: ScreeningStatus) => {
        const token = getAuthToken();
        if (!token) return;

        const key = `screening:${screeningId}:${status}`;
        setActionKey(key);

        try {
            const updated = await apiFetch<BackendScreening>(`/api/screening/${screeningId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status }),
            });

            setScreenings((prev) => prev.map((screening) => (screening._id === screeningId ? updated : screening)));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update screening booking");
        } finally {
            setActionKey("");
        }
    };

    const statusConfig = {
        new: { icon: Zap, label: "New Orders", color: "text-[#FF6A00]", bg: "bg-[#FF6A00]/10" },
        preparing: { icon: Clock, label: "Preparing", color: "text-[#CFAF63]", bg: "bg-[#CFAF63]/10" },
        ready: { icon: CheckCircle, label: "Ready", color: "text-[#00D98E]", bg: "bg-[#00D98E]/10" },
        out_for_delivery: { icon: UtensilsCrossed, label: "Out for Delivery", color: "text-[#6CA3EA]", bg: "bg-[#3B82F6]/10" },
        completed: { icon: CheckCircle, label: "Completed", color: "text-[#888]", bg: "bg-[#888]/10" },
    };

    const orderTabs: OrderStatus[] = ["new", "preparing", "ready", "out_for_delivery", "completed"];
    const visibleOperations = canSeeOperations;
    const currentOrders = useMemo(() => orders.filter((order) => order.status === activeTab), [orders, activeTab]);
    const activeReservations = useMemo(
        () => reservations.filter((reservation) => reservation.status !== "cancelled" && reservation.status !== "completed"),
        [reservations]
    );
    const activeScreenings = useMemo(
        () => screenings.filter((screening) => screening.status === "pending" || screening.status === "confirmed"),
        [screenings]
    );

    if (!staffInfo) return null;

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-3.5 sm:p-6 pt-16 sm:pt-20 pb-16">
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#CFAF63]">Welcome,</p>
                    <h1 className="font-(--font-heading) text-2xl sm:text-4xl text-[#F5F5F5] mt-0.5">{staffInfo.name}</h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-[#999]">Staff ID: {staffInfo.staffId}</p>
                </motion.div>
                <button
                    onClick={handleLogout}
                    className="self-start sm:self-auto flex items-center gap-2 rounded-full bg-[#FF6A00]/20 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[#FF6A00] transition hover:bg-[#FF6A00]/30 min-h-[38px] cursor-pointer"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>

            {error && (
                <div className="mb-4 sm:mb-6 rounded-xl border border-[#FF6A00]/35 bg-[#FF6A00]/10 p-3 text-xs sm:text-sm text-[#FFC79A]">
                    {error}
                </div>
            )}

            <div className="mb-6 sm:mb-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
                {orderTabs.map((tab) => {
                    const count = orders.filter((order) => order.status === tab).length;
                    const config = statusConfig[tab];
                    const Icon = config.icon;
                    return (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`rounded-xl sm:rounded-2xl border p-3 sm:p-4 text-left transition cursor-pointer min-h-[64px] ${activeTab === tab ? `border-[#CFAF63] ${config.bg}` : "border-[#333] hover:border-[#CFAF63]/40"}`}
                        >
                            <div className="flex items-center justify-between gap-1">
                                <div>
                                    <p className="text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.15em] text-[#999]">{config.label}</p>
                                    <p className={`mt-1 sm:mt-2 text-xl sm:text-3xl font-bold ${config.color}`}>{count}</p>
                                </div>
                                <Icon className={`${config.color} shrink-0`} size={20} />
                            </div>
                        </button>
                    );
                })}
            </div>

            <section>
                <h2 className="mb-3 sm:mb-4 font-(--font-heading) text-xl sm:text-2xl text-[#F5F5F5]">{statusConfig[activeTab].label}</h2>
                {isLoading ? (
                    <div className="rounded-2xl border border-[#333] p-8 text-center text-[#999]">Loading orders...</div>
                ) : currentOrders.length === 0 ? (
                    <div className="rounded-2xl border border-[#333] p-8 text-center text-[#999]">No orders in this stage</div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {currentOrders.map((order, idx) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="rounded-2xl border border-[#CFAF63]/25 p-6 transition hover:border-[#CFAF63]/55"
                            >
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <p className="text-xs uppercase tracking-widest text-[#CFAF63]">Order #{order.orderNumber}</p>
                                        <p className="text-lg font-semibold text-[#F5F5F5]">{order.customerName}</p>
                                    </div>
                                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusConfig[activeTab].bg} ${statusConfig[activeTab].color}`}>
                                        🚗 Delivery
                                    </span>
                                </div>

                                <div className="mb-4 space-y-2 rounded-xl bg-[#111]/50 p-3">
                                    {order.items.map((item, itemIndex) => (
                                        <div key={`${order.id}-${itemIndex}`} className="flex justify-between text-sm">
                                            <span className="text-[#CCC]">{item.name} x{item.quantity}</span>
                                            <span className="text-[#CFAF63]">₹{item.price * item.quantity}</span>
                                        </div>
                                    ))}
                                </div>

                                <p className="mb-2 text-xs text-[#8D8D8D]">Deliver to: {order.deliveryAddress}</p>
                                {order.customerPhone ? (
                                    <p className="mb-1 text-xs text-[#8D8D8D]">Customer Phone: {order.customerPhone}</p>
                                ) : null}
                                {order.deliveryPartnerName ? (
                                    <p className="mb-1 text-xs text-[#6CA3EA]">Delivery Partner: {order.deliveryPartnerName}</p>
                                ) : null}
                                {order.deliveryPartnerPhone ? (
                                    <p className="mb-1 text-xs text-[#8D8D8D]">Partner Phone: {order.deliveryPartnerPhone}</p>
                                ) : null}
                                {order.deliveryOtp ? (
                                    <p className="mb-2 text-xs font-semibold text-[#CFAF63]">Delivery OTP: {order.deliveryOtp}</p>
                                ) : null}
                                <div className="mb-4 flex items-center justify-between border-b border-[#333] pb-4">
                                    <p className="text-sm text-[#999]">{formatRelative(order.createdAt)}</p>
                                    <p className="text-lg font-bold text-[#CFAF63]">₹{order.total}</p>
                                </div>

                                {activeTab === "new" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "preparing")}
                                        disabled={actionKey === `order:${order.id}:preparing`}
                                        className="w-full rounded-lg bg-linear-to-r from-[#CFAF63] to-[#FF6A00] py-2 text-sm font-semibold text-[#111] transition hover:shadow-lg disabled:opacity-60"
                                    >
                                        {actionKey === `order:${order.id}:preparing` ? "Updating..." : "Start Preparing"}
                                    </button>
                                )}
                                {activeTab === "preparing" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "ready")}
                                        disabled={actionKey === `order:${order.id}:ready`}
                                        className="w-full rounded-lg bg-linear-to-r from-[#CFAF63] to-[#FF6A00] py-2 text-sm font-semibold text-[#111] transition hover:shadow-lg disabled:opacity-60"
                                    >
                                        {actionKey === `order:${order.id}:ready` ? "Updating..." : "Mark Ready"}
                                    </button>
                                )}
                                {activeTab === "ready" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "out_for_delivery")}
                                        disabled={actionKey === `order:${order.id}:out_for_delivery`}
                                        className="w-full rounded-lg bg-[#3B82F6]/20 py-2 text-sm font-semibold text-[#6CA3EA] transition hover:bg-[#3B82F6]/30 disabled:opacity-60"
                                    >
                                        {actionKey === `order:${order.id}:out_for_delivery` ? "Updating..." : "Hand Over to Delivery"}
                                    </button>
                                )}
                                {activeTab === "out_for_delivery" && (
                                    <button
                                        onClick={() => updateOrderStatus(order.id, "completed")}
                                        disabled={actionKey === `order:${order.id}:completed`}
                                        className="w-full rounded-lg bg-[#00D98E]/20 py-2 text-sm font-semibold text-[#00D98E] transition hover:bg-[#00D98E]/30 disabled:opacity-60"
                                    >
                                        {actionKey === `order:${order.id}:completed` ? "Updating..." : "Complete Order"}
                                    </button>
                                )}
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>

            {canQuickOrder ? (
                <section className="mt-10">
                    <QuickOrderPanel />
                </section>
            ) : null}

            {visibleOperations ? (
                <section className="mt-10">
                    <div className="mb-5 flex items-center gap-2">
                        <CalendarClock size={20} className="text-[#CFAF63]" />
                        <h2 className="font-(--font-heading) text-2xl text-[#F5F5F5]">Table Reservations</h2>
                        <span className="ml-2 rounded-full bg-[#CFAF63]/20 px-2.5 py-0.5 text-xs font-semibold text-[#CFAF63]">
                            {activeReservations.length}
                        </span>
                    </div>

                    {activeReservations.length === 0 ? (
                        <div className="rounded-2xl border border-[#333] p-8 text-center text-[#999]">No active reservations</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeReservations.map((reservation) => (
                                <div
                                    key={reservation._id}
                                    className="rounded-2xl border border-[#CFAF63]/25 bg-linear-to-br from-[#11100B] to-[#0B0B0B] p-5"
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.12em] text-[#CFAF63]">Table #{reservation.tableNumber}</p>
                                            <p className="text-base font-semibold text-[#F5F5F5]">{reservation.name}</p>
                                        </div>
                                        <span className="rounded-full bg-[#CFAF63]/20 px-2.5 py-1 text-xs font-semibold text-[#CFAF63]">
                                            {reservation.status}
                                        </span>
                                    </div>

                                    <div className="mb-4 space-y-1.5 rounded-xl bg-[#111]/50 p-3 text-sm text-[#CCC]">
                                        <div className="flex justify-between"><span className="text-[#999]">Date & Time</span><span>{reservation.date} · {reservation.time}</span></div>
                                        <div className="flex justify-between"><span className="text-[#999]">Guests</span><span>{reservation.guests}</span></div>
                                        <div className="flex justify-between"><span className="text-[#999]">Phone</span><span>{reservation.phone}</span></div>
                                    </div>

                                    <div className="flex gap-2">
                                        {reservation.status === "confirmed" && (
                                            <>
                                                <button
                                                    onClick={() => updateReservationStatus(reservation._id, "completed")}
                                                    disabled={actionKey === `reservation:${reservation._id}:completed`}
                                                    className="flex-1 rounded-lg bg-[#00D98E]/20 py-2 text-xs font-semibold text-[#00D98E] transition hover:bg-[#00D98E]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `reservation:${reservation._id}:completed` ? "Updating..." : "Complete"}
                                                </button>
                                                <button
                                                    onClick={() => updateReservationStatus(reservation._id, "cancelled")}
                                                    disabled={actionKey === `reservation:${reservation._id}:cancelled`}
                                                    className="flex-1 rounded-lg bg-[#FF6A00]/20 py-2 text-xs font-semibold text-[#FF6A00] transition hover:bg-[#FF6A00]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `reservation:${reservation._id}:cancelled` ? "Updating..." : "Cancel"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}

            {visibleOperations ? (
                <section className="mt-10">
                    <div className="mb-5 flex items-center gap-2">
                        <Monitor size={20} className="text-[#CFAF63]" />
                        <h2 className="font-(--font-heading) text-2xl text-[#F5F5F5]">Screening Reservations</h2>
                        <span className="ml-2 rounded-full bg-[#CFAF63]/20 px-2.5 py-0.5 text-xs font-semibold text-[#CFAF63]">
                            {activeScreenings.length}
                        </span>
                    </div>

                    {activeScreenings.length === 0 ? (
                        <div className="rounded-2xl border border-[#333] p-8 text-center text-[#999]">No active screening bookings</div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {activeScreenings.map((screening, idx) => (
                                <motion.div
                                    key={screening._id}
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.04 }}
                                    className="rounded-2xl border border-[#CFAF63]/25 bg-linear-to-br from-[#0F0D08] to-[#0B0B0B] p-5"
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.12em] text-[#CFAF63]">Private Screening</p>
                                            <p className="mt-0.5 text-base font-semibold text-[#F5F5F5]">{screening.name}</p>
                                        </div>
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${screening.status === "confirmed" ? "bg-[#00D98E]/15 text-[#00D98E]" : "bg-[#CFAF63]/15 text-[#CFAF63]"}`}>
                                            {screening.status}
                                        </span>
                                    </div>

                                    <div className="mb-4 space-y-1.5 rounded-xl bg-[#111]/50 p-3 text-sm text-[#CCC]">
                                        <div className="flex justify-between"><span className="text-[#999]">Date & Time</span><span>{screening.date} · {screening.time}</span></div>
                                        <div className="flex justify-between"><span className="text-[#999]">Guests</span><span>{screening.guests}</span></div>
                                        <div className="flex justify-between"><span className="text-[#999]">Content</span><span>{contentIcon(screening.contentType)} {contentLabel(screening.contentType)}</span></div>
                                        <div className="flex justify-between"><span className="text-[#999]">Occasion</span><span>{screening.occasion}</span></div>
                                    </div>

                                    <p className="mb-3 text-xs text-[#666]">📞 {screening.phone}</p>

                                    <div className="flex gap-2">
                                        {screening.status === "pending" && (
                                            <>
                                                <button
                                                    onClick={() => updateScreeningStatus(screening._id, "confirmed")}
                                                    disabled={actionKey === `screening:${screening._id}:confirmed`}
                                                    className="flex-1 rounded-lg bg-[#00D98E]/20 py-2 text-xs font-semibold text-[#00D98E] transition hover:bg-[#00D98E]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `screening:${screening._id}:confirmed` ? "Updating..." : "Confirm"}
                                                </button>
                                                <button
                                                    onClick={() => updateScreeningStatus(screening._id, "cancelled")}
                                                    disabled={actionKey === `screening:${screening._id}:cancelled`}
                                                    className="flex-1 rounded-lg bg-[#FF6A00]/20 py-2 text-xs font-semibold text-[#FF6A00] transition hover:bg-[#FF6A00]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `screening:${screening._id}:cancelled` ? "Updating..." : "Cancel"}
                                                </button>
                                            </>
                                        )}
                                        {screening.status === "confirmed" && (
                                            <>
                                                <button
                                                    onClick={() => updateScreeningStatus(screening._id, "completed")}
                                                    disabled={actionKey === `screening:${screening._id}:completed`}
                                                    className="flex-1 rounded-lg bg-[#00D98E]/20 py-2 text-xs font-semibold text-[#00D98E] transition hover:bg-[#00D98E]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `screening:${screening._id}:completed` ? "Updating..." : "Complete"}
                                                </button>
                                                <button
                                                    onClick={() => updateScreeningStatus(screening._id, "cancelled")}
                                                    disabled={actionKey === `screening:${screening._id}:cancelled`}
                                                    className="flex-1 rounded-lg bg-[#FF6A00]/20 py-2 text-xs font-semibold text-[#FF6A00] transition hover:bg-[#FF6A00]/30 disabled:opacity-60"
                                                >
                                                    {actionKey === `screening:${screening._id}:cancelled` ? "Updating..." : "Cancel"}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </section>
            ) : null}

            <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[#333] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#CFAF63]"><UtensilsCrossed size={18} /> Kitchen Throughput</div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">{orders.filter((order) => order.status === "preparing").length}</p>
                    <p className="text-xs text-[#888]">Orders currently being prepared</p>
                </div>
                <div className="rounded-2xl border border-[#333] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#00D98E]"><CheckCircle size={18} /> Ready Queue</div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">{orders.filter((order) => order.status === "ready").length}</p>
                    <p className="text-xs text-[#888]">Orders ready for handoff</p>
                </div>
                <div className="rounded-2xl border border-[#333] p-4">
                    <div className="mb-2 flex items-center gap-2 text-[#FF6A00]"><XCircle size={18} /> Attention</div>
                    <p className="text-2xl font-bold text-[#F5F5F5]">{screenings.filter((s) => s.status === "pending").length}</p>
                    <p className="text-xs text-[#888]">Screenings awaiting confirmation</p>
                </div>
            </section>
        </div>
    );
}
