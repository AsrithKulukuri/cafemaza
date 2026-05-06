import { Socket } from 'socket.io-client';

export interface LocationUpdatePayload {
    orderId: string;
    userId: string;
    userType: 'delivery' | 'customer'; // delivery partner or customer
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
}

export interface DeliveryLocationUpdate extends LocationUpdatePayload {
    userType: 'delivery';
    deliveryPartnerName: string;
    deliveryPartnerPhone?: string;
}

export interface CustomerLocationUpdate extends LocationUpdatePayload {
    userType: 'customer';
    deliveryAddress?: string;
}

/**
 * Emit location update to the other party in the order
 * Delivery partner sends to customer, customer sends to delivery partner
 */
export function emitLocationUpdate(
    socket: Socket | null,
    payload: DeliveryLocationUpdate | CustomerLocationUpdate
) {
    if (!socket || !socket.connected) {
        console.warn('Socket not connected');
        return false;
    }

    socket.emit('location_update', payload);
    return true;
}

/**
 * Listen for location updates from the other party
 * Returns cleanup function
 */
export function listenToLocationUpdates(
    socket: Socket | null,
    orderId: string,
    onLocationUpdate: (location: DeliveryLocationUpdate | CustomerLocationUpdate) => void
): (() => void) | null {
    if (!socket) return null;

    const handler = (data: DeliveryLocationUpdate | CustomerLocationUpdate) => {
        if (data.orderId === orderId) {
            onLocationUpdate(data);
        }
    };

    socket.on('location_update', handler);

    return () => {
        socket.off('location_update', handler);
    };
}

/**
 * Start location tracking for a delivery partner
 * Attempts to get location every `interval` ms and emits updates
 */
export function startDeliveryTracking(
    socket: Socket | null,
    orderId: string,
    userId: string,
    deliveryPartnerName: string,
    deliveryPartnerPhone?: string,
    onError?: (error: string) => void
): {
    stop: () => void;
    status: 'tracking' | 'stopped';
} {
    let isTracking = true;
    let pollingInterval: NodeJS.Timeout | null = null;

    const poll = async () => {
        try {
            if (!navigator.geolocation) {
                throw new Error('Geolocation not supported');
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (isTracking && socket?.connected) {
                        const payload: DeliveryLocationUpdate = {
                            orderId,
                            userId,
                            userType: 'delivery',
                            latitude: position.coords.latitude,
                            longitude: position.coords.longitude,
                            accuracy: position.coords.accuracy,
                            timestamp: position.timestamp,
                            deliveryPartnerName,
                            deliveryPartnerPhone,
                        };
                        emitLocationUpdate(socket, payload);
                    }
                },
                (error) => {
                    const msg = `Geolocation error: ${error.message}`;
                    console.error(msg);
                    onError?.(msg);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 0,
                }
            );
        } catch (error) {
            console.error('Tracking error:', error);
            onError?.(`Tracking error: ${error instanceof Error ? error.message : 'Unknown'}`);
        }
    };

    // Initial poll
    poll();

    // Poll every 5 seconds
    pollingInterval = setInterval(poll, 5000);

    return {
        stop: () => {
            isTracking = false;
            if (pollingInterval) {
                clearInterval(pollingInterval);
            }
        },
        status: 'tracking',
    };
}

/**
 * Stop all location tracking
 */
export function stopAllTracking(tracker: ReturnType<typeof startDeliveryTracking> | null) {
    if (tracker) {
        tracker.stop();
    }
}
