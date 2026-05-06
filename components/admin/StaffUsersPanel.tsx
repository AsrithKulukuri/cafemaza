"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";
import { getAuthToken } from "@/lib/authToken";

type StaffRole = "staff" | "bearer" | "kitchen" | "manager";

type StaffUser = {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: StaffRole;
    createdAt?: string;
};

const initialForm = {
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "bearer" as StaffRole,
};

export function StaffUsersPanel() {
    const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        async function loadStaffUsers() {
            const token = getAuthToken();
            if (!token) return;

            try {
                const users = await apiFetch<StaffUser[]>("/api/admin/staff-users", { token });
                setStaffUsers(users);
            } catch (requestError) {
                setError(requestError instanceof Error ? requestError.message : "Failed to load staff users");
            } finally {
                setLoading(false);
            }
        }

        loadStaffUsers();
    }, []);

    const refreshStaffUsers = async () => {
        const token = getAuthToken();
        if (!token) return;
        const users = await apiFetch<StaffUser[]>("/api/admin/staff-users", { token });
        setStaffUsers(users);
    };

    const handleCreate = async () => {
        const token = getAuthToken();
        if (!token) {
            setError("Admin session expired. Please login again.");
            return;
        }

        if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
            setError("Name, email and password are required");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const created = await apiFetch<StaffUser>("/api/admin/staff-users", {
                method: "POST",
                token,
                body: JSON.stringify(form),
            });

            setStaffUsers((prev) => [created, ...prev]);
            setForm(initialForm);
            setShowForm(false);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to create staff user");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateRole = async (userId: string, role: StaffRole) => {
        const token = getAuthToken();
        if (!token) return;

        try {
            const updated = await apiFetch<StaffUser>(`/api/admin/staff-users/${userId}`, {
                method: "PUT",
                token,
                body: JSON.stringify({ role }),
            });

            setStaffUsers((prev) => prev.map((user) => (user._id === userId ? updated : user)));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Failed to update staff user");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
                <button
                    onClick={() => setShowForm((prev) => !prev)}
                    className="rounded-full bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-3 font-semibold text-[#111]"
                >
                    {showForm ? "Close Staff Form" : "Add Staff Login"}
                </button>
                <button
                    onClick={() => void refreshStaffUsers()}
                    className="rounded-full border border-[#CFAF63]/30 px-5 py-3 text-sm text-[#F5F5F5]"
                >
                    Refresh
                </button>
            </div>

            {showForm && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6"
                >
                    <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Create Staff Login</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Full Name" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                        <input value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" type="email" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                        <input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                        <input value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Temporary Password" type="password" className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5]" />
                        <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as StaffRole }))} className="rounded-xl border border-[#CFAF63]/25 bg-[#121212] px-4 py-3 text-[#F5F5F5] md:col-span-2">
                            <option value="bearer">Bearer</option>
                            <option value="kitchen">Kitchen</option>
                            <option value="manager">Manager</option>
                            <option value="staff">General Staff</option>
                        </select>
                    </div>
                    <div className="mt-4 flex gap-3">
                        <button onClick={handleCreate} disabled={saving} className="rounded-lg bg-gradient-to-r from-[#CFAF63] to-[#FF6A00] px-6 py-2 text-sm font-semibold text-[#111]">
                            {saving ? "Saving..." : "Create Login"}
                        </button>
                        <button onClick={() => setShowForm(false)} className="rounded-lg border border-[#CFAF63]/25 px-6 py-2 text-sm text-[#F5F5F5]">
                            Cancel
                        </button>
                    </div>
                </motion.div>
            )}

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <div className="glass-card rounded-2xl border border-[#CFAF63]/25 p-6 overflow-x-auto">
                <h3 className="mb-4 font-[var(--font-heading)] text-lg text-[#F5F5F5]">Active Staff Logins</h3>
                {loading ? (
                    <p className="text-sm text-[#999]">Loading staff users...</p>
                ) : staffUsers.length === 0 ? (
                    <p className="text-sm text-[#999]">No staff accounts found.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#333]">
                                <th className="px-3 py-2 text-left text-[#999]">Name</th>
                                <th className="px-3 py-2 text-left text-[#999]">Email</th>
                                <th className="px-3 py-2 text-left text-[#999]">Phone</th>
                                <th className="px-3 py-2 text-left text-[#999]">Role</th>
                                <th className="px-3 py-2 text-right text-[#999]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffUsers.map((user) => (
                                <tr key={user._id} className="border-b border-[#1A1A1A]">
                                    <td className="px-3 py-3 text-[#F5F5F5]">{user.name}</td>
                                    <td className="px-3 py-3 text-[#CCC]">{user.email}</td>
                                    <td className="px-3 py-3 text-[#CCC]">{user.phone || "N/A"}</td>
                                    <td className="px-3 py-3">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleUpdateRole(user._id, e.target.value as StaffRole)}
                                            className="rounded-md border border-[#CFAF63]/30 bg-[#171717] px-2 py-1 text-xs text-[#F5F5F5]"
                                        >
                                            <option value="bearer">Bearer</option>
                                            <option value="kitchen">Kitchen</option>
                                            <option value="manager">Manager</option>
                                            <option value="staff">General Staff</option>
                                        </select>
                                    </td>
                                    <td className="px-3 py-3 text-right text-[#999]">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
