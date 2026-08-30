import { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cafemaza.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
    const lastModified = new Date();

    const routes = [
        {
            url: `${SITE_URL}`,
            lastModified,
            changeFrequency: "daily" as const,
            priority: 1.0,
        },
        {
            url: `${SITE_URL}/menu`,
            lastModified,
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/order-online`,
            lastModified,
            changeFrequency: "daily" as const,
            priority: 0.9,
        },
        {
            url: `${SITE_URL}/reserve-table`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.85,
        },
        {
            url: `${SITE_URL}/takeaway`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/live-grill`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/screening`,
            lastModified,
            changeFrequency: "weekly" as const,
            priority: 0.8,
        },
        {
            url: `${SITE_URL}/contact`,
            lastModified,
            changeFrequency: "monthly" as const,
            priority: 0.75,
        },
    ];

    return routes;
}
