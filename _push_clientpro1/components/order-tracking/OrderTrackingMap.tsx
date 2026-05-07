"use client";

import { useEffect, useState } from "react";
import { MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { LiveLocationMap } from "@/components/map/LiveLocationMap";
import { listenToLocationUpdates, DeliveryLocationUpdate, CustomerLocationUpdate } from "@/lib/locationTracking";
import { useSocket } from "@/lib/hooks/useSocket";

interface Props {
    orderId: string;
    orderStatus: string;
    assignedDeliveryPartner?: {
        name: string;
        phone?: string;
        vehicleNumber?: string;
    };
    customerLocation?: {
        address: string;
        latitude: number;
        longitude: number;
    };
}

export function OrderTrackingMap({ orderId, orderStatus, assignedDeliveryPartner, customerLocation }: Props) {
    const socket = useSocket();
    const [deliveryLocation, setDeliveryLocation] = useState<{
        name: string;
        phone?: string;
        latitude: number;
        longitude: number;
        timestamp: number;
    } | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    useEffect(() => {
        if (!socket || !orderId) return;

        const cleanup = listenToLocationUpdates(socket, orderId, (locationData) => {
            if (locationData.userType === "delivery") {
                setDeliveryLocation({
                    name: (locationData as DeliveryLocationUpdate).deliveryPartnerName,
                    phone: (locationData as DeliveryLocationUpdate).deliveryPartnerPhone,
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    timestamp: locationData.timestamp,
                });
                setLastUpdate(new Date());
            }
        });

        return cleanup || undefined;
    }, [socket, orderId]);

    if (orderStatus !== "out_for_delivery" && orderStatus !== "delivered" && !assignedDeliveryPartner) {
        return (
            <div className="bg-[#1a1a1a] border border-[#CFAF63]/25 rounded-2xl p-6">
                <div className="flex items-center gap-3">
                    <AlertCircle size={20} className="text-[#FF6A00]" />
                    <div>
                        <p className="font-semibold text-[#F5F5F5]">Live Tracking Available Soon</p>
                        <p className="text-sm text-[#999] mt-1">
                            Live location tracking will be available once your order is out for delivery.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-[#1a1a1a] border border-[#CFAF63]/25 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#F5F5F5]">Real-Time Delivery Tracking</h3>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${deliveryLocation ? "bg-[#00D98E]/10" : "bg-[#FF6A00]/10"}`}>
                        <div className={`w-2 h-2 rounded-full ${deliveryLocation ? "bg-[#00D98E]" : "bg-[#FF6A00]"} ${deliveryLocation ? "animate-pulse" : ""}`} />
                        <span className={deliveryLocation ? "text-[#00D98E]" : "text-[#FF6A00]"}>
                            {deliveryLocation ? "Live" : "Waiting for partner..."}
                        </span>
                    </div>
                </div>

                {deliveryLocation || assignedDeliveryPartner ? (
                    <div className="space-y-4">
                        <div className="flex items-start gap-4 bg-[#0E0E0E]/50 rounded-lg p-4 border border-[#CFAF63]/10">
                            <div className="w-12 h-12 bg-[#FF6A00]/20 rounded-lg flex items-center justify-center shrink-0">
                                <MapPin size={24} className="text-[#FF6A00]" />
                            </div>
                            <div className="flex-1">
                                <p className="font-semibold text-[#F5F5F5]">{deliveryLocation?.name || assignedDeliveryPartner?.name}</p>
                                {(deliveryLocation?.phone || assignedDeliveryPartner?.phone) && (
                                    <p className="text-sm text-[#999] mt-1">{deliveryLocation?.phone || assignedDeliveryPartner?.phone}</p>
                                )}
                                {assignedDeliveryPartner?.vehicleNumber && !deliveryLocation && (
                                    <p className="text-xs text-[#666] mt-1">Vehicle: {assignedDeliveryPartner.vehicleNumber}</p>
                                )}
                                {lastUpdate && (
                                    <p className="text-xs text-[#666] mt-2">
                                        Last update: {lastUpdate.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#CFAF63]/10">
                            <div>
                                <p className="text-xs uppercase text-[#CFAF63] mb-2">Distance</p>
                                <p className="text-sm text-[#F5F5F5]">Calculating...</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase text-[#CFAF63] mb-2">ETA</p>
                                <p className="text-sm text-[#F5F5F5]">10-15 mins</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#FF6A00]/20 rounded-full mb-3">
                            <MapPin size={24} className="text-[#FF6A00] animate-bounce" />
                        </div>
                        <p className="text-[#999]">Waiting for delivery partner location...</p>
                        <p className="text-xs text-[#666] mt-2">Your location is being shared</p>
                    </div>
                )}
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
