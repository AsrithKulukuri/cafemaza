"use client";

export function MenuCardSkeleton() {
    return (
        <article className="overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[#141414]/70">
            <div className="skeleton-shimmer h-56 w-full" />
            <div className="space-y-3 p-5">
                <div className="skeleton-shimmer h-6 w-3/4 rounded-md" />
                <div className="skeleton-shimmer h-4 w-1/2 rounded-md" />
                <div className="skeleton-shimmer h-4 w-full rounded-md" />
                <div className="skeleton-shimmer h-10 w-full rounded-lg" />
            </div>
        </article>
    );
}
