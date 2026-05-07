// Auto-generated from MongoDB menu items
export type Dish = {
    _id?: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    isVeg?: boolean;
    isBestSeller?: boolean;
    isSoldOut?: boolean;
    tags?: string[];
};

export type MenuCategory = {
    id: string;
    label: string;
    items: Dish[];
};

export const menuCategories: MenuCategory[] = [
    {
        id: "biryanis-(veg-non-veg)",
        label: "Biryanis (Veg & Non-Veg)",
        items: [
            { name: "Chicken Dum Biryani Single", price: 209, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Egg Biryani", price: 259, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Fish Biryani", price: 399, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Green Salad", price: 69, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Fish Biryani Family Pack", price: 1099, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Biryani Rice", price: 149, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Extra Dum 1 Pic", price: 99, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Special Tangdi Biryani", price: 389, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken Fry Piece Biryani Family", price: 769, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Mushroom Biryani", price: 289, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Kaju Biryani", price: 329, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Chicken Lollypop Biryani", price: 329, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Nalli Gosht Biryani", price: 479, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken Dum Biryani Family Pack", price: 769, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Mutton Dum Biryani Family Pack", price: 949, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Veg Dum Biryani", price: 269, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Kaju Paneer Biryani", price: 339, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
            { name: "Chicken Keema Biryani", price: 309, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Mutton Keema Biryani", price: 419, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Prawns Keema Biryani", price: 419, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken Dum Biryani", price: 299, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Mutton Dum Biryani", price: 429, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Prawns Dum Biryani", price: 429, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken 65 Biryani", price: 339, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken Tikka Biryani", price: 349, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Chicken Fry Piece Biyani", price: 289, image: "/images/biryanis-(veg-non-veg).jpg" },
            { name: "Paneer Dum Biryani", price: 270, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: true },
        ],
    },
    {
        id: "cafe-maza-sizzlers",
        label: "Cafe Maza Sizzlers",
        items: [
            { name: "Bbq Setup", price: 419, image: "/images/cafe-maza-sizzlers.jpg" },
            { name: "Italian Soup (Veg)", price: 249, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "American Chopsy With Sauce (nonveg)", price: 339, image: "/images/cafe-maza-sizzlers.jpg" },
            { name: "Cafe Maza Special Stroganoff (Veg)", price: 239, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "Singapore Noodles (Veg)", price: 239, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "Italian Soup (Non-Veg)", price: 259, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "Angari Murgh Kabab", price: 309, image: "/images/cafe-maza-sizzlers.jpg" },
            { name: "Angari Fish Tikka", price: 339, image: "/images/cafe-maza-sizzlers.jpg" },
            { name: "Cafe Maza Special Stroganoff (Non-Veg)", price: 339, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "Singapore Noodles (Non-Veg)", price: 289, image: "/images/cafe-maza-sizzlers.jpg", isVeg: true },
            { name: "Chicken Monica", price: 289, image: "/images/cafe-maza-sizzlers.jpg" },
        ],
    },
    {
        id: "cafe-maza-specials",
        label: "Cafe Maza Specials",
        items: [
            { name: "Chicken Harees", price: 100, image: "/images/cafe-maza-specials.jpg" },
            { name: "Chicken Harees Family Pack", price: 250, image: "/images/cafe-maza-specials.jpg" },
            { name: "Chicken Dum Biryani Handi 25p", price: 7250, image: "/images/cafe-maza-specials.jpg" },
            { name: "Murgh Musallam", price: 1299, image: "/images/cafe-maza-specials.jpg" },
            { name: "Mutton Sikandari Run", price: 1599, image: "/images/cafe-maza-specials.jpg" },
            { name: "Tandoori Non Veg Platter ( 5 Items )", price: 1999, image: "/images/cafe-maza-specials.jpg", isVeg: true },
        ],
    },
    {
        id: "chinese-starters-(veg-non-veg)",
        label: "Chinese Starters (Veg & Non-Veg)",
        items: [
            { name: "Paneer 65", price: 269, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chicken Fry", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken 555", price: 319, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Dragon Chicken", price: 349, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Kaju Fry", price: 289, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Babycorn Crispy", price: 289, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Paneer 555", price: 289, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Slice Sauce Chicken", price: 339, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Crispy Garlic Corn", price: 209, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chinese Non Veg Platter", price: 1695, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Hyderabadi Chicken 65", price: 285, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Hyderabadi Prawn 65", price: 379, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chilli Chicken - Dry", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chilli Chicken - Wet", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Manchurian - Dry", price: 299, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Manchurian - Wet", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Majestick", price: 319, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Thaipai", price: 319, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Lollypop - Crispy", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chicken Lollypop -soucs", price: 329, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Pepper Chicken", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Jeedi Pappau Kodi Pakodi", price: 319, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Chilli Prawns", price: 399, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Apolo Fish", price: 369, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Thaipai Fish", price: 379, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Golden Fried Prawns", price: 399, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Loose Prawns", price: 399, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Pandu Mirchi Kodi Vepudu", price: 309, image: "/images/chinese-starters-(veg-non-veg).jpg" },
            { name: "Veg Manchurian - Dry", price: 219, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Veg Manchurian -Wet", price: 249, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chilli Paneer- Dry", price: 269, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chilli Paneer-Wet", price: 289, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Kung Pao Paneer", price: 279, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Paneer Majestick", price: 289, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Gobi 65", price: 249, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chilli Mushroom", price: 259, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Crispy Mushroom Chilli Garlic", price: 249, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Honey Chilli Potato", price: 239, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: true },
        ],
    },
    {
        id: "desserts-sweets",
        label: "Desserts & Sweets",
        items: [
            { name: "Qurbani Ka Meetha", price: 139, image: "/images/desserts-sweets.jpg" },
            { name: "Gulab Jamun With Ice Cream", price: 149, image: "/images/desserts-sweets.jpg" },
            { name: "Gulab Jamun", price: 99, image: "/images/desserts-sweets.jpg" },
            { name: "Double Ka Meetha", price: 129, image: "/images/desserts-sweets.jpg" },
        ],
    },
    {
        id: "hakka-noodles-fried-rice",
        label: "Hakka Noodles & Fried Rice",
        items: [
            { name: "Kaju Paneer Fried Rice", price: 289, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Egg Fried Rice", price: 219, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Egg Noodles", price: 219, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Curd Rice", price: 129, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Extra Rice", price: 199, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Paneer Fried Rice", price: 289, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Mushroom Fried Rice", price: 319, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Double Egg Fried Rice", price: 249, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Chicken Noodles", price: 229, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Veg Pulao", price: 229, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Kodi Pulao", price: 259, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Veg Fried Rice", price: 199, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Chicken Fried Rice", price: 259, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Mix Fried Rice", price: 339, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Veg Hakka Noodles", price: 199, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Chicken Hakka Noodles", price: 259, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Mix Hakka Noodles", price: 339, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
            { name: "Veg American Chopsuey", price: 289, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Non-Veg American Chopsuey", price: 309, image: "/images/hakka-noodles-fried-rice.jpg" },
            { name: "Jeera Rice", price: 199, image: "/images/hakka-noodles-fried-rice.jpg", isVeg: true },
        ],
    },
    {
        id: "indian-breads",
        label: "Indian Breads",
        items: [
            { name: "Tandoori Roti", price: 29, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Butter Roti", price: 29, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Garlic Naan", price: 69, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Plain Naan", price: 49, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Butter Naan", price: 59, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Plain Kulcha", price: 59, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Masala Kulcha", price: 69, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Plain Paratha", price: 59, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Aloo Paratha", price: 69, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Roomali Roti", price: 49, image: "/images/indian-breads.jpg", isVeg: true },
            { name: "Kashmiri Naan", price: 79, image: "/images/indian-breads.jpg", isVeg: true },
        ],
    },
    {
        id: "main-course-(veg-non-veg)",
        label: "Main Course (Veg & Non-Veg)",
        items: [
            { name: "Chicken Kolhapuri", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Chicken Mughlai Curry", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Punjabi Chicken", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Fish Masala Curry", price: 329, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Dum Chicken", price: 349, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Egg Amlet", price: 159, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Mutton Keema Curry", price: 409, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Dal Tadka", price: 199, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Palak Paneer", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Kaju Curry", price: 339, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Egg Masala Curry", price: 199, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Tamoto Curry", price: 169, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Dal Khichidi", price: 219, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Mushroom Do Pyaza", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Mushroom Masala", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Paneer Butter Masala", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Kadai Paneer", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Paneer Tikka Masala", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Kaju Paneer Masala", price: 299, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Methi Chaman", price: 289, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Chicken Chettinad", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Andhra Kodi Kura", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Afghani Chicken Curry", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Butter Chicken", price: 339, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Chicken Tikka Masala", price: 359, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Kadai Chicken", price: 349, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Mutton Rogan Josh", price: 389, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Mutton Rara Masala", price: 389, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Kadai Mutton", price: 369, image: "/images/main-course-(veg-non-veg).jpg" },
            { name: "Mix Veg Curry", price: 239, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Kadai Veg", price: 239, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
            { name: "Veg Korma", price: 239, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
        ],
    },
    {
        id: "mocktails",
        label: "Mocktails",
        items: [
            { name: "Zamun Zaminia", price: 149, image: "/images/mocktails.jpg" },
            { name: "Berry Bliss", price: 149, image: "/images/mocktails.jpg" },
            { name: "Pina Colada", price: 149, image: "/images/mocktails.jpg" },
            { name: "Mango Mania", price: 149, image: "/images/mocktails.jpg" },
            { name: "Fruits Punch", price: 149, image: "/images/mocktails.jpg" },
            { name: "Sweet Lassi", price: 99, image: "/images/mocktails.jpg", isVeg: true },
            { name: "Butter Milk", price: 89, image: "/images/mocktails.jpg", isVeg: true },
            { name: "Fresh Lime Soda", price: 99, image: "/images/mocktails.jpg" },
            { name: "Virgin Mojito", price: 149, image: "/images/mocktails.jpg" },
            { name: "Strawberry Delight", price: 149, image: "/images/mocktails.jpg" },
            { name: "Blue Moon", price: 149, image: "/images/mocktails.jpg" },
            { name: "Passion Fruits Pop", price: 149, image: "/images/mocktails.jpg" },
            { name: "Orange Blossom", price: 149, image: "/images/mocktails.jpg" },
        ],
    },
    {
        id: "non-veg-soups",
        label: "Non Veg Soups",
        items: [
            { name: "Chicken Lemon Coriander Soup", price: 129, image: "/images/non-veg-soups.jpg" },
            { name: "Hot 'N Sour Soup (Chicken)", price: 129, image: "/images/non-veg-soups.jpg" },
            { name: "Kim In Chicken Soup", price: 159, image: "/images/non-veg-soups.jpg" },
            { name: "Paya Shorba", price: 179, image: "/images/non-veg-soups.jpg" },
            { name: "Marag Shorba", price: 239, image: "/images/non-veg-soups.jpg" },
            { name: "Manchow Soup (Chicken)", price: 129, image: "/images/non-veg-soups.jpg" },
            { name: "Sweet Corn Soup (Chicken)", price: 129, image: "/images/non-veg-soups.jpg" },
        ],
    },
    {
        id: "tandoori-starters-(veg-non-veg)",
        label: "Tandoori Starters (Veg & Non-Veg)",
        items: [
            { name: "Soya Chaap", price: 249, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tandoori Brocooli", price: 309, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Aalu Parata", price: 69, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Chicken Tikka Lasooni", price: 389, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tandoori Mix Non Veg Platter", price: 1999, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Chicken Tikka", price: 329, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Malai Chicken Tikka", price: 359, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Zafrani Chicken Tikka", price: 329, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Hariyali Chicken Tikka", price: 339, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Sholey Kebab", price: 349, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tangdi Kabab", price: 369, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Santrewala Murgh Tikka", price: 339, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Achri Fish Tikka", price: 379, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Hariyali Fish Tikka", price: 359, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tandoori Sea Prawns", price: 379, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tala Hua Gosht", price: 389, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Lamb Chops", price: 439, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Murgh Afgani Kebab", price: 309, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Chelo Kebab ( Mutton & Chicken )", price: 499, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Persian Kebab", price: 249, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Mutton Seekh Kebab", price: 419, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Mutton Ronaki Seekh Kebab", price: 419, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Sangam Seek Kebab", price: 359, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Mutton Boti Kebab", price: 399, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tandoori Chicken (half)", price: 319, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Tandoori Chicken (full)", price: 589, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
            { name: "Malai Paneer Tikka", price: 309, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Hariyali Paneer Tikka", price: 289, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Achri Paneer Tikka", price: 289, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Veg Seekh Kebab", price: 249, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Malai Brocoli Peri Peri", price: 269, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: true },
            { name: "Hara Bhara Kebab", price: 259, image: "/images/tandoori-starters-(veg-non-veg).jpg" },
        ],
    },
    {
        id: "veg-soups",
        label: "Veg Soups",
        items: [
            { name: "Hot 'N Sour Soup (Veg)", price: 99, image: "/images/veg-soups.jpg", isVeg: true },
            { name: "Tomato Dhaniya Shorba", price: 95, image: "/images/veg-soups.jpg" },
            { name: "Dal Shorba", price: 125, image: "/images/veg-soups.jpg", isVeg: true },
            { name: "Kim In Mushroom Soup", price: 139, image: "/images/veg-soups.jpg", isVeg: true },
            { name: "Manchow Soup (Veg)", price: 109, image: "/images/veg-soups.jpg", isVeg: true },
            { name: "Sweet Corn Soup (Veg)", price: 109, image: "/images/veg-soups.jpg", isVeg: true },
        ],
    },
];

export const featuredDishes: Dish[] = [
    { name: "Murgh Musallam", price: 1299, image: "/images/specials.jpg", isVeg: false },
    { name: "Chicken Dum Biryani", price: 299, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: false },
    { name: "Tandoori Chicken (full)", price: 589, image: "/images/tandoori-starters-(veg-non-veg).jpg", isVeg: false },
    { name: "Hyderabadi Chicken 65", price: 285, image: "/images/chinese-starters-(veg-non-veg).jpg", isVeg: false },
    { name: "Paneer Butter Masala", price: 289, image: "/images/main-course-(veg-non-veg).jpg", isVeg: true },
    { name: "Mutton Dum Biryani", price: 429, image: "/images/biryanis-(veg-non-veg).jpg", isVeg: false },
];

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

export const mockOrders: Order[] = [
    { id: "1", orderNumber: 1001, customerName: "Rajesh Kumar", customerPhone: "9876543210", items: [{ name: "Butter Chicken", quantity: 2, price: 289 }, { name: "Tandoori Chicken", quantity: 1, price: 250 }], status: "new", total: 828, orderType: "dine-in", createdAt: new Date(), tableNumber: 5 },
    { id: "2", orderNumber: 1002, customerName: "Priya Singh", customerPhone: "9876543211", items: [{ name: "Paneer Tikka", quantity: 1, price: 220 }], status: "preparing", total: 220, orderType: "takeaway", createdAt: new Date() },
    { id: "3", orderNumber: 1003, customerName: "Amit Patel", customerPhone: "9876543212", items: [{ name: "Lamb Biryani", quantity: 3, price: 280 }], status: "preparing", total: 840, orderType: "delivery", createdAt: new Date(), deliveryAddress: "123 Main Street" },
    { id: "4", orderNumber: 1004, customerName: "Neha Sharma", customerPhone: "9876543213", items: [{ name: "Chicken Dum Biryani", quantity: 2, price: 250 }], status: "ready", total: 500, orderType: "dine-in", createdAt: new Date(), tableNumber: 8 },
    { id: "5", orderNumber: 1005, customerName: "Vikram Singh", customerPhone: "9876543214", items: [{ name: "Rogan Josh", quantity: 1, price: 360 }, { name: "Naan", quantity: 2, price: 40 }], status: "ready", total: 440, orderType: "takeaway", createdAt: new Date() },
    { id: "6", orderNumber: 1006, customerName: "Ananya Verma", customerPhone: "9876543215", items: [{ name: "Chilli Chicken", quantity: 1, price: 260 }], status: "completed", total: 260, orderType: "delivery", createdAt: new Date(), deliveryAddress: "456 Oak Avenue" },
];

export const mockReservations: Reservation[] = [
    { id: "r1", name: "Rohit Gupta", phone: "9876543220", guests: 4, date: "2024-01-20", time: "19:00", tableNumber: 1, status: "confirmed" },
    { id: "r2", name: "Sakshi Desai", phone: "9876543221", guests: 2, date: "2024-01-20", time: "19:30", tableNumber: 3, status: "confirmed" },
    { id: "r3", name: "Harpreet Singh", phone: "9876543222", guests: 6, date: "2024-01-20", time: "20:00", tableNumber: 7, status: "confirmed" },
];

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
