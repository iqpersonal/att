"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    Megaphone,
    Search,
    Loader2,
    Calendar,
    Send,
    AlertCircle,
    Bell
} from "lucide-react";

interface Announcement {
    id: string;
    message: string;
    sentAt: string;
    recipientCount: number;
    status: "sent" | "scheduled";
}

// Dummy data for now - will be replaced by Firestore
const PREVIOUS_ANNOUNCEMENTS: Announcement[] = [
    { id: "1", message: "System maintenance scheduled for Sat 10 PM", sentAt: "2025-12-18T10:00:00Z", recipientCount: 12, status: "sent" },
    { id: "2", message: "New Lead Management module is now available!", sentAt: "2025-12-15T09:30:00Z", recipientCount: 10, status: "sent" },
];

export default function AnnouncementsPage() {
    const { role } = useAuth();
    const [announcement, setAnnouncement] = useState("");
    const [sending, setSending] = useState(false);
    const [history, setHistory] = useState<Announcement[]>(PREVIOUS_ANNOUNCEMENTS);

    const handleBroadcast = async () => {
        if (!announcement) return;
        setSending(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            const newAnn: Announcement = {
                id: Date.now().toString(),
                message: announcement,
                sentAt: new Date().toISOString(),
                recipientCount: 15, // Total active schools
                status: "sent"
            };

            setHistory([newAnn, ...history]);
            setAnnouncement("");
            alert("Announcement broadcasted successfully!");
        } catch (error) {
            console.error("Broadcast failed:", error);
        } finally {
            setSending(false);
        }
    };

    if (role !== "super-admin") {
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
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-emerald-100">
                    <Megaphone className="h-3 w-3" />
                    Communications
                </div>
                <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Global Announcements</h1>
                <p className="text-slate-400 font-medium font-outfit mt-2">Broadcast messages to all school administrators.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Area */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 mb-8">
                        <h2 className="text-xl font-bold text-[#0D121F] font-outfit mb-6 flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900">
                                <Send className="h-5 w-5" />
                            </div>
                            Compose Broadcast
                        </h2>
                        <textarea
                            value={announcement}
                            onChange={(e) => setAnnouncement(e.target.value)}
                            placeholder="Type your important message here..."
                            className="w-full h-40 p-6 bg-slate-50 border-0 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 font-medium placeholder:text-slate-400"
                        />
                        <div className="flex justify-between items-center mt-6">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                                Target: All Active Admins
                            </p>
                            <button
                                onClick={handleBroadcast}
                                disabled={sending || !announcement}
                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
                            >
                                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                                    Send Broadcast <Send className="h-4 w-4" />
                                </>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-8 h-full">
                        <h2 className="text-xl font-bold text-[#0D121F] font-outfit mb-6 flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-900">
                                <Bell className="h-5 w-5" />
                            </div>
                            History
                        </h2>
                        <div className="space-y-4">
                            {history.map((ann) => (
                                <div key={ann.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(ann.sentAt).toLocaleDateString()}
                                        </span>
                                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black uppercase">
                                            {ann.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 leading-snug">
                                        {ann.message}
                                    </p>
                                    <div className="mt-3 text-[10px] font-bold text-slate-400">
                                        Reached {ann.recipientCount} schools
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
