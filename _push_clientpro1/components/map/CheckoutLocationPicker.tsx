"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

type LocationPoint = {
    latitude: number;
    longitude: number;
};

type CheckoutLocationPickerProps = {
    value: LocationPoint;
    onChange: (next: LocationPoint) => void;
};

export function CheckoutLocationPicker({ value, onChange }: CheckoutLocationPickerProps) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<LeafletMap | null>(null);
    const markerRef = useRef<LeafletMarker | null>(null);
    const onChangeRef = useRef(onChange);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const leaflet = require("leaflet") as typeof import("leaflet");
        const center: [number, number] = [value.latitude, value.longitude];
        const pinIcon = new leaflet.Icon({
            iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
            shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
        });

        const map = leaflet.map(containerRef.current).setView(center, 16);
        mapRef.current = map;

        leaflet
            .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            })
            .addTo(map);

        const marker = leaflet.marker(center, { icon: pinIcon, draggable: true }).addTo(map);
        markerRef.current = marker;

        map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
            onChangeRef.current({ latitude: event.latlng.lat, longitude: event.latlng.lng });
        });

        marker.on("dragend", () => {
            const point = marker.getLatLng();
            onChangeRef.current({ latitude: point.lat, longitude: point.lng });
        });

        window.setTimeout(() => map.invalidateSize(), 0);

        return () => {
            markerRef.current = null;
            mapRef.current = null;
            map.remove();
        };
    }, [value.latitude, value.longitude]);

    useEffect(() => {
        const center: [number, number] = [value.latitude, value.longitude];
        mapRef.current?.setView(center, mapRef.current.getZoom(), { animate: false });
        markerRef.current?.setLatLng(center);
    }, [value.latitude, value.longitude]);

    return (
        <div className="overflow-hidden rounded-xl border border-[#CFAF63]/25">
            <div ref={containerRef} style={{ height: "18rem", width: "100%" }} />
            <div className="border-t border-[#CFAF63]/15 bg-[#101010] px-3 py-2 text-xs text-[#F5F5F5]/70">
                Tap map or drag pin to fine-tune delivery point.
            </div>
        </div>
    );
}
