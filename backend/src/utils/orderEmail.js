import nodemailer from "nodemailer";

import { buildOrderReceivedText } from "./orderNotifications.js";

let transporter = null;
let missingConfigWarned = false;

function getTransporter() {
    if (transporter) {
        return transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        if (!missingConfigWarned) {
            console.warn("SMTP is not configured. Order notification emails are currently disabled.");
            missingConfigWarned = true;
        }
        return null;
    }

    transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
    });

    return transporter;
}

export async function sendOrderNotificationEmail({
    orderId,
    customerName,
    customerEmail,
    totalAmount,
    paymentMethod,
    address,
    itemSummary,
}) {
    const targetEmail = process.env.ORDER_NOTIFICATION_EMAIL || "mazacafe2@gmail.com";
    const mailer = getTransporter();

    if (!mailer) {
        // Skip quietly in local/dev if SMTP is not configured.
        return;
    }

    const subject = `New Order Received - ${orderId}`;
    const text = buildOrderReceivedText({
        orderId,
        customerName,
        customerEmail,
        totalAmount,
        paymentMethod,
        address,
        itemSummary,
    });

    await mailer.sendMail({
        from: process.env.SMTP_USER,
        to: targetEmail,
        subject,
        text,
    });
}
