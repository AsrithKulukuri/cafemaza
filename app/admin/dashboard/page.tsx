"use client";

import { useState, useEffect, useRef, useMemo, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, BarChart3, ShoppingCart, UtensilsCrossed, Calendar, Plus, Trash2, Edit2, Monitor, Truck, User, TicketPercent, CreditCard, Scan, Users, Gift, Sliders } from "lucide-react";
import { mockOrders, mockAnalytics, mockReservations, mockScreeningBookings, type ScreeningBooking } from "@/data/mockData";
import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";
import { StaffUsersPanel } from "@/components/admin/StaffUsersPanel";
import { MembershipPosTerminal } from "@/components/admin/membership/MembershipPosTerminal";
import { CardsManagerPanel } from "@/components/admin/membership/CardsManagerPanel";
import { CustomersDirectoryPanel } from "@/components/admin/membership/CustomersDirectoryPanel";
import { ReferralsPointsPanel } from "@/components/admin/membership/ReferralsPointsPanel";
import { MembershipSettingsPanel } from "@/components/admin/membership/MembershipSettingsPanel";

type TabType =
    | "analytics"
    | "orders"
    | "menu"
    | "deliveryPartners"
    | "coupons"
    | "promotions"
    | "staffUsers"
    | "reservations"
    | "screenings"
    | "membershipPos"
    | "membershipCards"
    | "membershipCustomers"
    | "membershipReferrals"
    | "membershipSettings";

type AdminMenuItem = {
    _id: string;
    name: string;
    category?: string;
    categories?: string[];
    price?: number;
    variants?: { name: string; price: number }[];
    description?: string;
    image: string;
    isVeg: boolean;
    isPopular?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

type DeliveryPartner = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    deliveryProfile?: {
        vehicleNumber?: string;
        licenseNumber?: string;
        isActive?: boolean;
    };
    createdAt?: string;
};

type AdminOrderStatus = "placed" | "preparing" | "ready" | "out_for_delivery" | "delivered";
type AdminUpdatableOrderStatus = "placed" | "preparing" | "ready" | "out_for_delivery";

type AdminOrder = {
    id: string;
    customerName: string;
    customerPhone: string;
    items: { name: string; quantity: number; price: number }[];
    status: AdminOrderStatus;
    total: number;
    orderType: "dine-in" | "takeaway" | "delivery";
    createdAt: Date;
    tableNumber?: number;
    deliveryAddress?: string;
};

type DailyHistoryItem = {
    date: string;
    orders: number;
    revenue: number;
};

type CouponType = "flat" | "percent" | "free_delivery";

type CouponItem = {
    _id: string;
    code: string;
    type: CouponType;
    value: number;
    minOrder: number;
    maxDiscount?: number | null;
    usageLimit?: number | null;
    perUserLimit?: number | null;
    usageCount?: number;
    remainingUses?: number | null;
    startDate: string;
    expiryDate: string;
    isActive: boolean;
    status?: "active" | "inactive" | "expired" | "upcoming";
};

type CouponAnalyticsRow = {
    code: string;
    redemptions: number;
    totalDiscount: number;
    totalRevenue: number;
    avgOrderValue: number;
    type: CouponType | null;
    isActive: boolean | null;
    usageLimit: number | null;
    usageCount: number;
};

type CouponAnalyticsResponse = {
    summary: {
        totalCoupons: number;
        totalRedemptions: number;
        totalDiscountGiven: number;
        topCoupon: CouponAnalyticsRow | null;
    };
    rows: CouponAnalyticsRow[];
};

type PromoBannerItem = {
    _id: string;
    title: string;
    subtitle?: string;
    couponCode?: string;
    image?: string;
    ctaText?: string;
    ctaLink?: string;
    startsAt?: string | null;
    endsAt?: string | null;
    isActive: boolean;
    status?: "active" | "inactive" | "upcoming" | "expired";
};

function normalizeOrderStatus(status: string): AdminOrderStatus {
    if (status === "new") return "placed";
    if (status === "completed") return "delivered";
    if (status === "placed" || status === "preparing" || status === "ready" || status === "out_for_delivery" || status === "delivered") {
        return status;
    }
    return "placed";
}

function formatOrderDisplayId(orderId: string) {
    const normalized = String(orderId || "").trim();
    if (!normalized) {
        return "#------";
    }
    return `#${normalized.slice(-6).toUpperCase()}`;
}

export default function AdminDashboard() {
    const router = useRouter();
    const menuCategoryOptions = [
        "Recommended",
        "Soups",
        "Tandoori",
        "Chinese",
        "Main Course",
        "Biryani",
        "Rice & Noodles",
        "Breads",
        "Sizzlers",
        "Desserts",
        "Drinks",
    ];
    const [adminInfo, setAdminInfo] = useState<{ adminEmail: string; name: string; email: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("analytics");
    const [newMenuItem, setNewMenuItem] = useState({
        name: "",
        categories: ["Recommended"],
        price: "",
        variants: [] as { name: string; price: string }[],
        description: "",
        image: "",
        isVeg: true,
        isPopular: false,
        isBestSeller: false,
        isSpecial: false,
        isSoldOut: false,
        tagsText: "",
    });
    const [showNewMenuForm, setShowNewMenuForm] = useState(false);
    const [editingMenuItemId, setEditingMenuItemId] = useState<string | null>(null);

    function getSafeMenuImageSrc(src: string | undefined) {
        if (!src) {
            return "/images/soup.jpg";
        }

        if (src.includes("unsplash.com/photos/") || src.includes("images.pexels.com/photos/1095521/")) {
            return "/images/soup.jpg";
        }

        if (src.includes("images.unsplash.com")) {
            const separator = src.includes("?") ? "&" : "?";
            return `${src}${separator}auto=format&fit=crop&w=640&q=55`;
        }

        return src;
    }

    function normalizeMenuImageInput(src: string) {
        return getSafeMenuImageSrc(src.trim());
    }
    const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
    const [menuSaving, setMenuSaving] = useState(false);
    const [menuError, setMenuError] = useState("");
    const [uploadingImage, setUploadingImage] = useState(false);
    const [updatingImageId, setUpdatingImageId] = useState<string | null>(null);
    const rowImageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const [deliveryPartners, setDeliveryPartners] = useState<DeliveryPartner[]>([]);
    const [coupons, setCoupons] = useState<CouponItem[]>([]);
    const [couponError, setCouponError] = useState("");
    const [couponSaving, setCouponSaving] = useState(false);
    const [couponForm, setCouponForm] = useState({
        code: "",
        type: "flat" as CouponType,
        value: "",
        minOrder: "99",
        maxDiscount: "",
        usageLimit: "",
        perUserLimit: "",
        startDate: "",
        expiryDate: "",
        isActive: true,
    });
    const [couponAnalytics, setCouponAnalytics] = useState<CouponAnalyticsResponse | null>(null);
    const [promoBanners, setPromoBanners] = useState<PromoBannerItem[]>([]);
    const [promoError, setPromoError] = useState("");
    const [promoSaving, setPromoSaving] = useState(false);
    const [uploadingPromoImage, setUploadingPromoImage] = useState(false);
    const [promoForm, setPromoForm] = useState({
        title: "",
        subtitle: "",
        couponCode: "",
        image: "",
        ctaText: "Order Now",
        ctaLink: "/menu",
        startsAt: "",
        endsAt: "",
        isActive: true,
    });
    const [notificationPhone, setNotificationPhone] = useState("");
    const [notificationSaving, setNotificationSaving] = useState(false);
    const [notificationError, setNotificationError] = useState("");
    const [notificationSavedAt, setNotificationSavedAt] = useState<string | null>(null);
    const [showDeliveryPartnerForm, setShowDeliveryPartnerForm] = useState(false);
    const [deliveryPartnerSaving, setDeliveryPartnerSaving] = useState(false);
    const [deliveryPartnerError, setDeliveryPartnerError] = useState("");
    const [newDeliveryPartner, setNewDeliveryPartner] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        vehicleNumber: "",
        licenseNumber: "",
    });
    const [orders, setOrders] = useState<AdminOrder[]>(() =>
        mockOrders.map((order, index) => ({
            ...order,
            id: String(order.id),
            status: normalizeOrderStatus(order.status),
            createdAt: new Date(order.createdAt),
        }))
    );
    const [orderError, setOrderError] = useState("");
    const [dailyHistory, setDailyHistory] = useState<DailyHistoryItem[]>([]);
    const [historyDaysFilter, setHistoryDaysFilter] = useState<7 | 30 | 90>(90);
    const [showActiveDaysOnly, setShowActiveDaysOnly] = useState(false);
    const [screeningBookings, setScreeningBookings] = useState<ScreeningBooking[]>(mockScreeningBookings);
    const [reservations, setReservations] = useState(mockReservations);
    const [analytics, setAnalytics] = useState({
        totalOrdersToday: 0,
        revenueToday: 0,
        totalOrdersAllTime: 0,
        revenueAllTime: 0,
        activeOrders: 0,
        reservationsToday: 0,
    });

    const updateScreeningStatus = (id: string, status: ScreeningBooking["status"]) => {
        setScreeningBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    };

    useEffect(() => {
        const user = getAuthUser();
        if (!user || user.role !== "admin") {
            router.push("/admin-login");
            return;
        }
        setAdminInfo({ adminEmail: user.email, name: user.name, email: user.email });
    }, [router]);

    useEffect(() => {
        async function loadDashboardData() {
            const token = getAuthToken();
            if (!token) return;

            try {
                const [analyticsRes, ordersRes, menuRes, reservationsRes, screeningRes, deliveryPartnersRes, couponsRes, couponAnalyticsRes, promoBannersRes, notificationSettingsRes] = await Promise.all([
                    apiFetch<{ totalOrders: number; revenue: number; totalOrdersToday?: number; revenueToday?: number; activeOrders: number; reservations: number; dailyHistory?: DailyHistoryItem[] }>("/api/admin/analytics?days=90", { token }),
                    apiFetch<Array<{ _id: string; totalAmount: number; status: string; createdAt: string; userId?: { name?: string }; items: Array<{ quantity: number; menuItemId?: { name?: string; price?: number } }> }>>("/api/orders?days=90", { token }),
                    apiFetch<AdminMenuItem[]>("/api/menu", { token, cache: "no-store" }),
                    apiFetch<typeof mockReservations>("/api/reservations", { token }),
                    apiFetch<ScreeningBooking[]>("/api/screening", { token }),
                    apiFetch<DeliveryPartner[]>("/api/admin/delivery-partners", { token }),
                    apiFetch<CouponItem[]>("/api/admin/coupons", { token }),
                    apiFetch<CouponAnalyticsResponse>("/api/admin/coupon-analytics", { token }),
                    apiFetch<PromoBannerItem[]>("/api/promo-banners", { token }),
                    apiFetch<{ orderReceivedAlertPhone?: string; updatedAt?: string | null }>("/api/admin/notification-settings", { token }),
                ]);

                setAnalytics({
                    totalOrdersToday: analyticsRes.totalOrdersToday ?? (analyticsRes.dailyHistory?.[0]?.orders ?? 0),
                    revenueToday: analyticsRes.revenueToday ?? (analyticsRes.dailyHistory?.[0]?.revenue ?? 0),
                    totalOrdersAllTime: analyticsRes.totalOrders || 0,
                    revenueAllTime: analyticsRes.revenue || 0,
                    activeOrders: analyticsRes.activeOrders || 0,
                    reservationsToday: analyticsRes.reservations || 0,
                });
                setDailyHistory(analyticsRes.dailyHistory || []);

                setOrders(
                    ordersRes.map((order) => ({
                        id: order._id,
                        customerName: order.userId?.name || "Customer",
                        customerPhone: "N/A",
                        items: order.items.map((item) => ({
                            name: item.menuItemId?.name || "Item",
                            quantity: item.quantity,
                            price: item.menuItemId?.price || 0,
                        })),
                        status: normalizeOrderStatus(order.status),
                        total: order.totalAmount,
                        orderType: "delivery",
                        createdAt: new Date(order.createdAt),
                    }))
                );

                setMenuItems(menuRes);

                setReservations(reservationsRes);
                setScreeningBookings(screeningRes);
                setDeliveryPartners(deliveryPartnersRes);
                setCoupons(couponsRes);
                setCouponAnalytics(couponAnalyticsRes);
                setPromoBanners(promoBannersRes);
                setNotificationPhone(notificationSettingsRes.orderReceivedAlertPhone || "");
                setNotificationSavedAt(notificationSettingsRes.updatedAt || null);
            } catch {
                // Keep local fallback data.
            }
        }

        loadDashboardData();

        if (!socket.connected) {
            socket.connect();
        }
        // Join admins room on socket so server can send admin-targeted events
        try {
            socket.emit("join_admin");
        } catch (e) {
            // ignore
        }

        const handleOrderChanged = () => {
            loadDashboardData();
        };

        socket.on("order_created", handleOrderChanged);
        socket.on("order_status_updated", handleOrderChanged);

        return () => {
            socket.off("order_created", handleOrderChanged);
            socket.off("order_status_updated", handleOrderChanged);
        };
    }, []);

    const handleLogout = () => {
        clearAuthSession();
        router.push("/admin-login");
    };

    const saveNotificationPhone = async () => {
        const token = getAuthToken();
        if (!token) {
            setNotificationError("Admin session expired. Please login again.");
            return;
        }

        setNotificationSaving(true);
        setNotificationError("");

        try {
            const updated = await apiFetch<{ orderReceivedAlertPhone?: string; updatedAt?: string | null }>("/api/admin/notification-settings", {
                method: "PUT",
                token,
                body: JSON.stringify({ orderReceivedAlertPhone: notificationPhone }),
            });

            setNotificationPhone(updated.orderReceivedAlertPhone || "");
            setNotificationSavedAt(updated.updatedAt || null);
        } catch (error) {
            setNotificationError(error instanceof Error ? error.message : "Failed to save notification number");
        } finally {
            setNotificationSaving(false);
        }
    };

    const handleAddMenuItem = async () => {
        const hasVariants = newMenuItem.variants.length > 0;
        if (!newMenuItem.name || !newMenuItem.image || newMenuItem.categories.length === 0 || (!hasVariants && !newMenuItem.price)) {
            setMenuError("Name, categories, price or variants, and image are required");
            return;
        }

        if (hasVariants) {
            const invalidVariant = newMenuItem.variants.some((variant) => !variant.name.trim() || !variant.price.trim() || Number.isNaN(Number(variant.price)) || Number(variant.price) < 0);
            if (invalidVariant) {
                setMenuError("All variants require a valid name and price");
                return;
            }
        }

        const token = getAuthToken();
        if (!token) {
            setMenuError("Admin session expired. Please login again.");
            return;
        }

        setMenuSaving(true);
        setMenuError("");

        try {
            const tags = newMenuItem.tagsText
                .split(",")
                .map((tag) => tag.trim().toLowerCase())
                .filter(Boolean);
            const image = normalizeMenuImageInput(newMenuItem.image);
            const payload = {
                name: newMenuItem.name,
                categories: newMenuItem.categories,
                category: newMenuItem.categories[0] || "",
                price: newMenuItem.price ? Number(newMenuItem.price) : undefined,
                variants: newMenuItem.variants.length > 0
                    ? newMenuItem.variants.map((variant) => ({
                        name: variant.name.trim(),
                        price: Number(variant.price),
                    }))
                    : [],
                description: newMenuItem.description.trim(),
                image,
                isVeg: newMenuItem.isVeg,
                isPopular: newMenuItem.isPopular,
                isBestSeller: newMenuItem.isBestSeller,
                isSpecial: newMenuItem.isSpecial,
                isSoldOut: newMenuItem.isSoldOut,
                tags,
            };

            if (editingMenuItemId) {
                const updated = await apiFetch<AdminMenuItem>(`/api/menu/${editingMenuItemId}`, {
                    method: "PUT",
                    token,
                    body: JSON.stringify(payload),
                });
                setMenuItems((prev) => prev.map((item) => (item._id === editingMenuItemId ? updated : item)));
            } else {
                const created = await apiFetch<AdminMenuItem>("/api/menu", {
                    method: "POST",
                    token,
                    body: JSON.stringify(payload),
                });
                setMenuItems((prev) => [created, ...prev]);
            }

            setNewMenuItem({
                name: "",
                categories: ["Recommended"],
                price: "",
                variants: [],
                description: "",
                image: "",
                isVeg: true,
                isPopular: false,
                isBestSeller: false,
                isSpecial: false,
                isSoldOut: false,
                tagsText: "",
            });
            setShowNewMenuForm(false);
            setEditingMenuItemId(null);
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Failed to save menu item");
        } finally {
            setMenuSaving(false);
        }
    };

    const handleEditMenuItem = (item: AdminMenuItem) => {
        setEditingMenuItemId(item._id);
        setShowNewMenuForm(true);
        setNewMenuItem({
            name: item.name || "",
            categories: item.categories && item.categories.length > 0 ? item.categories : item.category ? [item.category] : ["Recommended"],
            price: item.price != null ? String(item.price) : "",
            variants: item.variants ? item.variants.map((variant) => ({ name: variant.name, price: String(variant.price) })) : [],
            description: item.description || "",
            image: item.image || "",
            isVeg: Boolean(item.isVeg),
            isPopular: Boolean(item.isPopular),
            isBestSeller: Boolean(item.isBestSeller),
            isSpecial: Boolean(item.isSpecial),
            isSoldOut: Boolean(item.isSoldOut),
            tagsText: (item.tags || []).join(", "),
        });
    };

    const updateOrderStatus = async (orderId: string, status: AdminUpdatableOrderStatus) => {
        const previousStatus = orders.find((order) => order.id === orderId)?.status;
        if (!previousStatus) {
            return;
        }

        setOrderError("");
        setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));

        const token = getAuthToken();
        if (!token) {
            setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: previousStatus } : order)));
            setOrderError("Admin session expired. Please login again.");
            return;
        }

        try {
            const updated = await apiFetch<{ status?: string }>(`/api/orders/${orderId}/status`, {
                method: "PUT",
                token,
                body: JSON.stringify({ status }),
            });

            const normalized = normalizeOrderStatus(String(updated?.status || status));
            setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: normalized } : order)));
        } catch (error) {
            setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status: previousStatus } : order)));
            setOrderError(error instanceof Error ? error.message : "Failed to update order status");
        }
    };

    const updateMenuItem = async (id: string, patch: Partial<AdminMenuItem>) => {
        const token = getAuthToken();

        if (!token) {
            setMenuError("Admin session expired. Please login again.");
            return;
        }

        try {
            const updated = await apiFetch<AdminMenuItem>(`/api/menu/${id}`, {
                method: "PUT",
                token,
                body: JSON.stringify(patch),
            });

            setMenuItems((prev) => prev.map((item) => (item._id === id ? updated : item)));
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Failed to update menu item");
        }
    };

    const deleteMenuItem = async (id: string) => {
        const token = getAuthToken();
        if (!token) {
            setMenuError("Admin session expired. Please login again.");
            return;
        }

        try {
            await apiFetch(`/api/menu/${id}`, {
                method: "DELETE",
                token,
            });
            setMenuItems((prev) => prev.filter((item) => item._id !== id));
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Failed to delete menu item");
        }
    };

    const editMenuItemPrice = (id: string, currentPrice: number) => {
        const input = window.prompt("Update item price", String(currentPrice));
        if (!input) return;
        const nextPrice = Number(input);
        if (Number.isNaN(nextPrice) || nextPrice <= 0) return;

        updateMenuItem(id, { price: nextPrice });
    };

    const editMenuItemTags = (item: AdminMenuItem) => {
        const input = window.prompt("Update tags (comma separated)", (item.tags || []).join(", "));
        if (input === null) return;

        const tags = input
            .split(",")
            .map((tag) => tag.trim().toLowerCase())
            .filter(Boolean);

        updateMenuItem(item._id, { tags });
    };

    const uploadImageFile = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        const token = typeof window !== "undefined" ? window.localStorage.getItem("cm_token") : null;
        const response = await fetch("/api/menu/upload-image", {
            method: "POST",
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            const hint = result.hint ? ` ${result.hint}` : "";
            throw new Error(`${result.error || "Image upload failed"}${hint}`);
        }

        return result.publicUrl as string;
    };

    const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        setMenuError("");

        try {
            const publicUrl = await uploadImageFile(file);
            setNewMenuItem((prev) => ({ ...prev, image: publicUrl }));
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Image upload failed");
        } finally {
            setUploadingImage(false);
        }
    };

    const handleReplaceItemImage = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUpdatingImageId(id);
        setMenuError("");

        try {
            const publicUrl = await uploadImageFile(file);
            await updateMenuItem(id, { image: publicUrl });
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Image update failed");
        } finally {
            if (event.target) {
                event.target.value = "";
            }
            setUpdatingImageId(null);
        }
    };

    const editMenuItemImageUrl = (item: AdminMenuItem) => {
        const input = window.prompt("Update image URL", item.image || "");
        if (input === null) return;

        const nextImage = input.trim();
        if (!nextImage) return;

        updateMenuItem(item._id, { image: normalizeMenuImageInput(nextImage) });
    };

    const handleAddDeliveryPartner = async () => {
        const token = getAuthToken();
        if (!token) {
            setDeliveryPartnerError("Admin session expired. Please login again.");
            return;
        }

        if (!newDeliveryPartner.name || !newDeliveryPartner.email || !newDeliveryPartner.password) {
            setDeliveryPartnerError("Name, email and password are required");
            return;
        }

        setDeliveryPartnerSaving(true);
        setDeliveryPartnerError("");

        try {
            const created = await apiFetch<DeliveryPartner>("/api/admin/delivery-partners", {
                method: "POST",
                token,
                body: JSON.stringify(newDeliveryPartner),
            });

            setDeliveryPartners((prev) => [created, ...prev]);
            setNewDeliveryPartner({
                name: "",
                email: "",
                phone: "",
                password: "",
                vehicleNumber: "",
                licenseNumber: "",
            });
            setShowDeliveryPartnerForm(false);
        } catch (requestError) {
            setDeliveryPartnerError(requestError instanceof Error ? requestError.message : "Failed to add delivery partner");
        } finally {
            setDeliveryPartnerSaving(false);
        }
    };

    const toggleDeliveryPartner = async (partner: DeliveryPartner, isActive: boolean) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const updated = await apiFetch<DeliveryPartner>(`/api/admin/delivery-partners/${partner._id}`, {
                method: "PUT",
                token,
                body: JSON.stringify({ isActive }),
            });

            setDeliveryPartners((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (requestError) {
            setDeliveryPartnerError(requestError instanceof Error ? requestError.message : "Failed to update partner");
        }
    };

    const handleAddCoupon = async () => {
        const token = getAuthToken();
        if (!token) {
            setCouponError("Admin session expired. Please login again.");
            return;
        }

        if (!couponForm.code.trim() || !couponForm.value || !couponForm.startDate || !couponForm.expiryDate) {
            setCouponError("Code, value, start date and expiry date are required");
            return;
        }

        setCouponSaving(true);
        setCouponError("");

        try {
            const created = await apiFetch<CouponItem>("/api/admin/add-coupon", {
                method: "POST",
                token,
                body: JSON.stringify({
                    code: couponForm.code,
                    type: couponForm.type,
                    value: Number(couponForm.value),
                    minOrder: Number(couponForm.minOrder || 0),
                    maxDiscount: couponForm.maxDiscount ? Number(couponForm.maxDiscount) : null,
                    usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
                    perUserLimit: couponForm.perUserLimit ? Number(couponForm.perUserLimit) : null,
                    startDate: couponForm.startDate,
                    expiryDate: couponForm.expiryDate,
                    isActive: couponForm.isActive,
                }),
            });

            setCoupons((prev) => [created, ...prev]);
            setCouponForm({
                code: "",
                type: "flat",
                value: "",
                minOrder: "99",
                maxDiscount: "",
                usageLimit: "",
                perUserLimit: "",
                startDate: "",
                expiryDate: "",
                isActive: true,
            });
        } catch (requestError) {
            setCouponError(requestError instanceof Error ? requestError.message : "Failed to add coupon");
        } finally {
            setCouponSaving(false);
        }
    };

    const toggleCoupon = async (coupon: CouponItem) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const updated = await apiFetch<CouponItem>(`/api/admin/update-coupon/${coupon._id}`, {
                method: "PUT",
                token,
                body: JSON.stringify({
                    ...coupon,
                    isActive: !coupon.isActive,
                }),
            });

            setCoupons((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (requestError) {
            setCouponError(requestError instanceof Error ? requestError.message : "Failed to update coupon");
        }
    };

    const deleteCoupon = async (couponId: string) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            await apiFetch(`/api/admin/delete-coupon/${couponId}`, {
                method: "DELETE",
                token,
            });
            setCoupons((prev) => prev.filter((item) => item._id !== couponId));
        } catch (requestError) {
            setCouponError(requestError instanceof Error ? requestError.message : "Failed to delete coupon");
        }
    };

    const editCoupon = async (coupon: CouponItem) => {
        const token = getAuthToken();
        if (!token) return;

        const valueInput = window.prompt("Coupon value", String(coupon.value));
        if (valueInput === null) return;
        const minOrderInput = window.prompt("Minimum order", String(coupon.minOrder));
        if (minOrderInput === null) return;
        const maxDiscountInput = window.prompt("Max discount (leave blank for none)", coupon.maxDiscount == null ? "" : String(coupon.maxDiscount));
        if (maxDiscountInput === null) return;

        const value = Number(valueInput);
        const minOrder = Number(minOrderInput);
        const maxDiscount = maxDiscountInput.trim() ? Number(maxDiscountInput) : null;

        if (!Number.isFinite(value) || !Number.isFinite(minOrder) || (maxDiscount != null && !Number.isFinite(maxDiscount))) {
            setCouponError("Coupon update values are invalid");
            return;
        }

        try {
            const updated = await apiFetch<CouponItem>(`/api/admin/update-coupon/${coupon._id}`, {
                method: "PUT",
                token,
                body: JSON.stringify({
                    ...coupon,
                    value,
                    minOrder,
                    maxDiscount,
                }),
            });

            setCoupons((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (requestError) {
            setCouponError(requestError instanceof Error ? requestError.message : "Failed to edit coupon");
        }
    };

    const handleAddPromoBanner = async () => {
        const token = getAuthToken();
        if (!token) {
            setPromoError("Admin session expired. Please login again.");
            return;
        }

        if (!promoForm.title.trim()) {
            setPromoError("Promo title is required");
            return;
        }

        setPromoSaving(true);
        setPromoError("");

        try {
            const created = await apiFetch<PromoBannerItem>("/api/promo-banners", {
                method: "POST",
                token,
                body: JSON.stringify({
                    ...promoForm,
                    couponCode: promoForm.couponCode.trim().toUpperCase(),
                    startsAt: promoForm.startsAt || null,
                    endsAt: promoForm.endsAt || null,
                }),
            });

            setPromoBanners((prev) => [created, ...prev].slice(0, 3));
            setPromoForm({
                title: "",
                subtitle: "",
                couponCode: "",
                image: "",
                ctaText: "Order Now",
                ctaLink: "/menu",
                startsAt: "",
                endsAt: "",
                isActive: true,
            });
        } catch (requestError) {
            setPromoError(requestError instanceof Error ? requestError.message : "Failed to add promo banner");
        } finally {
            setPromoSaving(false);
        }
    };

    const handlePromoImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploadingPromoImage(true);
        setPromoError("");

        try {
            const publicUrl = await uploadImageFile(file);
            setPromoForm((prev) => ({ ...prev, image: publicUrl }));
        } catch (error) {
            setPromoError(error instanceof Error ? error.message : "Promo image upload failed");
        } finally {
            if (event.target) {
                event.target.value = "";
            }
            setUploadingPromoImage(false);
        }
    };

    const togglePromoBanner = async (banner: PromoBannerItem) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const updated = await apiFetch<PromoBannerItem>(`/api/promo-banners/${banner._id}`, {
                method: "PUT",
                token,
                body: JSON.stringify({
                    ...banner,
                    isActive: !banner.isActive,
                }),
            });

            setPromoBanners((prev) => prev.map((item) => (item._id === updated._id ? updated : item)));
        } catch (requestError) {
            setPromoError(requestError instanceof Error ? requestError.message : "Failed to update promo banner");
        }
    };

    const deletePromoBanner = async (bannerId: string) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            await apiFetch(`/api/promo-banners/${bannerId}`, {
                method: "DELETE",
                token,
            });

            setPromoBanners((prev) => prev.filter((item) => item._id !== bannerId));
        } catch (requestError) {
            setPromoError(requestError instanceof Error ? requestError.message : "Failed to delete promo banner");
        }
    };

    if (!adminInfo) return null;

    const tabs = [
        { id: "membershipPos", label: "POS Scanner & Billing", icon: Scan },
        { id: "membershipCards", label: "200 Cards Hub", icon: CreditCard },
        { id: "membershipCustomers", label: "Members Directory", icon: Users },
        { id: "membershipReferrals", label: "Referrals & Points", icon: Gift },
        { id: "membershipSettings", label: "Membership Settings", icon: Sliders },
        { id: "analytics", label: "Analytics", icon: BarChart3 },
        { id: "orders", label: "Orders", icon: ShoppingCart },
        { id: "menu", label: "Menu", icon: UtensilsCrossed },
        { id: "deliveryPartners", label: "Delivery Partners", icon: Truck },
        { id: "coupons", label: "Coupons", icon: TicketPercent },
        { id: "promotions", label: "Promotions", icon: Calendar },
        { id: "staffUsers", label: "Staff Users", icon: User },
        { id: "reservations", label: "Reservations", icon: Calendar },
        { id: "screenings", label: "Screenings", icon: Monitor },
    ];

    return (
        <div className="min-h-screen bg-[#0B0B0B] p-3 sm:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="text-xs sm:text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Welcome,</p>
                    <h1 className="font-[var(--font-heading)] text-2xl sm:text-4xl text-[#F5F5F5]">{adminInfo.name}</h1>
                    <p className="text-xs sm:text-sm text-[#999] mt-0.5">{adminInfo.email}</p>
                </motion.div>
                <button
                    onClick={handleLogout}
                    className="touch-target self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00]/30 transition text-xs sm:text-sm font-semibold cursor-pointer"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 sm:mb-8 overflow-x-auto pb-3 pt-1 custom-scrollbar">
                <div className="flex items-center gap-2.5 min-w-max">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <motion.button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                className={`shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-xs sm:text-sm font-semibold transition cursor-pointer ${isActive
                                    ? "bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] text-[#111] shadow-lg ring-1 ring-[#FF6A00]/40"
                                    : "border border-[#CFAF63]/25 bg-black/40 text-[#F5F5F5] hover:border-[#CFAF63] hover:bg-[#CFAF63]/10"
                                    }`}
                            >
                                <Icon size={16} className={isActive ? "text-[#111]" : "text-[#CFAF63]"} />
                                <span>{tab.label}</span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Content Sections */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                {/* ANALYTICS TAB */}
                {activeTab === "analytics" && (
                    <div className="space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="glass-card rounded-2xl border border-[#CFAF63]/25 p-4 sm:p-6"
                        >
                            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                                <div>
                                    <h3 className="font-(--font-heading) text-lg sm:text-xl text-[#F5F5F5] mb-1">Order received notification number</h3>
                                    <p className="text-xs sm:text-sm text-[#999]">This number receives the WhatsApp alert when a new order is placed.</p>
                                </div>
                                <div className="flex flex-col gap-2 md:min-w-90 md:flex-row">
                                    <input
                                        value={notificationPhone}
                                        onChange={(e) => setNotificationPhone(e.target.value)}
                                        placeholder="+91XXXXXXXXXX"
                                        className="w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none font-mono text-sm"
                                    />
                                    <button
                                        onClick={() => void saveNotificationPhone()}
                                        disabled={notificationSaving}
                                        className="touch-target min-h-[44px] rounded-xl bg-linear-to-r from-[#CFAF63] to-[#FF6A00] px-5 py-3 text-sm font-semibold text-[#111] disabled:opacity-60 cursor-pointer"
                                    >
                                        {notificationSaving ? "Saving..." : "Save Number"}
                                    </button>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#999]">
                                <span>Current: {notificationPhone || "Not set"}</span>
                                {notificationSavedAt ? <span>Last saved: {new Date(notificationSavedAt).toLocaleString()}</span> : null}
                            </div>
                            {notificationError ? <p className="mt-3 text-sm text-rose-300">{notificationError}</p> : null}
                        </motion.div>

                        {/* Analytics Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                            {[
                                { 
                                    label: "Orders Today", 
                                    value: analytics.totalOrdersToday, 
                                    subtext: `All-Time: ${analytics.totalOrdersAllTime}`, 
                                    icon: "📊", 
                                    color: "from-[#FF6A00]" 
                                },
                                { 
                                    label: "Revenue Today", 
                                    value: `₹${analytics.revenueToday.toLocaleString()}`, 
                                    subtext: `All-Time: ₹${analytics.revenueAllTime.toLocaleString()}`, 
                                    icon: "💰", 
                                    color: "from-[#CFAF63]" 
                                },
                                { 
                                    label: "Active Orders", 
                                    value: analytics.activeOrders, 
                                    subtext: "In Kitchen / Delivery", 
                                    icon: "🔄", 
                                    color: "from-[#3B82F6]" 
                                },
                                { 
                                    label: "Reservations", 
                                    value: reservations.length, 
                                    subtext: "Table Bookings", 
                                    icon: "🗓️", 
                                    color: "from-[#00D98E]" 
                                },
                                { 
                                    label: "Screenings", 
                                    value: screeningBookings.length, 
                                    subtext: "Private Cinema", 
                                    icon: "🎬", 
                                    color: "from-[#8B5CF6]" 
                                },
                            ].map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`glass-card rounded-2xl border border-[#CFAF63]/25 p-5 bg-linear-to-br ${card.color}/5 flex flex-col justify-between`}
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-[#999] text-xs sm:text-sm font-medium">{card.label}</p>
                                        <span className="text-2xl sm:text-3xl">{card.icon}</span>
                                    </div>
                                    <div className="mt-3">
                                        <p className="text-2xl sm:text-3xl font-bold text-[#F5F5F5]">{card.value}</p>
                                        <p className="text-[11px] text-[#CFAF63]/80 mt-1 font-mono">{card.subtext}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Order & Revenue History */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-(--font-heading) text-xl text-[#F5F5F5] mb-1">Order & Revenue History</h3>
                                    <p className="text-sm text-[#999]">Daily breakdown of online orders & in-store POS billing (newest first).</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="flex items-center rounded-xl bg-[#151515] p-1 border border-[#CFAF63]/20 text-xs">
                                        {([7, 30, 90] as const).map((days) => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setHistoryDaysFilter(days)}
                                                className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                                                    historyDaysFilter === days
                                                        ? "bg-[#CFAF63] text-[#111] font-semibold"
                                                        : "text-[#999] hover:text-[#FFF]"
                                                }`}
                                            >
                                                {days}D
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowActiveDaysOnly((prev) => !prev)}
                                        className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition cursor-pointer ${
                                            showActiveDaysOnly
                                                ? "border-[#00D98E] bg-[#00D98E]/15 text-[#00D98E]"
                                                : "border-[#CFAF63]/20 bg-[#151515] text-[#999] hover:text-[#FFF]"
                                        }`}
                                    >
                                        {showActiveDaysOnly ? "✓ Active Days Only" : "Show All Days"}
                                    </button>
                                </div>
                            </div>

                            {(() => {
                                let displayedItems = dailyHistory.slice(0, historyDaysFilter);
                                if (showActiveDaysOnly) {
                                    displayedItems = displayedItems.filter((item) => item.orders > 0 || item.revenue > 0);
                                }
                                const periodOrders = displayedItems.reduce((acc, curr) => acc + curr.orders, 0);
                                const periodRevenue = displayedItems.reduce((acc, curr) => acc + curr.revenue, 0);
                                const todayStr = new Date().toISOString().slice(0, 10);

                                return (
                                    <>
                                        <div className="mt-4 max-h-[440px] overflow-auto rounded-xl border border-[#CFAF63]/15">
                                            <table className="w-full text-sm">
                                                <thead className="sticky top-0 bg-[#121212] z-10">
                                                    <tr className="border-b border-[#2A2A2A]">
                                                        <th className="px-4 py-3 text-left font-semibold text-[#999]">Date</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-[#999]">Orders</th>
                                                        <th className="px-4 py-3 text-left font-semibold text-[#999]">Status</th>
                                                        <th className="px-4 py-3 text-right font-semibold text-[#999]">Revenue</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayedItems.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-8 text-center text-[#777]">
                                                                No orders recorded in this period.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        displayedItems.map((entry) => {
                                                            const isToday = entry.date === todayStr;
                                                            const hasSales = entry.orders > 0 || entry.revenue > 0;

                                                            return (
                                                                <tr
                                                                    key={entry.date}
                                                                    className={`border-b border-[#1A1A1A] last:border-b-0 transition ${
                                                                        isToday
                                                                            ? "bg-[#CFAF63]/10"
                                                                            : hasSales
                                                                            ? "hover:bg-[#1A1A1A]/60"
                                                                            : "opacity-60 hover:opacity-100"
                                                                    }`}
                                                                >
                                                                    <td className="px-4 py-3 text-[#F5F5F5] font-mono flex items-center gap-2">
                                                                        <span>{entry.date}</span>
                                                                        {isToday && (
                                                                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#CFAF63] text-[#111] font-bold">
                                                                                Today
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-4 py-3 font-semibold">
                                                                        <span className={entry.orders > 0 ? "text-[#CFAF63]" : "text-[#777]"}>
                                                                            {entry.orders} {entry.orders === 1 ? "order" : "orders"}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        {hasSales ? (
                                                                            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#00D98E]/15 text-[#00D98E] font-medium">
                                                                                ● Active Sales
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[11px] text-[#555]">No activity</span>
                                                                        )}
                                                                    </td>
                                                                    <td className={`px-4 py-3 text-right font-mono font-semibold ${hasSales ? "text-[#00D98E]" : "text-[#666]"}`}>
                                                                        ₹{entry.revenue.toLocaleString()}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Summary Bar */}
                                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#999] border-t border-[#2A2A2A] pt-3">
                                            <span>
                                                Showing {displayedItems.length} days ({displayedItems.filter((i) => i.orders > 0 || i.revenue > 0).length} active trading days)
                                            </span>
                                            <div className="flex items-center gap-4">
                                                <span>Total Period Orders: <strong className="text-[#CFAF63]">{periodOrders}</strong></span>
                                                <span>Total Period Revenue: <strong className="text-[#00D98E]">₹{periodRevenue.toLocaleString()}</strong></span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </div>
                )}

                {/* ORDERS TAB */}
                {activeTab === "orders" && (
                    <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                        <h3 className="font-[var(--font-heading)] text-xl text-[#F5F5F5] mb-4">Order Management</h3>
                        {orderError ? <p className="mb-3 text-sm text-rose-300">{orderError}</p> : null}
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#333]">
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Order ID</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Customer</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Items</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Status</th>
                                    <th className="text-right py-3 px-4 text-[#999] text-sm font-semibold">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map((order, index) => (
                                    <tr key={`${order.id || "order"}-${index}`} className="border-b border-[#1A1A1A] hover:bg-[#111]/50 transition">
                                        <td className="py-3 px-4 text-[#CFAF63]">{formatOrderDisplayId(order.id)}</td>
                                        <td className="py-3 px-4 text-[#F5F5F5]">{order.customerName}</td>
                                        <td className="py-3 px-4 text-[#CCC] text-sm">{order.items.map((i) => i.name).join(", ")}</td>
                                        <td className="py-3 px-4">
                                            <select
                                                value={order.status}
                                                onChange={(e) => {
                                                    const nextStatus = e.target.value as AdminOrderStatus;
                                                    if (nextStatus === "delivered") {
                                                        return;
                                                    }
                                                    void updateOrderStatus(order.id, nextStatus as AdminUpdatableOrderStatus);
                                                }}
                                                disabled={order.status === "delivered"}
                                                className="rounded-md border border-[#CFAF63]/30 bg-[#171717] px-2 py-1 text-xs text-[#F5F5F5]"
                                            >
                                                <option value="placed">placed</option>
                                                <option value="preparing">preparing</option>
                                                <option value="ready">ready</option>
                                                <option value="out_for_delivery">out_for_delivery</option>
                                                <option value="delivered" disabled>delivered (delivery only)</option>
                                            </select>
                                        </td>
                                        <td className="py-3 px-4 text-right text-[#F5F5F5] font-semibold">₹{order.total}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* MENU TAB */}
                {activeTab === "menu" && (
                    <div className="space-y-6">
                        <motion.button
                            onClick={() => setShowNewMenuForm(!showNewMenuForm)}
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] text-[#111] font-semibold hover:shadow-lg transition"
                        >
                            <Plus size={18} />
                            Add New Item
                        </motion.button>

                        {/* Add Menu Form */}
                        {showNewMenuForm && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6"
                            >
                                <h3 className="font-[var(--font-heading)] text-lg text-[#F5F5F5] mb-4">{editingMenuItemId ? "Edit Menu Item" : "Add New Menu Item"}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Item Name"
                                        value={newMenuItem.name}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                    />
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs uppercase tracking-[0.16em] text-[#999]">Categories</label>
                                        <select
                                            multiple
                                            value={newMenuItem.categories}
                                            onChange={(e) => setNewMenuItem({
                                                ...newMenuItem,
                                                categories: Array.from(e.target.selectedOptions, (option) => option.value),
                                            })}
                                            className="h-40 rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] focus:outline-none"
                                        >
                                            {menuCategoryOptions.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="number"
                                            placeholder="Base Price (₹)"
                                            value={newMenuItem.price}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                                            className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                        />
                                        <div className="rounded-2xl border border-[#CFAF63]/25 bg-[#101010] p-3">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-sm text-[#999]">Variants (optional)</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewMenuItem((prev) => ({
                                                        ...prev,
                                                        variants: [...prev.variants, { name: "", price: "" }],
                                                    }))}
                                                    className="rounded-full border border-[#CFAF63]/30 px-3 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                                >
                                                    Add Variant
                                                </button>
                                            </div>
                                            {newMenuItem.variants.length === 0 ? (
                                                <p className="mt-3 text-xs text-[#777]">Add variants to create multi-option menu items, otherwise the base price will be used.</p>
                                            ) : (
                                                <div className="mt-3 space-y-2">
                                                    {newMenuItem.variants.map((variant, idx) => (
                                                        <div key={`${variant.name}-${idx}`} className="grid grid-cols-[1fr_120px_auto] gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Variant name"
                                                                value={variant.name}
                                                                onChange={(e) => setNewMenuItem((prev) => ({
                                                                    ...prev,
                                                                    variants: prev.variants.map((item, index) => index === idx ? { ...item, name: e.target.value } : item),
                                                                }))}
                                                                className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                                            />
                                                            <input
                                                                type="number"
                                                                placeholder="Price"
                                                                value={variant.price}
                                                                onChange={(e) => setNewMenuItem((prev) => ({
                                                                    ...prev,
                                                                    variants: prev.variants.map((item, index) => index === idx ? { ...item, price: e.target.value } : item),
                                                                }))}
                                                                className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setNewMenuItem((prev) => ({
                                                                    ...prev,
                                                                    variants: prev.variants.filter((_, index) => index !== idx),
                                                                }))}
                                                                className="rounded-full bg-rose-500/15 px-3 py-3 text-sm text-rose-300 hover:bg-rose-500/25"
                                                            >
                                                                Remove
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Image URL"
                                        value={newMenuItem.image}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                    />
                                    <textarea
                                        placeholder="Description"
                                        value={newMenuItem.description}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                                        className="min-h-[120px] resize-none rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none md:col-span-2"
                                    />
                                    <label className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]">
                                        <span className="text-xs text-[#999]">Upload dish photo (Supabase)</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="mt-2 block w-full text-sm"
                                        />
                                        <span className="mt-1 block text-xs text-[#999]">
                                            {uploadingImage ? "Uploading..." : "Max size 5MB"}
                                        </span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newMenuItem.isVeg}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, isVeg: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-[#F5F5F5]">Vegetarian</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newMenuItem.isPopular}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, isPopular: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-[#F5F5F5]">Show on Home</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newMenuItem.isBestSeller}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, isBestSeller: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-[#F5F5F5]">Most Selling</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newMenuItem.isSpecial}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, isSpecial: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-[#F5F5F5]">Recommended / Special Item</span>
                                    </label>
                                    <label className="flex items-center gap-2 px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={newMenuItem.isSoldOut}
                                            onChange={(e) => setNewMenuItem({ ...newMenuItem, isSoldOut: e.target.checked })}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-[#F5F5F5]">Sold Out</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Tags (comma separated: spicy, chef-special, new)"
                                        value={newMenuItem.tagsText}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, tagsText: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none md:col-span-2"
                                    />
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button
                                        onClick={handleAddMenuItem}
                                        disabled={menuSaving || uploadingImage}
                                        className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] text-[#111] font-semibold hover:shadow-lg transition text-sm"
                                    >
                                        {menuSaving ? "Saving..." : "Save Item"}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowNewMenuForm(false);
                                            setEditingMenuItemId(null);
                                        }}
                                        className="px-6 py-2 rounded-lg border border-[#CFAF63]/25 text-[#F5F5F5] hover:bg-[#1A1A1A] transition text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {menuError ? <p className="mt-3 text-sm text-rose-300">{menuError}</p> : null}
                            </motion.div>
                        )}

                        {/* Managed Menu List */}
                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                            <h3 className="font-[var(--font-heading)] text-lg text-[#F5F5F5] mb-4">All Menu Items</h3>
                            {menuError ? <p className="mb-3 text-sm text-rose-300">{menuError}</p> : null}
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        <th className="py-2 px-3 text-left text-[#999]">Dish</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Categories</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Price / Variants</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Tags</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Status</th>
                                        <th className="py-2 px-3 text-right text-[#999]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {menuItems.map((item, index) => (
                                        <tr key={`${item._id || `menu-item-${item.name}`}-${index}`} className="border-b border-[#1A1A1A] align-top">
                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                                                        <img
                                                            src={getSafeMenuImageSrc(item.image)}
                                                            alt={item.name}
                                                            onError={(event) => {
                                                                event.currentTarget.src = "/images/soup.jpg";
                                                            }}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-[#F5F5F5] font-medium">{item.name}</p>
                                                        <p className="text-[#999] text-xs">{item.isVeg ? "Veg" : "Non Veg"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-[#CCC]">{(item.categories || [item.category || ""]).filter(Boolean).join(", ")}</td>
                                            <td className="py-3 px-3 text-[#CFAF63]">
                                                {item.variants && item.variants.length > 0 ? (
                                                    <div className="space-y-1">
                                                        {item.variants.map((variant, idx) => (
                                                            <div key={`${item._id}-variant-${idx}`} className="text-xs text-[#F5F5F5]">
                                                                {variant.name}: ₹{variant.price}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    `₹${item.price ?? 0}`
                                                )}
                                            </td>
                                            <td className="py-3 px-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.isPopular ? <span className="rounded-full bg-[#00D98E]/20 px-2 py-0.5 text-xs text-[#4FE0A6]">Home</span> : null}
                                                    {item.isBestSeller ? <span className="rounded-full bg-[#FF6A00]/20 px-2 py-0.5 text-xs text-[#FF6A00]">Most Selling</span> : null}
                                                    {item.isSpecial ? <span className="rounded-full bg-[#CFAF63]/20 px-2 py-0.5 text-xs text-[#CFAF63]">Special</span> : null}
                                                    {item.isSoldOut ? <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs text-rose-300">Sold Out</span> : null}
                                                    {(item.tags || []).map((tag, tagIndex) => (
                                                        <span key={`${item._id || item.name}-${tag}-${tagIndex}`} className="rounded-full bg-[#3B82F6]/20 px-2 py-0.5 text-xs text-[#6CA3EA]">{tag}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3">
                                                <label className="flex items-center gap-2 text-xs text-[#CCC]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.isPopular)}
                                                        onChange={(event) => updateMenuItem(item._id, { isPopular: event.target.checked })}
                                                    />
                                                    Show on Home
                                                </label>
                                                <label className="mt-1 flex items-center gap-2 text-xs text-[#CCC]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.isBestSeller)}
                                                        onChange={(event) => updateMenuItem(item._id, { isBestSeller: event.target.checked })}
                                                    />
                                                    Most Selling
                                                </label>
                                                <label className="mt-1 flex items-center gap-2 text-xs text-[#CCC]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.isSoldOut)}
                                                        onChange={(event) => updateMenuItem(item._id, { isSoldOut: event.target.checked })}
                                                    />
                                                    Sold Out
                                                </label>
                                                <label className="mt-1 flex items-center gap-2 text-xs text-[#CCC]">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(item.isVeg)}
                                                        onChange={(event) => updateMenuItem(item._id, { isVeg: event.target.checked })}
                                                    />
                                                    Veg
                                                </label>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex justify-end gap-2 flex-wrap">
                                                    <button
                                                        onClick={() => handleEditMenuItem(item)}
                                                        className="rounded border border-[#CFAF63]/40 px-2 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => editMenuItemPrice(item._id, item.price ?? 0)}
                                                        className="p-1 rounded hover:bg-[#CFAF63]/20 transition"
                                                        title="Edit Price"
                                                    >
                                                        <Edit2 size={14} className="text-[#CFAF63]" />
                                                    </button>
                                                    <button
                                                        onClick={() => editMenuItemTags(item)}
                                                        className="rounded border border-[#3B82F6]/40 px-2 py-1 text-xs text-[#6CA3EA] hover:bg-[#3B82F6]/10"
                                                    >
                                                        Tags
                                                    </button>
                                                    <button
                                                        onClick={() => editMenuItemImageUrl(item)}
                                                        className="rounded border border-[#00D98E]/40 px-2 py-1 text-xs text-[#4FE0A6] hover:bg-[#00D98E]/10"
                                                    >
                                                        URL
                                                    </button>
                                                    <button
                                                        onClick={() => rowImageInputRefs.current[item._id]?.click()}
                                                        disabled={updatingImageId === item._id}
                                                        className="rounded border border-[#CFAF63]/40 px-2 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10 disabled:opacity-50"
                                                    >
                                                        {updatingImageId === item._id ? "Uploading..." : "Upload"}
                                                    </button>
                                                    <input
                                                        ref={(element) => {
                                                            rowImageInputRefs.current[item._id] = element;
                                                        }}
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(event) => handleReplaceItemImage(item._id, event)}
                                                        className="hidden"
                                                    />
                                                    <button
                                                        onClick={() => deleteMenuItem(item._id)}
                                                        className="p-1 rounded hover:bg-[#FF6A00]/20 transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} className="text-[#FF6A00]" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DELIVERY PARTNERS TAB */}
                {activeTab === "deliveryPartners" && (
                    <div className="space-y-6">
                        <motion.button
                            onClick={() => setShowDeliveryPartnerForm(!showDeliveryPartnerForm)}
                            whileHover={{ scale: 1.05 }}
                            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-3 font-semibold text-[#111]"
                        >
                            <Plus size={18} />
                            Add Delivery Partner
                        </motion.button>

                        {showDeliveryPartnerForm && (
                            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6">
                                <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">New Delivery Partner</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={newDeliveryPartner.name}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, name: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                    <input
                                        type="email"
                                        placeholder="Email"
                                        value={newDeliveryPartner.email}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, email: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        value={newDeliveryPartner.phone}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                    <input
                                        type="password"
                                        placeholder="Temporary Password"
                                        value={newDeliveryPartner.password}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, password: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Vehicle Number"
                                        value={newDeliveryPartner.vehicleNumber}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, vehicleNumber: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                    <input
                                        type="text"
                                        placeholder="License Number"
                                        value={newDeliveryPartner.licenseNumber}
                                        onChange={(e) => setNewDeliveryPartner((prev) => ({ ...prev, licenseNumber: e.target.value }))}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                </div>
                                <div className="mt-4 flex gap-3">
                                    <button
                                        onClick={handleAddDeliveryPartner}
                                        disabled={deliveryPartnerSaving}
                                        className="rounded-lg bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2 text-sm font-semibold text-[#111]"
                                    >
                                        {deliveryPartnerSaving ? "Saving..." : "Save Partner"}
                                    </button>
                                    <button
                                        onClick={() => setShowDeliveryPartnerForm(false)}
                                        className="rounded-lg border border-[#CFAF63]/25 px-6 py-2 text-sm"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {deliveryPartnerError ? <p className="mt-3 text-sm text-rose-300">{deliveryPartnerError}</p> : null}
                            </div>
                        )}

                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                            <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Registered Delivery Partners</h3>
                            {deliveryPartnerError ? <p className="mb-3 text-sm text-rose-300">{deliveryPartnerError}</p> : null}
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        <th className="py-2 px-3 text-left text-[#999]">Name</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Contact</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Vehicle</th>
                                        <th className="py-2 px-3 text-left text-[#999]">License</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Status</th>
                                        <th className="py-2 px-3 text-right text-[#999]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deliveryPartners.map((partner, index) => (
                                        <tr key={`${partner._id || partner.email}-${index}`} className="border-b border-[#1A1A1A]">
                                            <td className="py-3 px-3 text-[#F5F5F5]">{partner.name}</td>
                                            <td className="py-3 px-3 text-[#CCC]">
                                                <p>{partner.email}</p>
                                                <p className="text-xs text-[#999]">{partner.phone || "No phone"}</p>
                                            </td>
                                            <td className="py-3 px-3 text-[#CCC]">{partner.deliveryProfile?.vehicleNumber || "N/A"}</td>
                                            <td className="py-3 px-3 text-[#CCC]">{partner.deliveryProfile?.licenseNumber || "N/A"}</td>
                                            <td className="py-3 px-3">
                                                <span className={`rounded-full px-2 py-1 text-xs ${partner.deliveryProfile?.isActive === false ? "bg-rose-500/20 text-rose-300" : "bg-[#00D98E]/20 text-[#00D98E]"}`}>
                                                    {partner.deliveryProfile?.isActive === false ? "Inactive" : "Active"}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <button
                                                    onClick={() => toggleDeliveryPartner(partner, !(partner.deliveryProfile?.isActive === false))}
                                                    className="rounded border border-[#CFAF63]/40 px-3 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                                >
                                                    {partner.deliveryProfile?.isActive === false ? "Activate" : "Deactivate"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "coupons" && (
                    <div className="space-y-6">
                        {couponAnalytics ? (
                            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6">
                                <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Coupon Performance</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-[#999]">Total Coupons</p>
                                        <p className="mt-1 text-2xl text-[#F5F5F5]">{couponAnalytics.summary.totalCoupons}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#999]">Total Redemptions</p>
                                        <p className="mt-1 text-2xl text-[#CFAF63]">{couponAnalytics.summary.totalRedemptions}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#999]">Discount Given</p>
                                        <p className="mt-1 text-2xl text-[#4FE0A6]">₹{couponAnalytics.summary.totalDiscountGiven}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[#999]">Top Coupon</p>
                                        <p className="mt-1 text-2xl text-[#FF6A00]">{couponAnalytics.summary.topCoupon?.code || "—"}</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}

                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6">
                            <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Create Coupon</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input
                                    type="text"
                                    placeholder="Coupon Code (e.g. SAVE50)"
                                    value={couponForm.code}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <select
                                    value={couponForm.type}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, type: e.target.value as CouponType }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                >
                                    <option value="flat">Flat Discount</option>
                                    <option value="percent">Percent Discount</option>
                                    <option value="free_delivery">Free Delivery</option>
                                </select>
                                <input
                                    type="number"
                                    placeholder="Value"
                                    value={couponForm.value}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, value: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="number"
                                    placeholder="Minimum Order"
                                    value={couponForm.minOrder}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, minOrder: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="number"
                                    placeholder="Max Discount (optional)"
                                    value={couponForm.maxDiscount}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, maxDiscount: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="number"
                                    placeholder="Global usage limit (optional)"
                                    value={couponForm.usageLimit}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, usageLimit: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="number"
                                    placeholder="Per-user usage limit (optional)"
                                    value={couponForm.perUserLimit}
                                    onChange={(e) => setCouponForm((prev) => ({ ...prev, perUserLimit: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <label className="flex items-center gap-2 rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-sm text-[#F5F5F5]">
                                    <input
                                        type="checkbox"
                                        checked={couponForm.isActive}
                                        onChange={(e) => setCouponForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                                    />
                                    Active
                                </label>
                                <label className="text-sm text-[#F5F5F5]/75">
                                    Start Date
                                    <input
                                        type="datetime-local"
                                        value={couponForm.startDate}
                                        onChange={(e) => setCouponForm((prev) => ({ ...prev, startDate: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                </label>
                                <label className="text-sm text-[#F5F5F5]/75">
                                    Expiry Date
                                    <input
                                        type="datetime-local"
                                        value={couponForm.expiryDate}
                                        onChange={(e) => setCouponForm((prev) => ({ ...prev, expiryDate: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                </label>
                            </div>
                            <button
                                onClick={handleAddCoupon}
                                disabled={couponSaving}
                                className="mt-4 rounded-lg bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2 text-sm font-semibold text-[#111]"
                            >
                                {couponSaving ? "Saving..." : "Add Coupon"}
                            </button>
                            {couponError ? <p className="mt-3 text-sm text-rose-300">{couponError}</p> : null}
                        </div>

                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                            <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">All Coupons</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        <th className="py-2 px-3 text-left text-[#999]">Code</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Type</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Value</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Min Order</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Usage</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Window</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Status</th>
                                        <th className="py-2 px-3 text-right text-[#999]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {coupons.map((coupon) => (
                                        <tr key={coupon._id} className="border-b border-[#1A1A1A]">
                                            <td className="py-3 px-3 text-[#CFAF63]">{coupon.code}</td>
                                            <td className="py-3 px-3 text-[#CCC]">{coupon.type}</td>
                                            <td className="py-3 px-3 text-[#CCC]">
                                                {coupon.type === "percent" ? `${coupon.value}%` : coupon.type === "flat" ? `₹${coupon.value}` : "Free Delivery"}
                                                {coupon.type === "percent" && coupon.maxDiscount ? ` (max ₹${coupon.maxDiscount})` : ""}
                                            </td>
                                            <td className="py-3 px-3 text-[#CCC]">₹{coupon.minOrder}</td>
                                            <td className="py-3 px-3 text-[#999] text-xs">
                                                <p>{coupon.usageLimit ? `${coupon.usageCount || 0}/${coupon.usageLimit}` : "Unlimited"}</p>
                                                <p>{coupon.perUserLimit ? `Per user: ${coupon.perUserLimit}` : "Per user: Unlimited"}</p>
                                            </td>
                                            <td className="py-3 px-3 text-[#999] text-xs">
                                                <p>{new Date(coupon.startDate).toLocaleString()}</p>
                                                <p>{new Date(coupon.expiryDate).toLocaleString()}</p>
                                            </td>
                                            <td className="py-3 px-3">
                                                <span className={`rounded-full px-2 py-1 text-xs ${coupon.status === "active"
                                                    ? "bg-[#00D98E]/20 text-[#00D98E]"
                                                    : coupon.status === "expired"
                                                        ? "bg-rose-500/20 text-rose-300"
                                                        : "bg-[#CFAF63]/20 text-[#CFAF63]"}`}>
                                                    {coupon.status || (coupon.isActive ? "active" : "inactive")}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => toggleCoupon(coupon)}
                                                        className="rounded border border-[#CFAF63]/40 px-3 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                                    >
                                                        {coupon.isActive ? "Disable" : "Enable"}
                                                    </button>
                                                    <button
                                                        onClick={() => void editCoupon(coupon)}
                                                        className="rounded border border-[#6CA3EA]/40 px-3 py-1 text-xs text-[#6CA3EA] hover:bg-[#6CA3EA]/10"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => void deleteCoupon(coupon._id)}
                                                        className="rounded border border-rose-400/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "promotions" && (
                    <div className="space-y-6">
                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6">
                            <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Create Home Promo Slide (max 3)</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={promoForm.title}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, title: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="text"
                                    placeholder="Subtitle"
                                    value={promoForm.subtitle}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="text"
                                    placeholder="Coupon code (optional)"
                                    value={promoForm.couponCode}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase() }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="text"
                                    placeholder="Background image URL (optional)"
                                    value={promoForm.image}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, image: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <label className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]">
                                    <span className="text-xs text-[#999]">Upload banner image</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePromoImageUpload}
                                        className="mt-2 block w-full text-sm"
                                    />
                                    <span className="mt-1 block text-xs text-[#999]">
                                        {uploadingPromoImage ? "Uploading..." : promoForm.image ? "Uploaded and linked" : "Recommended wide banner image"}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="CTA Text"
                                    value={promoForm.ctaText}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, ctaText: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <input
                                    type="text"
                                    placeholder="CTA Link (e.g. /menu)"
                                    value={promoForm.ctaLink}
                                    onChange={(e) => setPromoForm((prev) => ({ ...prev, ctaLink: e.target.value }))}
                                    className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                />
                                <label className="text-sm text-[#F5F5F5]/75">
                                    Start Date (optional)
                                    <input
                                        type="datetime-local"
                                        value={promoForm.startsAt}
                                        onChange={(e) => setPromoForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                </label>
                                <label className="text-sm text-[#F5F5F5]/75">
                                    End Date (optional)
                                    <input
                                        type="datetime-local"
                                        value={promoForm.endsAt}
                                        onChange={(e) => setPromoForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                                        className="mt-2 w-full rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3"
                                    />
                                </label>
                            </div>
                            <div className="mt-4 flex items-center gap-3">
                                <button
                                    onClick={handleAddPromoBanner}
                                    disabled={promoSaving}
                                    className="rounded-lg bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2 text-sm font-semibold text-[#111]"
                                >
                                    {promoSaving ? "Saving..." : "Add Promo Slide"}
                                </button>
                                <span className="text-xs text-[#999]">Current slides: {promoBanners.length}/3</span>
                            </div>
                            {promoError ? <p className="mt-3 text-sm text-rose-300">{promoError}</p> : null}
                        </div>

                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                            <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Promo Slides</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        <th className="py-2 px-3 text-left text-[#999]">Title</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Coupon</th>
                                        <th className="py-2 px-3 text-left text-[#999]">CTA</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Status</th>
                                        <th className="py-2 px-3 text-right text-[#999]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {promoBanners.map((banner) => (
                                        <tr key={banner._id} className="border-b border-[#1A1A1A]">
                                            <td className="py-3 px-3 text-[#F5F5F5]">{banner.title}</td>
                                            <td className="py-3 px-3 text-[#CFAF63]">{banner.couponCode || "—"}</td>
                                            <td className="py-3 px-3 text-[#CCC]">{banner.ctaText || "Order Now"} → {banner.ctaLink || "/menu"}</td>
                                            <td className="py-3 px-3">
                                                <span className={`rounded-full px-2 py-1 text-xs ${banner.status === "active" ? "bg-[#00D98E]/20 text-[#00D98E]" : "bg-[#CFAF63]/20 text-[#CFAF63]"}`}>
                                                    {banner.status || (banner.isActive ? "active" : "inactive")}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => void togglePromoBanner(banner)}
                                                        className="rounded border border-[#CFAF63]/40 px-3 py-1 text-xs text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                                    >
                                                        {banner.isActive ? "Disable" : "Enable"}
                                                    </button>
                                                    <button
                                                        onClick={() => void deletePromoBanner(banner._id)}
                                                        className="rounded border border-rose-400/40 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "staffUsers" && (
                    <div className="space-y-6">
                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6">
                            <h3 className="font-[var(--font-heading)] text-xl text-[#F5F5F5] mb-2">Staff Access Management</h3>
                            <p className="text-sm text-[#999]">
                                Create and manage bearer, kitchen, manager, and general staff logins from one place.
                            </p>
                        </div>
                        <StaffUsersPanel />
                    </div>
                )}

                {/* RESERVATIONS TAB */}
                {activeTab === "reservations" && (
                    <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                        <h3 className="font-[var(--font-heading)] text-xl text-[#F5F5F5] mb-4">Reservation Management</h3>
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#333]">
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Customer Name</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Phone</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Guests</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Date</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Time</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Table</th>
                                    <th className="text-left py-3 px-4 text-[#999] text-sm font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reservations.map((res, index) => (
                                    <tr key={`${res.id || `reservation-${res.phone}-${res.date}`}-${index}`} className="border-b border-[#1A1A1A] hover:bg-[#111]/50 transition">
                                        <td className="py-3 px-4 text-[#F5F5F5]">{res.name}</td>
                                        <td className="py-3 px-4 text-[#CCC] text-sm">{res.phone}</td>
                                        <td className="py-3 px-4 text-[#CCC]">{res.guests}</td>
                                        <td className="py-3 px-4 text-[#CCC] text-sm">{res.date}</td>
                                        <td className="py-3 px-4 text-[#CCC] text-sm">{res.time}</td>
                                        <td className="py-3 px-4 text-[#CFAF63] font-semibold">#{res.tableNumber}</td>
                                        <td className="py-3 px-4">
                                            <span className="text-xs px-2 py-1 rounded-full bg-[#00D98E]/20 text-[#00D98E] font-semibold">
                                                confirmed
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* SCREENINGS TAB */}
                {activeTab === "screenings" && (
                    <div className="space-y-6">
                        {/* Summary cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {(["pending", "confirmed", "completed", "cancelled"] as const).map((s) => {
                                const count = screeningBookings.filter((b) => b.status === s).length;
                                const cfg = {
                                    pending: { color: "text-[#CFAF63]", bg: "from-[#CFAF63]/10", icon: "⏳" },
                                    confirmed: { color: "text-[#00D98E]", bg: "from-[#00D98E]/10", icon: "✅" },
                                    completed: { color: "text-[#888]", bg: "from-[#888]/10", icon: "🎬" },
                                    cancelled: { color: "text-[#FF6A00]", bg: "from-[#FF6A00]/10", icon: "❌" },
                                }[s];
                                return (
                                    <div key={s} className={`glass-card rounded-2xl border border-[#CFAF63]/20 p-5 bg-gradient-to-br ${cfg.bg} to-transparent`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[#999] text-xs capitalize">{s}</p>
                                                <p className={`text-3xl font-bold mt-1 ${cfg.color}`}>{count}</p>
                                            </div>
                                            <span className="text-2xl">{cfg.icon}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Booking table */}
                        <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                            <h3 className="font-[var(--font-heading)] text-xl text-[#F5F5F5] mb-4 flex items-center gap-2">
                                <Monitor size={20} className="text-[#CFAF63]" />
                                Screening Booking Management
                            </h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#333]">
                                        {["Name", "Phone", "Date & Time", "Guests", "Occasion", "Content", "Special Request", "Status"].map((h) => (
                                            <th key={h} className="text-left py-3 px-4 text-[#999] text-xs font-semibold whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {screeningBookings.map((b, index) => (
                                        <tr key={`${b.id || `screening-${b.phone}-${b.date}`}-${index}`} className="border-b border-[#1A1A1A] hover:bg-[#111]/60 transition">
                                            <td className="py-3 px-4 text-[#F5F5F5] font-medium whitespace-nowrap">{b.name}</td>
                                            <td className="py-3 px-4 text-[#CCC]">{b.phone}</td>
                                            <td className="py-3 px-4 text-[#CCC] whitespace-nowrap">{b.date} {b.time}</td>
                                            <td className="py-3 px-4 text-[#CCC] text-center">{b.guests}</td>
                                            <td className="py-3 px-4">
                                                <span className="rounded-full border border-[#CFAF63]/25 px-2 py-0.5 text-xs text-[#CFAF63]">{b.occasion}</span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="rounded-full bg-[#3B82F6]/15 px-2 py-0.5 text-xs text-[#6CA3EA]">{b.contentType}</span>
                                            </td>
                                            <td className="py-3 px-4 text-[#999] max-w-[140px] truncate" title={b.specialRequest}>{b.specialRequest || "—"}</td>
                                            <td className="py-3 px-4">
                                                <select
                                                    value={b.status}
                                                    onChange={(e) => updateScreeningStatus(b.id, e.target.value as ScreeningBooking["status"])}
                                                    className="rounded-md border border-[#CFAF63]/30 bg-[#171717] px-2 py-1 text-xs text-[#F5F5F5] focus:outline-none"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="confirmed">Confirmed</option>
                                                    <option value="completed">Completed</option>
                                                    <option value="cancelled">Cancelled</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* MEMBERSHIP POS SCANNER & BILLING */}
                {activeTab === "membershipPos" && <MembershipPosTerminal />}

                {/* 200 CARDS HUB */}
                {activeTab === "membershipCards" && <CardsManagerPanel />}

                {/* MEMBERS DIRECTORY */}
                {activeTab === "membershipCustomers" && <CustomersDirectoryPanel />}

                {/* REFERRALS & POINTS ENGINE */}
                {activeTab === "membershipReferrals" && <ReferralsPointsPanel />}

                {/* MEMBERSHIP CONFIGURATION SETTINGS */}
                {activeTab === "membershipSettings" && <MembershipSettingsPanel />}
            </motion.div>
        </div>
    );
}
