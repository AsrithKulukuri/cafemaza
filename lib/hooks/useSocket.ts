import { useEffect, useState } from 'react';
import { socket as defaultSocket } from '../socket';
import type { Socket } from 'socket.io-client';

/**
 * Hook to use Socket.io instance in React components
 * Ensures socket is connected and ready
 */
export function useSocket(): Socket | null {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return null;
    }

    if (!defaultSocket.connected) {
        defaultSocket.connect();
    }

    return defaultSocket;
}
