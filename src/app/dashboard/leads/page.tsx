"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { AddLeadModal } from "@/components/AddLeadModal";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, addDoc, serverTimestamp, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
    Target,
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Phone,
    Mail,
    Calendar,
    Loader2,
    AlertCircle,
    UserPlus,
    CheckCircle2,
    Clock,
    XCircle,
    Star,
    Crown,
    Share2,
    MessageSquare,
    TrendingUp,
    Hash,
    MoreVertical,
    Trash2,
    Check,
    FileText
} from "lucide-react";

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
}

export default function LeadsPage() {
    const { tenantId, features, role } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState("all");
    const [selectedForm, setSelectedForm] = useState("all");
    const [showAddModal, setShowAddModal] = useState(false);
    const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
    const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
    const isModuleEnabled = features.includes("leads") || role === "super-admin";

    const fetchLeads = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const q = query(
                collection(db, "leads"),
                where("tenantId", "==", tenantId),
                orderBy("createdAt", "desc")
            );
            const snapshot = await getDocs(q);
            const leadList = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            })) as Lead[];
            setLeads(leadList);
        } catch (error) {
            console.error("Error fetching leads:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!tenantId) return;
        setSyncing(true);
        try {
            const response = await fetch("/api/leads/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenantId })
            });
            const data = await response.json();
            if (data.success) {
                alert(data.message);
                fetchLeads(); // Refresh list
            } else {
                alert(`Sync failed: ${data.error}${data.details ? `\n\nDetails: ${data.details}` : ""}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (!tenantId || !isModuleEnabled) {
            setLoading(false);
            return;
        }
        fetchLeads();
    }, [tenantId, isModuleEnabled]);

    const handleUpdateStatus = async (leadId: string, newStatus: Lead["status"]) => {
        setStatusUpdating(leadId);
        try {
            await updateDoc(doc(db, "leads", leadId), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });
            setLeads(leads.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
            setActionMenuId(null);
        } catch (error) {
            console.error("Error updating status:", error);
        } finally {
            setStatusUpdating(null);
        }
    };

    const handleDeleteLead = async (leadId: string) => {
        if (!confirm("Are you sure you want to delete this lead?")) return;
        try {
            await deleteDoc(doc(db, "leads", leadId));
            setLeads(leads.filter(l => l.id !== leadId));
        } catch (error) {
            console.error("Error deleting lead:", error);
        }
    };

    // Calculate dynamic analytics
    const totalLeads = leads.length;
    const closedLeads = leads.filter(l => l.status === "closed").length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const pendingFollowups = leads.filter(l => ["new", "interested"].includes(l.status)).length;

    // Get unique campaigns and forms for filter
    const campaigns = Array.from(new Set(leads.map(l => l.campaignName).filter(Boolean)));
    const forms = Array.from(new Set(leads.map(l => l.formName).filter(Boolean)));

    // Filter leads
    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);

        const matchesCampaign = selectedCampaign === "all" || lead.campaignName === selectedCampaign;
        const matchesForm = selectedForm === "all" || lead.formName === selectedForm;

        return matchesSearch && matchesCampaign && matchesForm;
    });

    if (!isModuleEnabled && !loading) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-8 py-12">
                <div className="h-32 w-32 bg-primary/10 rounded-[40px] flex items-center justify-center text-primary animate-bounce">
                    <Crown className="h-16 w-16" />
                </div>
                <div className="max-w-xl space-y-4">
                    <h1 className="text-4xl font-black text-[#0D121F] font-outfit tracking-tight">Premium Module: Lead Management</h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Organize your admissions pipeline, track potential students, and boost your enrollment with our advanced Lead Management system.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                    {[
                        { icon: Target, title: "Track Leads", desc: "Never lose a potential student again." },
                        { icon: Clock, title: "Follow-ups", desc: "Set reminders and track status." },
                        { icon: Star, title: "Conversion", desc: "Convert inquiries into enrollments." }
                    ].map((feat, i) => (
                        <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-3">
                            <feat.icon className="h-8 w-8 text-primary mx-auto" />
                            <h3 className="font-bold text-slate-900">{feat.title}</h3>
                            <p className="text-xs text-slate-400 font-medium">{feat.desc}</p>
                        </div>
                    ))}
                </div>
                <button className="px-12 py-5 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-lg">
                    Unlock Now (Subscription Required)
                </button>
                <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Contact support to enable this module</p>
            </div>
        );
    }

    return (
        <div className="p-12">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/10">
                        <Target className="h-3 w-3" />
                        Admissions Pipeline
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Lead Management</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Track and convert potential students for your school.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className={`px-6 py-4 rounded-[28px] font-bold transition-all flex items-center gap-2 border shadow-sm ${syncing
                            ? "bg-slate-100 text-slate-400 border-slate-200"
                            : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                            }`}
                    >
                        {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                        Sync Now
                    </button>
                    <Link href="/dashboard/leads/integrations">
                        <button className="px-6 py-4 bg-white text-indigo-600 border border-indigo-100 rounded-[28px] font-bold hover:bg-indigo-50 transition-all flex items-center gap-2">
                            <Share2 className="h-5 w-5" />
                            Social Connect
                        </button>
                    </Link>
                    <div className="relative w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[28px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium text-slate-900 shadow-sm"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-8 py-4 bg-primary text-white rounded-[28px] font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <Plus className="h-5 w-5" />
                        New Lead
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                    { label: "Pipeline Total", count: totalLeads, icon: Target, color: "bg-indigo-50 text-indigo-500", trend: "Active leads" },
                    { label: "Conversion", count: `${conversionRate}%`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-500", trend: "Enrollment rate" },
                    { label: "Action Needed", count: pendingFollowups, icon: Clock, color: "bg-amber-50 text-amber-500", trend: "Pending follow-up" },
                    { label: "Meta Connected", count: Array.from(new Set(leads.map(l => l.campaignName))).filter(Boolean).length, icon: Share2, color: "bg-blue-50 text-blue-500", trend: "Active campaigns" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-primary/20 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 ${stat.color} rounded-2xl flex items-center justify-center`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{stat.trend}</span>
                        </div>
                        <div>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{stat.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 font-outfit mt-1">{stat.count}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                        <Filter className="h-4 w-4 text-slate-400 mr-3" />
                        <select
                            value={selectedCampaign}
                            onChange={(e) => setSelectedCampaign(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none pr-8"
                        >
                            <option value="all">All Campaigns</option>
                            {campaigns.map((camp, idx) => (
                                <option key={idx} value={camp as string}>{camp}</option>
                            ))}
                        </select>
                    </div>

                    {forms.length > 0 && (
                        <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                            <Hash className="h-4 w-4 text-slate-400 mr-3" />
                            <select
                                value={selectedForm}
                                onChange={(e) => setSelectedForm(e.target.value)}
                                className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none pr-8"
                            >
                                <option value="all">All Forms</option>
                                {forms.map((form, idx) => (
                                    <option key={idx} value={form as string}>{form}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Hash className="h-3 w-3" /> Showing {filteredLeads.length} leads
                    </span>
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-visible mb-20 relative">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Lead</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Campaign Source</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pipeline Status</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Ingested</th>
                            <th className="px-8 py-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="py-32 text-center">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="relative">
                                            <div className="h-16 w-16 border-4 border-primary/5 rounded-full" />
                                            <div className="absolute inset-0 h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                        </div>
                                        <p className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Filtering Database...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-32 text-center">
                                    <div className="max-w-xs mx-auto space-y-4">
                                        <div className="h-20 w-20 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mx-auto">
                                            <Search className="h-10 w-10" />
                                        </div>
                                        <p className="font-black text-slate-900 font-outfit text-xl">No Matching Leads</p>
                                        <p className="text-slate-400 text-sm font-medium">Try adjusting your filters or search terms to find what you're looking for.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredLeads.map((lead) => (
                            <tr
                                key={lead.id}
                                className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                                onClick={() => setDetailsLead(lead)}
                            >
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-primary font-bold shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                                            {lead.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{lead.fullName}</p>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                                    <Phone className="h-3 w-3" /> {lead.phone}
                                                </span>
                                                <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                                <span className="text-[10px] font-bold text-slate-400 lowercase">{lead.email}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="space-y-1">
                                        <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-tighter">
                                            <Share2 className="h-2.5 w-2.5" /> {lead.source}
                                        </div>
                                        <p className="text-xs font-bold text-slate-500 truncate max-w-[150px]">{lead.campaignName || "Manual Entry"}</p>
                                        {lead.formName && (
                                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-tight mt-0.5 flex items-center gap-1">
                                                <FileText className="h-2.5 w-2.5" /> {lead.formName}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2 w-2 rounded-full animate-pulse ${lead.status === "new" ? "bg-indigo-500" :
                                            lead.status === "contacted" ? "bg-blue-500" :
                                                lead.status === "interested" ? "bg-amber-500" :
                                                    lead.status === "closed" ? "bg-emerald-500" :
                                                        "bg-red-500"
                                            }`} />
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lead.status === "new" ? "bg-indigo-50 text-indigo-600" :
                                            lead.status === "contacted" ? "bg-blue-50 text-blue-600" :
                                                lead.status === "interested" ? "bg-amber-50 text-amber-600" :
                                                    lead.status === "closed" ? "bg-emerald-50 text-emerald-600" :
                                                        "bg-red-50 text-red-600"
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[11px] uppercase tracking-tight">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {lead.createdAt?.toDate().toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) || "Just now"}
                                    </div>
                                </td>
                                <td className="px-8 py-7 text-right relative">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setWhatsappLead(lead);
                                            }}
                                            className="p-2.5 text-emerald-500 border border-emerald-100 bg-emerald-50 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                            title="Send WhatsApp"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </button>

                                        <div className="relative group">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActionMenuId(actionMenuId === lead.id ? null : lead.id);
                                                }}
                                                className={`p-2.5 rounded-xl transition-all border ${actionMenuId === lead.id ? 'bg-slate-900 border-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50 border-slate-100'}`}
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </button>

                                            {actionMenuId === lead.id && (
                                                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[24px] shadow-2xl border border-slate-100 py-3 z-[100] animate-in slide-in-from-top-2 duration-200">
                                                    <p className="px-5 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">Update Pipeline</p>
                                                    {[
                                                        { id: "new", label: "Mark as New", icon: Target },
                                                        { id: "contacted", label: "Contacted", icon: Phone },
                                                        { id: "interested", label: "Interested", icon: Star },
                                                        { id: "closed", label: "Closed / Won", icon: CheckCircle2 },
                                                        { id: "lost", label: "Lost / Closed", icon: XCircle }
                                                    ].map((st) => (
                                                        <button
                                                            key={st.id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleUpdateStatus(lead.id, st.id as any);
                                                            }}
                                                            className={`w-full px-5 py-2.5 flex items-center justify-between text-xs font-bold transition-colors ${lead.status === st.id ? 'text-primary' : 'text-slate-600 hover:bg-slate-50'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <st.icon className="h-3.5 w-3.5" />
                                                                {st.label}
                                                            </div>
                                                            {lead.status === st.id && <Check className="h-3 w-3" />}
                                                        </button>
                                                    ))}
                                                    <div className="my-2 border-t border-slate-50" />
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setDetailsLead(lead);
                                                            setActionMenuId(null);
                                                        }}
                                                        className="w-full px-5 py-2.5 flex items-center gap-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                                    >
                                                        <FileText className="h-3.5 w-3.5" />
                                                        View Details
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {whatsappLead && (
                <WhatsAppModal
                    isOpen={!!whatsappLead}
                    onClose={() => setWhatsappLead(null)}
                    lead={{
                        id: whatsappLead.id,
                        fullName: whatsappLead.fullName,
                        phone: whatsappLead.phone
                    }}
                    tenantId={tenantId || ""}
                />
            )}

            {showAddModal && (
                <AddLeadModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchLeads}
                    tenantId={tenantId || ""}
                />
            )}

            {detailsLead && (
                <LeadDetailsModal
                    isOpen={!!detailsLead}
                    onClose={() => setDetailsLead(null)}
                    lead={detailsLead}
                    onUpdateStatus={handleUpdateStatus}
                />
            )}
        </div>
    );
}
