import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        category: { type: String, trim: true },
        categories: { type: [String], default: [] },
        price: { type: Number, min: 0 },
        variants: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true, min: 0 },
            },
        ],
        description: { type: String, default: "" },
        image: { type: String, default: "" },
        isVeg: { type: Boolean, default: false },
        isPopular: { type: Boolean, default: false },
        isBestSeller: { type: Boolean, default: false },
        isSpecial: { type: Boolean, default: false },
        isSoldOut: { type: Boolean, default: false },
        tags: { type: [String], default: [] },
    },
    { timestamps: true }
);

menuItemSchema.index({ category: 1, categories: 1, createdAt: -1 });
menuItemSchema.index({ isPopular: 1, isBestSeller: 1, createdAt: -1 });
menuItemSchema.index({ isSoldOut: 1 });

export const MenuItem = mongoose.model("MenuItem", menuItemSchema);
