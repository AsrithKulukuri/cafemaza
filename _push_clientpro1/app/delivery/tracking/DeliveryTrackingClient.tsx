"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { MapPin, AlertCircle, Loader2, CheckCircle, Navigation } from "lucide-react";
import { LiveLocationMap } from "@/components/map/LiveLocationMap";
import { useGeolocation } from "@/lib/hooks/useGeolocation";
import { listenToLocationUpdates, DeliveryLocationUpdate, CustomerLocationUpdate } from "@/lib/locationTracking";
import { useSocket } from "@/lib/hooks/useSocket";
import { apiFetch } from "@/lib/api";
import { getAuthToken, getAuthUser } from "@/lib/authToken";

interface CustomerLocation {
    address: string;
    latitude: number;
    longitude: number;
}

export function DeliveryTrackingClient() {
    const params = useParams();
    const orderId = params?.orderId as string;
    const socket = useSocket();

    const [customerLocation, setCustomerLocation] = useState<CustomerLocation | null>(null);
    const [deliveryLocation, setDeliveryLocation] = useState<{
        name: string;
        phone?: string;
        latitude: number;
        longitude: number;
        timestamp: number;
    } | null>(null);

    const [trackingActive, setTrackingActive] = useState(false);
    const [orderStatus, setOrderStatus] = useState("pending");
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const triedAutoStartRef = useRef(false);

    const authUser = getAuthUser();

    useEffect(() => {
        async function hydrateOrder() {
            const token = getAuthToken();
            if (!token || !orderId) return;

            try {
                const mine = await apiFetch<Array<{
                    _id: string;
                    status: string;
                    address: string;
                }>>("/api/orders/delivery/mine", { token });

                const order = mine.find((item) => item._id === orderId);
                if (!order) return;

                setOrderStatus(order.status);

                const coords = order.address.match(/coords:([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)/i);
                if (coords) {
                    const latitude = Number(coords[1]);
                    const longitude = Number(coords[2]);
                    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
                        setCustomerLocation({
                            address: order.address,
                            latitude,
                            longitude,
                        });
                    }
                }
            } catch {
                // Keep graceful fallback.
            }
        }

        hydrateOrder();
    }, [orderId]);

    const { location: currentLocation, error: geoError, loading: geoLoading } = useGeolocation({
        enabled: trackingActive,
        interval: 5000,
        enableHighAccuracy: true,
    });

    // Listen for location updates from customer
    useEffect(() => {
        if (!socket || !orderId) return;

        socket.emit("join_order", orderId);

        const cleanup = listenToLocationUpdates(socket, orderId, (locationData) => {
            if (locationData.userType === "customer") {
                setCustomerLocation({
                    address: (locationData as CustomerLocationUpdate).deliveryAddress || "Customer Location",
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                });
            }
        });

        return cleanup || undefined;
    }, [socket, orderId]);

    // Emit delivery location when tracking is active
    useEffect(() => {
        if (!trackingActive || !currentLocation || !socket?.connected || !orderId) return;

        const deliveryPartnerName = authUser?.name || "Delivery Partner";
        const deliveryPartnerPhone = authUser?.email || undefined;

        const payload: DeliveryLocationUpdate = {
            orderId,
            userId: authUser?.id || "delivery-partner",
            userType: "delivery",
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            accuracy: currentLocation.accuracy,
            timestamp: currentLocation.timestamp,
            deliveryPartnerName,
            deliveryPartnerPhone,
        };

        socket.emit("location_update", payload);

        setDeliveryLocation({
            name: deliveryPartnerName,
            phone: deliveryPartnerPhone,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            timestamp: currentLocation.timestamp,
        });
    }, [authUser?.email, authUser?.id, authUser?.name, currentLocation, trackingActive, socket, orderId]);

    const handleStartTracking = useCallback(async () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }

        try {
            // Start polling; geolocation hook will prompt for permission and surface errors consistently across browsers.
            setTrackingActive(true);
            setError(null);
            setSuccessMessage("Location tracking started. Sharing your live location with customer...");
        } catch (err) {
            setError(`Failed to start tracking: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
    }, []);

    useEffect(() => {
        if (triedAutoStartRef.current) {
            return;
        }

        if (orderStatus !== "out_for_delivery") {
            return;
        }

        triedAutoStartRef.current = true;
        void handleStartTracking();
    }, [handleStartTracking, orderStatus]);

    const handleStopTracking = useCallback(() => {
        setTrackingActive(false);
        setSuccessMessage(null);
    }, []);

    return (
        <div className="space-y-6 max-w-5xl">
            {/* Status Card */}
            <div className="bg-[#1a1a1a] border border-[#CFAF63]/25 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-[#F5F5F5]">Live Delivery Tracking</h2>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${trackingActive ? "bg-[#00D98E]/10" : "bg-[#FF6A00]/10"}`}>
                        <div className={`w-2 h-2 rounded-full ${trackingActive ? "bg-[#00D98E]" : "bg-[#FF6A00]"} ${trackingActive ? "animate-pulse" : ""}`} />
                        <span className={trackingActive ? "text-[#00D98E]" : "text-[#FF6A00]"}>
                            {trackingActive ? "Live" : "Inactive"}
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Errors */}
                    {(error || geoError) && (
                        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-red-400 text-sm">{error || geoError}</p>
                        </div>
                    )}

                    {/* Success Message */}
                    {successMessage && (
                        <div className="flex items-start gap-3 bg-[#00D98E]/10 border border-[#00D98E]/30 rounded-lg p-4">
                            <CheckCircle size={20} className="text-[#00D98E] shrink-0 mt-0.5" />
                            <p className="text-[#00D98E] text-sm">{successMessage}</p>
                        </div>
                    )}

                    {/* Tracking Controls */}
                    <div className="flex gap-3">
                        {!trackingActive ? (
                            <button
                                onClick={handleStartTracking}
                                disabled={geoLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-[#00D98E] text-[#111] rounded-lg font-semibold hover:bg-[#00D98E]/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                {geoLoading ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
                                Start Live Tracking
                            </button>
                        ) : (
                            <button
                                onClick={handleStopTracking}
                                className="flex items-center gap-2 px-6 py-3 bg-[#FF6A00] text-[#F5F5F5] rounded-lg font-semibold hover:bg-[#FF6A00]/90 transition"
                            >
                                <MapPin size={18} />
                                Stop Tracking
                            </button>
                        )}
                    </div>

                    {/* Status Info */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#CFAF63]/10">
                        <div>
                            <p className="text-xs uppercase text-[#CFAF63] mb-2">Order ID</p>
                            <p className="text-sm font-mono text-[#F5F5F5]">{orderId?.slice(0, 12)}...</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-[#CFAF63] mb-2">Your Status</p>
                            <p className="text-sm text-[#F5F5F5]">{trackingActive ? "🛵 Out for Delivery" : "Awaiting Dispatch"}</p>
                        </div>
                        {currentLocation && (
                            <>
                                <div>
                                    <p className="text-xs uppercase text-[#CFAF63] mb-2">Accuracy</p>
                                    <p className="text-sm text-[#F5F5F5]">{Math.round(currentLocation.accuracy || 0)}m</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase text-[#CFAF63] mb-2">Last Update</p>
                                    <p className="text-sm text-[#F5F5F5]">{new Date(currentLocation.timestamp).toLocaleTimeString()}</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Map */}
            <LiveLocationMap
                deliveryLocation={deliveryLocation}
                customerLocation={customerLocation}
                orderStatus={orderStatus}
                showRoute={true}
            />
        </div>
    );
}
