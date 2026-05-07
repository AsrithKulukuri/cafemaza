import { DeliveryTrackingClient } from "../DeliveryTrackingClient";

export default function DeliveryTrackingByOrderPage() {
    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            <div className="mx-auto mb-8 max-w-5xl">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Tracking</p>
                <h1 className="mt-2 font-[var(--font-heading)] text-4xl text-[#F5F5F5]">Delivery Tracking</h1>
                <p className="mt-2 text-[#999]">Share your live location with customer for this assigned order.</p>
            </div>

            <div className="mx-auto max-w-5xl">
                <DeliveryTrackingClient />
            </div>
        </div>
    );
}
