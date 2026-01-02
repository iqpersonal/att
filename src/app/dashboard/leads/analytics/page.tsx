"use client";

import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import {
    BarChart3,
    TrendingUp,
    Users,
    GraduationCap,
    ArrowLeft,
    PieChart,
    Timer,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    Target
} from "lucide-react";
import Link from "next/link";

interface LeadAnalytics {
    totalLeads: number;
    convertedCount: number;
    conversionRate: number;
    sourceBreakdown: Record<string, number>;
    formBreakdown: Record<string, { total: number; converted: number }>;
    avgConversionDays: number;
}

export default function LeadsAnalyticsPage() {
    const { tenantId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<LeadAnalytics | null>(null);

    useEffect(() => {
        if (!tenantId) return;

        const fetchAnalytics = async () => {
            setLoading(true);
            try {
                const leadsRef = collection(db, "leads");
                const q = query(leadsRef, where("tenantId", "==", tenantId));
                const snap = await getDocs(q);

                let totalLeads = 0;
                let convertedCount = 0;
                let totalConversionMs = 0;
                const sourceBreakdown: Record<string, number> = {};
                const formBreakdown: Record<string, { total: number; converted: number }> = {};

                snap.docs.forEach(doc => {
                    const data = doc.data();
                    totalLeads++;

                    // Source Breakdown
                    const src = data.source || "Unknown";
                    sourceBreakdown[src] = (sourceBreakdown[src] || 0) + 1;

                    // Form Breakdown
                    const form = data.formName || "Manual Entry";
                    if (!formBreakdown[form]) {
                        formBreakdown[form] = { total: 0, converted: 0 };
                    }
                    formBreakdown[form].total++;

                    if (data.converted) {
                        convertedCount++;
                        formBreakdown[form].converted++;

                        // Velocity
                        if (data.createdAt && data.convertedAt) {
                            const start = data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
                            const end = data.convertedAt.toDate ? data.convertedAt.toDate().getTime() : new Date(data.convertedAt).getTime();
                            totalConversionMs += (end - start);
                        }
                    }
                });

                const avgConversionDays = convertedCount > 0
                    ? Math.round(totalConversionMs / convertedCount / (1000 * 60 * 60 * 24))
                    : 0;

                setStats({
                    totalLeads,
                    convertedCount,
                    conversionRate: totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0,
                    sourceBreakdown,
                    formBreakdown,
                    avgConversionDays
                });
            } catch (error) {
                console.error("Analytics fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, [tenantId]);

    const MetricCard = ({ title, value, sub, icon: Icon, color, trend }: any) => (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
            <div className="flex items-start justify-between mb-6">
                <div className={`h-14 w-14 ${color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {trend > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{title}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-slate-900 font-outfit tracking-tight">{value}</h3>
                    {sub && <span className="text-sm font-bold text-slate-300">{sub}</span>}
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="p-12 min-h-screen flex flex-col items-center justify-center bg-slate-50/50">
                <BarChart3 className="h-12 w-12 text-primary animate-bounce mb-4" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Calculating ROI...</p>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="p-12 min-h-screen bg-[#F8FAFC]">
            {/* Nav Header */}
            <div className="mb-12">
                <Link
                    href="/dashboard/leads"
                    className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors group"
                >
                    <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                    Back to Pipeline
                </Link>
            </div>

            <header className="flex items-center justify-between mb-16">
                <div className="space-y-1">
                    <h1 className="text-5xl font-extrabold text-[#0D121F] font-outfit tracking-tighter">Conversion <span className="text-primary/40 italic">Intelligence</span></h1>
                    <p className="text-slate-400 font-bold text-sm font-outfit">Marketing performance and ROI analysis for this enrollment cycle.</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-xs font-bold text-slate-600">
                    <Filter className="h-4 w-4 text-slate-300" />
                    Last 30 Days
                </div>
            </header>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                <MetricCard
                    title="Gross Prospects"
                    value={stats.totalLeads}
                    icon={Target}
                    color="bg-indigo-50 text-indigo-600"
                />
                <MetricCard
                    title="Conversion Rate"
                    value={`${stats.conversionRate.toFixed(1)}%`}
                    icon={TrendingUp}
                    color="bg-emerald-50 text-emerald-600"
                    trend={12}
                />
                <MetricCard
                    title="Active Students"
                    value={stats.convertedCount}
                    icon={GraduationCap}
                    color="bg-primary/5 text-primary"
                />
                <MetricCard
                    title="Pipeline Speed"
                    value={stats.avgConversionDays}
                    sub="days"
                    icon={Timer}
                    color="bg-amber-50 text-amber-600"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Source Quality Breakdown */}
                <div className="lg:col-span-1 bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-12">
                        <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Source Distribution</h3>
                        <PieChart className="h-5 w-5 text-slate-200" />
                    </div>
                    <div className="flex-1 space-y-8">
                        {Object.entries(stats.sourceBreakdown).map(([source, count], idx) => {
                            const pct = ((count / stats.totalLeads) * 100).toFixed(0);
                            return (
                                <div key={source} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{source}</p>
                                        <p className="text-sm font-black text-slate-900">{count} <span className="text-[10px] text-slate-300 ml-1">({pct}%)</span></p>
                                    </div>
                                    <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${idx === 0 ? 'bg-primary shadow-lg shadow-primary/20' :
                                                    idx === 1 ? 'bg-indigo-400' : 'bg-slate-300'
                                                }`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Performance Analytics */}
                <div className="lg:col-span-2 bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight">Campaign Efficiency</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">ROI by Lead Form & Source Name</p>
                        </div>
                        <Link href="/dashboard/leads" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All Leads</Link>
                    </div>
                    <div className="flex-1 overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50/30">
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Form / Campaign Identification</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Prospects</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Enrollments</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Yield Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {Object.entries(stats.formBreakdown)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .map(([form, data]) => {
                                        const yield_rate = ((data.converted / data.total) * 100).toFixed(1);
                                        return (
                                            <tr key={form} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:text-white transition-all">
                                                            <Target className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 text-sm tracking-tight">{form}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Digital Acquisition</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 font-bold text-slate-700 text-sm">{data.total}</td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-slate-900 text-sm">{data.converted}</span>
                                                        <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${yield_rate}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${Number(yield_rate) > 20 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                        }`}>
                                                        {yield_rate}% Yield
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
