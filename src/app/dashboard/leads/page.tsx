"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { WhatsAppModal } from "@/components/WhatsAppModal";
import { AddLeadModal } from "@/components/AddLeadModal";
import { LeadDetailsModal } from "@/components/LeadDetailsModal";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, serverTimestamp, orderBy, doc, updateDoc, deleteDoc, addDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
    Target,
    Plus,
    Search,
    Filter,
    Phone,
    Calendar,
    Loader2,
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
    Check,
    FileText,
    AlertTriangle,
    Zap,
    Archive,
    BarChart3
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
    converted?: boolean;
    studentId?: string;
}

export default function LeadsPage() {
    const { tenantId, features, role } = useAuth();
    const isModuleEnabled = features.includes("leads") || role === "super-admin";

    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCampaign, setSelectedCampaign] = useState("all");
    const [selectedForm, setSelectedForm] = useState("all");
    const [showNeedsAttention, setShowNeedsAttention] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

    const [showAddModal, setShowAddModal] = useState(false);
    const [whatsappLead, setWhatsappLead] = useState<Lead | null>(null);
    const [detailsLead, setDetailsLead] = useState<Lead | null>(null);
    const [actionMenuId, setActionMenuId] = useState<string | null>(null);
    const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
    const [sendingBulk, setSendingBulk] = useState(false);
    const [cleaning, setCleaning] = useState(false);

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

    const handleSmartCleanup = async () => {
        const threshold = 7 * 24 * 60 * 60 * 1000; // 7 days
        const now = new Date().getTime();

        const staleLeads = leads.filter(l => {
            if (l.status !== "new" || !l.createdAt) return false;
            const created = l.createdAt.toDate ? l.createdAt.toDate().getTime() : new Date(l.createdAt).getTime();
            return (now - created) > threshold;
        });

        if (staleLeads.length === 0) {
            alert("No leads found in 'New' status older than 7 days. Your pipeline is healthy!");
            return;
        }

        if (!confirm(`Found ${staleLeads.length} leads older than 7 days in 'New' status. Would you like to archive them as 'Lost'?`)) return;

        setCleaning(true);
        try {
            for (const lead of staleLeads) {
                await updateDoc(doc(db, "leads", lead.id), {
                    status: "lost",
                    updatedAt: serverTimestamp(),
                    notes: (lead.notes || "") + "\n[System]: Auto-archived due to inactivity (>7 days in New)."
                });

                await addDoc(collection(db, "leads", lead.id, "activities"), {
                    type: "status_change",
                    content: "Auto-archived as 'Lost' due to 7+ days of inactivity in 'New' status.",
                    createdAt: serverTimestamp(),
                    userId: "system_automation"
                });
            }
            alert(`Succesfully archived ${staleLeads.length} leads.`);
            fetchLeads();
        } catch (err: any) {
            alert(`Cleanup failed: ${err.message}`);
        } finally {
            setCleaning(false);
        }
    };

    const handleBulkFollowUp = async () => {
        if (selectedLeads.length === 0) return;
        if (!confirm(`Send automated follow-up to ${selectedLeads.length} leads?`)) return;

        setSendingBulk(true);
        try {
            const res = await fetch("/api/leads/bulk-followup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    leadIds: selectedLeads,
                    tenantId,
                    templateName: "acknowledgement_01" // Using a safe default
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(data.message);
                setSelectedLeads([]);
                fetchLeads();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error: any) {
            alert(`Failed to send bulk follow-up: ${error.message}`);
        } finally {
            setSendingBulk(false);
        }
    };

    const handleSync = async () => {
        if (!tenantId) return;
        setSyncing(true);
        try {
            const res = await fetch(`/api/leads/sync`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenantId })
            });

            const data = await res.json();
            if (data.success) {
                alert(data.message || "Sync completed successfully.");
                fetchLeads();
            } else {
                alert(`Sync failed: ${data.error}`);
            }
        } catch (error: any) {
            console.error("Sync error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setSyncing(false);
        }
    };

    const handleUpdateStatus = async (leadId: string, newStatus: Lead["status"]) => {
        const lead = leads.find(l => l.id === leadId);
        const oldStatus = lead?.status;

        setStatusUpdating(leadId);
        try {
            await updateDoc(doc(db, "leads", leadId), {
                status: newStatus,
                updatedAt: serverTimestamp()
            });

            // Log activity
            await addDoc(collection(db, "leads", leadId, "activities"), {
                type: "status_change",
                content: `Status updated from ${oldStatus} to ${newStatus} via dashboard`,
                createdAt: serverTimestamp()
            });

            fetchLeads();
            setActionMenuId(null);
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status");
        } finally {
            setStatusUpdating(null);
        }
    };

    const isLeadStale = (lead: Lead) => {
        if (!lead.createdAt || lead.status !== "new") return false;
        // Handle both Firestore Timestamp and JS Date
        const createdDate = lead.createdAt.toDate ? lead.createdAt.toDate().getTime() : new Date(lead.createdAt).getTime();
        const now = new Date().getTime();
        return (now - createdDate) > 24 * 60 * 60 * 1000;
    };

    useEffect(() => {
        if (!tenantId || !isModuleEnabled) {
            setLoading(false);
            return;
        }
        fetchLeads();
    }, [tenantId, isModuleEnabled]);

    // Analytics
    const totalLeads = leads.length;
    const closedLeads = leads.filter(l => l.status === "closed").length;
    const conversionRate = totalLeads > 0 ? ((closedLeads / totalLeads) * 100).toFixed(1) : "0.0";
    const staleCount = leads.filter(isLeadStale).length;

    // Filters logic
    const campaigns = Array.from(new Set(leads.map(l => l.campaignName).filter(Boolean)));
    const forms = Array.from(new Set(leads.map(l => l.formName).filter(Boolean)));

    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);

        const matchesCampaign = selectedCampaign === "all" || lead.campaignName === selectedCampaign;
        const matchesForm = selectedForm === "all" || lead.formName === selectedForm;
        const matchesStale = !showNeedsAttention || isLeadStale(lead);

        return matchesSearch && matchesCampaign && matchesForm && matchesStale;
    });

    // Selection logic
    const toggleSelection = (id: string) => {
        setSelectedLeads(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const toggleAll = () => {
        if (selectedLeads.length === filteredLeads.length && filteredLeads.length > 0) setSelectedLeads([]);
        else setSelectedLeads(filteredLeads.map(l => l.id));
    };

    if (!isModuleEnabled && !loading) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-8 py-12">
                <div className="h-32 w-32 bg-primary/10 rounded-[40px] flex items-center justify-center text-primary animate-bounce">
                    <Crown className="h-16 w-16" />
                </div>
                <div className="max-w-xl space-y-4">
                    <h1 className="text-4xl font-black text-[#0D121F] font-outfit tracking-tight">Premium Module: Lead Management</h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Unlock advanced pipeline tracking, social media lead sync, and conversion analytics.
                    </p>
                </div>
                <button className="px-12 py-5 bg-primary text-white rounded-[24px] font-black shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-lg">
                    Contact Support to Unlock
                </button>
            </div>
        );
    }

    return (
        <div className="p-12 relative min-h-screen">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-primary/10">
                        <Target className="h-3 w-3" /> Admissions Pipeline
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Lead Management</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Track and convert potential students for your school.</p>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleSmartCleanup}
                        disabled={cleaning}
                        className="px-6 py-4 bg-white text-slate-400 border border-slate-100 rounded-[28px] font-bold flex items-center gap-2 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer disabled:opacity-50"
                        title="Archive leads older than 7 days"
                    >
                        {cleaning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Archive className="h-5 w-5" />}
                        Smart Cleanup
                    </button>
                    <button onClick={handleSync} disabled={syncing} className="px-6 py-4 bg-white text-emerald-600 border border-emerald-100 rounded-[28px] font-bold flex items-center gap-2 hover:bg-emerald-50 transition-all cursor-pointer">
                        {syncing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clock className="h-5 w-5" />}
                        Sync Now
                    </button>
                    <Link href="/dashboard/leads/integrations">
                        <button className="px-6 py-4 bg-white text-indigo-600 border border-indigo-100 rounded-[28px] font-bold flex items-center gap-2 hover:bg-indigo-50 transition-all cursor-pointer">
                            <Share2 className="h-5 w-5" /> Social Connect
                        </button>
                    </Link>
                    <Link href="/dashboard/leads/analytics">
                        <button className="px-6 py-4 bg-white text-primary border border-primary/10 rounded-[28px] font-bold flex items-center gap-2 hover:bg-primary/5 transition-all cursor-pointer shadow-sm">
                            <BarChart3 className="h-5 w-5" /> Analytics
                        </button>
                    </Link>
                    <div className="relative w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search leads..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[28px] focus:outline-none focus:ring-4 focus:ring-primary/5 shadow-sm font-medium"
                        />
                    </div>
                    <button onClick={() => setShowAddModal(true)} className="px-8 py-4 bg-primary text-white rounded-[28px] font-bold shadow-xl shadow-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all cursor-pointer">
                        <Plus className="h-5 w-5" /> New Lead
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                {[
                    { label: "Pipeline Total", count: totalLeads, icon: Target, color: "bg-indigo-50 text-indigo-500", trend: "Active list" },
                    { label: "Conversion", count: `${conversionRate}%`, icon: TrendingUp, color: "bg-emerald-50 text-emerald-500", trend: "Closed/Won" },
                    { label: "Needs Attention", count: staleCount, icon: AlertTriangle, color: "bg-red-50 text-red-500", trend: "Cold leads (+24h)" },
                    { label: "Meta Linked", count: campaigns.length, icon: Share2, color: "bg-blue-50 text-blue-500", trend: "Active ads" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:border-primary transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`h-12 w-12 ${stat.color} rounded-2xl flex items-center justify-center`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{stat.trend}</span>
                        </div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 font-outfit mt-1">{stat.count}</h3>
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowNeedsAttention(!showNeedsAttention)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl border transition-all font-bold text-sm cursor-pointer ${showNeedsAttention ? "bg-red-50 text-red-600 border-red-200 shadow-sm" : "bg-white text-slate-500 border-slate-100 hover:bg-slate-50"}`}
                    >
                        <AlertTriangle className={`h-4 w-4 ${showNeedsAttention ? "text-red-500" : "text-slate-400"}`} />
                        Needs Attention
                        {staleCount > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{staleCount}</span>}
                    </button>

                    <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                        <Filter className="h-4 w-4 text-slate-400 mr-3" />
                        <select value={selectedCampaign} onChange={(e) => setSelectedCampaign(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none pr-8 cursor-pointer">
                            <option value="all">All Campaigns</option>
                            {campaigns.map((c, i) => <option key={i} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {forms.length > 0 && (
                        <div className="flex items-center bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                            <Hash className="h-4 w-4 text-slate-400 mr-3" />
                            <select value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 outline-none pr-8 cursor-pointer">
                                <option value="all">All Forms</option>
                                {forms.map((f, i) => <option key={i} value={f}>{f}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Hash className="h-3 w-3" /> Showing {filteredLeads.length} leads
                </span>
            </div>

            {/* Bulk Action Bar */}
            {selectedLeads.length > 0 && (
                <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-xs text-white">
                            {selectedLeads.length}
                        </div>
                        <p className="text-sm font-bold font-outfit">Leads Selected</p>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBulkFollowUp}
                            disabled={sendingBulk}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {sendingBulk ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                            Send Bulk Follow-up
                        </button>
                        <button onClick={() => setSelectedLeads([])} className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-all cursor-pointer">
                            <XCircle className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-20 relative">
                <table className="w-full">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-8 py-6 text-left w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedLeads.length === filteredLeads.length && filteredLeads.length > 0}
                                    onChange={toggleAll}
                                    className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </th>
                            <th className="px-4 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Student Lead</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Source</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="px-8 py-6 text-left text-[11px] font-bold text-slate-400 uppercase tracking-widest">Created</th>
                            <th className="px-8 py-6 text-right text-[11px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></td></tr>
                        ) : filteredLeads.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-32 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                                    No leads found matching your filters
                                </td>
                            </tr>
                        ) : filteredLeads.map((lead) => (
                            <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all group cursor-pointer ${selectedLeads.includes(lead.id) ? "bg-primary/5" : ""}`} onClick={() => setDetailsLead(lead)}>
                                <td className="px-8 py-7" onClick={(e) => e.stopPropagation()}>
                                    <input
                                        type="checkbox"
                                        checked={selectedLeads.includes(lead.id)}
                                        onChange={() => toggleSelection(lead.id)}
                                        className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                    />
                                </td>
                                <td className="px-4 py-7">
                                    <div className="flex items-center gap-4">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black transition-all ${isLeadStale(lead) ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"}`}>
                                            {lead.fullName.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{lead.fullName}</p>
                                                {isLeadStale(lead) && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-black uppercase">
                                                        <Clock className="h-2.5 w-2.5" /> Cold
                                                    </span>
                                                )}
                                                {lead.converted && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-primary text-white rounded text-[9px] font-black uppercase shadow-sm">
                                                        <CheckCircle2 className="h-2.5 w-2.5" /> Enrolled
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                                                <Phone className="h-3.5 w-3.5" /> {lead.phone}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="inline-flex items-center gap-2 px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase">
                                        <Share2 className="h-2.5 w-2.5" /> {lead.source}
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 truncate max-w-[120px]">{lead.campaignName || "Manual"}</p>
                                </td>
                                <td className="px-8 py-7">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lead.status === "new" ? "bg-indigo-50 text-indigo-600" :
                                        lead.status === "closed" ? "bg-emerald-50 text-emerald-600" :
                                            "bg-amber-50 text-amber-600"
                                        }`}>
                                        {lead.status}
                                    </span>
                                </td>
                                <td className="px-8 py-7">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {lead.createdAt?.toDate ? lead.createdAt.toDate().toLocaleDateString("en-GB", { day: '2-digit', month: 'short' }) : "Recently"}
                                    </div>
                                </td>
                                <td className="px-8 py-7 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setWhatsappLead(lead); }}
                                            className="p-2.5 text-emerald-500 border border-emerald-100 bg-emerald-50 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm cursor-pointer"
                                            title="Send WhatsApp"
                                        >
                                            <MessageSquare className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActionMenuId(actionMenuId === lead.id ? null : lead.id); }}
                                            className={`p-2.5 rounded-xl transition-all border cursor-pointer ${actionMenuId === lead.id ? 'bg-slate-900 border-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50 border-slate-100'}`}
                                        >
                                            <MoreVertical className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {whatsappLead && (
                <WhatsAppModal
                    isOpen={!!whatsappLead}
                    onClose={() => setWhatsappLead(null)}
                    lead={{ id: whatsappLead.id, fullName: whatsappLead.fullName, phone: whatsappLead.phone }}
                    tenantId={tenantId || ""}
                />
            )}
            <AddLeadModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={fetchLeads}
                tenantId={tenantId || ""}
            />
            <LeadDetailsModal
                isOpen={!!detailsLead}
                onClose={() => setDetailsLead(null)}
                lead={detailsLead as Lead}
                onUpdateStatus={handleUpdateStatus}
            />
        </div>
    );
}
