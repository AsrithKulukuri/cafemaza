"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Dish } from "@/data/mockData";
import { BookingModal } from "@/components/reserve-table/BookingModal";
import { CartDrawer, type CartItem } from "@/components/cart/CartDrawer";
import { ToastStack, type ToastItem } from "@/components/ui/ToastStack";
import { ScrollProgressBar } from "@/components/ui/ScrollProgressBar";
import { MobileBottomNav } from "@/components/ui/MobileBottomNav";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { FloatingActionButtons } from "@/components/ui/FloatingActionButtons";
import { usePathname } from "next/navigation";

type PremiumUIContextValue = {
    cartItems: CartItem[];
    cartCount: number;
    cartTotal: number;
    cartOpen: boolean;
    bookingOpen: boolean;
    soundEnabled: boolean;
    addToCart: (dish: Dish) => void;
    increaseQty: (name: string) => void;
    decreaseQty: (name: string) => void;
    openCart: () => void;
    closeCart: () => void;
    openBooking: () => void;
    closeBooking: () => void;
    toggleSound: () => void;
    pushToast: (message: string) => void;
};

const PremiumUIContext = createContext<PremiumUIContextValue | null>(null);

function randomId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function PremiumUIProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [cartItems, setCartItems] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [bookingOpen, setBookingOpen] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(false);
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    useEffect(() => {
        const raw = window.localStorage.getItem("cafeMazaCart");
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw) as CartItem[];
            if (Array.isArray(parsed)) setCartItems(parsed);
        } catch {
            // Ignore bad local storage data.
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem("cafeMazaCart", JSON.stringify(cartItems));
    }, [cartItems]);

    const pushToast = (message: string) => {
        const id = randomId();
        setToasts((prev) => [...prev, { id, message }]);
        window.setTimeout(() => {
            setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 2500);
    };

    const addToCart = (dish: Dish) => {
        setCartItems((prev) => {
            const existing = prev.find((item) => item.name === dish.name);
            return existing
                ? prev.map((item) => (item.name === dish.name ? { ...item, qty: item.qty + 1 } : item))
                : [...prev, { ...dish, qty: 1 }];
        });
        setCartOpen(true);
        pushToast(`${dish.name} added to cart`);
    };

    const increaseQty = (name: string) => {
        setCartItems((prev) => prev.map((item) => (item.name === name ? { ...item, qty: item.qty + 1 } : item)));
    };

    const decreaseQty = (name: string) => {
        setCartItems((prev) =>
            prev
                .map((item) => (item.name === name ? { ...item, qty: item.qty - 1 } : item))
                .filter((item) => item.qty > 0)
        );
    };

    const toggleSound = () => {
        setSoundEnabled((prev) => !prev);
        pushToast(soundEnabled ? "Sound disabled" : "Sound enabled");
    };

    const cartCount = useMemo(() => cartItems.reduce((sum, item) => sum + item.qty, 0), [cartItems]);
    const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + item.price * item.qty, 0), [cartItems]);
    const showFloatingActions = pathname !== "/menu";

    const value: PremiumUIContextValue = {
        cartItems,
        cartCount,
        cartTotal,
        cartOpen,
        bookingOpen,
        soundEnabled,
        addToCart,
        increaseQty,
        decreaseQty,
        openCart: () => setCartOpen(true),
        closeCart: () => setCartOpen(false),
        openBooking: () => setBookingOpen(true),
        closeBooking: () => setBookingOpen(false),
        toggleSound,
        pushToast,
    };

    return (
        <PremiumUIContext.Provider value={value}>
            <ScrollProgressBar />
            {children}
            <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
            {showFloatingActions ? <FloatingActionButtons cartCount={cartCount} onCart={() => setCartOpen(true)} onBook={() => setBookingOpen(true)} /> : null}
            <MobileBottomNav onCartOpen={() => setCartOpen(true)} onBookOpen={() => setBookingOpen(true)} />
            <CartDrawer
                open={cartOpen}
                items={cartItems}
                onClose={() => setCartOpen(false)}
                onIncrease={increaseQty}
                onDecrease={decreaseQty}
            />
            <BookingModal
                open={bookingOpen}
                onClose={() => setBookingOpen(false)}
                onSuccess={() => pushToast("Table reserved successfully")}
            />
            <ToastStack toasts={toasts} />
        </PremiumUIContext.Provider>
    );
}

export function usePremiumUI() {
    const context = useContext(PremiumUIContext);
    if (!context) {
        throw new Error("usePremiumUI must be used within PremiumUIProvider");
    }

    return context;
}
