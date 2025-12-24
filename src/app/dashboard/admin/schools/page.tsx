"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
    Building2,
    Search,
    Loader2,
    Calendar,
    Crown,
    Target,
    AlertCircle,
    Plus,
    X,
    BookOpen,
    GraduationCap,
    Clock
} from "lucide-react";

interface Tenant {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    status: "active" | "suspended";
    features?: string[];
    studentCount?: number;
}

const AVAILABLE_MODULES = [
    { id: "leads", label: "Lead Management", icon: Target },
    { id: "attendance", label: "Attendance", icon: Clock },
    { id: "academics", label: "Academics", icon: BookOpen },
    { id: "exams", label: "Exams", icon: GraduationCap },
];

export default function SchoolsManagementPage() {
    const { role } = useAuth();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [updating, setUpdating] = useState<string | null>(null);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    useEffect(() => {
        if (role !== "super-admin") return;

        const fetchTenants = async () => {
            try {
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

    const handleUpdateStatus = async (tenantId: string, currentStatus: string) => {
        setUpdating(tenantId);
        try {
            const newStatus = currentStatus === "suspended" ? "active" : "suspended";
            await updateDoc(doc(db, "tenants", tenantId), {
                status: newStatus,
                updatedAt: new Date().toISOString()
            });
            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, status: newStatus as any } : t));
        } catch (error) {
            console.error("Error updating tenant status:", error);
            alert("Failed to update tenant status.");
        } finally {
            setUpdating(null);
        }
    };

    const handleToggleFeature = async (tenantId: string, currentFeatures: string[] = [], feature: string) => {
        setUpdating(`${tenantId}-${feature}`);
        try {
            const newFeatures = currentFeatures.includes(feature)
                ? currentFeatures.filter(f => f !== feature)
                : [...currentFeatures, feature];

            await updateDoc(doc(db, "tenants", tenantId), {
                features: newFeatures,
                updatedAt: serverTimestamp()
            });

            setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, features: newFeatures } : t));
        } catch (error) {
            console.error("Error toggling feature:", error);
            alert("Failed to update features.");
        } finally {
            setUpdating(null);
            setOpenDropdown(null);
        }
    };

    const filteredTenants = tenants.filter(t =>
        t.id !== "super-admin" && (
            t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            t.id.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

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
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-indigo-100">
                        <Building2 className="h-3 w-3" />
                        Institutions
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Schools Management</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Manage subscriptions, status, and features for all schools.</p>
                </div>

                <div className="relative w-96 group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Find school by name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[28px] focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500/20 transition-all font-medium text-slate-900 shadow-sm"
                    />
                </div>
            </header>

            <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden min-h-[600px]">
                <div className="overflow-x-visible">
                    <table className="w-full">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Institution Info</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Platform ID</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Active Modules</th>
                                <th className="px-8 py-5 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                                <th className="px-8 py-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                                            <p className="text-slate-400 font-bold font-outfit">Loading schools...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredTenants.map((tenant) => (
                                <tr key={tenant.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors font-black">
                                                {tenant.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-extrabold text-[#0D121F] font-outfit">{tenant.name}</p>
                                                    {tenant.features && tenant.features.length > 0 && (
                                                        <div className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase flex items-center gap-0.5">
                                                            <Crown className="h-2 w-2" />
                                                            Premium
                                                        </div>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium tracking-tight">Owner ID: {tenant.ownerId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <code className="text-[12px] bg-slate-50 px-2 py-1 rounded-md text-slate-500 font-bold">{tenant.id}</code>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tenant.status === "active"
                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                            : "bg-red-50 text-red-600 border border-red-100"
                                            }`}>
                                            {tenant.status || "active"}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-wrap gap-2 max-w-[300px]">
                                            {tenant.features?.map(featureId => {
                                                const module = AVAILABLE_MODULES.find(m => m.id === featureId);
                                                const Icon = module ? module.icon : Target;
                                                return (
                                                    <div key={featureId} className="px-2 py-1 bg-white border border-slate-200 rounded-lg flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                                                        <Icon className="h-3 w-3 text-indigo-500" />
                                                        {module ? module.label : featureId}
                                                        <button
                                                            onClick={() => handleToggleFeature(tenant.id, tenant.features, featureId)}
                                                            className="ml-1 hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="h-2.5 w-2.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setOpenDropdown(openDropdown === tenant.id ? null : tenant.id)}
                                                    className="h-6 w-6 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </button>

                                                {openDropdown === tenant.id && (
                                                    <div className="absolute top-8 left-0 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-1.5 animation-in fade-in slide-in-from-top-2">
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 py-1 mb-1">Add Module</div>
                                                        {AVAILABLE_MODULES.filter(m => !tenant.features?.includes(m.id)).map(module => (
                                                            <button
                                                                key={module.id}
                                                                onClick={() => handleToggleFeature(tenant.id, tenant.features, module.id)}
                                                                className="w-full flex items-center gap-2 px-2 py-2 text-left text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                                                            >
                                                                <module.icon className="h-3.5 w-3.5 opacity-50" />
                                                                {module.label}
                                                            </button>
                                                        ))}
                                                        {AVAILABLE_MODULES.filter(m => !tenant.features?.includes(m.id)).length === 0 && (
                                                            <div className="px-2 py-2 text-xs text-slate-400 italic text-center">All modules active</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-400">
                                            <Calendar className="h-4 w-4" />
                                            <span className="text-sm font-medium">
                                                {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => handleUpdateStatus(tenant.id, tenant.status || "active")}
                                            disabled={updating === tenant.id}
                                            className={`px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all border ${tenant.status === "suspended"
                                                ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                                                : "bg-white text-red-500 border-red-100 hover:bg-red-50"
                                                }`}
                                        >
                                            {updating === tenant.id ? <Loader2 className="h-4 w-4 animate-spin" /> : (tenant.status === "suspended" ? "Unsuspend" : "Suspend")}
                                        </button>
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
