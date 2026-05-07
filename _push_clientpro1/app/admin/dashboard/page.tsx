"use client";

import { useState, useEffect, useRef, type ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LogOut, BarChart3, ShoppingCart, UtensilsCrossed, Calendar, Plus, Trash2, Edit2, Monitor, Truck, User, TicketPercent } from "lucide-react";
import { mockOrders, mockAnalytics, mockReservations, mockScreeningBookings, type ScreeningBooking } from "@/data/mockData";
import { apiFetch } from "@/lib/api";
import { clearAuthSession, getAuthToken, getAuthUser } from "@/lib/authToken";
import { socket } from "@/lib/socket";
import { StaffUsersPanel } from "@/components/admin/StaffUsersPanel";

type TabType = "analytics" | "orders" | "menu" | "deliveryPartners" | "coupons" | "promotions" | "staffUsers" | "reservations" | "screenings";

type AdminMenuItem = {
    _id: string;
    name: string;
    category: string;
    price: number;
    image: string;
    isVeg: boolean;
    isPopular?: boolean;
    isBestSeller?: boolean;
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
    const [adminInfo, setAdminInfo] = useState<{ adminEmail: string; name: string; email: string } | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("analytics");
    const [newMenuItem, setNewMenuItem] = useState({
        name: "",
        category: "bakery",
        price: "",
        image: "",
        isVeg: true,
        isPopular: false,
        isBestSeller: false,
        isSoldOut: false,
        tagsText: "",
    });
    const [showNewMenuForm, setShowNewMenuForm] = useState(false);

    function getSafeMenuImageSrc(src: string | undefined) {
        if (!src) {
            return "/images/soup.jpg";
        }

        if (src.includes("unsplash.com/photos/")) {
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
    const [screeningBookings, setScreeningBookings] = useState<ScreeningBooking[]>(mockScreeningBookings);
    const [reservations, setReservations] = useState(mockReservations);
    const [analytics, setAnalytics] = useState({
        totalOrdersToday: mockAnalytics.totalOrdersToday,
        revenueToday: mockAnalytics.revenueToday,
        activeOrders: mockAnalytics.activeOrders,
        reservationsToday: mockAnalytics.reservationsToday,
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
                const [analyticsRes, ordersRes, menuRes, reservationsRes, screeningRes, deliveryPartnersRes, couponsRes, couponAnalyticsRes, promoBannersRes] = await Promise.all([
                    apiFetch<{ totalOrders: number; revenue: number; activeOrders: number; reservations: number; dailyHistory?: DailyHistoryItem[] }>("/api/admin/analytics?days=90", { token }),
                    apiFetch<Array<{ _id: string; totalAmount: number; status: string; createdAt: string; userId?: { name?: string }; items: Array<{ quantity: number; menuItemId?: { name?: string; price?: number } }> }>>("/api/orders?days=90", { token }),
                    apiFetch<AdminMenuItem[]>("/api/menu"),
                    apiFetch<typeof mockReservations>("/api/reservations", { token }),
                    apiFetch<ScreeningBooking[]>("/api/screening", { token }),
                    apiFetch<DeliveryPartner[]>("/api/admin/delivery-partners", { token }),
                    apiFetch<CouponItem[]>("/api/admin/coupons", { token }),
                    apiFetch<CouponAnalyticsResponse>("/api/admin/coupon-analytics", { token }),
                    apiFetch<PromoBannerItem[]>("/api/promo-banners", { token }),
                ]);

                setAnalytics({
                    totalOrdersToday: analyticsRes.totalOrders,
                    revenueToday: analyticsRes.revenue,
                    activeOrders: analyticsRes.activeOrders,
                    reservationsToday: analyticsRes.reservations,
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
            } catch {
                // Keep local fallback data.
            }
        }

        loadDashboardData();

        if (!socket.connected) {
            socket.connect();
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

    const handleAddMenuItem = async () => {
        if (!newMenuItem.name || !newMenuItem.price || !newMenuItem.image) {
            setMenuError("Name, price and image are required");
            return;
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

            const created = await apiFetch<AdminMenuItem>("/api/menu", {
                method: "POST",
                token,
                body: JSON.stringify({
                    name: newMenuItem.name,
                    category: newMenuItem.category,
                    price: Number(newMenuItem.price),
                    image,
                    isVeg: newMenuItem.isVeg,
                    isPopular: newMenuItem.isPopular,
                    isBestSeller: newMenuItem.isBestSeller,
                    isSoldOut: newMenuItem.isSoldOut,
                    tags,
                }),
            });

            setMenuItems((prev) => [created, ...prev]);
            setNewMenuItem({
                name: "",
                category: "bakery",
                price: "",
                image: "",
                isVeg: true,
                isPopular: false,
                isBestSeller: false,
                isSoldOut: false,
                tagsText: "",
            });
            setShowNewMenuForm(false);
        } catch (error) {
            setMenuError(error instanceof Error ? error.message : "Failed to create menu item");
        } finally {
            setMenuSaving(false);
        }
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

        const response = await fetch("/api/menu/upload-image", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Image upload failed");
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
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Welcome,</p>
                    <h1 className="font-[var(--font-heading)] text-4xl text-[#F5F5F5]">{adminInfo.name}</h1>
                    <p className="text-sm text-[#999] mt-1">{adminInfo.email}</p>
                </motion.div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF6A00]/20 text-[#FF6A00] hover:bg-[#FF6A00]/30 transition"
                >
                    <LogOut size={18} />
                    Logout
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <motion.button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            whileHover={{ scale: 1.05 }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition ${activeTab === tab.id
                                ? "bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] text-[#111] font-semibold"
                                : "border border-[#CFAF63]/25 text-[#F5F5F5] hover:border-[#CFAF63]"
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </motion.button>
                    );
                })}
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
                        {/* Analytics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {[
                                { label: "Total Orders Today", value: analytics.totalOrdersToday, icon: "📊", color: "from-[#FF6A00]" },
                                { label: "Revenue Today", value: `₹${analytics.revenueToday}`, icon: "💰", color: "from-[#CFAF63]" },
                                { label: "Active Orders", value: analytics.activeOrders, icon: "🔄", color: "from-[#3B82F6]" },
                                { label: "Reservations", value: analytics.reservationsToday, icon: "🗓️", color: "from-[#00D98E]" },
                                { label: "Screening Bookings", value: screeningBookings.length, icon: "🎬", color: "from-[#8B5CF6]" },
                            ].map((card, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className={`glass-card rounded-2xl border border-[#CFAF63]/25 p-6 bg-gradient-to-br ${card.color}/5`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[#999] text-sm">{card.label}</p>
                                            <p className="text-3xl font-bold text-[#F5F5F5] mt-2">{card.value}</p>
                                        </div>
                                        <span className="text-4xl">{card.icon}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* 90-Day History */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6"
                        >
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-[var(--font-heading)] text-xl text-[#F5F5F5] mb-1">90-Day Order History</h3>
                                    <p className="text-sm text-[#999]">Daily order counts and revenue update from live orders.</p>
                                </div>
                                <span className="rounded-full border border-[#CFAF63]/25 px-3 py-1 text-xs uppercase tracking-[0.14em] text-[#CFAF63]">
                                    {dailyHistory.length} days
                                </span>
                            </div>

                            <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border border-[#CFAF63]/15">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-[#101010]">
                                        <tr className="border-b border-[#2A2A2A]">
                                            <th className="px-4 py-3 text-left font-semibold text-[#999]">Date</th>
                                            <th className="px-4 py-3 text-left font-semibold text-[#999]">Orders</th>
                                            <th className="px-4 py-3 text-right font-semibold text-[#999]">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyHistory.map((entry) => (
                                            <tr key={entry.date} className="border-b border-[#1A1A1A] last:border-b-0">
                                                <td className="px-4 py-3 text-[#F5F5F5]">{entry.date}</td>
                                                <td className="px-4 py-3 text-[#CFAF63]">{entry.orders}</td>
                                                <td className="px-4 py-3 text-right text-[#4FE0A6]">₹{entry.revenue}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                                <h3 className="font-[var(--font-heading)] text-lg text-[#F5F5F5] mb-4">Add New Menu Item</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="Item Name"
                                        value={newMenuItem.name}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                    />
                                    <select
                                        value={newMenuItem.category}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, category: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] focus:outline-none"
                                    >
                                        <option value="bakery">Bakery</option>
                                        <option value="beverages">Beverages</option>
                                        <option value="biryani">Biryani</option>
                                        <option value="biryanis-(veg-non-veg)">Biryanis (Veg & Non-Veg)</option>
                                        <option value="cafe-maza-sizzlers">Cafe Maza Sizzlers</option>
                                        <option value="cafe-maza-specials">Cafe Maza Specials</option>
                                        <option value="cafe-maza-spl-combos">Cafe Maza Spl Combos</option>
                                        <option value="chai-coffee">Chai & Coffee</option>
                                        <option value="chinese-starters">Chinese Starters</option>
                                        <option value="chinese-starters-(veg-non-veg)">Chinese Starters (Veg & Non-Veg)</option>
                                        <option value="desserts">Desserts</option>
                                        <option value="desserts-sweets">Desserts & Sweets</option>
                                        <option value="hakka-noodles-fried-rice">Hakka Noodles & Fried Rice</option>
                                        <option value="indian-breads">Indian Breads</option>
                                        <option value="main-course">Main Course</option>
                                        <option value="main-course-(veg-non-veg)">Main Course (Veg & Non-Veg)</option>
                                        <option value="mocktails">Mocktails</option>
                                        <option value="non-veg-soups">Non Veg Soups</option>
                                        <option value="seafood">Seafood</option>
                                        <option value="soups">Soups</option>
                                        <option value="tandoori">Tandoori</option>
                                        <option value="tandoori-starters-(veg-non-veg)">Tandoori Starters (Veg & Non-Veg)</option>
                                        <option value="veg-soups">Veg Soups</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="Price (₹)"
                                        value={newMenuItem.price}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, price: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Image URL"
                                        value={newMenuItem.image}
                                        onChange={(e) => setNewMenuItem({ ...newMenuItem, image: e.target.value })}
                                        className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] placeholder-[#666] focus:outline-none"
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
                                        onClick={() => setShowNewMenuForm(false)}
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
                                        <th className="py-2 px-3 text-left text-[#999]">Category</th>
                                        <th className="py-2 px-3 text-left text-[#999]">Price</th>
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
                                                        <Image
                                                            src={getSafeMenuImageSrc(item.image)}
                                                            alt={item.name}
                                                            fill
                                                            sizes="48px"
                                                            className="object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="text-[#F5F5F5] font-medium">{item.name}</p>
                                                        <p className="text-[#999] text-xs">{item.isVeg ? "Veg" : "Non Veg"}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-3 text-[#CCC]">{item.category}</td>
                                            <td className="py-3 px-3 text-[#CFAF63]">₹{item.price}</td>
                                            <td className="py-3 px-3">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {item.isPopular ? <span className="rounded-full bg-[#00D98E]/20 px-2 py-0.5 text-xs text-[#4FE0A6]">Home</span> : null}
                                                    {item.isBestSeller ? <span className="rounded-full bg-[#FF6A00]/20 px-2 py-0.5 text-xs text-[#FF6A00]">Most Selling</span> : null}
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
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => editMenuItemPrice(item._id, item.price)}
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
            </motion.div>
        </div>
    );
}
