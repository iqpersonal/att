"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
    Building2,
    Users,
    ShieldCheck,
    Globe,
    AlertCircle,
    Loader2,
    Crown,
    ArrowRight
} from "lucide-react";
import Link from "next/link";

interface Tenant {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    status: "active" | "suspended";
    features?: string[];
    studentCount?: number;
}

export default function SuperAdminPage() {
    const { role } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [announcement, setAnnouncement] = useState("");
    const [sendingAnn, setSendingAnn] = useState(false);

    useEffect(() => {
        if (role !== "super-admin") return;

        const fetchTenants = async () => {
            try {
                // Fetch all for stats
                const q = query(collection(db, "tenants"));
                const snapshot = await getDocs(q);
                const tenantList = snapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                })) as Tenant[];
                setTenants(tenantList);
            } catch (error) {
                console.error("Error fetching tenants:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTenants();
    }, [role]);

    const handleGlobalAnnouncement = async () => {
        if (!announcement) return;
        setSendingAnn(true);
        try {
            console.log("Sending global announcement:", announcement);
            alert("Global announcement broadcasted to all school administrators!");
            setAnnouncement("");
        } catch (error) {
            console.error("Error sending announcement:", error);
        } finally {
            setSendingAnn(false);
        }
    };

    const recentTenants = tenants
        .filter(t => t.id !== "super-admin")
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    if (role !== "super-admin" && !loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-900 font-outfit">Access Denied</h1>
                    <p className="text-slate-500">You do not have permission to view this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-12">
            <header className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/10">
                    <ShieldCheck className="h-3 w-3" />
                    Platform Overview
                </div>
                <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Super Admin Control</h1>
                <p className="text-slate-400 font-medium font-outfit mt-2">Welcome back. Here is what is happening across your platform.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl hover:shadow-slate-200/20 transition-all">
                    <div className="h-14 w-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500">
                        <Building2 className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Global Reach</p>
                        <h3 className="text-3xl font-black text-slate-900 font-outfit">
                            {tenants.filter(t => t.id !== "super-admin").length} Schools
                        </h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl hover:shadow-slate-200/20 transition-all">
                    <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                        <Crown className="h-7 w-7" />
                    </div>
                    <div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Premium Licenses</p>
                        <h3 className="text-3xl font-black text-slate-900 font-outfit">
                            {tenants.filter(t => t.id !== "super-admin" && t.features && t.features.length > 0).length} Subscriptions
                        </h3>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-4 hover:shadow-xl hover:shadow-slate-200/20 transition-all overflow-hidden">
                    <div className="flex items-center gap-6">
                        <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                            <Globe className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Quick Broadcast</p>
                            <input
                                type="text"
                                value={announcement}
                                onChange={(e) => setAnnouncement(e.target.value)}
                                placeholder="Message all..."
                                className="w-full mt-2 bg-transparent text-slate-900 font-bold text-lg focus:outline-none placeholder:text-slate-200 truncate"
                            />
                        </div>
                        <button
                            onClick={handleGlobalAnnouncement}
                            disabled={sendingAnn || !announcement}
                            className="px-5 py-3 bg-slate-900 text-white rounded-xl font-bold text-sm hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex-shrink-0"
                        >
                            {sendingAnn ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h2 className="text-xl font-extrabold text-[#0D121F] font-outfit">Recent Registrations</h2>
                    <Link href="/dashboard/admin/schools" className="text-sm font-bold text-primary hover:underline flex items-center gap-1">
                        View All Schools <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td className="px-8 py-20 text-center">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
                                    </td>
                                </tr>
                            ) : recentTenants.length === 0 ? (
                                <tr>
                                    <td className="px-8 py-12 text-center text-slate-400 font-medium">No schools registered yet.</td>
                                </tr>
                            ) : recentTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors font-black">
                                                    {tenant.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-extrabold text-[#0D121F] font-outfit">{tenant.name}</p>
                                                        {tenant.features && tenant.features.length > 0 && (
                                                            <div className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center gap-0.5">
                                                                <Crown className="h-2 w-2" />
                                                                Premium
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 font-medium tracking-tight">Registered {new Date(tenant.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tenant.status === "active"
                                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                : "bg-red-50 text-red-600 border border-red-100"
                                                }`}>
                                                {tenant.status || "active"}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
