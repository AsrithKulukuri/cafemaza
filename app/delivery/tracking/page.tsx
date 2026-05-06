import { DeliveryTrackingClient } from "./DeliveryTrackingClient";

export default function DeliveryTrackingPage() {
    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Live Tracking</p>
                <h1 className="font-[var(--font-heading)] text-4xl text-[#F5F5F5] mt-2">Delivery Tracking</h1>
                <p className="text-[#999] mt-2">Track your delivery order and share your location with customer</p>
            </div>

            {/* Client Component */}
            <div className="max-w-5xl mx-auto">
                <DeliveryTrackingClient />
            </div>
        </div>
    );
}
