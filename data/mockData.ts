export type DishVariant = {
    name: string;
    price: number;
};

export type Dish = {
    _id?: string;
    name: string;
    price?: number;
    variants?: DishVariant[];
    image: string;
    description?: string;
    isVeg?: boolean;
    isBestSeller?: boolean;
    isSpecial?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

export type MenuCategory = {
    id: string;
    label: string;
    items: Dish[];
};

export const navLinks = [
    { label: "Home", href: "/" },
    { label: "Menu", href: "/menu" },
    { label: "Live Grill", href: "/live-grill" },
    { label: "Screening", href: "/screening" },
    { label: "Reserve", href: "/reserve-table" },
    { label: "Order", href: "/order-online" },
    { label: "Gallery", href: "/gallery" },
    { label: "Contact", href: "/contact" },
];

export const featuredDishes: Dish[] = [
    { name: "Chicken Tikka", price: 290, image: "/images/chicken-tikka.jpg" },
    { name: "Butter Chicken", price: 289, image: "/images/butter-chicken.jpg" },
    { name: "Chicken Dum Biryani", price: 250, image: "/images/chicken-dum-biryani.jpg" },
    { name: "Mutton Rogan Josh", price: 360, image: "/images/mutton-rogan-josh.jpg" },
    { name: "Paneer Butter Masala", price: 189, image: "/images/paneer-butter-masala.jpg" },
    { name: "Chilli Chicken", price: 260, image: "/images/chilli-chicken.jpg" },
];

export const menuCategories: MenuCategory[] = [
    {
        id: "recommended",
        label: "Chef Specials",
        items: [
            { name: "Murgh Musallam", price: 799, image: "/images/butter-chicken.jpg", isSpecial: true },
            { name: "Mutton Sikandari Raan", price: 1299, image: "/images/mutton-rogan-josh.jpg", isSpecial: true },
            { name: "Tandoori Non Veg Platter", price: 899, image: "/images/chicken-tikka.jpg", isSpecial: true },
            { name: "Assorted BBQ Setup", price: 1499, image: "/images/starter.jpg", isSpecial: true },
        ],
    },
    {
        id: "soups",
        label: "Soups",
        items: [
            { name: "Tomato Dhaniya Shorba", price: 149, image: "/images/soup.jpg", isVeg: true },
            { name: "Manchow Soup", variants: [{ name: "Veg", price: 129 }, { name: "Chicken", price: 159 }], image: "/images/soup.jpg" },
            { name: "Hot n Sour Soup", variants: [{ name: "Veg", price: 129 }, { name: "Chicken", price: 159 }], image: "/images/soup.jpg" },
            { name: "Sweet Corn Soup", variants: [{ name: "Veg", price: 129 }, { name: "Chicken", price: 159 }], image: "/images/soup.jpg" },
        ],
    },
    {
        id: "chinese",
        label: "Chinese",
        items: [
            { name: "Chilli Chicken", variants: [{ name: "Dry", price: 309 }, { name: "Wet", price: 329 }], image: "/images/chilli-chicken.jpg" },
            { name: "Chicken Manchurian", variants: [{ name: "Dry", price: 309 }, { name: "Wet", price: 329 }], image: "/images/chicken-manchurian.jpg" },
            { name: "Pepper Chicken", price: 329, image: "/images/starter.jpg" },
            { name: "Chilli Paneer", variants: [{ name: "Dry", price: 289 }, { name: "Wet", price: 309 }], image: "/images/paneer-tikka.jpg", isVeg: true },
            { name: "Gobi 65", variants: [{ name: "Dry", price: 229 }, { name: "Wet", price: 249 }], image: "/images/starter.jpg", isVeg: true },
        ],
    },
    {
        id: "tandoori",
        label: "Tandoori",
        items: [
            { name: "Tandoori Chicken", variants: [{ name: "Half", price: 319 }, { name: "Full", price: 589 }], image: "/images/chicken-tikka.jpg" },
            { name: "Chicken Tikka", variants: [{ name: "Malai", price: 359 }, { name: "Zafrani", price: 329 }, { name: "Hariyali", price: 339 }], image: "/images/chicken-tikka.jpg" },
            { name: "Tangidi Kabab", price: 349, image: "/images/chicken-tikka.jpg" },
            { name: "Paneer Tikka", price: 289, image: "/images/paneer-tikka.jpg", isVeg: true },
        ],
    },
    {
        id: "main-course",
        label: "Main Course",
        items: [
            { name: "Butter Chicken", price: 369, image: "/images/butter-chicken.jpg" },
            { name: "Chicken Tikka Masala", price: 379, image: "/images/butter-chicken.jpg" },
            { name: "Mutton Rogan Josh", price: 449, image: "/images/mutton-rogan-josh.jpg" },
            { name: "Paneer Butter Masala", price: 299, image: "/images/paneer-butter-masala.jpg", isVeg: true },
            { name: "Dal Makhani", price: 249, image: "/images/veg-korma.jpg", isVeg: true },
        ],
    },
    {
        id: "biryani",
        label: "Biryani",
        items: [
            { name: "Chicken Dum Biryani", variants: [{ name: "Single", price: 199 }, { name: "Full", price: 329 }, { name: "Family Pack", price: 699 }], image: "/images/chicken-dum-biryani.jpg" },
            { name: "Mutton Dum Biryani", variants: [{ name: "Single", price: 279 }, { name: "Full", price: 449 }, { name: "Family Pack", price: 899 }], image: "/images/mutton-biryani.jpg" },
            { name: "Special Tangdi Biryani", price: 389, image: "/images/chicken-dum-biryani.jpg", isSpecial: true },
            { name: "Veg Dum Biryani", variants: [{ name: "Full", price: 249 }, { name: "Family", price: 549 }], image: "/images/veg-biryani.jpg", isVeg: true },
        ],
    },
    {
        id: "rice-noodles",
        label: "Rice & Noodles",
        items: [
            { name: "Fried Rice", variants: [{ name: "Veg", price: 219 }, { name: "Egg", price: 239 }, { name: "Chicken", price: 269 }], image: "/images/starter.jpg" },
            { name: "Soft Noodles", variants: [{ name: "Veg", price: 219 }, { name: "Egg", price: 239 }, { name: "Chicken", price: 269 }], image: "/images/starter.jpg" },
        ],
    },
    {
        id: "breads",
        label: "Breads",
        items: [
            { name: "Tandoori Roti", variants: [{ name: "Plain", price: 30 }, { name: "Butter", price: 40 }], image: "/images/roti.jpg", isVeg: true },
            { name: "Naan", variants: [{ name: "Plain", price: 45 }, { name: "Butter", price: 55 }, { name: "Garlic", price: 75 }], image: "/images/roti.jpg", isVeg: true },
            { name: "Rumali Roti", price: 35, image: "/images/roti.jpg", isVeg: true },
        ],
    },
    {
        id: "desserts",
        label: "Desserts",
        items: [
            { name: "Qurbani Ka Meetha", variants: [{ name: "Plain", price: 149 }, { name: "With Ice Cream", price: 189 }], image: "/images/dessert.jpg", isVeg: true },
            { name: "Gulab Jamun", price: 99, image: "/images/gulab-jamun.jpg", isVeg: true },
            { name: "Apricot Delight", price: 199, image: "/images/dessert.jpg", isVeg: true },
        ],
    },
    {
        id: "drinks",
        label: "Drinks",
        items: [
            { name: "Virgin Mojito", price: 149, image: "/images/virgin-mojito.jpg", isVeg: true },
            { name: "Fresh Lime Soda", variants: [{ name: "Salted", price: 89 }, { name: "Sweet", price: 89 }, { name: "Mixed", price: 99 }], image: "/images/fresh-lime-soda.jpg", isVeg: true },
            { name: "Special Lassi", price: 129, image: "/images/mocktail.jpg", isVeg: true },
        ],
    },
];

export const grillFeatures = [
    { title: "Live Grill", text: "Sizzling skewers served at your table." },
    { title: "Fresh Ingredients", text: "Handpicked produce and premium cuts daily." },
    { title: "Family Dining", text: "Spacious luxury seating for family celebrations." },
    { title: "Chef Specials", text: "Signature marinades crafted by our master chefs." },
];

export const galleryImages = [
    { src: "/images/gallery-grill.jpg", alt: "Grill cooking" },
    { src: "/images/gallery-interior.jpg", alt: "Restaurant interior" },
    { src: "/images/gallery-chef.jpg", alt: "Chef preparing food" },
    { src: "/images/gallery-family.jpg", alt: "Family dining" },
    { src: "/images/gallery-platter.jpg", alt: "Signature platter" },
    { src: "/images/gallery-fire.jpg", alt: "Flame grilling" },
];

export const premiumPhotos = [
    { caption: "Live Grill Mastery", src: "/images/gallery-grill.jpg" },
    { caption: "Chef's Premium Selection", src: "/images/gallery-chef.jpg" },
    { caption: "Luxury Seating", src: "/images/gallery-interior.jpg" },
    { caption: "Signature Biryani", src: "/images/chicken-dum-biryani.jpg" },
    { caption: "Fine Dining Ambiance", src: "/images/gallery-family.jpg" },
    { caption: "Handcrafted Platters", src: "/images/gallery-platter.jpg" },
];

// ============== SCREENING BOOKING DATA ==============

export type ScreeningBooking = {
    id: string;
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    guests: number;
    occasion: "Birthday" | "Anniversary" | "Casual";
    contentType: "Sports Match" | "Movie" | "Custom Content";
    specialRequest?: string;
    status: "pending" | "confirmed" | "completed" | "cancelled";
    createdAt: Date;
};

export const mockScreeningBookings: ScreeningBooking[] = [
    {
        id: "sc1",
        name: "Arjun Mehta",
        phone: "9876543001",
        email: "arjun@example.com",
        date: "2026-03-20",
        time: "19:00",
        guests: 4,
        occasion: "Birthday",
        contentType: "Movie",
        specialRequest: "Bollywood thriller please",
        status: "confirmed",
        createdAt: new Date(),
    },
    {
        id: "sc2",
        name: "Priya Nair",
        phone: "9876543002",
        email: "priya@example.com",
        date: "2026-03-21",
        time: "20:30",
        guests: 2,
        occasion: "Anniversary",
        contentType: "Sports Match",
        status: "pending",
        createdAt: new Date(),
    },
    {
        id: "sc3",
        name: "Rahul Verma",
        phone: "9876543003",
        email: "rahul@example.com",
        date: "2026-03-22",
        time: "18:00",
        guests: 3,
        occasion: "Casual",
        contentType: "Custom Content",
        specialRequest: "IPL highlights",
        status: "pending",
        createdAt: new Date(),
    },
];

// ============== MULTI-PORTAL MOCK DATA ==============

export type Order = {
    id: string;
    orderNumber: number;
    customerName: string;
    customerPhone: string;
    items: { name: string; quantity: number; price: number }[];
    status: "new" | "preparing" | "ready" | "completed" | "cancelled";
    total: number;
    orderType: "dine-in" | "takeaway" | "delivery";
    createdAt: Date;
    tableNumber?: number;
    deliveryAddress?: string;
};

export type Reservation = {
    id: string;
    name: string;
    phone: string;
    guests: number;
    date: string;
    time: string;
    tableNumber: number;
    status: "confirmed" | "cancelled";
};

export type StaffMember = {
    id: string;
    staffId: string;
    name: string;
    role: "chef" | "counter" | "manager";
    shift: "morning" | "evening" | "night";
};

export type Delivery = {
    id: string;
    orderId: string;
    deliveryId: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    deliveryAddress: string;
    items: string[];
    status: "assigned" | "picked-up" | "out-for-delivery" | "delivered";
    assignedTo: string;
    createdAt: Date;
};

// Mock Orders
export const mockOrders: Order[] = [
    { id: "1", orderNumber: 1001, customerName: "Rajesh Kumar", customerPhone: "9876543210", items: [{ name: "Butter Chicken", quantity: 2, price: 289 }, { name: "Tandoori Chicken", quantity: 1, price: 250 }], status: "new", total: 828, orderType: "dine-in", createdAt: new Date(), tableNumber: 5 },
    { id: "2", orderNumber: 1002, customerName: "Priya Singh", customerPhone: "9876543211", items: [{ name: "Paneer Tikka", quantity: 1, price: 220 }], status: "preparing", total: 220, orderType: "takeaway", createdAt: new Date() },
    { id: "3", orderNumber: 1003, customerName: "Amit Patel", customerPhone: "9876543212", items: [{ name: "Lamb Biryani", quantity: 3, price: 280 }], status: "preparing", total: 840, orderType: "delivery", createdAt: new Date(), deliveryAddress: "123 Main Street" },
    { id: "4", orderNumber: 1004, customerName: "Neha Sharma", customerPhone: "9876543213", items: [{ name: "Chicken Dum Biryani", quantity: 2, price: 250 }], status: "ready", total: 500, orderType: "dine-in", createdAt: new Date(), tableNumber: 8 },
    { id: "5", orderNumber: 1005, customerName: "Vikram Singh", customerPhone: "9876543214", items: [{ name: "Rogan Josh", quantity: 1, price: 360 }, { name: "Naan", quantity: 2, price: 40 }], status: "ready", total: 440, orderType: "takeaway", createdAt: new Date() },
    { id: "6", orderNumber: 1006, customerName: "Ananya Verma", customerPhone: "9876543215", items: [{ name: "Chilli Chicken", quantity: 1, price: 260 }], status: "completed", total: 260, orderType: "delivery", createdAt: new Date(), deliveryAddress: "456 Oak Avenue" },
];

// Mock Reservations
export const mockReservations: Reservation[] = [
    { id: "r1", name: "Rohit Gupta", phone: "9876543220", guests: 4, date: "2024-01-20", time: "19:00", tableNumber: 1, status: "confirmed" },
    { id: "r2", name: "Sakshi Desai", phone: "9876543221", guests: 2, date: "2024-01-20", time: "19:30", tableNumber: 3, status: "confirmed" },
    { id: "r3", name: "Harpreet Singh", phone: "9876543222", guests: 6, date: "2024-01-20", time: "20:00", tableNumber: 7, status: "confirmed" },
];

// Mock Staff
export const mockStaff: StaffMember[] = [
    { id: "s1", staffId: "CHEF001", name: "Chef Vikram", role: "chef", shift: "evening" },
    { id: "s2", staffId: "CHEF002", name: "Chef Arjun", role: "chef", shift: "evening" },
    { id: "s3", staffId: "COUNTER001", name: "Ravi", role: "counter", shift: "evening" },
    { id: "s4", staffId: "MGR001", name: "Manager Suresh", role: "manager", shift: "evening" },
];

// Mock Deliveries
export const mockDeliveries: Delivery[] = [
    { id: "d1", orderId: "3", deliveryId: "DEL001", customerName: "Amit Patel", customerPhone: "9876543212", pickupAddress: "CafÃ© Maza, Food Court", deliveryAddress: "123 Main Street, Apt 5B", items: ["Lamb Biryani x3"], status: "picked-up", assignedTo: "Delivery Partner 1", createdAt: new Date() },
    { id: "d2", orderId: "6", deliveryId: "DEL002", customerName: "Ananya Verma", customerPhone: "9876543215", pickupAddress: "CafÃ© Maza, Food Court", deliveryAddress: "456 Oak Avenue, Suite 200", items: ["Chilli Chicken x1"], status: "delivered", assignedTo: "Delivery Partner 2", createdAt: new Date() },
];

// Mock Analytics Data
export const mockAnalytics = {
    totalOrdersToday: 48,
    revenueToday: 15240,
    activeOrders: 6,
    reservationsToday: 12,
    ordersPerHour: [
        { time: "12 PM", orders: 4 },
        { time: "1 PM", orders: 7 },
        { time: "2 PM", orders: 5 },
        { time: "6 PM", orders: 3 },
        { time: "7 PM", orders: 8 },
        { time: "8 PM", orders: 9 },
        { time: "9 PM", orders: 5 },
        { time: "10 PM", orders: 2 },
    ],
    revenueChart: [
        { time: "12 PM", revenue: 1200 },
        { time: "1 PM", revenue: 2100 },
        { time: "2 PM", revenue: 1500 },
        { time: "6 PM", revenue: 900 },
        { time: "7 PM", revenue: 2400 },
        { time: "8 PM", revenue: 2700 },
        { time: "9 PM", revenue: 1500 },
        { time: "10 PM", revenue: 600 },
    ],
};



