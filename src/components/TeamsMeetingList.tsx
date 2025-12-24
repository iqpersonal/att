"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Loader2, Calendar, Video, Bell, Users, RefreshCw, ExternalLink } from "lucide-react";

interface Meeting {
    id: string;
    subject: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
    webLink?: string;
    onlineMeeting?: {
        joinUrl: string;
    };
    attendees?: any[];
}

export function TeamsMeetingList({ userId, tenantId }: { userId?: string; tenantId?: string | null }) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [error, setError] = useState("");
    const [attendanceLoading, setAttendanceLoading] = useState<string | null>(null);
    const [selectedAttendance, setSelectedAttendance] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"live" | "upcoming" | "past">("upcoming");

    const fetchMeetings = async () => {
        setLoading(true);
        setError("");
        try {
            let url = "/api/teams/meetings?";
            if (userId) url += `userId=${userId}&`;
            if (tenantId) url += `tenantId=${tenantId}&`;
            if (!tenantId && !userId) url += `tenantId=tellus-teams&`;

            const res = await fetch(url);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setMeetings(data.value || []);
            setFetched(true);
        } catch (err: any) {
            console.error("Error fetching meetings:", err);
            setError(err.message || "Failed to load meetings");
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch when component mounts or tenantId changes
    useEffect(() => {
        if (tenantId) {
            fetchMeetings();
        }
    }, [tenantId]);

    // Categorization Logic
    const now = new Date();
    const categorized = meetings.reduce((acc, meeting) => {
        const start = new Date(meeting.start.dateTime);
        const end = new Date(meeting.end.dateTime);

        if (now >= start && now <= end) {
            acc.live.push(meeting);
        } else if (now < start) {
            acc.upcoming.push(meeting);
        } else {
            acc.past.push(meeting);
        }
        return acc;
    }, { live: [] as Meeting[], upcoming: [] as Meeting[], past: [] as Meeting[] });

    // Sort past meetings by newest first
    categorized.past.sort((a, b) => new Date(b.start.dateTime).getTime() - new Date(a.start.dateTime).getTime());
    // Sort upcoming by soonest first
    categorized.upcoming.sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime());

    const activeMeetings = categorized[activeTab];

    const handleSendReminder = async (meetingId: string) => {
        alert(`Reminder functionality coming soon used for meeting: ${meetingId}`);
    };

    const handleCheckAttendance = async (meetingId: string) => {
        setAttendanceLoading(meetingId);
        try {
            const res = await fetch(`/api/teams/attendance?meetingId=${meetingId}&tenantId=${tenantId || "tellus-teams"}`);
            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            setSelectedAttendance(data);
        } catch (err: any) {
            console.error("Error fetching attendance:", err);
            alert(`Failed to sync attendance: ${err.message}`);
        } finally {
            setAttendanceLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">Teams Sessions</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Live & Scheduled Events</p>
                </div>
                <button
                    onClick={fetchMeetings}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 shadow-sm text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-50 transition-all hover:scale-105 active:scale-95"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <RefreshCw className="h-4 w-4" />}
                    {fetched ? "Refresh" : "Load Sessions"}
                </button>
            </div>

            {/* Premium Tabs */}
            <div className="flex p-1.5 bg-slate-100/50 rounded-2xl w-full sm:w-fit">
                {(["live", "upcoming", "past"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-xl text-xs font-extrabold transition-all uppercase tracking-wider ${activeTab === tab
                            ? "bg-white text-primary shadow-sm"
                            : "text-slate-400 hover:text-slate-600"
                            }`}
                    >
                        {tab}
                        {categorized[tab].length > 0 && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-md text-[10px] ${activeTab === tab ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                                }`}>
                                {categorized[tab].length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                    {error}
                </div>
            )}

            {!fetched && !loading && !error && (
                <div className="p-12 text-center bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200">
                    <Video className="h-10 w-10 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-bold text-sm">Synchronize with Microsoft Teams</p>
                    <button
                        onClick={fetchMeetings}
                        className="mt-4 px-6 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-primary/20 transition-all"
                    >
                        Start Sync
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {fetched && activeMeetings.length === 0 && (
                    <div className="py-20 text-center">
                        <Calendar className="h-12 w-12 text-slate-100 mx-auto mb-4" />
                        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">No {activeTab} sessions found</p>
                    </div>
                )}

                {activeMeetings.map((meeting) => (
                    <div key={meeting.id} className="p-5 bg-white border border-slate-100 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-primary/20 transition-all shadow-sm hover:shadow-xl hover:shadow-primary/5">
                        <div className="flex items-start gap-4">
                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 ${activeTab === 'live' ? 'bg-primary/10 text-primary animate-pulse' : 'bg-slate-50 text-slate-400 group-hover:text-primary group-hover:bg-primary/5'
                                }`}>
                                <Video className="h-7 w-7" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="font-extrabold text-slate-800 text-base line-clamp-1 font-outfit">{meeting.subject}</h4>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs font-bold text-slate-400">
                                    <span className="flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {format(new Date(meeting.start.dateTime), "EEE, MMM d")}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <RefreshCw className="h-3.5 w-3.5" />
                                        {format(new Date(meeting.start.dateTime), "h:mm a")} - {format(new Date(meeting.end.dateTime), "h:mm a")}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-auto bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100">
                            <a
                                href={meeting.onlineMeeting?.joinUrl || meeting.webLink}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                title="Join Meeting"
                            >
                                <ExternalLink className="h-5 w-5" />
                            </a>
                            <button
                                onClick={() => handleSendReminder(meeting.id)}
                                className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                                title="Send Reminder"
                            >
                                <Bell className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => handleCheckAttendance(meeting.id)}
                                disabled={attendanceLoading === meeting.id}
                                className={`flex items-center gap-2 px-4 h-10 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${attendanceLoading === meeting.id
                                    ? "bg-slate-100 text-slate-400"
                                    : "bg-[#6264A7] text-white hover:shadow-lg hover:shadow-[#6264A7]/20"
                                    }`}
                            >
                                {attendanceLoading === meeting.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Users className="h-4 w-4" />
                                )}
                                <span>Attendance</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Attendance Results Overlay */}
            {selectedAttendance && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">{selectedAttendance.subject}</h3>
                                <p className="text-slate-400 text-sm font-medium">Attendance Detail Report</p>
                            </div>
                            <button
                                onClick={() => setSelectedAttendance(null)}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-all font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {selectedAttendance.attendanceRecords?.length > 0 ? (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-3 text-xs font-bold text-slate-400 px-4 mb-2">
                                        <span>PARTICIPANT</span>
                                        <span>JOIN TIME</span>
                                        <span className="text-right">DURATION</span>
                                    </div>
                                    {selectedAttendance.attendanceRecords.map((record: any, idx: number) => (
                                        <div key={idx} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between group hover:bg-slate-100 transition-all">
                                            <div className="flex items-center gap-3 w-1/3">
                                                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center text-[#6264A7] font-bold text-xs shadow-sm group-hover:shadow-none transition-all">
                                                    {(record.identity?.displayName || "U")[0]}
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm line-clamp-1">
                                                    {record.identity?.displayName || "Unknown User"}
                                                </span>
                                            </div>
                                            <div className="text-slate-500 text-xs font-medium w-1/3 text-center">
                                                {format(new Date(record.joinDateTime), "h:mm a")}
                                            </div>
                                            <div className="w-1/3 text-right">
                                                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-[10px] font-bold">
                                                    {Math.round(record.totalAttendanceInSeconds / 60)} min
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <Users className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-slate-500 font-medium">No one has joined this meeting yet.</p>
                                    {selectedAttendance.message && (
                                        <p className="text-slate-400 text-xs mt-1">{selectedAttendance.message}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedAttendance(null)}
                                className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => alert("Syncing to internal attendance logs...")}
                                className="px-6 py-2.5 bg-[#6264A7] text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-[#6264A7]/20 transition-all"
                            >
                                Sync to DB
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
