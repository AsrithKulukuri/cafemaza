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

export const premiumPhotos = [
    { caption: "Live Grill Mastery", src: "/images/gallery-grill.jpg" },
    { caption: "Chef's Premium Selection", src: "/images/gallery-chef.jpg" },
    { caption: "Luxury Seating", src: "/images/gallery-interior.jpg" },
    { caption: "Signature Biryani", src: "/images/chicken-dum-biryani.jpg" },
    { caption: "Fine Dining Ambiance", src: "/images/gallery-family.jpg" },
    { caption: "Handcrafted Platters", src: "/images/gallery-platter.jpg" },
];

export const galleryImages = [
    { src: "/images/gallery-grill.jpg", alt: "Grill cooking" },
    { src: "/images/gallery-interior.jpg", alt: "Restaurant interior" },
    { src: "/images/gallery-chef.jpg", alt: "Chef preparing food" },
    { src: "/images/gallery-family.jpg", alt: "Family dining" },
    { src: "/images/gallery-platter.jpg", alt: "Signature platter" },
    { src: "/images/gallery-fire.jpg", alt: "Flame grilling" },
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

export const mockScreeningBookings: ScreeningBooking[] = [];

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
export const mockOrders: Order[] = [];

// Mock Reservations
export const mockReservations: Reservation[] = [];

// Mock Staff
export const mockStaff: StaffMember[] = [];

// Mock Deliveries
export const mockDeliveries: Delivery[] = [];

// Mock Analytics Data
export const mockAnalytics = {
    totalOrdersToday: 0,
    revenueToday: 0,
    activeOrders: 0,
    reservationsToday: 0,
    ordersPerHour: [],
    revenueChart: [],
};




