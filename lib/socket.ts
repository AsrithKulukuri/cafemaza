import { io } from "socket.io-client";

const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_BASE_URL;
const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

const isRelativeApiBase = Boolean(configuredApiBase?.startsWith("/"));
const socketBaseUrl = configuredSocketUrl || (isRelativeApiBase ? undefined : configuredApiBase) || "http://localhost:5000";

export const socket = io(socketBaseUrl, {
    autoConnect: false,
    path: "/socket.io/",
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
    auth: (cb) => {
        const token = typeof window !== "undefined" ? window.localStorage.getItem("cm_token") : null;
        cb({ token });
    },
});
