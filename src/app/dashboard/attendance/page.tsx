"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { query, collection, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Calendar,
    Users,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Video,
    RefreshCw,
    Link as LinkIcon,
    Clock,
    Search,
    Filter,
    ArrowUpRight,
    Mail,
    MessageSquare
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { sendEmail, sendWhatsApp } from "@/lib/messaging";


interface Meeting {
    id: string;
    subject: string;
    start: { dateTime: string };
}

interface Participant {
    id: string;
    displayName: string;
    emailAddress: string;
    attendanceRecords: {
        totalAttendanceInSeconds: number;
    }[];
}

export default function AttendancePage() {
    const { data: session, status } = useSession();
    const { user: firebaseUser, tenantId } = useAuth();
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<string | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [fetchingParticipants, setFetchingParticipants] = useState(false);
    const [isLinked, setIsLinked] = useState(false);
    const [notifying, setNotifying] = useState<string | null>(null);

    useEffect(() => {
        if (session) {
            fetchMeetings();
            checkLinkStatus();
        }
    }, [session]);

    const checkLinkStatus = async () => {
        if (!firebaseUser) return;
        setIsLinked(!!(session as any)?.refreshToken);
    };

    const handleNotify = async (person: Participant, method: 'email' | 'whatsapp' | 'both') => {
        setNotifying(person.displayName);
        const meetingSubject = meetings.find(m => m.id === selectedMeeting)?.subject || "Today's Session";
        const duration = Math.round(person.attendanceRecords[0].totalAttendanceInSeconds / 60);

        const emailBody = `
            <h2>Attendance Report</h2>
            <p>Dear Parent,</p>
            <p>This is to inform you that <b>${person.displayName}</b> successfully attended <b>${meetingSubject}</b>.</p>
            <ul>
                <li><b>Session:</b> ${meetingSubject}</li>
                <li><b>Duration:</b> ${duration} minutes</li>
                <li><b>Status:</b> Present</li>
            </ul>
            <p>Regards,<br>StudioSchool Team</p>
        `;

        try {
            if (method === 'email' || method === 'both') {
                await sendEmail(person.emailAddress, `Attendance Report: ${meetingSubject}`, emailBody);
            }
            if (method === 'whatsapp' || method === 'both') {
                // Lookup student phone number from Firestore
                let phoneNumber = person.emailAddress;
                try {
                    const studentsRef = collection(db, "students");
                    const q = query(
                        studentsRef,
                        where("email", "==", person.emailAddress),
                        where("tenantId", "==", tenantId || "studio-school-beta")
                    );
                    const querySnapshot = await getDocs(q);
                    if (!querySnapshot.empty) {
                        const studentData = querySnapshot.docs[0].data();
                        phoneNumber = studentData.phoneNumber || phoneNumber;
                    }
                } catch (e) {
                    console.error("Firestore lookup error:", e);
                }

                // Meta requires pre-approved templates. Using 'attendance_report' as a default.
                await sendWhatsApp(
                    phoneNumber,
                    "attendance_report",
                    [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: person.displayName },
                                { type: "text", text: meetingSubject },
                                { type: "text", text: duration.toString() }
                            ]
                        }
                    ],
                    tenantId || "studio-school-beta"
                );
            }
            alert(`Notification sent to ${person.displayName} via ${method}`);
        } catch (error) {
            console.error("Notification error:", error);
            alert("Failed to send notification. Check console for details.");
        } finally {
            setNotifying(null);
        }
    };

    const fetchMeetings = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/teams/meetings");
            const data = await res.json();
            setMeetings(data.value || []);
        } catch (error) {
            console.error("Error fetching meetings:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async (meetingId: string) => {
        setSelectedMeeting(meetingId);
        setFetchingParticipants(true);
        try {
            const res = await fetch(`/api/teams/attendance?meetingId=${meetingId}`);
            const data = await res.json();
            setParticipants(data.attendanceRecords || []);
        } catch (error) {
            console.error("Error fetching participants:", error);
        } finally {
            setFetchingParticipants(false);
        }
    };

    if (status === "loading") {
        return (
            <div className="p-10 flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-8">
                <div className="bg-primary/5 p-8 rounded-[40px] mb-8 animate-float">
                    <Video className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-4xl font-extrabold text-[#0F172A] mb-4 font-outfit">Connect Teams</h2>
                <p className="text-slate-500 max-w-sm mb-12 text-lg font-medium leading-relaxed">
                    Sync your scheduled meetings and automatically track student attendance with Microsoft Teams.
                </p>
                <button
                    onClick={() => signIn("microsoft")}
                    className="bg-primary text-white px-10 py-5 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                >
                    <LinkIcon className="h-5 w-5" />
                    Sign in with Microsoft
                </button>
            </div>
        );
    }

    return (
        <div className="p-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Attendance Tracking</h1>
                    <p className="text-slate-400 font-medium font-outfit">Sync and manage Teams meeting attendance analytics.</p>
                </div>
                <div className="flex gap-4">
                    {!isLinked ? (
                        <Link
                            href="/dashboard/settings"
                            className="flex items-center gap-2 px-6 py-4 bg-amber-50 text-amber-600 rounded-2xl font-bold border border-amber-100 hover:bg-amber-100 transition-all"
                        >
                            <LinkIcon className="h-5 w-5" />
                            Link Account in Settings
                        </Link>
                    ) : (
                        <div className="flex items-center gap-2 px-6 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-bold border border-emerald-100">
                            <CheckCircle2 className="h-5 w-5" />
                            Teams Linked
                        </div>
                    )}
                    <button
                        onClick={fetchMeetings}
                        className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-primary hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => signOut()}
                        className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-slate-400 font-bold hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                    >
                        Disconnect
                    </button>
                </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-10">
                {/* Meetings List */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-[#0D121F] font-outfit flex items-center gap-3">
                            <Calendar className="h-6 w-6 text-primary" />
                            Recent Sessions
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="p-12 text-center bg-white rounded-[32px] border border-slate-50">
                                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                            </div>
                        ) : meetings.length === 0 ? (
                            <div className="p-12 text-center bg-white rounded-[32px] border border-slate-50 italic text-slate-400 font-medium">
                                No recent meetings found.
                            </div>
                        ) : (
                            meetings.map((meeting) => (
                                <button
                                    key={meeting.id}
                                    onClick={() => fetchParticipants(meeting.id)}
                                    className={`w-full text-left p-6 rounded-[32px] border transition-all duration-300 relative overflow-hidden group ${selectedMeeting === meeting.id
                                        ? "bg-primary text-white border-primary shadow-2xl shadow-primary/20 scale-[1.02]"
                                        : "bg-white text-slate-900 border-slate-50 hover:border-primary/20 hover:shadow-xl hover:shadow-slate-200/50"
                                        }`}
                                >
                                    <div className="relative z-10">
                                        <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-3 ${selectedMeeting === meeting.id ? "text-white/80" : "text-primary"}`}>
                                            {new Date(meeting.start.dateTime).toLocaleDateString("en-US", {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                        <div className="font-bold text-lg leading-snug pr-8">{meeting.subject || "Untitled Meeting"}</div>
                                        <ArrowUpRight className={`absolute top-0 right-0 h-5 w-5 transition-transform ${selectedMeeting === meeting.id ? "text-white/40" : "text-slate-200 group-hover:text-primary group-hover:translate-x-1 group-hover:-translate-y-1"}`} />
                                    </div>
                                    {selectedMeeting !== meeting.id && (
                                        <div className="absolute -bottom-4 -right-4 h-16 w-16 bg-slate-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Participants Detail */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-[#0D121F] font-outfit flex items-center gap-3">
                            <Users className="h-6 w-6 text-primary" />
                            Attendance Roster
                        </h2>
                        {selectedMeeting && (
                            <div className="flex gap-3">
                                <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm">
                                    <Filter className="h-5 w-5" />
                                </button>
                                <button className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm">
                                    <Search className="h-5 w-5" />
                                </button>
                                <button className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-primary/20 text-sm">
                                    Export PDF
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-[48px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                        {!selectedMeeting ? (
                            <div className="flex flex-col items-center justify-center min-h-[500px] p-20 text-center">
                                <div className="bg-slate-50 p-8 rounded-full mb-6">
                                    <Calendar className="h-12 w-12 text-slate-200" />
                                </div>
                                <p className="text-[#0F172A] font-bold text-xl mb-2">Select a Session</p>
                                <p className="text-slate-400 font-medium max-w-xs">Please choose a meeting from the list to view the detailed attendance report.</p>
                            </div>
                        ) : fetchingParticipants ? (
                            <div className="flex flex-col items-center justify-center min-h-[500px] p-20 text-center">
                                <div className="relative">
                                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="h-8 w-8 bg-white rounded-full" />
                                    </div>
                                </div>
                                <p className="text-slate-900 font-bold text-xl mt-8">Syncing Report</p>
                                <p className="text-slate-400 font-medium mt-2">Fetching final analytics from Microsoft Servers...</p>
                            </div>
                        ) : participants.length === 0 ? (
                            <div className="flex flex-col items-center justify-center min-h-[500px] p-20 text-center">
                                <div className="bg-orange-50 p-8 rounded-full mb-6">
                                    <AlertCircle className="h-12 w-12 text-orange-400" />
                                </div>
                                <p className="text-slate-900 font-bold text-xl mb-2">No Records Available</p>
                                <p className="text-slate-400 font-medium max-w-xs">Reports are typically finalized once the live session has completely ended.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-50">
                                            <th className="px-10 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Participant Name</th>
                                            <th className="px-10 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Email Address</th>
                                            <th className="px-10 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Duration</th>
                                            <th className="px-10 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Record</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {participants.map((person, i) => (
                                            <tr key={i} className="hover:bg-primary/[0.01] transition-colors group">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-11 w-11 rounded-2xl bg-primary/5 flex items-center justify-center text-primary font-bold text-sm tracking-tighter group-hover:scale-110 transition-transform">
                                                            {person.displayName.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <div className="font-bold text-[#0F172A]">{person.displayName}</div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="text-slate-500 font-medium text-sm flex items-center gap-2">
                                                        <LinkIcon className="h-3 w-3 opacity-20" />
                                                        {person.emailAddress}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                                                        <Clock className="h-4 w-4 text-slate-300" />
                                                        {Math.round(person.attendanceRecords[0].totalAttendanceInSeconds / 60)}m
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-3">
                                                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                                                            <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                                            Present
                                                        </span>
                                                        <div className="h-8 w-[1px] bg-slate-100 mx-2" />
                                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleNotify(person, 'email')}
                                                                disabled={!!notifying}
                                                                title="Send Email"
                                                                className="p-2 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                                                            >
                                                                {notifying === person.displayName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleNotify(person, 'whatsapp')}
                                                                disabled={!!notifying}
                                                                title="Send WhatsApp"
                                                                className="p-2 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                                            >
                                                                <MessageSquare className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
