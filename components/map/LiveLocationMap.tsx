"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";

interface LocationCoord {
    latitude: number;
    longitude: number;
    timestamp?: number;
}

interface DeliveryLocation extends LocationCoord {
    name: string;
    phone?: string;
}

interface CustomerLocation extends LocationCoord {
    address?: string;
}

type LiveLocationMapProps = {
    deliveryLocation?: DeliveryLocation | null;
    customerLocation?: CustomerLocation | null;
    orderStatus?: string;
    showRoute?: boolean;
};

export function LiveLocationMap({
    deliveryLocation,
    customerLocation,
    orderStatus,
    showRoute = true,
}: LiveLocationMapProps) {
    if (!deliveryLocation && !customerLocation) {
        return (
            <div className="w-full h-96 bg-[#1a1a1a] rounded-2xl border border-[#CFAF63]/25 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <AlertTriangle size={32} className="text-[#FF6A00]" />
                    <p className="text-[#999]">Location data not available</p>
                </div>
            </div>
        );
    }

    if (typeof window === "undefined") {
        return <div className="h-96 w-full rounded-2xl border border-[#CFAF63]/25 bg-[#1a1a1a]" />;
    }

    return (
        <LiveLocationMapClient
            deliveryLocation={deliveryLocation}
            customerLocation={customerLocation}
            orderStatus={orderStatus}
            showRoute={showRoute}
        />
    );
}

function LiveLocationMapClient({
    deliveryLocation,
    customerLocation,
    orderStatus,
    showRoute = true,
}: LiveLocationMapProps) {
    const mapCenter = useMemo<[number, number]>(() => {
        if (deliveryLocation && customerLocation) {
            const midLat = (deliveryLocation.latitude + customerLocation.latitude) / 2;
            const midLng = (deliveryLocation.longitude + customerLocation.longitude) / 2;
            return [midLat, midLng];
        }

        if (deliveryLocation) {
            return [deliveryLocation.latitude, deliveryLocation.longitude];
        }

        if (customerLocation) {
            return [customerLocation.latitude, customerLocation.longitude];
        }

        return [28.6139, 77.209];
    }, [deliveryLocation, customerLocation]);

    // Runtime-only module loading to avoid SSR "window is not defined" crashes from Leaflet.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const leaflet = require("leaflet") as typeof import("leaflet");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reactLeaflet = require("react-leaflet") as typeof import("react-leaflet");
    const { MapContainer, TileLayer, Marker, Popup, Polyline } = reactLeaflet;

    const deliveryIcon = useMemo(
        () =>
            new leaflet.Icon({
                iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjRkY2QTAwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPtm7PC90ZXh0Pjwvc3ZnPg==",
                iconSize: [32, 32],
                popupAnchor: [0, -16],
            }),
        [leaflet],
    );

    const customerIcon = useMemo(
        () =>
            new leaflet.Icon({
                iconUrl: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI4IiBmaWxsPSIjQ0ZBRjYzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtc2l6ZT0iMjAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMTExIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+QUQ8L3RleHQ+PC9zdmc+",
                iconSize: [32, 32],
                popupAnchor: [0, -16],
            }),
        [leaflet],
    );

    return (
        <div className="w-full rounded-2xl border border-[#CFAF63]/25 overflow-hidden">
            <MapContainer
                center={mapCenter}
                zoom={15}
                style={{ width: "100%", height: "24rem" }}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {deliveryLocation && (
                    <Marker position={[deliveryLocation.latitude, deliveryLocation.longitude]} icon={deliveryIcon}>
                        <Popup>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[#111]">🚚 Delivery Partner</p>
                                <p className="text-[#666]">{deliveryLocation.name}</p>
                                {deliveryLocation.phone && <p className="text-[#999] text-xs">{deliveryLocation.phone}</p>}
                                {deliveryLocation.timestamp && (
                                    <p className="text-[#999] text-xs">
                                        Updated: {new Date(deliveryLocation.timestamp).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {customerLocation && (
                    <Marker position={[customerLocation.latitude, customerLocation.longitude]} icon={customerIcon}>
                        <Popup>
                            <div className="flex flex-col gap-1">
                                <p className="font-semibold text-[#111]">📍 Delivery Address</p>
                                {customerLocation.address && <p className="text-[#666]">{customerLocation.address}</p>}
                                {customerLocation.timestamp && (
                                    <p className="text-[#999] text-xs">
                                        Updated: {new Date(customerLocation.timestamp).toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                )}

                {showRoute && deliveryLocation && customerLocation && (
                    <Polyline
                        positions={[
                            [deliveryLocation.latitude, deliveryLocation.longitude],
                            [customerLocation.latitude, customerLocation.longitude],
                        ]}
                        pathOptions={{ color: "#FF6A00", weight: 2, opacity: 0.7, dashArray: "5, 5" }}
                    />
                )}
            </MapContainer>

            {deliveryLocation && customerLocation && (
                <div className="bg-[#0E0E0E] border-t border-[#CFAF63]/25 p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs uppercase text-[#CFAF63] mb-1">Status</p>
                            <p className="text-sm text-[#F5F5F5]">{orderStatus || "Out for delivery"}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase text-[#CFAF63] mb-1">Live Updates</p>
                            <p className="text-sm text-[#00D98E]">Real-time tracking enabled</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
