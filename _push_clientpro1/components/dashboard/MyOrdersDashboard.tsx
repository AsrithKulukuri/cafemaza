"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingBag, Calendar, Film, Clock, MapPin, Check, Truck, AlertCircle } from "lucide-react";
import { getAuthToken, getAuthUser } from "@/lib/authToken";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { apiFetch } from "@/lib/api";

interface Order {
    id: string;
    orderNumber: string;
    items: string[];
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled";
    total: number;
    orderType: "delivery" | "takeaway" | "dine-in";
    deliveryAddress?: string;
    tableNumber?: number;
    createdAt: string;
    estimatedTime?: string;
}

type BackendOrder = {
    _id: string;
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
    totalAmount: number;
    address: string;
    createdAt: string;
    items: Array<{
        quantity: number;
        menuItemId?: {
            name?: string;
        };
    }>;
};

interface Reservation {
    id: string;
    date: string;
    time: string;
    guests: number;
    tableNumber: number;
    status: "confirmed" | "cancelled" | "completed";
    notes?: string;
    createdAt: string;
}

interface Screening {
    id: string;
    name: string;
    date: string;
    time: string;
    tickets: number;
    status: "booked" | "cancelled" | "completed";
    seatNumbers: string;
    createdAt: string;
    totalPrice: number;
}

export default function MyOrdersDashboard() {
    const [activeTab, setActiveTab] = useState<"orders" | "reservations" | "screenings">("orders");
    const [orders, setOrders] = useState<Order[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [screenings, setScreenings] = useState<Screening[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [user, setUser] = useState<{ name?: string; email?: string } | null>(null);

    const mapBackendOrders = (ordersData: BackendOrder[]): Order[] => {
        return (ordersData || []).map((order) => ({
            id: order._id,
            orderNumber: order._id,
            items: order.items.map((item) => `${item.menuItemId?.name || "Menu Item"} x${item.quantity}`),
            status: order.status,
            total: order.totalAmount,
            orderType: "delivery",
            deliveryAddress: order.address,
            createdAt: order.createdAt,
            estimatedTime: order.status === "delivered" ? undefined : "In progress",
        }));
    };

    useEffect(() => {
        async function loadUserData() {
            try {
                setLoading(true);
                const appUser = getAuthUser();
                let supabaseUserEmail = "";
                let supabaseUserPhone = "";

                if (appUser) {
                    setUser({ name: appUser.name, email: appUser.email });
                } else {
                    const supabase = createSupabaseBrowserClient();
                    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
                    if (supabaseUser) {
                        setUser({ name: supabaseUser.user_metadata?.name || supabaseUser.email, email: supabaseUser.email });
                        supabaseUserEmail = supabaseUser.email || "";

                        const profileResponse = await fetch("/api/auth/profile", { method: "GET" });
                        if (profileResponse.ok) {
                            const profileData = await profileResponse.json();
                            supabaseUserPhone =
                                profileData?.profile?.phone_e164 ||
                                profileData?.profile?.pending_phone_e164 ||
                                "";
                        }
                    }
                }

                // Load orders
                const token = getAuthToken();
                if (token) {
                    const ordersData = await apiFetch<BackendOrder[]>("/api/orders/user", { token });
                    setOrders(mapBackendOrders(ordersData));
                } else if (supabaseUserEmail || supabaseUserPhone) {
                    const query = new URLSearchParams();
                    if (supabaseUserEmail) {
                        query.set("email", supabaseUserEmail);
                    }
                    if (supabaseUserPhone) {
                        query.set("phone", supabaseUserPhone);
                    }

                    const ordersData = await apiFetch<BackendOrder[]>(`/api/orders/public?${query.toString()}`);
                    setOrders(mapBackendOrders(ordersData));
                } else {
                    setOrders([]);
                }

                // Mock reservations and screenings
                setReservations(mockReservations);
                setScreenings(mockScreenings);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load data");
                setOrders([]);
                setReservations(mockReservations);
                setScreenings(mockScreenings);
            } finally {
                setLoading(false);
            }
        }

        loadUserData();
    }, []);

    const getOrderStatusColor = (status: Order["status"]) => {
        const colors: Record<Order["status"], string> = {
            placed: "bg-[#3B82F6]/20 text-[#3B82F6]",
            preparing: "bg-[#F59E0B]/20 text-[#F59E0B]",
            ready: "bg-[#10B981]/20 text-[#10B981]",
            out_for_delivery: "bg-[#FF6A00]/20 text-[#FF6A00]",
            delivered: "bg-[#00D98E]/20 text-[#00D98E]",
            cancelled: "bg-[#EF4444]/20 text-[#EF4444]",
        };
        return colors[status];
    };

    const getOrderStatusIcon = (status: Order["status"]) => {
        const icons: Record<Order["status"], React.ReactNode> = {
            placed: <Clock size={16} />,
            preparing: <AlertCircle size={16} />,
            ready: <Check size={16} />,
            out_for_delivery: <Truck size={16} />,
            delivered: <Check size={16} />,
            cancelled: <AlertCircle size={16} />,
        };
        return icons[status];
    };

    const getReservationStatusColor = (status: Reservation["status"]) => {
        const colors: Record<Reservation["status"], string> = {
            confirmed: "bg-[#10B981]/20 text-[#10B981]",
            cancelled: "bg-[#EF4444]/20 text-[#EF4444]",
            completed: "bg-[#00D98E]/20 text-[#00D98E]",
        };
        return colors[status];
    };

    const getScreeningStatusColor = (status: Screening["status"]) => {
        const colors: Record<Screening["status"], string> = {
            booked: "bg-[#8B5CF6]/20 text-[#8B5CF6]",
            cancelled: "bg-[#EF4444]/20 text-[#EF4444]",
            completed: "bg-[#00D98E]/20 text-[#00D98E]",
        };
        return colors[status];
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="w-12 h-12 border-4 border-[#CFAF63]/30 border-t-[#CFAF63] rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6 md:p-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Customer Dashboard</p>
                <h1 className="font-[var(--font-heading)] text-5xl text-[#F5F5F5] mt-2">My Orders & Bookings</h1>
                {user && (
                    <p className="text-[#999] mt-4">Welcome back, <span className="text-[#CFAF63]">{user.name || user.email}</span>!</p>
                )}
            </motion.div>

            {/* Tabs */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex gap-4 border-b border-[#333]"
            >
                {[
                    { id: "orders" as const, icon: ShoppingBag, label: "My Orders" },
                    { id: "reservations" as const, icon: Calendar, label: "Reservations" },
                    { id: "screenings" as const, icon: Film, label: "Screenings" },
                ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition ${isActive
                                ? "border-[#FF6A00] text-[#FF6A00]"
                                : "border-transparent text-[#999] hover:text-[#CFAF63]"
                                }`}
                        >
                            <Icon size={20} />
                            <span className="text-sm font-semibold">{tab.label}</span>
                            {tab.id === "orders" && orders.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-bold">
                                    {orders.length}
                                </span>
                            )}
                            {tab.id === "reservations" && reservations.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-bold">
                                    {reservations.length}
                                </span>
                            )}
                            {tab.id === "screenings" && screenings.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-bold">
                                    {screenings.length}
                                </span>
                            )}
                        </button>
                    );
                })}
            </motion.div>

            {/* Content */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-6xl"
            >
                {/* Orders Tab */}
                {activeTab === "orders" && (
                    <div className="space-y-4">
                        {orders.length === 0 ? (
                            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-8 text-center">
                                <ShoppingBag size={48} className="mx-auto text-[#666] mb-4" />
                                <p className="text-[#999]">No orders yet. Start ordering now!</p>
                            </div>
                        ) : (
                            orders.map((order, idx) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 hover:border-[#CFAF63]/50 transition"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Left: Order Info */}
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <p className="text-xs uppercase tracking-[0.1em] text-[#CFAF63] mb-1">Order #{order.orderNumber.slice(-6)}</p>
                                                    <p className="text-lg font-semibold text-[#F5F5F5]">{order.items.join(", ")}</p>
                                                </div>
                                                <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold ${getOrderStatusColor(order.status)}`}>
                                                    {getOrderStatusIcon(order.status)}
                                                    {order.status.replace(/_/g, " ")}
                                                </span>
                                            </div>
                                            <p className="text-[#999] text-sm mb-2">Order Type: <span className="text-[#CFAF63]">{order.orderType === "delivery" ? "🚚 Delivery" : order.orderType === "takeaway" ? "🛍️ Takeaway" : "🍽️ Dine-in"}</span></p>
                                            <p className="text-[#999] text-sm">Placed: {new Date(order.createdAt).toLocaleDateString()}</p>
                                        </div>

                                        {/* Right: Delivery/Details */}
                                        <div>
                                            <div className="flex items-start justify-between h-full">
                                                <div>
                                                    {order.deliveryAddress && (
                                                        <>
                                                            <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-2">Delivery Address</p>
                                                            <div className="flex items-start gap-2 mb-4">
                                                                <MapPin size={16} className="text-[#FF6A00] mt-0.5 flex-shrink-0" />
                                                                <p className="text-[#F5F5F5] text-sm">{order.deliveryAddress}</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    {order.tableNumber && (
                                                        <>
                                                            <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-2">Table Number</p>
                                                            <p className="text-[#CFAF63] font-semibold text-lg">Table {order.tableNumber}</p>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-1">Total</p>
                                                    <p className="text-2xl font-bold text-[#CFAF63]">₹{order.total}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {order.estimatedTime && (
                                        <div className="mt-4 pt-4 border-t border-[#333]">
                                            <div className="flex items-center justify-between gap-3 text-[#999] text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} />
                                                    <span>Estimated time: {order.estimatedTime}</span>
                                                </div>
                                                <Link
                                                    href={`/order-tracking?orderId=${order.id}`}
                                                    className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-xs text-[#CFAF63] hover:border-[#FF6A00] hover:text-[#FF6A00]"
                                                >
                                                    Track Live
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                {/* Reservations Tab */}
                {activeTab === "reservations" && (
                    <div className="space-y-4">
                        {reservations.length === 0 ? (
                            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-8 text-center">
                                <Calendar size={48} className="mx-auto text-[#666] mb-4" />
                                <p className="text-[#999]">No reservations yet. Book a table now!</p>
                            </div>
                        ) : (
                            reservations.map((res, idx) => (
                                <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 hover:border-[#CFAF63]/50 transition"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-[#CFAF63] mb-2">Date & Time</p>
                                            <p className="text-lg font-semibold text-[#F5F5F5] mb-1">
                                                📅 {new Date(res.date).toLocaleDateString()}
                                            </p>
                                            <p className="text-[#999] text-sm">⏰ {res.time}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-[#CFAF63] mb-2">Reservation Details</p>
                                            <p className="text-[#F5F5F5] text-sm mb-2">👥 {res.guests} Guests</p>
                                            <p className="text-[#CFAF63] text-sm font-semibold">🪑 Table {res.tableNumber}</p>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                {res.notes && (
                                                    <>
                                                        <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-1">Notes</p>
                                                        <p className="text-[#999] text-sm">{res.notes}</p>
                                                    </>
                                                )}
                                            </div>
                                            <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold ${getReservationStatusColor(res.status)}`}>
                                                <Check size={14} />
                                                {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}

                {/* Screenings Tab */}
                {activeTab === "screenings" && (
                    <div className="space-y-4">
                        {screenings.length === 0 ? (
                            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-8 text-center">
                                <Film size={48} className="mx-auto text-[#666] mb-4" />
                                <p className="text-[#999]">No screenings booked yet. Book your screening now!</p>
                            </div>
                        ) : (
                            screenings.map((screening, idx) => (
                                <motion.div
                                    key={screening.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 hover:border-[#CFAF63]/50 transition"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-[#CFAF63] mb-2">Screening</p>
                                            <p className="text-lg font-semibold text-[#F5F5F5] mb-3">🎬 {screening.name}</p>
                                            <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-1">Booked</p>
                                            <p className="text-[#F5F5F5] text-sm">{new Date(screening.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.1em] text-[#CFAF63] mb-2">Screening Details</p>
                                            <p className="text-[#F5F5F5] text-sm mb-2">📅 {new Date(screening.date).toLocaleDateString()}</p>
                                            <p className="text-[#F5F5F5] text-sm mb-2">⏰ {screening.time}</p>
                                            <p className="text-[#F5F5F5] text-sm">🎫 {screening.tickets} Tickets</p>
                                        </div>
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-1">Seats</p>
                                                <p className="text-[#CFAF63] font-semibold mb-3">{screening.seatNumbers}</p>
                                                <p className="text-xs uppercase tracking-[0.1em] text-[#999] mb-1">Total Price</p>
                                                <p className="text-2xl font-bold text-[#FF6A00]">₹{screening.totalPrice}</p>
                                            </div>
                                            <span className={`flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold h-fit ${getScreeningStatusColor(screening.status)}`}>
                                                <Film size={14} />
                                                {screening.status.charAt(0).toUpperCase() + screening.status.slice(1)}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    );
}

const mockReservations: Reservation[] = [
    {
        id: "r1",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: "19:30",
        guests: 4,
        tableNumber: 7,
        status: "confirmed",
        notes: "Window seating preferred",
        createdAt: new Date().toISOString(),
    },
    {
        id: "r2",
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        time: "13:00",
        guests: 2,
        tableNumber: 3,
        status: "completed",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

const mockScreenings: Screening[] = [
    {
        id: "s1",
        name: "Pathaan - Premium Screening",
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        time: "20:00",
        tickets: 2,
        status: "booked",
        seatNumbers: "A5, A6",
        totalPrice: 800,
        createdAt: new Date().toISOString(),
    },
    {
        id: "s2",
        name: "Jawan - Live Screening",
        date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        time: "18:00",
        tickets: 4,
        status: "completed",
        seatNumbers: "B1, B2, B3, B4",
        totalPrice: 1600,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    },
];
