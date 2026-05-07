import mongoose from "mongoose";

const promoBannerSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        subtitle: {
            type: String,
            trim: true,
            default: "",
        },
        couponCode: {
            type: String,
            trim: true,
            uppercase: true,
            default: "",
        },
        image: {
            type: String,
            trim: true,
            default: "",
        },
        ctaText: {
            type: String,
            trim: true,
            default: "Order Now",
        },
        ctaLink: {
            type: String,
            trim: true,
            default: "/menu",
        },
        startsAt: {
            type: Date,
            default: null,
        },
        endsAt: {
            type: Date,
            default: null,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

promoBannerSchema.index({ isActive: 1, startsAt: 1, endsAt: 1, createdAt: -1 });

export const PromoBanner = mongoose.model("PromoBanner", promoBannerSchema);
