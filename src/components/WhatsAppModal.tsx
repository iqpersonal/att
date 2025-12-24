"use client";

import { useState, useEffect } from "react";
import {
    X,
    MessageSquare,
    Send,
    Loader2,
    Search,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    Copy,
    Smartphone
} from "lucide-react";

interface WhatsAppTemplate {
    name: string;
    language: string;
    category: string;
    components: any[];
}

interface WhatsAppModalProps {
    isOpen: boolean;
    onClose: () => void;
    lead: {
        id: string;
        fullName: string;
        phone: string;
    };
    tenantId: string;
}

export function WhatsAppModal({ isOpen, onClose, lead, tenantId }: WhatsAppModalProps) {
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchTemplates();
        } else {
            // Reset state on close
            setSelectedTemplate(null);
            setVariables({});
            setError(null);
            setSuccess(false);
        }
    }, [isOpen]);

    const fetchTemplates = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/messaging/whatsapp/templates?tenantId=${tenantId}`);
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
            } else {
                setError(data.error || "Failed to load templates");
            }
        } catch (err) {
            setError("Error connecting to messaging service");
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!selectedTemplate) return;
        setSending(true);
        setError(null);

        // Map variables to Meta component format
        const components = selectedTemplate.components
            .filter(c => c.type === "BODY" && c.text.includes("{{"))
            .map(c => {
                const parameters: any[] = [];
                // Simple regex to find {{1}}, {{2}} etc.
                const matches = c.text.match(/\{\{\d+\}\}/g) || [];
                matches.forEach((_: any, i: number) => {
                    parameters.push({
                        type: "text",
                        text: variables[`{{${i + 1}}}`] || lead.fullName || "Student"
                    });
                });
                return {
                    type: "body",
                    parameters
                };
            });

        try {
            const res = await fetch("/api/messaging/whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: lead.phone,
                    templateName: selectedTemplate.name,
                    languageCode: selectedTemplate.language,
                    components,
                    tenantId
                })
            });
            const data = await res.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(onClose, 2000);
            } else {
                setError(data.error || "Failed to send message");
            }
        } catch (err) {
            setError("Connection failed");
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    const filteredTemplates = templates.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">

                {/* Header */}
                <div className="px-8 py-6 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 font-outfit">Send WhatsApp</h3>
                            <p className="text-emerald-700/60 text-xs font-bold uppercase tracking-widest">To: {lead.fullName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/50 rounded-xl transition-colors text-slate-400"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-8">
                    {success ? (
                        <div className="py-12 text-center space-y-4 animate-in zoom-in duration-300">
                            <div className="h-20 w-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-200">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h4 className="text-2xl font-bold text-slate-900 font-outfit">Message Sent!</h4>
                            <p className="text-slate-500">Your message is on its way to {lead.fullName}.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Receiver Info */}
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="h-5 w-5 text-slate-400" />
                                    <span className="font-bold text-slate-700">{lead.phone}</span>
                                </div>
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Verified Multi-Channel</span>
                            </div>

                            {/* Template Selector or Variable Input */}
                            {!selectedTemplate ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <input
                                            type="text"
                                            placeholder="Search templates..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none font-medium text-slate-700"
                                        />
                                    </div>

                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {loading ? (
                                            <div className="py-20 text-center">
                                                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mx-auto mb-2" />
                                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Fetching from Meta...</p>
                                            </div>
                                        ) : filteredTemplates.length === 0 ? (
                                            <div className="py-12 text-center p-8 bg-slate-50 rounded-3xl">
                                                <AlertCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                                <p className="text-sm text-slate-400 font-bold">No approved templates found.</p>
                                            </div>
                                        ) : (
                                            filteredTemplates.map((t, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedTemplate(t)}
                                                    className="w-full p-4 flex items-center justify-between bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group lg:scale-100 scale-95"
                                                >
                                                    <div className="text-left">
                                                        <p className="font-bold text-slate-900 group-hover:text-emerald-700 truncate max-w-[280px]">{t.name.replace(/_/g, " ")}</p>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest capitalize">{t.category.toLowerCase()} • {t.language}</span>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center justify-between">
                                        <button
                                            onClick={() => setSelectedTemplate(null)}
                                            className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                                        >
                                            <ChevronRight className="h-3 w-3 rotate-180" /> Back to list
                                        </button>
                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest">Selected</span>
                                    </div>

                                    <div className="p-6 bg-slate-900 rounded-[32px] text-emerald-400 font-medium text-sm border-4 border-slate-800 shadow-xl">
                                        <p className="opacity-60 mb-2 uppercase text-[10px] tracking-widest font-bold">Message Preview</p>
                                        {selectedTemplate.components.find(c => c.type === "BODY")?.text.split("\n").map((line: string, idx: number) => (
                                            <p key={idx} className="mb-1">{line}</p>
                                        ))}
                                    </div>

                                    {/* Template Variables Input (Optional for MVP - using defaults) */}
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3 text-amber-800 text-xs">
                                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                        <p className="font-bold">Automated Mapping: User names and school info will be applied automatically to the variables.</p>
                                    </div>

                                    <button
                                        onClick={handleSend}
                                        disabled={sending}
                                        className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        {sending ? <Loader2 className="h-6 w-6 animate-spin" /> : <>
                                            Send Message Now <Send className="h-5 w-5" />
                                        </>}
                                    </button>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3 text-red-600 text-sm animate-in shake-1 duration-300">
                                    <AlertCircle className="h-5 w-5" />
                                    <p className="font-bold">{error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
