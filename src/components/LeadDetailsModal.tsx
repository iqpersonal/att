"use client";

import { useState, useEffect, useCallback } from "react";
import {
    X,
    User,
    Mail,
    Phone,
    Calendar,
    Target,
    Share2,
    FileText,
    Clock,
    CheckCircle2,
    Star,
    PhoneCall,
    MessageSquare,
    Loader2,
    Plus,
    Send,
    Smartphone,
    History,
    Activity,
    StickyNote,
    Trash2,
    ArrowRight,
    GraduationCap,
    Hash,
    BookOpen,
    Users
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    query,
    where,
    orderBy,
    getDocs,
    serverTimestamp,
    doc,
    updateDoc
} from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

interface ActivityItem {
    id: string;
    type: "status_change" | "note" | "whatsapp" | "call" | "email" | "creation" | "conversion";
    content: string;
    createdAt: any;
    userId?: string;
}

interface Lead {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    status: "new" | "contacted" | "interested" | "closed" | "lost";
    source: string;
    campaignName?: string;
    adName?: string;
    formName?: string;
    notes: string;
    createdAt: any;
    tenantId?: string;
    converted?: boolean;
    studentId?: string;
}

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onUpdateStatus: (leadId: string, newStatus: Lead["status"]) => Promise<void>;
}

export function LeadDetailsModal({ isOpen, onClose, lead, onUpdateStatus }: LeadDetailsModalProps) {
    const { tenantId: authTenantId } = useAuth();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [actLoading, setActLoading] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [postingNote, setPostingNote] = useState(false);
    const [localNotes, setLocalNotes] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    // Conversion States
    const [isConverting, setIsConverting] = useState(false);
    const [conversionLoading, setConversionLoading] = useState(false);
    const [enrollData, setEnrollData] = useState({
        rollNumber: "",
        class: "",
        gender: "male"
    });

    const fetchActivities = useCallback(async () => {
        if (!lead?.id) return;
        setActLoading(true);
        try {
            const q = query(
                collection(db, "leads", lead.id, "activities"),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ActivityItem[];
            setActivities(list);
        } catch (error) {
            console.error("Error fetching activities:", error);
        } finally {
            setActLoading(false);
        }
    }, [lead?.id]);

    useEffect(() => {
        if (isOpen && lead) {
            fetchActivities();
            setLocalNotes(lead.notes || "");
            setIsConverting(false);
        }
    }, [isOpen, lead, fetchActivities]);

    const logActivity = async (type: ActivityItem["type"], content: string) => {
        if (!lead?.id) return;
        try {
            await addDoc(collection(db, "leads", lead.id, "activities"), {
                type,
                content,
                createdAt: serverTimestamp()
            });
            fetchActivities();
        } catch (error) {
            console.error("Error logging activity:", error);
        }
    };

    const handleAddNote = async () => {
        if (!newNote.trim() || !lead?.id) return;
        setPostingNote(true);
        try {
            await logActivity("note", newNote);
            setNewNote("");
        } finally {
            setPostingNote(false);
        }
    };

    const handleConvert = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead || !authTenantId) return;
        setConversionLoading(true);

        try {
            // 1. Create Student Document
            const studentRef = await addDoc(collection(db, "students"), {
                name: lead.fullName,
                email: lead.email,
                phoneNumber: lead.phone,
                rollNumber: enrollData.rollNumber,
                class: enrollData.class,
                gender: enrollData.gender,
                tenantId: authTenantId,
                status: "active",
                sourceLeadId: lead.id,
                createdAt: serverTimestamp()
            });

            // 2. Update Lead Document
            await updateDoc(doc(db, "leads", lead.id), {
                status: "closed",
                converted: true,
                studentId: studentRef.id,
                convertedAt: serverTimestamp()
            });

            // 3. Log Conversion Activity
            await logActivity("conversion", `Lead successfully converted to Student (ID: ${studentRef.id})`);

            // 4. Update local status through prop
            await onUpdateStatus(lead.id, "closed");

            setIsConverting(false);
            alert("Success! Student has been enrolled.");
        } catch (error) {
            console.error("Conversion error:", error);
            alert("Failed to convert lead. Please try again.");
        } finally {
            setConversionLoading(false);
        }
    };

    // Auto-save logic for main lead notes
    useEffect(() => {
        if (!lead?.id || localNotes === lead.notes) return;

        const timer = setTimeout(async () => {
            setSavingNotes(true);
            try {
                await updateDoc(doc(db, "leads", lead.id), {
                    notes: localNotes,
                    updatedAt: serverTimestamp()
                });
            } catch (err) {
                console.error("Auto-save failed:", err);
            } finally {
                setSavingNotes(false);
            }
        }, 2000);

        return () => clearTimeout(timer);
    }, [localNotes, lead?.id, lead?.notes]);

    if (!isOpen || !lead) return null;

    const statusConfig = {
        new: { icon: Target, color: "bg-indigo-50 text-indigo-600", label: "New Lead" },
        contacted: { icon: PhoneCall, color: "bg-blue-50 text-blue-600", label: "Contacted" },
        interested: { icon: Star, color: "bg-amber-50 text-amber-600", label: "Interested" },
        closed: { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600", label: "Closed/Won" },
        lost: { icon: X, color: "bg-red-50 text-red-600", label: "Lost/Closed" }
    };

    const config = statusConfig[lead.status] || statusConfig.new;

    const getActivityIcon = (type: ActivityItem["type"]) => {
        switch (type) {
            case "status_change": return <Activity className="h-4 w-4 text-amber-500" />;
            case "note": return <StickyNote className="h-4 w-4 text-blue-500" />;
            case "whatsapp": return <MessageSquare className="h-4 w-4 text-emerald-500" />;
            case "call": return <PhoneCall className="h-4 w-4 text-indigo-500" />;
            case "email": return <Mail className="h-4 w-4 text-violet-500" />;
            case "creation": return <Plus className="h-4 w-4 text-slate-400" />;
            case "conversion": return <GraduationCap className="h-4 w-4 text-primary" />;
            default: return <Clock className="h-4 w-4 text-slate-400" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose} />

            <div className="relative w-full max-w-6xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 h-[90vh] flex flex-col">

                {/* Header Profile Section */}
                <div className="bg-slate-50/80 px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-primary text-white rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shadow-primary/20">
                            {lead.fullName.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className="text-2xl font-black text-slate-900 font-outfit uppercase tracking-tight">{lead.fullName}</h3>
                                <div className={`inline-flex items-center gap-2 px-3 py-1 ${config.color} rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10`}>
                                    <config.icon className="h-3 w-3" />
                                    {config.label}
                                </div>
                                {lead.converted && (
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        <GraduationCap className="h-3 w-3" />
                                        Enrolled
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <span>{lead.phone}</span>
                                <span className="text-slate-200">|</span>
                                <span className="lowercase">{lead.email}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {!lead.converted && (lead.status === 'closed' || lead.status === 'interested') && (
                            <button
                                onClick={() => setIsConverting(!isConverting)}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isConverting ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white shadow-xl shadow-primary/20 hover:scale-105'
                                    }`}
                            >
                                {isConverting ? 'Cancel Conversion' : <>Enroll as Student <ArrowRight className="h-4 w-4" /></>}
                            </button>
                        )}
                        <select
                            value={lead.status}
                            onChange={(e) => {
                                const oldStatus = lead.status;
                                const newStatus = e.target.value as Lead["status"];
                                onUpdateStatus(lead.id, newStatus);
                                logActivity("status_change", `Changed status from ${oldStatus} to ${newStatus}`);
                            }}
                            className="bg-white px-6 py-3 border border-slate-100 rounded-2xl text-xs font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-primary/5 outline-none cursor-pointer"
                        >
                            <option value="new">Move to New</option>
                            <option value="contacted">Mark Contacted</option>
                            <option value="interested">Mark Interested</option>
                            <option value="closed">Closed / Won</option>
                            <option value="lost">Mark Lost</option>
                        </select>
                        <button onClick={onClose} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Content Areas */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left: Lead Details */}
                    <div className="w-1/2 md:w-1/3 border-r border-slate-50 p-10 overflow-y-auto bg-slate-50/30">
                        <div className="space-y-8">
                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Target className="h-3.5 w-3.5" /> Acquisition Details
                                </label>
                                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source Platform</p>
                                        <div className="flex items-center gap-2">
                                            <Share2 className="h-4 w-4 text-primary" />
                                            <span className="font-bold text-slate-900">{lead.source}</span>
                                        </div>
                                    </div>
                                    {lead.campaignName && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Campaign</p>
                                            <p className="font-bold text-slate-700 text-sm leading-tight">{lead.campaignName}</p>
                                        </div>
                                    )}
                                    {lead.formName && (
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Form Name</p>
                                            <p className="font-bold text-slate-700 text-sm leading-tight italic">"{lead.formName}"</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                        <StickyNote className="h-3.5 w-3.5" /> Internal Notes
                                    </label>
                                    {savingNotes && <span className="text-[9px] font-bold text-primary animate-pulse uppercase tracking-wider">Saving...</span>}
                                </div>
                                <textarea
                                    className="w-full h-48 bg-white border border-slate-100 rounded-[32px] p-6 text-sm font-medium text-slate-600 focus:ring-4 focus:ring-primary/5 shadow-sm resize-none outline-none leading-relaxed"
                                    placeholder="Add background info about this lead..."
                                    value={localNotes}
                                    onChange={(e) => setLocalNotes(e.target.value)}
                                />
                            </section>

                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                    <Calendar className="h-3.5 w-3.5" /> Ingestion Profile
                                </label>
                                <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Created At</p>
                                    <p className="font-bold text-slate-900 text-sm">
                                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString("en-US", {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        }) : "Just now"}
                                    </p>
                                </div>
                            </section>
                        </div>
                    </div>

                    {/* Right: Interaction Hub OR Conversion Form */}
                    <div className="flex-1 flex flex-col bg-white">
                        {isConverting ? (
                            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-8 duration-500">
                                <div className="p-10 border-b border-slate-50 bg-slate-50/50">
                                    <h4 className="text-xl font-black text-slate-900 font-outfit uppercase tracking-tight flex items-center gap-4">
                                        <GraduationCap className="h-7 w-7 text-primary" /> Enrollment Details
                                    </h4>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mt-2">Complete the profile to onboard as an active student</p>
                                </div>

                                <form onSubmit={handleConvert} className="flex-1 p-12 space-y-10">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Official Roll Number</label>
                                            <div className="relative group">
                                                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={enrollData.rollNumber}
                                                    onChange={(e) => setEnrollData({ ...enrollData, rollNumber: e.target.value })}
                                                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[28px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300 shadow-inner"
                                                    placeholder="e.g. 2024-ADM-001"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Assigned Class / Batch</label>
                                            <div className="relative group">
                                                <BookOpen className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                                <input
                                                    type="text"
                                                    required
                                                    value={enrollData.class}
                                                    onChange={(e) => setEnrollData({ ...enrollData, class: e.target.value })}
                                                    className="w-full pl-16 pr-6 py-5 bg-slate-50 border border-slate-100 rounded-[28px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300 shadow-inner"
                                                    placeholder="e.g. Class 10A"
                                                />
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 space-y-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Gender Specification</label>
                                            <div className="flex gap-6">
                                                {["male", "female", "other"].map((g) => (
                                                    <button
                                                        key={g}
                                                        type="button"
                                                        onClick={() => setEnrollData({ ...enrollData, gender: g })}
                                                        className={`flex-1 py-5 rounded-[28px] font-black border-2 transition-all capitalize text-xs tracking-[0.1em] ${enrollData.gender === g
                                                            ? "bg-slate-900 text-white border-slate-900 shadow-2xl active:scale-95"
                                                            : "bg-white text-slate-400 border-slate-50 hover:border-slate-100 hover:text-slate-600 shadow-sm"
                                                            }`}
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-10 flex gap-6">
                                        <button
                                            type="button"
                                            onClick={() => setIsConverting(false)}
                                            className="px-10 py-5 bg-slate-50 text-slate-500 rounded-[28px] font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={conversionLoading}
                                            className="flex-1 py-5 bg-primary text-white rounded-[28px] font-black text-xs uppercase tracking-widest hover:scale-[1.02] hover:shadow-2xl hover:shadow-primary/30 transition-all disabled:opacity-70 flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-primary/20"
                                        >
                                            {conversionLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                                <>Confirm Enrollment <ArrowRight className="h-4 w-4" /></>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <>
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                                        <History className="h-4 w-4 text-primary" /> Interaction Hub
                                    </h4>
                                    <div className="flex gap-2">
                                        <button onClick={() => logActivity("call", "Logged a phone call outcome")} className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Log Call">
                                            <PhoneCall className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => logActivity("whatsapp", "Sent manual WhatsApp message")} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Log WhatsApp">
                                            <MessageSquare className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => logActivity("email", "Sent follow-up email")} className="p-2.5 bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-600 hover:text-white transition-all shadow-sm" title="Log Email">
                                            <Mail className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Activities List */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                    {actLoading ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                                            <Loader2 className="h-10 w-10 animate-spin mb-4" />
                                            <p className="text-[10px] font-black uppercase tracking-widest">Loading history...</p>
                                        </div>
                                    ) : activities.length === 0 ? (
                                        <div className="text-center py-20 text-slate-300">
                                            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                                <Activity className="h-8 w-8" />
                                            </div>
                                            <p className="text-[10px] font-black uppercase tracking-widest">No activities logged yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8 relative">
                                            {/* Vertical Timeline Line */}
                                            <div className="absolute left-[17px] top-2 bottom-2 w-px bg-slate-100" />

                                            {activities.map((act) => (
                                                <div key={act.id} className="relative flex gap-6 group">
                                                    <div className={`h-9 w-9 bg-white border-2 ${act.type === 'conversion' ? 'border-primary/40' : 'border-slate-50'} rounded-xl flex items-center justify-center shadow-sm z-10 group-hover:scale-110 group-hover:border-primary/20 transition-all`}>
                                                        {getActivityIcon(act.type)}
                                                    </div>
                                                    <div className="flex-1 pt-1 pb-4 border-b border-slate-50/50">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <p className={`text-xs font-bold leading-snug ${act.type === 'conversion' ? 'text-primary' : 'text-slate-900'}`}>{act.content}</p>
                                                            <span className="text-[10px] font-black text-slate-300 uppercase shrink-0">
                                                                {act.createdAt?.toDate ? act.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                            {act.createdAt?.toDate ? act.createdAt.toDate().toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "Recently"}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Note Input */}
                                <div className="p-8 border-t border-slate-50 bg-slate-50/50">
                                    <div className="relative group">
                                        <Plus className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Type a quick interaction note..."
                                            className="w-full pl-14 pr-24 py-5 bg-white border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                            disabled={postingNote}
                                        />
                                        <button
                                            onClick={handleAddNote}
                                            disabled={postingNote || !newNote.trim()}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                                        >
                                            {postingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Post Note"}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="px-10 py-6 border-t border-slate-100 flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Lead ID: {lead.id.slice(-8)}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Close Portal
                    </button>
                </div>
            </div>
        </div>
    );
}
