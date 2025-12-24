"use client";

import { useEffect, useState } from "react";
import { MeetingCalendar } from "@/components/MeetingCalendar";
import { db } from "@/lib/firebase";
import { collection, query, where, getCountFromServer } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import {
    Users,
    Calendar as CalendarIcon,
    Settings,
    Share2,
    Video,
    Clock,
    ArrowLeft,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function BatchDetailPage() {
    const { tenantId } = useAuth();
    const params = useParams();
    const batchName = decodeURIComponent(params.id as string);
    const [stats, setStats] = useState({
        enrolled: 0,
        upcoming: 0,
        engagement: "92%",
        activeSessions: "..."
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBatchData = async () => {
            try {
                // Fetch Enrolled Students for this Batch
                const studentsRef = collection(db, "students");
                const q = query(
                    studentsRef,
                    where("class", "==", batchName),
                    where("tenantId", "==", tenantId || "studio-school-beta")
                );
                const studentSnapshot = await getCountFromServer(q);

                // Fetch Upcoming Meetings for this Batch
                const now = new Date();
                const start = now.toISOString();
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

                const res = await fetch(`/api/teams/calendar?startDateTime=${start}&endDateTime=${end}`);
                const data = await res.json();
                let meetingCount = 0;
                if (data.value) {
                    meetingCount = data.value.filter((e: any) =>
                        e.subject.toLowerCase().includes(batchName.toLowerCase())
                    ).length;
                }

                setStats({
                    enrolled: studentSnapshot.data().count,
                    upcoming: meetingCount,
                    engagement: "94%",
                    activeSessions: `${meetingCount} Scheduled`
                });
            } catch (error) {
                console.error("Error fetching batch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBatchData();
    }, [batchName]);

    const statCards = [
        { label: "Enrolled Students", value: stats.enrolled.toString(), icon: Users, color: "text-blue-600" },
        { label: "Active Sessions", value: stats.activeSessions, icon: Video, color: "text-emerald-600" },
        { label: "Avg. Engagement", value: stats.engagement, icon: Clock, color: "text-amber-600" },
        { label: "Upcoming Events", value: stats.upcoming.toString(), icon: CalendarIcon, color: "text-primary" },
    ];

    return (
        <div className="p-12">
            {/* Back Button */}
            <Link
                href="/dashboard/batches"
                className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest mb-12 hover:text-primary transition-colors group"
            >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Batches
            </Link>

            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/10">
                        Academic Batch Detail
                    </div>
                    <h1 className="text-6xl font-extrabold text-[#0D121F] font-outfit tracking-tighter">
                        {batchName} <span className="text-primary/10">Group</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg max-w-xl">
                        Managing schedule, attendance, and online session tracking for students in {batchName}.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="h-14 w-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary hover:shadow-lg transition-all">
                        <Share2 className="h-6 w-6" />
                    </button>
                    <button className="h-14 w-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary hover:shadow-lg transition-all">
                        <Settings className="h-6 w-6" />
                    </button>
                    <button className="h-14 px-8 bg-primary text-white rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                        <Video className="h-5 w-5" />
                        Schedule Meeting
                    </button>
                </div>
            </header>

            {/* Quick Content Toggle / Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-16">
                {statCards.map((idx, i) => (
                    <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-50 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                <idx.icon className="h-5 w-5 text-slate-400" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{idx.label}</span>
                        </div>
                        <div className={`text-3xl font-extrabold ${idx.color} font-outfit flex items-center gap-2`}>
                            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-100" /> : idx.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Batch Specific Calendar */}
            <section className="bg-white p-12 rounded-[56px] border border-slate-100 shadow-sm mb-16">
                <div className="flex items-center justify-between mb-12">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-extrabold text-[#0D121F] font-outfit">Batch Schedule</h2>
                        <p className="text-slate-400 font-medium font-outfit">Calendar view for all upcoming session associated with {batchName}</p>
                    </div>
                </div>
                <MeetingCalendar batchFilter={batchName} />
            </section>
        </div>
    );
}
