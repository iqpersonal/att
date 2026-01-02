"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, getCountFromServer } from "firebase/firestore";
import {
    Users,
    Calendar,
    Bell,
    TrendingUp,
    ArrowRight,
    Search,
    Filter,
    Clock,
    CheckCircle2
} from "lucide-react";
import { useSession } from "next-auth/react";
import { TeamsMeetingList } from "@/components/TeamsMeetingList";

export default function Dashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const { user: firebaseUser, tenantId, role } = useAuth();
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [meetingCount, setMeetingCount] = useState<number | null>(null);
    const [attendancePct, setAttendancePct] = useState<number | null>(null);
    const [coldLeadsCount, setColdLeadsCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tenantId || !firebaseUser) return;

        if (role === "super-admin") {
            router.push("/dashboard/admin");
            return;
        }

        const fetchDashboardData = async () => {
            try {
                // Fetch Student Count for this Tenant
                const currentTenantId = tenantId || "tellus-teams";
                const studentsRef = collection(db, "students");
                const sq = query(studentsRef, where("tenantId", "==", currentTenantId));
                const studentSnap = await getCountFromServer(sq);
                const currentStudentCount = studentSnap.data().count;
                setStudentCount(currentStudentCount);

                // Fetch Cold Leads Count (Admission Logic)
                const leadsRef = collection(db, "leads");
                const lq = query(leadsRef, where("tenantId", "==", currentTenantId), where("status", "==", "new"));
                const leadsSnap = await getDocs(lq);

                const now = new Date().getTime();
                const coldLeads = leadsSnap.docs.filter((doc: any) => {
                    const data = doc.data();
                    if (!data.createdAt) return false;
                    const created = data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
                    return (now - created) > 24 * 60 * 60 * 1000;
                });
                setColdLeadsCount(coldLeads.length);

                // Fetch Meeting Count (Upcoming for this month)
                const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
                const endMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString();

                const res = await fetch(`/api/teams/calendar?startDateTime=${startMonth}&endDateTime=${endMonth}&tenantId=${currentTenantId}`);
                const calData = await res.json();
                if (calData.value) {
                    setMeetingCount(calData.value.length);
                }

                // Fetch Last Session Attendance
                try {
                    const meetingsRes = await fetch(`/api/teams/meetings?tenantId=${currentTenantId}`);
                    const meetingsData = await meetingsRes.json();
                    const meetings = meetingsData.value || [];

                    if (meetings.length > 0) {
                        meetings.sort((a: any, b: any) => new Date(b.start.dateTime).getTime() - new Date(a.start.dateTime).getTime());
                        const lastMeeting = meetings[0];
                        const params = new URLSearchParams({
                            meetingId: lastMeeting.id,
                            tenantId: currentTenantId,
                            userId: firebaseUser?.uid || "",
                            organizerEmail: lastMeeting.organizerEmail || "",
                            joinUrl: lastMeeting.joinUrl || ""
                        });

                        const attendanceRes = await fetch(`/api/teams/attendance?${params.toString()}`);
                        const attendanceData = await attendanceRes.json();
                        const attendeeCount = attendanceData.attendanceRecords ? attendanceData.attendanceRecords.length : 0;

                        if (currentStudentCount > 0) {
                            setAttendancePct(Math.round((attendeeCount / currentStudentCount) * 100));
                        }
                    }
                } catch (e) {
                    console.error("Error calculating attendance:", e);
                }
            } catch (error) {
                console.error("Dashboard error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [tenantId, role, router, firebaseUser]);

    const stats = [
        {
            label: "Total Students",
            value: studentCount !== null ? studentCount.toLocaleString() : "--",
            icon: Users,
            color: "blue",
            trend: "+12% this month"
        },
        {
            label: "Teams Sessions",
            value: meetingCount !== null ? meetingCount.toLocaleString() : "--",
            icon: Calendar,
            color: "purple",
            trend: "Next: Physics 101"
        },
        {
            label: "Avg. Attendance",
            value: attendancePct !== null ? `${attendancePct}%` : "--",
            icon: TrendingUp,
            color: "emerald",
            trend: "Last session"
        },
        {
            label: "Action Required",
            value: coldLeadsCount > 0 ? coldLeadsCount.toString() : "0",
            icon: Bell,
            color: "orange",
            trend: "New admission leads"
        }
    ];

    if (loading) {
        return (
            <div className="p-12 animate-pulse space-y-12">
                <div className="h-20 bg-slate-100 rounded-3xl w-1/3" />
                <div className="grid grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-[32px]" />)}
                </div>
                <div className="h-96 bg-slate-100 rounded-[56px]" />
            </div>
        );
    }

    return (
        <div className="p-12">
            <header className="mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">System Overview</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Welcome back, Principal Overview. Here is what's happening today.</p>
                </div>
                <div className="flex gap-4">
                    <button className="h-14 w-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">
                        <Search className="h-6 w-6" />
                    </button>
                    <button className="px-8 h-14 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        Weekly Report
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm group hover:border-primary/20 transition-all cursor-default">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center 
                                ${stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
                                    stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
                                        stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
                                            'bg-orange-50 text-orange-600'}`}>
                                <stat.icon className="h-7 w-7" />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</h3>
                        <p className="text-3xl font-black text-[#0D121F] font-outfit">{stat.value}</p>
                        <p className="text-xs font-bold text-slate-300 mt-2 flex items-center gap-1">
                            {stat.trend}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
                <section className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 h-80 w-80 bg-primary/5 rounded-full blur-[100px]" />
                    <TeamsMeetingList tenantId={tenantId} userId={firebaseUser?.uid} />
                </section>

                {/* Quick Search / Filter Area */}
                <section className="bg-primary p-12 rounded-[56px] shadow-2xl shadow-primary/20 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Search className="h-40 w-40 text-white" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-3xl font-black text-white font-outfit mb-2">System Search</h2>
                        <p className="text-primary-foreground/60 font-medium font-outfit mb-8 max-w-xs">
                            Find anything across the institution with our global indexed search.
                        </p>

                        <div className="relative mb-8">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-6 w-6 text-primary" />
                            <input
                                type="text"
                                placeholder="Find batches, students or reports..."
                                className="w-full bg-white rounded-3xl py-6 pl-16 pr-8 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-white/20 transition-all"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button className="flex-1 px-4 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all border border-white/10 backdrop-blur-sm">View Reports</button>
                            <button className="flex-1 px-4 py-4 bg-white text-primary rounded-2xl font-bold transition-all shadow-xl shadow-black/10">Export List</button>
                        </div>
                    </div>

                    <div className="mt-12 grid grid-cols-2 gap-6 relative z-10">
                        <div className="bg-white/5 p-6 rounded-[32px] border border-white/10">
                            <div className="flex items-center gap-3 text-white mb-2">
                                <Filter className="h-5 w-5" />
                                <span className="font-bold">Active Filters</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Attendance Low</span>
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Physics</span>
                            </div>
                        </div>
                        <div className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="block text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Index Status</span>
                                <span className="text-xl font-black text-white font-outfit tracking-tight">Optimized</span>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
