"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getAuthToken, getAuthUser } from "@/lib/authToken";

const MINIMUM_ORDER = 99;
const DELIVERY_CHARGE = 40;
const GST_RATE = 0.05;

type MenuItem = {
    _id: string;
    name: string;
    price: number;
    category: string;
    image?: string;
    isVeg?: boolean;
    isSoldOut?: boolean;
};

type OrderType = "dine_in" | "takeaway" | "delivery";

type CartEntry = {
    item: MenuItem;
    quantity: number;
};

type CreatedStaffOrder = {
    _id: string;
};

type PhoneLookupResponse = {
    found: boolean;
    customer?: {
        name?: string;
        email?: string;
        phone?: string;
    };
};

type AppliedCouponResponse = {
    code: string;
    type: "flat" | "percent" | "free_delivery";
    discount: number;
    delivery: number;
    subtotal: number;
    gst: number;
    total: number;
    message: string;
};

type ActiveTable = {
    tableNumber: number;
    activeOrders: number;
    latestOrderAt: string;
    latestStatus: string;
};

type LightweightOrder = {
    tableNumber?: number;
    status: "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
    createdAt: string;
};

function deriveActiveTablesFromOrders(orders: LightweightOrder[]): ActiveTable[] {
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

export function QuickOrderPanel() {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [paymentMethod, setPaymentMethod] = useState<"Cash" | "UPI">("Cash");
    const [orderType, setOrderType] = useState<OrderType>("dine_in");
    const [tableNumber, setTableNumber] = useState("");
    const [specialInstructions, setSpecialInstructions] = useState("");
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<AppliedCouponResponse | null>(null);
    const [couponMessage, setCouponMessage] = useState("");
    const [activeTables, setActiveTables] = useState<ActiveTable[]>([]);
    const [cart, setCart] = useState<CartEntry[]>([]);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [lookupMessage, setLookupMessage] = useState("");
    const [isBearer, setIsBearer] = useState(false);

    useEffect(() => {
        const currentUser = getAuthUser();
        setIsBearer(currentUser?.role === "bearer");
    }, []);

    useEffect(() => {
        if (isBearer) {
            setOrderType("dine_in");
        }
    }, [isBearer]);

    useEffect(() => {
        async function loadMenu() {
            try {
                const items = await apiFetch<MenuItem[]>('/api/menu');
                setMenuItems(items);
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : 'Failed to load menu items');
            } finally {
                setLoading(false);
            }
        }

        loadMenu();
    }, []);

    const loadActiveTables = useCallback(async () => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const tables = await apiFetch<ActiveTable[]>("/api/orders/tables/active", { token });
            if (tables.length > 0) {
                setActiveTables(tables);
                return;
            }

            const orders = await apiFetch<LightweightOrder[]>("/api/orders", { token });
            setActiveTables(deriveActiveTablesFromOrders(orders));
        } catch {
            try {
                const orders = await apiFetch<LightweightOrder[]>("/api/orders", { token });
                setActiveTables(deriveActiveTablesFromOrders(orders));
            } catch {
                setActiveTables([]);
            }
        }
    }, []);

    useEffect(() => {
        void loadActiveTables();
    }, [loadActiveTables]);

    useEffect(() => {
        if (!appliedCoupon) return;
        setAppliedCoupon(null);
        setCouponMessage("Coupon removed because order details changed. Re-apply to confirm discounts.");
    }, [orderType, tableNumber, cart]);

    const filteredMenu = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return menuItems;
        return menuItems.filter((item) => item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));
    }, [menuItems, search]);

    const subtotal = useMemo(() => cart.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0), [cart]);
    const minimumOrderMet = subtotal >= MINIMUM_ORDER;
    const shortfall = Math.max(0, MINIMUM_ORDER - subtotal);
    const delivery = minimumOrderMet
        ? (orderType === "delivery" ? (appliedCoupon?.delivery ?? DELIVERY_CHARGE) : 0)
        : 0;
    const discount = minimumOrderMet ? Math.min(appliedCoupon?.discount ?? 0, subtotal) : 0;
    const gst = minimumOrderMet ? (subtotal - discount + delivery) * GST_RATE : 0;
    const total = Math.max(0, subtotal - discount + delivery + gst);

    const addItem = (item: MenuItem) => {
        if (item.isSoldOut) return;
        setCart((prev) => {
            const existing = prev.find((entry) => entry.item._id === item._id);
            if (existing) {
                return prev.map((entry) => entry.item._id === item._id ? { ...entry, quantity: entry.quantity + 1 } : entry);
            }
            return [...prev, { item, quantity: 1 }];
        });
    };

    const updateQuantity = (itemId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart((prev) => prev.filter((entry) => entry.item._id !== itemId));
            return;
        }

        setCart((prev) => prev.map((entry) => entry.item._id === itemId ? { ...entry, quantity } : entry));
    };

    const applyCoupon = async () => {
        const token = getAuthToken();
        if (!token) {
            setError("Session expired. Please login again.");
            return;
        }

        if (!couponCode.trim()) {
            setCouponMessage("Enter a coupon code.");
            return;
        }

        if (!minimumOrderMet) {
            setCouponMessage(`Minimum order is ₹${MINIMUM_ORDER}. Add ₹${shortfall.toFixed(2)} more.`);
            return;
        }

        try {
            const result = await apiFetch<AppliedCouponResponse>("/api/orders/apply-coupon", {
                method: "POST",
                token,
                body: JSON.stringify({
                    code: couponCode.trim(),
                    items: cart.map((entry) => ({ menuItemId: entry.item._id, quantity: entry.quantity })),
                    orderType,
                    tableNumber: tableNumber ? Number(tableNumber) : undefined,
                }),
            });

            setAppliedCoupon(result);
            setCouponMessage(result.message || "Coupon applied successfully.");
        } catch (requestError) {
            setAppliedCoupon(null);
            setCouponMessage(requestError instanceof Error ? requestError.message : "Invalid coupon");
        }
    };

    const placeOrder = async () => {
        const token = getAuthToken();
        if (!token) {
            setError('Session expired. Please login again.');
            return;
        }

        if (!customerPhone.trim() || cart.length === 0) {
            setError('Customer phone and at least one item are required.');
            return;
        }

        if (orderType === "dine_in" && !tableNumber.trim()) {
            setError("Table number is required for dine-in orders.");
            return;
        }

        if (!minimumOrderMet) {
            setError(`Minimum order is ₹${MINIMUM_ORDER}. Add ₹${shortfall.toFixed(2)} more.`);
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const resolvedName = customerName.trim() || `Customer ${customerPhone.replace(/\D/g, "").slice(-4) || "WalkIn"}`;
            const resolvedTable = orderType === "dine_in" && tableNumber.trim() ? Number(tableNumber) : undefined;
            const resolvedAddress = resolvedTable
                ? `Table ${resolvedTable}`
                : orderType === "takeaway"
                    ? "Takeaway Counter"
                    : "Delivery order";

            const payload = {
                customerName: resolvedName,
                customerEmail,
                customerPhone,
                tableNumber: resolvedTable,
                orderType,
                specialInstructions,
                items: cart.map((entry) => ({ menuItemId: entry.item._id, quantity: entry.quantity })),
                paymentMethod,
                address: resolvedAddress,
                couponCode: appliedCoupon?.code || undefined,
            };

            const created = await apiFetch<CreatedStaffOrder>("/api/orders/staff", {
                method: 'POST',
                token,
                body: JSON.stringify(payload),
            });

            if (paymentMethod === "UPI") {
                setSuccess(
                    resolvedTable
                        ? `Order ${created._id} created for Table ${resolvedTable}. Customer can complete Razorpay payment from their account.`
                        : `Order ${created._id} created. Customer can complete Razorpay payment from their account.`
                );
            } else {
                setSuccess(resolvedTable ? `Order ${created._id} created for Table ${resolvedTable}.` : `Order ${created._id} created successfully.`);
            }
            setCart([]);
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setPaymentMethod("Cash");
            setTableNumber('');
            setSpecialInstructions('');
            setCouponCode("");
            setAppliedCoupon(null);
            setCouponMessage("");
            setLookupMessage("");
            void loadActiveTables();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to create order');
        } finally {
            setSaving(false);
        }
    };

    const lookupCustomerByPhone = async () => {
        const token = getAuthToken();
        if (!token || !customerPhone.trim()) {
            return;
        }

        setLookupMessage("");
        try {
            const response = await apiFetch<PhoneLookupResponse>(`/api/orders/customer-by-phone?phone=${encodeURIComponent(customerPhone.trim())}`, {
                token,
            });

            if (!response.found) {
                setLookupMessage("No existing customer found. New profile will be created.");
                return;
            }

            if (response.customer?.name) {
                setCustomerName(response.customer.name);
            }
            if (response.customer?.email) {
                setCustomerEmail(response.customer.email);
            }
            if (response.customer?.phone) {
                setCustomerPhone(response.customer.phone);
            }
            setLookupMessage("Existing customer found and linked.");
        } catch (requestError) {
            setLookupMessage(requestError instanceof Error ? requestError.message : "Could not verify customer number");
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-[#CFAF63]/25 bg-[#111]/60 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#CFAF63]">Bearer Quick Order</p>
                    <h3 className="font-(--font-heading) text-2xl text-[#F5F5F5]">Order Taking POS</h3>
                </div>
                <p className="text-sm text-[#CFAF63]">Total: ₹{total.toFixed(2)}</p>
            </div>

            <div className="mb-3 grid gap-2 md:grid-cols-3">
                <button type="button" onClick={() => setOrderType("dine_in")} className={`rounded-lg border px-3 py-2 text-sm ${orderType === "dine_in" ? "border-[#CFAF63] bg-[#CFAF63]/15 text-[#CFAF63]" : "border-[#333] text-[#CCC]"}`}>Dine-in</button>
                <button type="button" onClick={() => setOrderType("takeaway")} disabled={isBearer} className={`rounded-lg border px-3 py-2 text-sm ${orderType === "takeaway" ? "border-[#CFAF63] bg-[#CFAF63]/15 text-[#CFAF63]" : "border-[#333] text-[#CCC]"} disabled:cursor-not-allowed disabled:opacity-50`}>Takeaway</button>
                <button type="button" onClick={() => setOrderType("delivery")} disabled={isBearer} className={`rounded-lg border px-3 py-2 text-sm ${orderType === "delivery" ? "border-[#CFAF63] bg-[#CFAF63]/15 text-[#CFAF63]" : "border-[#333] text-[#CCC]"} disabled:cursor-not-allowed disabled:opacity-50`}>Delivery</button>
            </div>

            {isBearer ? (
                <p className="mb-3 text-xs text-[#CFAF63]">Bearer mode: table-based dine-in orders only.</p>
            ) : null}

            {orderType === "dine_in" && activeTables.length ? (
                <div className="mb-3 flex flex-wrap gap-2 rounded-xl border border-[#333] bg-[#0f0f0f] p-2">
                    {activeTables.map((table) => (
                        <button key={table.tableNumber} type="button" onClick={() => setTableNumber(String(table.tableNumber))} className="rounded-full border border-[#CFAF63]/35 px-3 py-1 text-xs text-[#CFAF63]">
                            Table {table.tableNumber} · {table.activeOrders} active
                        </button>
                    ))}
                </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                <input value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email (optional)" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                <div className="flex gap-2 md:col-span-2">
                    <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Customer phone" className="flex-1 rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                    <button type="button" onClick={() => void lookupCustomerByPhone()} className="rounded-xl border border-[#CFAF63]/35 px-4 py-3 text-sm text-[#CFAF63]">
                        Check
                    </button>
                </div>
                <input value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} placeholder={orderType === "dine_in" ? "Table number" : "Table number (optional)"} type="number" min={1} className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "Cash" | "UPI")} className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]">
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI (customer pays in account)</option>
                </select>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                <textarea value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder="Special instructions" className="min-h-24 rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] md:col-span-2" />
            </div>
            {lookupMessage ? <p className="mt-2 text-xs text-[#CFAF63]">{lookupMessage}</p> : null}

            <div className="mt-5 rounded-2xl border border-[#333] p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm uppercase tracking-[0.15em] text-[#999]">Menu</h4>
                    {loading ? <span className="text-xs text-[#CFAF63]">Loading...</span> : null}
                </div>
                {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
                <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {filteredMenu.map((item) => (
                        <button
                            key={item._id}
                            type="button"
                            onClick={() => addItem(item)}
                            disabled={Boolean(item.isSoldOut)}
                            className="rounded-xl border border-[#CFAF63]/20 bg-[#0F0F0F] p-3 text-left transition hover:border-[#CFAF63]/50 disabled:opacity-50"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                    <p className="font-medium text-[#F5F5F5]">{item.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <p className="text-xs text-[#999]">{item.category}</p>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${item.isVeg ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40" : "bg-red-500/25 text-red-300 border border-red-500/40"}`}>
                                            <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                                            {item.isVeg ? "Veg" : "Non-Veg"}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[#CFAF63] font-semibold">₹{item.price}</p>
                            </div>
                            {item.isSoldOut ? <p className="mt-2 text-xs text-rose-300">Sold out</p> : null}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-5 rounded-2xl border border-[#333] p-4">
                <h4 className="mb-3 text-sm uppercase tracking-[0.15em] text-[#999]">Current Ticket</h4>
                {cart.length === 0 ? (
                    <p className="text-sm text-[#999]">No items added yet.</p>
                ) : (
                    <div className="space-y-3">
                        {cart.map((entry) => (
                            <div key={entry.item._id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0F0F0F] px-3 py-2">
                                <div>
                                    <p className="text-sm text-[#F5F5F5]">{entry.item.name}</p>
                                    <p className="text-xs text-[#999]">₹{entry.item.price} each</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => updateQuantity(entry.item._id, entry.quantity - 1)} className="rounded-md border border-[#333] px-2 py-1 text-xs text-[#F5F5F5]">-</button>
                                    <span className="w-6 text-center text-sm text-[#F5F5F5]">{entry.quantity}</span>
                                    <button type="button" onClick={() => updateQuantity(entry.item._id, entry.quantity + 1)} className="rounded-md border border-[#333] px-2 py-1 text-xs text-[#F5F5F5]">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-5 rounded-2xl border border-[#333] p-4">
                <h4 className="mb-3 text-sm uppercase tracking-[0.15em] text-[#999]">Coupon & Pricing</h4>
                <div className="flex gap-2">
                    <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        className="flex-1 rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-3 py-2 text-sm text-[#F5F5F5]"
                    />
                    <button type="button" onClick={() => void applyCoupon()} className="rounded-xl border border-[#CFAF63]/35 px-4 py-2 text-sm text-[#CFAF63]">
                        Apply
                    </button>
                </div>
                {couponMessage ? <p className="mt-2 text-xs text-[#CFAF63]">{couponMessage}</p> : null}

                <div className="mt-3 space-y-1 text-sm text-[#CCC]">
                    <div className="flex items-center justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span>Discount</span><span>- ₹{discount.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span>Delivery</span><span>₹{delivery.toFixed(2)}</span></div>
                    <div className="flex items-center justify-between"><span>GST (5%)</span><span>₹{gst.toFixed(2)}</span></div>
                    <div className="mt-2 flex items-center justify-between border-t border-[#333] pt-2 font-semibold text-[#F5F5F5]"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
                </div>

                {!minimumOrderMet && cart.length ? (
                    <p className="mt-2 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
                        Add ₹{shortfall.toFixed(2)} more to place order.
                    </p>
                ) : null}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={placeOrder} disabled={saving || !minimumOrderMet} className="rounded-full bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-3 font-semibold text-[#111] disabled:opacity-60">
                    {saving ? 'Creating Order...' : paymentMethod === "Cash" ? 'Create Table Order' : 'Create UPI Order'}
                </button>
                <button type="button" onClick={() => setCart([])} className="rounded-full border border-[#CFAF63]/30 px-5 py-3 text-sm text-[#F5F5F5]">
                    Clear Ticket
                </button>
            </div>

            {success ? <p className="mt-3 text-sm text-[#00D98E]">{success}</p> : null}
        </motion.div>
    );
}
