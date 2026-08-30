"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ChefHat, Package, Truck, CheckCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/authToken";
import { socket } from "@/lib/socket";
import { OrderTrackingMap } from "@/components/order-tracking/OrderTrackingMap";

type BackendOrder = {
    _id: string;
    status: string;
    createdAt: string;
    address?: string;
    deliveryOtp?: string;
    deliveryPartnerId?: {
        _id?: string;
        name?: string;
        phone?: string;
        deliveryProfile?: {
            vehicleNumber?: string;
        };
    } | null;
};

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

interface TrackingStage {
    stage: string;
    timestamp: string;
    status: "completed" | "active" | "pending";
    icon: React.ReactNode;
    details: string;
}

export default function OrderTrackingPage() {
    const searchParams = useSearchParams();
    const [currentStatus, setCurrentStatus] = useState<string>("placed");
    const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString());
    const [orderId, setOrderId] = useState<string>(searchParams.get("orderId") ?? "");
    const [customerAddress, setCustomerAddress] = useState<string>("Your Delivery Address");
    const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
    const [assignedDelivery, setAssignedDelivery] = useState<{
        name: string;
        phone?: string;
        vehicleNumber?: string;
    } | null>(null);
    const [deliveryOtp, setDeliveryOtp] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [actionMessage, setActionMessage] = useState("");

    const trackingData = useMemo<TrackingStage[]>(() => {
        const flow = ["placed", "preparing", "ready", "out_for_delivery", "delivered"];
        const activeIndex = flow.indexOf(currentStatus);

        return [
            {
                stage: "Order Placed",
                timestamp: activeIndex >= 0 ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "pending",
                status: activeIndex > 0 ? "completed" : activeIndex === 0 ? "active" : "pending",
                icon: <CheckCircle />,
                details: "Your order has been received and confirmed",
            },
            {
                stage: "Preparing",
                timestamp: activeIndex >= 1 ? "updated" : "pending",
                status: activeIndex > 1 ? "completed" : activeIndex === 1 ? "active" : "pending",
                icon: <ChefHat />,
                details: "Our chefs are preparing your delicious meal",
            },
            {
                stage: "Ready for Pickup",
                timestamp: activeIndex >= 2 ? "updated" : "pending",
                status: activeIndex > 2 ? "completed" : activeIndex === 2 ? "active" : "pending",
                icon: <Package />,
                details: "Your order is ready and waiting for you",
            },
            {
                stage: "Out for Delivery",
                timestamp: activeIndex >= 3 ? "updated" : "pending",
                status: activeIndex > 3 ? "completed" : activeIndex === 3 ? "active" : "pending",
                icon: <Truck />,
                details: "Your order is on the way",
            },
            {
                stage: "Delivered",
                timestamp: activeIndex >= 4 ? "updated" : "pending",
                status: currentStatus === "delivered" ? "completed" : activeIndex === 4 ? "active" : "pending",
                icon: <CheckCircle />,
                details: "Order delivered to your location",
            },
        ];
    }, [createdAt, currentStatus]);

    const loadOrder = useCallback(
        async (showLoader: boolean) => {
            try {
                if (showLoader) {
                    setLoading(true);
                }

                setError("");
                const token = getAuthToken();

                if (!token) {
                    throw new Error("Please login to view order tracking");
                }

                const orders = await apiFetch<BackendOrder[]>("/api/orders/user", { token });

                const targetOrder = (orderId && orders.find((o) => o._id === orderId)) || orders[0];

                if (!targetOrder) {
                    throw new Error("No orders found for this account");
                }

                setOrderId(targetOrder._id);
                setCurrentStatus(targetOrder.status);
                setCreatedAt(targetOrder.createdAt);
                setCustomerAddress(targetOrder.address || "Your Delivery Address");
                setCustomerCoords(parseCoordsFromAddress(targetOrder.address));
                setDeliveryOtp(targetOrder.deliveryOtp || null);

                if (targetOrder.deliveryPartnerId) {
                    setAssignedDelivery({
                        name: targetOrder.deliveryPartnerId.name || "Delivery Partner",
                        phone: targetOrder.deliveryPartnerId.phone || undefined,
                        vehicleNumber: targetOrder.deliveryPartnerId.deliveryProfile?.vehicleNumber || undefined,
                    });
                } else {
                    setAssignedDelivery(null);
                }
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load order");
            } finally {
                if (showLoader) {
                    setLoading(false);
                }
            }
        },
        [orderId],
    );

    useEffect(() => {
        void loadOrder(true);
    }, [loadOrder]);

    const handleRefreshStatus = useCallback(async () => {
        setRefreshing(true);
        setActionMessage("");
        await loadOrder(false);
        setActionMessage("Order status refreshed");
        setRefreshing(false);
    }, [loadOrder]);

    const handleContactDelivery = useCallback(() => {
        const phone = assignedDelivery?.phone?.trim();
        if (!phone) {
            setActionMessage("Delivery partner phone is not available yet");
            return;
        }

        const dialable = phone.replace(/[^\d+]/g, "");
        window.location.href = `tel:${dialable}`;
    }, [assignedDelivery?.phone]);

    useEffect(() => {
        if (!orderId) {
            return;
        }

        socket.connect();
        socket.emit("join_order", orderId);

        const onStatus = (payload: { orderId: string; status: string }) => {
            if (payload.orderId === orderId) {
                setCurrentStatus(payload.status);
            }
        };

        socket.on("order_status_updated", onStatus);

        const onAssigned = (payload: {
            orderId: string;
            deliveryPartner?: { name?: string; phone?: string; deliveryProfile?: { vehicleNumber?: string } };
        }) => {
            if (payload.orderId !== orderId) return;

            if (payload.deliveryPartner) {
                setAssignedDelivery({
                    name: payload.deliveryPartner.name || "Delivery Partner",
                    phone: payload.deliveryPartner.phone || undefined,
                    vehicleNumber: payload.deliveryPartner.deliveryProfile?.vehicleNumber || undefined,
                });
            }
        };

        socket.on("order_delivery_assigned", onAssigned);

        return () => {
            socket.off("order_status_updated", onStatus);
            socket.off("order_delivery_assigned", onAssigned);
            socket.disconnect();
        };
    }, [orderId]);

    if (loading) {
        return <div className="min-h-screen bg-[#0B0B0B] p-6 text-[#F5F5F5]">Loading tracking details...</div>;
    }

    if (error) {
        return <div className="min-h-screen bg-[#0B0B0B] p-6 text-rose-300">{error}</div>;
    }

    const completedStages = trackingData.filter((s) => s.status === "completed").length;
    const totalStages = trackingData.length;
    const progressPercent = (completedStages / totalStages) * 100;

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto mb-8"
            >
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Real-time</p>
                <h1 className="font-(--font-heading) text-4xl text-[#F5F5F5]">Order Tracking</h1>
                <p className="text-[#999] mt-2">Order #{orderId.slice(-6).toUpperCase()} • Placed at {new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
            </motion.div>

            {/* Main Tracking Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl mx-auto glass-card rounded-2xl sm:rounded-3xl border border-[#CFAF63]/25 p-4 sm:p-8"
            >
                {/* Progress Bar */}
                <div className="mb-6 sm:mb-8">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs sm:text-sm text-[#999]">Overall Progress</p>
                        <p className="text-xs sm:text-sm font-semibold text-[#CFAF63]">{completedStages}/{totalStages} Complete</p>
                    </div>
                    <div className="w-full bg-[#1A1A1A] rounded-full h-2.5 sm:h-3 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="h-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00]"
                        />
                    </div>
                </div>

                {/* Timeline */}
                <div className="space-y-3 sm:space-y-4">
                    {trackingData.map((stage, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex gap-3 sm:gap-6"
                        >
                            {/* Timeline Dot & Line */}
                            <div className="flex flex-col items-center relative flex-shrink-0">
                                <motion.div
                                    className={`w-9 h-9 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-base sm:text-xl relative z-10 ${stage.status === "completed"
                                        ? "bg-linear-to-br from-[#CFAF63] to-[#FF6A00] text-[#111]"
                                        : stage.status === "active"
                                            ? "bg-[#3B82F6] text-white animate-pulse"
                                            : "bg-[#222] text-[#666]"
                                        }`}
                                    animate={stage.status === "active" ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                                    transition={{ repeat: stage.status === "active" ? Infinity : 0, duration: 2 }}
                                >
                                    {stage.icon}
                                </motion.div>

                                {/* Vertical Line */}
                                {idx < trackingData.length - 1 && (
                                    <motion.div
                                        initial={{ height: 0 }}
                                        animate={{ height: "65px" }}
                                        transition={{ delay: idx * 0.1 + 0.2, duration: 0.6 }}
                                        className={`w-0.5 sm:w-1 mt-2 ${stage.status === "completed"
                                            ? "bg-linear-to-b from-[#CFAF63] to-[#FF6A00]"
                                            : "bg-[#333]"
                                            }`}
                                    />
                                )}
                            </div>

                            {/* Stage Info */}
                            <motion.div
                                className="pb-5 sm:pb-6 flex-1 min-w-0"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.1 + 0.1 }}
                            >
                                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                    <p className="font-(--font-heading) text-base sm:text-lg text-[#F5F5F5]">{stage.stage}</p>
                                    <span
                                        className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full font-semibold ${stage.status === "completed"
                                            ? "bg-[#00D98E]/20 text-[#00D98E]"
                                            : stage.status === "active"
                                                ? "bg-[#3B82F6]/20 text-[#3B82F6] animate-pulse"
                                                : "bg-[#333]/50 text-[#999]"
                                            }`}
                                    >
                                        {stage.status === "pending" ? "Pending" : stage.status === "active" ? "In Progress" : "Completed"}
                                    </span>
                                </div>
                                <p className="text-[#999] text-xs sm:text-sm mb-1.5 leading-snug">{stage.details}</p>

                                {/* Timestamp */}
                                {stage.timestamp !== "pending" && (
                                    <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-[#CFAF63]">
                                        <Clock size={13} />
                                        {stage.timestamp}
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Live Tracking Map - Show when partner is assigned */}
            {assignedDelivery || currentStatus === "out_for_delivery" || currentStatus === "delivered" ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="max-w-4xl mx-auto mt-6 sm:mt-8"
                >
                    <OrderTrackingMap
                        orderId={orderId}
                        orderStatus={currentStatus}
                        assignedDeliveryPartner={assignedDelivery || undefined}
                        customerLocation={{
                            address: customerAddress,
                            latitude: customerCoords?.latitude || 28.6139,
                            longitude: customerCoords?.longitude || 77.209,
                        }}
                    />
                </motion.div>
            ) : null}

            {/* Order Details Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="max-w-2xl mx-auto mt-6 sm:mt-8 glass-card rounded-2xl border border-[#CFAF63]/25 p-4 sm:p-6"
            >
                <h2 className="font-(--font-heading) text-lg sm:text-xl text-[#F5F5F5] mb-3 sm:mb-4">Order Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    {/* Live Order Info */}
                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Order</p>
                        <p className="text-[#F5F5F5] font-semibold text-sm sm:text-base">#{orderId.slice(-6).toUpperCase()}</p>
                        <p className="text-[#999] text-xs sm:text-sm">Status: {currentStatus.replaceAll("_", " ")}</p>
                        <p className="text-[#999] text-xs sm:text-sm">Live updates enabled</p>
                    </div>

                    {/* Order Items */}
                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Items</p>
                        <div className="space-y-0.5">
                            <p className="text-[#F5F5F5] text-xs sm:text-sm">Items synced from backend order</p>
                            <p className="text-[#999] text-[11px] sm:text-xs">Open checkout history for full line items</p>
                        </div>
                    </div>

                    {/* Delivery Type */}
                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Order Type</p>
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] text-xs font-semibold">
                            🚚 Live Order
                        </span>
                    </div>

                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Delivery Partner</p>
                        {assignedDelivery ? (
                            <>
                                <p className="text-[#F5F5F5] text-xs sm:text-sm font-medium">{assignedDelivery.name}</p>
                                <p className="text-[#999] text-xs sm:text-sm">{assignedDelivery.phone || "Phone unavailable"}</p>
                            </>
                        ) : (
                            <p className="text-[#999] text-xs sm:text-sm">Not assigned yet</p>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Delivery OTP</p>
                        <p className="text-[#F5F5F5] text-xs sm:text-sm">
                            {deliveryOtp ? `Share this code with your delivery partner: ${deliveryOtp}` : "OTP will appear when the order is assigned."}
                        </p>
                    </div>

                    {/* Estimated Time */}
                    <div>
                        <p className="text-[10px] sm:text-xs uppercase tracking-widest text-[#999] mb-1">Estimated Delivery</p>
                        <p className="text-[#F5F5F5] text-xs sm:text-sm">Status-driven live ETA</p>
                    </div>
                </div>
            </motion.div>

            {currentStatus === "delivered" ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="max-w-2xl mx-auto mt-6 rounded-2xl border border-[#00D98E]/30 bg-[#0F1915] p-5 sm:p-6 text-center"
                >
                    <h3 className="font-(--font-heading) text-2xl sm:text-3xl text-[#F5F5F5]">See you soon</h3>
                    <p className="mt-1.5 text-xs sm:text-sm text-[#A6D6C4]">Your order has been delivered successfully.</p>
                    <Link
                        href="/"
                        className="mt-4 inline-flex rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2.5 text-xs sm:text-sm font-semibold text-[#111] min-h-[44px] items-center"
                    >
                        Home
                    </Link>
                </motion.div>
            ) : null}

            {/* Action Buttons */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-2xl mx-auto mt-6 flex gap-4 justify-center"
            >
                <button
                    onClick={handleContactDelivery}
                    className="px-6 py-3 rounded-full border border-[#CFAF63]/25 text-[#F5F5F5] hover:bg-[#1A1A1A] transition"
                >
                    📞 Contact Delivery
                </button>
                <button
                    onClick={handleRefreshStatus}
                    disabled={refreshing}
                    className="px-6 py-3 rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] text-[#111] font-semibold hover:shadow-lg transition disabled:opacity-70"
                >
                    {refreshing ? "Refreshing..." : "🔄 Refresh Status"}
                </button>
            </motion.div>
            {actionMessage ? (
                <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#CFAF63]">{actionMessage}</p>
            ) : null}
        </div>
    );
}
