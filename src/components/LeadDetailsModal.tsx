"use client";

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
    MessageSquare
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

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: Lead | null;
    onUpdateStatus: (leadId: string, newStatus: Lead["status"]) => Promise<void>;
}

export function LeadDetailsModal({ isOpen, onClose, lead, onUpdateStatus }: LeadDetailsModalProps) {
    if (!isOpen || !lead) return null;

    const statusConfig = {
        new: { icon: Target, color: "bg-indigo-50 text-indigo-600", label: "New Lead" },
        contacted: { icon: PhoneCall, color: "bg-blue-50 text-blue-600", label: "Contacted" },
        interested: { icon: Star, color: "bg-amber-50 text-amber-600", label: "Interested" },
        closed: { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600", label: "Closed/Won" },
        lost: { icon: X, color: "bg-red-50 text-red-600", label: "Lost/Closed" }
    };

    const config = statusConfig[lead.status] || statusConfig.new;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">

                {/* Header Profile Section */}
                <div className="bg-slate-50/50 px-10 py-10 border-b border-slate-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                        <button
                            onClick={onClose}
                            className="p-3 bg-white hover:bg-slate-50 rounded-2xl shadow-sm transition-all text-slate-400"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-start gap-8">
                        <div className="h-24 w-24 bg-primary text-white rounded-[32px] flex items-center justify-center text-4xl font-black shadow-xl shadow-primary/20">
                            {lead.fullName.charAt(0)}
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 ${config.color} rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10`}>
                                    <config.icon className="h-3 w-3" />
                                    {config.label}
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 font-outfit leading-tight">{lead.fullName}</h3>
                            </div>

                            <div className="flex flex-wrap gap-6 text-sm font-bold text-slate-400 uppercase tracking-widest">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-primary" />
                                    {lead.phone}
                                </div>
                                <div className="flex items-center gap-2 lowercase">
                                    <Mail className="h-4 w-4 text-primary" />
                                    {lead.email}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="px-10 py-10 grid grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Share2 className="h-3.5 w-3.5" /> Acquisition Source
                            </label>
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50">
                                <p className="text-sm font-bold text-slate-900">{lead.source}</p>
                                <p className="text-xs font-medium text-slate-500 mt-1">{lead.campaignName || "No campaign data"}</p>
                                {lead.formName && (
                                    <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                                        <FileText className="h-3 w-3" /> FORM: {lead.formName}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" /> Ingested Date
                            </label>
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50">
                                <p className="text-sm font-bold text-slate-900">
                                    {lead.createdAt?.toDate().toLocaleDateString("en-US", {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5" /> Lead Notes
                            </label>
                            <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100/50 min-h-[140px]">
                                <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                                    "{lead.notes || "No notes available for this prospect."}"
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest">
                        <Clock className="h-4 w-4" />
                        Status:
                        <select
                            value={lead.status}
                            onChange={(e) => onUpdateStatus(lead.id, e.target.value as Lead["status"])}
                            className="bg-transparent border-none text-slate-900 focus:ring-0 outline-none cursor-pointer hover:text-primary transition-colors pr-8 font-bold"
                        >
                            <option value="new">New Lead</option>
                            <option value="contacted">Contacted</option>
                            <option value="interested">Interested</option>
                            <option value="closed">Closed/Won</option>
                            <option value="lost">Lost/Closed</option>
                        </select>
                    </div>
                    <div className="flex gap-4">
                        <button
                            className="px-8 py-3 bg-white text-slate-600 border border-slate-200 rounded-2xl font-bold hover:bg-slate-100 transition-all text-sm"
                            onClick={onClose}
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
