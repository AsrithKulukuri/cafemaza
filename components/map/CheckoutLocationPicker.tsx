"use client";

import { useMemo } from "react";

type LocationPoint = {
    latitude: number;
    longitude: number;
};

type CheckoutLocationPickerProps = {
    value: LocationPoint;
    onChange: (next: LocationPoint) => void;
};

export function CheckoutLocationPicker({ value, onChange }: CheckoutLocationPickerProps) {
    // Load leaflet modules only in browser runtime to avoid SSR window errors.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const leaflet = require("leaflet") as typeof import("leaflet");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const reactLeaflet = require("react-leaflet") as typeof import("react-leaflet");
    const { MapContainer, Marker, TileLayer, useMapEvents } = reactLeaflet;

    const pinIcon = useMemo(
        () =>
            new leaflet.Icon({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
            }),
        [leaflet],
    );

    function MapTapHandler({ onPointChange }: { onPointChange: (next: LocationPoint) => void }) {
        useMapEvents({
            click(event: { latlng: { lat: number; lng: number } }) {
                onPointChange({
                    latitude: event.latlng.lat,
                    longitude: event.latlng.lng,
                });
            },
        });

        return null;
    }

    const center = useMemo<[number, number]>(() => [value.latitude, value.longitude], [value.latitude, value.longitude]);

    return (
        <div className="overflow-hidden rounded-xl border border-[#CFAF63]/25">
            <MapContainer center={center} zoom={16} scrollWheelZoom style={{ height: "18rem", width: "100%" }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <MapTapHandler onPointChange={onChange} />
                <Marker
                    position={center}
                    icon={pinIcon}
                    draggable
                    eventHandlers={{
                        dragend: (event: { target: { getLatLng: () => { lat: number; lng: number } } }) => {
                            const marker = event.target;
                            const point = marker.getLatLng();
                            onChange({ latitude: point.lat, longitude: point.lng });
                        },
                    }}
                />
            </MapContainer>
            <div className="border-t border-[#CFAF63]/15 bg-[#101010] px-3 py-2 text-xs text-[#F5F5F5]/70">
                Tap map or drag pin to fine-tune delivery point.
            </div>
        </div>
    );
}
