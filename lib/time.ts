export function formatTimeShort(date: Date) {
    try {
        return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch (e) {
        return date.toISOString().slice(11, 16);
    }
}

export function formatRelative(iso: string | Date) {
    const date = typeof iso === "string" ? new Date(iso) : iso;
    const now = new Date();

    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((+today - +localDate) / (24 * 60 * 60 * 1000));

    const time = formatTimeShort(date);

    if (diffDays === 0) return `Today ${time}`;
    if (diffDays === 1) return `Yesterday ${time}`;
    if (diffDays > 1 && diffDays < 7) return `${date.toLocaleDateString(undefined, { weekday: "short" })} ${time}`;

    return date.toLocaleDateString();
}
