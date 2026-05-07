import { useEffect, useRef, useState, useCallback } from 'react';

export interface LocationData {
    latitude: number;
    longitude: number;
    accuracy?: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    timestamp: number;
}

interface UseGeolocationOptions {
    enableHighAccuracy?: boolean;
    timeout?: number;
    maximumAge?: number;
    enabled?: boolean;
    onLocationUpdate?: (location: LocationData) => void;
    onError?: (error: GeolocationPositionError) => void;
    interval?: number; // Polling interval in milliseconds (default 5000)
}

export function useGeolocation({
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    enabled = true,
    onLocationUpdate,
    onError,
    interval = 5000,
}: UseGeolocationOptions) {
    const [location, setLocation] = useState<LocationData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const watchIdRef = useRef<number | null>(null);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleSuccess = useCallback((position: GeolocationPosition) => {
        const { latitude, longitude, accuracy, altitude, altitudeAccuracy, heading, speed } = position.coords;
        const locationData: LocationData = {
            latitude,
            longitude,
            accuracy,
            altitude,
            altitudeAccuracy,
            heading,
            speed,
            timestamp: position.timestamp,
        };

        setLocation(locationData);
        setError(null);
        setLoading(false);
        onLocationUpdate?.(locationData);
    }, [onLocationUpdate]);

    const handleError = useCallback((err: GeolocationPositionError) => {
        const errorMessage = {
            1: 'Permission denied to access location',
            2: 'Location unavailable',
            3: 'Request timeout',
        }[err.code] || 'Unknown error';

        setError(errorMessage);
        setLoading(false);
        onError?.(err);
    }, [onError]);

    useEffect(() => {
        if (!enabled || !navigator.geolocation) {
            setError('Geolocation not supported');
            setLoading(false);
            return;
        }

        const options = {
            enableHighAccuracy,
            timeout,
            maximumAge,
        };

        // Use polling instead of continuous watch for better control
        const pollLocation = () => {
            navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
        };

        // Get initial location immediately
        pollLocation();

        // Set up polling
        pollingIntervalRef.current = setInterval(pollLocation, interval);

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }
        };
    }, [enabled, enableHighAccuracy, timeout, maximumAge, interval, handleSuccess, handleError]);

    return { location, error, loading };
}
