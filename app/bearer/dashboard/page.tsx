"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, UtensilsCrossed } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";
import { QuickOrderPanel } from "@/components/staff/QuickOrderPanel";

type ActiveTable = {
    tableNumber: number;
    activeOrders: number;
    latestOrderAt: string;
    latestStatus: string;
};

function deriveActiveTablesFromOrders(orders: BearerOrder[]): ActiveTable[] {
    const tableMap = new Map<number, { activeOrders: number; latestOrderAt: string; latestStatus: string }>();

    for (const order of orders) {
        if (!order.tableNumber) continue;
        if (!["placed", "preparing", "ready"].includes(order.status)) continue;

        const current = tableMap.get(order.tableNumber);
        if (!current) {
            tableMap.set(order.tableNumber, {
                activeOrders: 1,
                latestOrderAt: order.createdAt,
                latestStatus: order.status,
            });
            continue;
        }

        const isLatest = new Date(order.createdAt).getTime() > new Date(current.latestOrderAt).getTime();
        tableMap.set(order.tableNumber, {
            activeOrders: current.activeOrders + 1,
            latestOrderAt: isLatest ? order.createdAt : current.latestOrderAt,
            latestStatus: isLatest ? order.status : current.latestStatus,
        });
    }

    return Array.from(tableMap.entries())
        .map(([tableNumber, info]) => ({
            tableNumber,
            activeOrders: info.activeOrders,
            latestOrderAt: info.latestOrderAt,
            latestStatus: info.latestStatus,
        }))
        .sort((a, b) => a.tableNumber - b.tableNumber);
}

type BearerOrder = {
    _id: string;
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
    tableNumber?: number;
    createdAt: string;
};

const statusLabel: Record<string, string> = {
    placed: "Sent to Kitchen",
    preparing: "Preparing",
    ready: "Ready to Serve",
    out_for_delivery: "Out",
    delivered: "Completed",
};

export default function BearerDashboardPage() {
    const router = useRouter();
    const [staffName, setStaffName] = useState("Bearer");
    const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
    const [orders, setOrders] = useState<BearerOrder[]>([]);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [pressingTable, setPressingTable] = useState<number | null>(null);
    const [completingTable, setCompletingTable] = useState<number | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const user = getAuthUser();
        if (!user || !["bearer", "manager", "admin"].includes(user.role)) {
            router.push("/staff-login");
            return;
        }

        if (user.role !== "bearer") {
            if (user.role === "manager" || user.role === "admin") {
                router.push("/staff/dashboard");
                return;
            }
        }

        setStaffName(user.name);
    }, [router]);

    useEffect(() => {
        const token = getAuthToken();
        if (!token) return;

        async function loadData() {
            setError("");
            try {
                const allOrders = await apiFetch<BearerOrder[]>("/api/orders", { token });
                setOrders(allOrders);

                try {
                    const tables = await apiFetch<ActiveTable[]>("/api/orders/tables/active", { token });
                    if (tables.length > 0) {
                        setActiveTables(tables);
                    } else {
                        setActiveTables(deriveActiveTablesFromOrders(allOrders));
                    }
                } catch {
                    setActiveTables(deriveActiveTablesFromOrders(allOrders));
                }
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load bearer dashboard");
            }
        }

        void loadData();

        if (!socket.connected) {
            socket.connect();
        }

        const refresh = () => {
            void loadData();
        };

        socket.on("order_created", refresh);
        socket.on("order_status_updated", refresh);

        return () => {
            socket.off("order_created", refresh);
            socket.off("order_status_updated", refresh);
        };
    }, []);

    const tableStatuses = useMemo(() => {
        const latestByTable = new Map<number, BearerOrder>();
        for (const order of orders) {
            if (!order.tableNumber) continue;
            if (!["placed", "preparing", "ready"].includes(order.status)) continue;

            const existing = latestByTable.get(order.tableNumber);
            if (!existing || new Date(order.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
                latestByTable.set(order.tableNumber, order);
            }
        }

        return Array.from(latestByTable.entries())
            .map(([tableNumber, order]) => ({ tableNumber, status: order.status, createdAt: order.createdAt }))
            .sort((a, b) => a.tableNumber - b.tableNumber);
    }, [orders]);

    const logout = () => {
        clearAuthSession();
        router.push("/staff-login");
    };

    const completeTable = async (tableNumber: number) => {
        const token = getAuthToken();
        if (!token) return;

        setCompletingTable(tableNumber);
        setError("");
        setNotice("");

        try {
            const result = await apiFetch<{ completedCount: number; message: string }>(`/api/orders/tables/${tableNumber}/complete`, {
                method: "PUT",
                token,
            });

            setNotice(result.message || `Table ${tableNumber} marked completed.`);
            setActiveTables((prev) => prev.filter((table) => table.tableNumber !== tableNumber));
            setOrders((prev) => prev.map((order) => (
                order.tableNumber === tableNumber && ["placed", "preparing", "ready"].includes(order.status)
                    ? { ...order, status: "delivered" }
                    : order
            )));
        } catch (requestError) {
            const message = requestError instanceof Error ? requestError.message : "Failed to complete table";

            // Compatibility fallback: if backend route isn't deployed yet, close table via existing status API.
            if (message.includes("404")) {
                try {
                    const targetOrders = orders.filter(
                        (order) =>
                            order.tableNumber === tableNumber &&
                            ["placed", "preparing", "ready"].includes(order.status)
                    );

                    if (!targetOrders.length) {
                        setError(`No active orders found for table ${tableNumber}`);
                        return;
                    }

                    await Promise.all(
                        targetOrders.map((order) =>
                            apiFetch(`/api/orders/${order._id}/status`, {
                                method: "PUT",
                                token,
                                body: JSON.stringify({ status: "out_for_delivery" }),
                            })
                        )
                    );

                    setNotice(`Table ${tableNumber} marked completed (compatibility mode).`);
                    setActiveTables((prev) => prev.filter((table) => table.tableNumber !== tableNumber));
                    setOrders((prev) => prev.map((order) => (
                        order.tableNumber === tableNumber && ["placed", "preparing", "ready"].includes(order.status)
                            ? { ...order, status: "out_for_delivery" }
                            : order
                    )));
                    return;
                } catch (fallbackError) {
                    setError(fallbackError instanceof Error ? fallbackError.message : "Failed to complete table");
                    return;
                }
            }

            setError(message);
        } finally {
            setCompletingTable(null);
            setPressingTable(null);
        }
    };

    const clearLongPressTimer = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const startLongPress = (tableNumber: number) => {
        if (completingTable) return;
        clearLongPressTimer();
        setPressingTable(tableNumber);

        longPressTimerRef.current = setTimeout(() => {
            void completeTable(tableNumber);
        }, 900);
    };

    const cancelLongPress = () => {
        clearLongPressTimer();
        setPressingTable(null);
    };

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-3.5 sm:p-6 pt-16 sm:pt-20 pb-16">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}>
                        <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#CFAF63]">Bearer Order Taking</p>
                        <h1 className="font-(--font-heading) text-2xl sm:text-4xl text-[#F5F5F5] mt-0.5">{staffName}</h1>
                        <p className="mt-1 text-xs sm:text-sm text-[#9A9A9A]">{"Select table, take order, send to kitchen, then pick next table."}</p>
                    </motion.div>

                    <button onClick={logout} className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full border border-[#FF6A00]/40 bg-[#FF6A00]/15 px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-[#FFB37A] min-h-[38px] cursor-pointer">
                        <LogOut size={15} /> Logout
                    </button>
                </div>

                {error ? (
                    <div className="mb-4 rounded-xl border border-[#FF6A00]/35 bg-[#FF6A00]/10 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#FFD6B8]">{error}</div>
                ) : null}
                {notice ? (
                    <div className="mb-4 rounded-xl border border-[#00D98E]/35 bg-[#00D98E]/10 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-[#A7F6D3]">{notice}</div>
                ) : null}

                <div className="mb-6 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-2">
                    <div className="rounded-2xl border border-[#2E2E2E] bg-[#101010] p-3.5 sm:p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs sm:text-sm text-[#CFAF63] font-semibold"><UtensilsCrossed size={15} /> Active Tables</div>
                        {activeTables.length === 0 ? (
                            <p className="text-xs sm:text-sm text-[#9A9A9A]">No active dine-in tables right now.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {activeTables.map((table) => (
                                    <button
                                        key={table.tableNumber}
                                        type="button"
                                        onMouseDown={() => startLongPress(table.tableNumber)}
                                        onMouseUp={cancelLongPress}
                                        onMouseLeave={cancelLongPress}
                                        onTouchStart={() => startLongPress(table.tableNumber)}
                                        onTouchEnd={cancelLongPress}
                                        onTouchCancel={cancelLongPress}
                                        onContextMenu={(event) => event.preventDefault()}
                                        disabled={completingTable === table.tableNumber}
                                        className={`rounded-xl border bg-[#141414] p-2.5 sm:px-3 sm:py-2 text-left ${pressingTable === table.tableNumber ? "border-[#00D98E]" : "border-[#3B3B3B]"} disabled:opacity-60 cursor-pointer min-h-[64px]`}
                                    >
                                        <p className="text-xs sm:text-sm font-semibold text-[#F5F5F5]">Table {table.tableNumber}</p>
                                        <p className="text-[11px] sm:text-xs text-[#B7B7B7]">{table.activeOrders} active</p>
                                        <p className="mt-0.5 text-[9px] sm:text-[10px] text-[#8C8C8C] leading-tight">
                                            {completingTable === table.tableNumber ? "Completing..." : pressingTable === table.tableNumber ? "Release to cancel, hold to complete" : "Long press to complete"}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-[#2E2E2E] bg-[#101010] p-3.5 sm:p-4">
                        <p className="mb-2 text-xs sm:text-sm font-semibold text-[#CFAF63]">Kitchen Status by Table</p>
                        {tableStatuses.length === 0 ? (
                            <p className="text-xs sm:text-sm text-[#9A9A9A]">No table orders in kitchen queue.</p>
                        ) : (
                            <div className="space-y-2">
                                {tableStatuses.map((row) => (
                                    <div key={row.tableNumber} className="flex items-center justify-between rounded-xl border border-[#3A3A3A] bg-[#141414] px-3 py-2 text-xs sm:text-sm">
                                        <span className="text-[#F5F5F5]">Table {row.tableNumber}</span>
                                        <span className="text-[#CFAF63] font-medium">{statusLabel[row.status] || row.status}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <QuickOrderPanel />
            </div>
        </div>
    );
}
