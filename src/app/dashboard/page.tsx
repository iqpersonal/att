"use client";

import { useState, useEffect } from "react";
import { MeetingCalendar } from "@/components/MeetingCalendar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getCountFromServer, query, where } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import { TeamsMeetingList } from "@/components/TeamsMeetingList";
import {
    Users,
    Calendar as CalendarIcon,
    CheckCircle2,
    ArrowUpRight,
    TrendingUp,
    MoreHorizontal,
    Plus,
    Search,
    Loader2
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";

export default function Dashboard() {
    const { data: session } = useSession();
    const router = useRouter();
    const { tenantId, role } = useAuth();
    const [studentCount, setStudentCount] = useState<number | null>(null);
    const [meetingCount, setMeetingCount] = useState<number | null>(null);
    const [attendancePct, setAttendancePct] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (role === "super-admin") {
            router.push("/dashboard/admin");
            return;
        }

        const fetchDashboardData = async () => {
            try {
                // Fetch Student Count for this Tenant
                const studentsRef = collection(db, "students");
                const q = query(studentsRef, where("tenantId", "==", tenantId || "tellus-teams"));
                const snapshot = await getCountFromServer(q);
                setStudentCount(snapshot.data().count);
                const currentStudentCount = snapshot.data().count;

                // Fetch Meeting Count (Upcoming for this month)
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

                const res = await fetch(`/api/teams/calendar?startDateTime=${start}&endDateTime=${end}&tenantId=${tenantId || "tellus-teams"}`);
                const data = await res.json();
                if (data.value) {
                    setMeetingCount(data.value.length);
                }

                // Fetch Last Session Attendance
                try {
                    const meetingsRes = await fetch(`/api/teams/meetings?tenantId=${tenantId || "tellus-teams"}`);
                    const meetingsData = await meetingsRes.json();
                    const meetings = meetingsData.value || [];

                    if (meetings.length > 0) {
                        // Get latest meeting
                        meetings.sort((a: any, b: any) => new Date(b.start.dateTime).getTime() - new Date(a.start.dateTime).getTime());
                        const lastMeeting = meetings[0];

                        // Fetch attendance for this meeting
                        const attendanceRes = await fetch(`/api/teams/attendance?meetingId=${lastMeeting.id}&tenantId=${tenantId || "tellus-teams"}`);
                        const attendanceData = await attendanceRes.json();

                        const attendeeCount = attendanceData.attendanceRecords ? attendanceData.attendanceRecords.length : 0;

                        if (currentStudentCount > 0) {
                            const percentage = Math.round((attendeeCount / currentStudentCount) * 100);
                            setAttendancePct(percentage);
                        }
                    }
                } catch (e) {
                    console.error("Error calculating attendance:", e);
                }

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [tenantId, role, router]);

    const stats = [
        {
            title: "Total Students",
            value: studentCount !== null ? studentCount.toLocaleString() : "...",
            icon: Users,
            color: "bg-primary/5 text-primary",
            trend: "+2%"
        },
        {
            title: "Active Meetings",
            value: meetingCount !== null ? meetingCount.toString() : "...",
            icon: CalendarIcon,
            color: "bg-emerald-50 text-emerald-600",
            trend: "Live"
        },
        {
            title: "Last Session Att.",
            value: attendancePct !== null ? `${attendancePct}%` : "--%",
            icon: CheckCircle2,
            color: "bg-amber-50 text-amber-600",
            trend: "Latest"
        },
    ];
    return (
        <div className="p-12">
            {/* Header Section */}
            <header className="flex items-center justify-between mb-16">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-1">
                        <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
                        Live Statistics
                    </div>
                    <h1 className="text-5xl font-extrabold text-[#0D121F] font-outfit tracking-tighter">
                        {session?.user?.name?.split(' ')[0] || "Principal"} <span className="text-primary/40 text-4xl block sm:inline">Overview</span>
                    </h1>
                </div>

                <div className="flex items-center gap-6 bg-white p-3 rounded-[32px] border border-slate-100 shadow-sm">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-10 w-10 rounded-full border-4 border-white bg-slate-100 overflow-hidden">
                                <img src={getAvatarUrl(`${i + 10}`, "notionists")} alt="avatar" />
                            </div>
                        ))}
                        <div className="h-10 w-10 rounded-full border-4 border-white bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                            {studentCount ? `+${studentCount}` : "..."}
                        </div>
                    </div>
                    <button className="h-12 w-12 bg-[#0D121F] text-white rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shadow-xl shadow-black/10">
                        <Plus className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Performance Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white p-8 rounded-[48px] border border-slate-50 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all group cursor-pointer relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                            <ArrowUpRight className="h-6 w-6 text-primary" />
                        </div>
                        <div className={`h-16 w-16 rounded-[24px] ${stat.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500`}>
                            <stat.icon className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.title}</p>
                            <div className="flex items-baseline gap-3">
                                <h3 className="text-4xl font-extrabold text-[#0D121F] font-outfit">{stat.value}</h3>
                                <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    {stat.trend}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-12">
                {/* Calendar Section */}
                <section className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm">
                    <MeetingCalendar />
                </section>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Teams Meeting Sessions */}
                <section className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-20 -top-20 h-80 w-80 bg-primary/5 rounded-full blur-[100px]" />
                    <TeamsMeetingList tenantId={tenantId} />
                </section>

                {/* Quick Search / Filter Area */}
                <section className="bg-primary p-12 rounded-[56px] text-white relative overflow-hidden group">
                    <div className="absolute -left-20 -bottom-20 h-80 w-80 bg-white/10 rounded-full blur-[100px] group-hover:bg-white/20 transition-all duration-700" />
                    <h3 className="text-2xl font-extrabold font-outfit mb-8">System Search</h3>
                    <div className="relative mb-8">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                        <input
                            type="text"
                            placeholder="Find batches, students or reports..."
                            className="w-full bg-white/10 border border-white/10 rounded-3xl py-6 pl-16 pr-6 text-white placeholder:text-white/30 font-bold focus:outline-none focus:ring-4 ring-white/10 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {['View Reports', 'Export List'].map((text, i) => (
                            <button key={i} className="bg-white text-primary py-4 rounded-2xl font-extrabold text-sm hover:bg-slate-50 transition-colors shadow-xl shadow-black/10">
                                {text}
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
