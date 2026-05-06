import { io } from "socket.io-client";

const configuredSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

const isRelativeApiBase = Boolean(configuredApiBase?.startsWith("/"));
const socketBaseUrl = configuredSocketUrl || (isRelativeApiBase ? undefined : configuredApiBase) || "http://localhost:5000";
const socketPath = isRelativeApiBase ? "/backend/socket.io/" : "/socket.io/";

export const socket = io(socketBaseUrl, {
    autoConnect: false,
    path: socketPath,
    transports: ["websocket", "polling"],
});
