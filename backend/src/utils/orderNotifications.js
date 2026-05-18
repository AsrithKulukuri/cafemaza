function formatCurrencyINR(amount) {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount)) {
        return "INR 0";
    }

    return `INR ${Math.round(numericAmount)}`;
}

export function buildOrderReceivedText({ orderId, customerName, customerEmail, totalAmount, paymentMethod, address, itemSummary }) {
    return [
        `Order ID: ${orderId}`,
        `Customer: ${customerName || "N/A"}`,
        `Email: ${customerEmail || "N/A"}`,
        `Total: ${formatCurrencyINR(totalAmount)}`,
        `Payment: ${paymentMethod || "N/A"}`,
        `Address: ${address || "N/A"}`,
        `Items: ${itemSummary || "N/A"}`,
    ].join("\n");
}
