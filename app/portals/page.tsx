"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChefHat, Truck, Settings, User } from "lucide-react";

const portals = [
    {
        id: "customer",
        title: "Customer Portal",
        description: "Order food, reserve tables, and track your deliveries",
        icon: User,
        links: [
            { label: "Login", href: "/login" },
            { label: "Sign Up", href: "/signup" },
            { label: "My Orders", href: "/my-orders" },
            { label: "Track Order", href: "/order-tracking" },
        ],
        color: "from-[#FF6A00]",
    },
    {
        id: "staff",
        title: "Staff Portal",
        description: "Manage orders, kitchen queue, and order preparation",
        icon: ChefHat,
        links: [
            { label: "Staff Login", href: "/staff-login" },
            { label: "Dashboard", href: "/staff/dashboard" },
        ],
        color: "from-[#CFAF63]",
    },
    {
        id: "delivery",
        title: "Delivery Portal",
        description: "Manage assigned deliveries and track locations",
        icon: Truck,
        links: [
            { label: "Delivery Login", href: "/delivery-login" },
            { label: "Dashboard", href: "/delivery/dashboard" },
        ],
        color: "from-[#3B82F6]",
    },
    {
        id: "admin",
        title: "Admin Portal",
        description: "Analytics, order management, menu, and reservations",
        icon: Settings,
        links: [
            { label: "Admin Login", href: "/admin-login" },
            { label: "Dashboard", href: "/admin/dashboard" },
        ],
        color: "from-[#7C3AED]",
    },
];

export default function PortalsPage() {
    return (
        <div className="min-h-screen bg-[#0B0B0B] p-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12 mt-8"
            >
                <p className="text-sm uppercase tracking-[0.2em] text-[#CFAF63]">Café Maza Portals</p>
                <h1 className="font-[var(--font-heading)] text-5xl text-[#F5F5F5] mt-2">Welcome</h1>
                <p className="text-[#999] mt-4 max-w-2xl mx-auto">
                    Access different portals based on your role. Choose your portal to get started.
                </p>
            </motion.div>

            {/* Portals Grid */}
            <motion.div layout className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {portals.map((portal, idx) => {
                    const Icon = portal.icon;
                    return (
                        <motion.div
                            key={portal.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`glass-card rounded-3xl border border-[#CFAF63]/25 p-8 hover:border-[#CFAF63]/50 transition bg-gradient-to-br ${portal.color}/5`}
                        >
                            {/* Icon & Title */}
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`p-3 rounded-xl bg-gradient-to-br ${portal.color} to-[#FF6A00] text-white`}>
                                    <Icon size={28} />
                                </div>
                                <div className="flex-1">
                                    <h2 className="font-[var(--font-heading)] text-2xl text-[#F5F5F5]">{portal.title}</h2>
                                    <p className="text-sm text-[#999] mt-1">{portal.description}</p>
                                </div>
                            </div>

                            {/* Links */}
                            <div className="flex gap-3 flex-wrap">
                                {portal.links.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${link.label.includes("Login") || link.label.includes("Sign Up")
                                            ? `bg-gradient-to-r ${portal.color} to-[#FF6A00] text-[#111] hover:shadow-lg`
                                            : "border border-[#CFAF63]/25 text-[#CFAF63] hover:bg-[#CFAF63]/10"
                                            }`}
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </div>
                        </motion.div>
                    );
                })}
            </motion.div>

            {/* Demo Credentials */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="max-w-2xl mx-auto glass-card rounded-2xl border border-[#CFAF63]/25 p-6 bg-[#CFAF63]/5"
            >
                <h3 className="font-[var(--font-heading)] text-lg text-[#F5F5F5] mb-4">📝 Demo Credentials</h3>
                <div className="space-y-3 text-sm">
                    <div>
                        <p className="text-[#999]">All portals accept any credentials for demo purposes:</p>
                        <p className="text-[#CFAF63] font-mono mt-1">ID: Any value (e.g., CHEF001, DEL001, ADMIN001)</p>
                        <p className="text-[#CFAF63] font-mono">Password: Any value</p>
                    </div>
                    <div className="pt-3 border-t border-[#CFAF63]/25">
                        <p className="text-[#999] mb-2">For customer portal:</p>
                        <p className="text-[#CFAF63]">Email: any@email.com | Password: any</p>
                    </div>
                </div>
            </motion.div>

            {/* Back to Home */}
            <div className="text-center mt-8">
                <Link href="/" className="text-[#CFAF63] hover:text-[#FF6A00] transition text-sm">
                    ← Back to Home
                </Link>
            </div>
        </div>
    );
}
