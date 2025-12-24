"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    orderBy,
    limit
} from "firebase/firestore";
import {
    Search,
    Send,
    User,
    MessageSquare,
    History,
    Loader2,
    CheckCircle2,
    AlertCircle,
    UserCircle2,
    Clock,
    X,
    Sparkles,
    RefreshCw,
    Filter,
    Calendar,
    Users,
    CheckSquare,
    Square,
    Check,
    Target
} from "lucide-react";
import { sendWhatsApp } from "@/lib/messaging";
import { format } from "date-fns";

interface Student {
    id: string;
    name: string;
    phoneNumber?: string;
    email: string;
    class: string;
    rollNumber: string;
}

interface Lead {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    status: string;
    campaignName?: string;
    formName?: string;
    source: string;
    createdAt: any;
}

interface MessageHistory {
    id: string;
    toName: string;
    toNumber: string;
    message: string;
    status: 'sent' | 'failed';
    createdAt: any;
    error?: string;
}

interface TemplateComponent {
    type: string;
    text?: string;
    format?: string;
    example?: any;
}

interface WhatsAppTemplate {
    name: string;
    language: string;
    category: string;
    components: TemplateComponent[];
}

export default function MessagingDashboard() {
    const { tenantId } = useAuth();

    // Core Sourcing
    const [source, setSource] = useState<'students' | 'leads'>('students');
    const [students, setStudents] = useState<Student[]>([]);
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    // Selection & Search
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filters (Leads only)
    const [campaignFilter, setCampaignFilter] = useState("all");
    const [formFilter, setFormFilter] = useState("all");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    // Template States
    const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
    const [selectedTemplateName, setSelectedTemplateName] = useState("");
    const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
    const [fetchingTemplates, setFetchingTemplates] = useState(false);

    const [history, setHistory] = useState<MessageHistory[]>([]);
    const [sending, setSending] = useState(false);

    // Derived: Selected template object
    const selectedTemplate = useMemo(() =>
        templates.find(t => t.name === selectedTemplateName)
        , [templates, selectedTemplateName]);

    // Derived: Variable placeholders across ALL components
    const placeholdersByComponent = useMemo(() => {
        if (!selectedTemplate) return {};
        const map: Record<string, string[]> = {};

        selectedTemplate.components.forEach(comp => {
            if (comp.text) {
                const matches = comp.text.match(/{{(\d+)}}/g);
                if (matches) {
                    map[comp.type] = matches.map(m => m.replace(/[{}]/g, ""));
                }
            }
        });

        return map;
    }, [selectedTemplate]);

    // All unique placeholder IDs
    const allPlaceholderIds = useMemo(() => {
        const ids = new Set<string>();
        Object.values(placeholdersByComponent).forEach(compIds => {
            compIds.forEach(id => ids.add(id));
        });
        return Array.from(ids).sort((a, b) => parseInt(a) - parseInt(b));
    }, [placeholdersByComponent]);

    // Derived: Preview text
    const previewText = useMemo(() => {
        if (!selectedTemplate) return "";
        const body = selectedTemplate.components.find(c => c.type === "BODY");
        if (!body || !body.text) return "";

        let text = body.text;
        Object.entries(templateVariables).forEach(([key, val]) => {
            text = text.replace(`{{${key}}}`, val || `{{${key}}}`);
        });
        return text;
    }, [selectedTemplate, templateVariables]);

    // Fetch templates
    const fetchTemplates = async () => {
        if (!tenantId) return;
        setFetchingTemplates(true);
        try {
            const res = await fetch(`/api/messaging/whatsapp/templates?tenantId=${tenantId}`);
            const data = await res.json();
            if (data.success) {
                setTemplates(data.templates);
                if (data.templates.length > 0 && !selectedTemplateName) {
                    setSelectedTemplateName(data.templates[0].name);
                }
            } else {
                console.error("Failed to fetch templates:", data.error);
            }
        } catch (error) {
            console.error("Error fetching templates:", error);
        } finally {
            setFetchingTemplates(false);
        }
    };

    // Fetch students/leads
    useEffect(() => {
        if (!tenantId) return;

        // Fetch Students
        const qStudents = query(
            collection(db, "students"),
            where("tenantId", "==", tenantId)
        );
        const unsubStudents = onSnapshot(qStudents, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            setStudents(data);
        });

        // Fetch Leads
        const qLeads = query(
            collection(db, "leads"),
            where("tenantId", "==", tenantId),
            orderBy("createdAt", "desc")
        );
        const unsubLeads = onSnapshot(qLeads, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Lead[];
            setLeads(data);
            setLoading(false);
        });

        fetchTemplates();

        return () => {
            unsubStudents();
            unsubLeads();
        };
    }, [tenantId]);

    // Initialize variables when template changes
    useEffect(() => {
        if (selectedTemplate) {
            const initialVars: Record<string, string> = {};
            allPlaceholderIds.forEach(p => {
                // Auto-fill student name if it's the first variable
                if (p === "1" && selectedStudent) {
                    initialVars[p] = selectedStudent.name;
                } else {
                    initialVars[p] = "";
                }
            });
            setTemplateVariables(initialVars);
        }
    }, [selectedTemplateName, selectedStudent, allPlaceholderIds]);

    // Fetch history
    useEffect(() => {
        if (!tenantId) return;
        const q = query(
            collection(db, "tenants", tenantId, "message_history"),
            orderBy("createdAt", "desc"),
            limit(20)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MessageHistory[];
            setHistory(data);
        });
        return () => unsubscribe();
    }, [tenantId]);

    // Multi-select helpers
    const toggleSelect = (id: string, phone: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            if (phone) newSelected.add(id);
            else alert("This recipient does not have a phone number.");
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = (items: (Student | Lead)[]) => {
        if (selectedIds.size === items.filter(i => (i as any).phoneNumber || (i as any).phone).length) {
            setSelectedIds(new Set());
        } else {
            const validIds = items
                .filter(i => (i as any).phoneNumber || (i as any).phone)
                .map(i => i.id);
            setSelectedIds(new Set(validIds));
        }
    };

    const campaigns = useMemo(() => Array.from(new Set(leads.map(l => l.campaignName).filter(Boolean))), [leads]);
    const forms = useMemo(() => Array.from(new Set(leads.map(l => l.formName).filter(Boolean))), [leads]);

    const filteredData = useMemo(() => {
        if (source === 'students') {
            return students.filter(s =>
                (s.name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (s.rollNumber || "").includes(searchQuery)
            );
        } else {
            return leads.filter(l => {
                const matchesSearch = (l.fullName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                    (l.phone || "").includes(searchQuery);
                const matchesCampaign = campaignFilter === 'all' || l.campaignName === campaignFilter;
                const matchesForm = formFilter === 'all' || l.formName === formFilter;

                // Date filtering
                let matchesDate = true;
                if (dateRange.start || dateRange.end) {
                    let leadDate: Date;
                    if (l.createdAt?.toDate) leadDate = l.createdAt.toDate();
                    else if (l.createdAt instanceof Date) leadDate = l.createdAt;
                    else if (typeof l.createdAt === 'string' || typeof l.createdAt === 'number') leadDate = new Date(l.createdAt);
                    else leadDate = new Date(); // Fallback to now if missing

                    if (dateRange.start) {
                        const start = new Date(dateRange.start);
                        start.setHours(0, 0, 0, 0);
                        if (leadDate < start) matchesDate = false;
                    }
                    if (dateRange.end) {
                        const end = new Date(dateRange.end);
                        end.setHours(23, 59, 59, 999);
                        if (leadDate > end) matchesDate = false;
                    }
                }

                return matchesSearch && matchesCampaign && matchesForm && matchesDate;
            });
        }
    }, [source, students, leads, searchQuery, campaignFilter, formFilter, dateRange]);

    // Track most recently selected item for preview purposes
    const lastSelectedItem = useMemo(() => {
        if (selectedIds.size === 1) {
            const id = Array.from(selectedIds)[0];
            return source === 'students' ? students.find(s => s.id === id) : leads.find(l => l.id === id);
        }
        return null;
    }, [selectedIds, source, students, leads]);

    const handleSendMessage = async () => {
        const recipients = source === 'students'
            ? students.filter(s => selectedIds.has(s.id))
            : leads.filter(l => selectedIds.has(l.id));

        // Fallback for single select from search if no bulk selection
        if (selectedIds.size === 0 && selectedStudent) {
            recipients.push(selectedStudent as any);
        } else if (selectedIds.size === 0 && searchQuery.startsWith('+')) {
            recipients.push({ id: 'manual', name: 'Recipient', phoneNumber: searchQuery } as any);
        }

        if (recipients.length === 0 || !selectedTemplate || !tenantId) {
            alert("Please select recipients or enter a valid phone number starting with +");
            return;
        }

        setSending(true);
        let successCount = 0;
        let failCount = 0;

        try {
            for (const recipient of recipients) {
                const phone = (recipient as any).phoneNumber || (recipient as any).phone;
                const name = (recipient as any).name || (recipient as any).fullName;

                // Build components array for Meta per component type
                const components: any[] = [];

                Object.entries(placeholdersByComponent).forEach(([type, ids]) => {
                    const parameters = ids.map(id => {
                        let text = templateVariables[id] || "";
                        // Auto-fill student/lead name if it's the first variable and empty
                        if (id === "1" && !text) text = name;
                        return { type: "text", text };
                    });

                    components.push({
                        type: type.toLowerCase(),
                        parameters: parameters
                    });
                });

                const result = await sendWhatsApp(
                    phone,
                    selectedTemplate.name,
                    components,
                    tenantId,
                    selectedTemplate.language
                );

                // Log to Firestore
                await addDoc(collection(db, "tenants", tenantId, "message_history"), {
                    toName: name,
                    toNumber: phone,
                    message: previewText.replace(/{{1}}/g, name), // Rough preview
                    template: selectedTemplate.name,
                    status: result.success ? 'sent' : 'failed',
                    error: result.error || null,
                    createdAt: serverTimestamp()
                });

                if (result.success) successCount++;
                else failCount++;
            }

            if (successCount > 0) {
                alert(`Broadcast complete! ${successCount} sent, ${failCount} failed.`);
                setTemplateVariables({});
                setSelectedStudent(null);
                setSearchQuery("");
                setSelectedIds(new Set());
            } else {
                alert(`Broadcast failed for all recipients.`);
            }
        } catch (error: any) {
            console.error("Messaging error:", error);
            alert(`Failed to send message: ${error.message}`);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-12">
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">WhatsApp Center</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Communicate directly with your students and leads using pre-approved templates.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={fetchTemplates}
                        disabled={fetchingTemplates}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <RefreshCw className={`h-4 w-4 ${fetchingTemplates ? 'animate-spin' : ''}`} />
                        Sync Templates
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Search and Composer */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 space-y-10">
                        {/* Source Toggle */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button
                                    onClick={() => { setSource('students'); setSelectedIds(new Set()); setSelectedStudent(null); }}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${source === 'students' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Users className="h-4 w-4" />
                                    Students
                                </button>
                                <button
                                    onClick={() => { setSource('leads'); setSelectedIds(new Set()); setSelectedStudent(null); }}
                                    className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${source === 'leads' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    <Target className="h-4 w-4" />
                                    Meta Leads
                                </button>
                            </div>

                            {selectedIds.size > 0 && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest border border-primary/10 animate-in zoom-in-95">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {selectedIds.size} Selected for Broadcast
                                </div>
                            )}
                        </div>

                        {/* Filters (Leads only) */}
                        {source === 'leads' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 bg-slate-50/50 rounded-3xl border border-slate-100 animate-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Campaign</label>
                                    <select
                                        value={campaignFilter}
                                        onChange={(e) => setCampaignFilter(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    >
                                        <option value="all">All Campaigns</option>
                                        {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Form</label>
                                    <select
                                        value={formFilter}
                                        onChange={(e) => setFormFilter(e.target.value)}
                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    >
                                        <option value="all">All Forms</option>
                                        {forms.map(f => <option key={f} value={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date Start</label>
                                    <input
                                        type="date"
                                        value={dateRange.start}
                                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Date End</label>
                                    <input
                                        type="date"
                                        value={dateRange.end}
                                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/10"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Recipient Selector / Multi-Select List */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select {source === 'students' ? 'Students' : 'Leads'}</label>
                                <button
                                    onClick={() => toggleSelectAll(filteredData.slice(0, 50))}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                >
                                    {selectedIds.size === filteredData.slice(0, 50).filter(i => (i as any).phoneNumber || (i as any).phone).length ? 'Deselect All' : 'Select Visible (Top 50)'}
                                </button>
                            </div>

                            <div className="relative group">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    placeholder={`Search ${source}...`}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-16 pr-8 py-5 bg-slate-50 border border-slate-50 rounded-[32px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all font-bold text-slate-900"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                                {loading ? (
                                    <div className="col-span-full py-20 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/20" />
                                    </div>
                                ) : filteredData.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-slate-400 font-bold text-sm bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        No matching {source} found.
                                    </div>
                                ) : (
                                    filteredData.slice(0, 50).map((item) => {
                                        const id = item.id;
                                        const name = (item as any).name || (item as any).fullName;
                                        const phone = (item as any).phoneNumber || (item as any).phone;
                                        const isSelected = selectedIds.has(id);
                                        const isDisabled = !phone;

                                        return (
                                            <button
                                                key={id}
                                                disabled={isDisabled}
                                                onClick={() => toggleSelect(id, phone)}
                                                className={`flex items-center gap-4 p-4 rounded-[24px] border transition-all text-left group ${isSelected ? 'bg-primary/5 border-primary/20 ring-2 ring-primary/5' : 'bg-white border-slate-100 hover:border-slate-200'} ${isDisabled ? 'opacity-50 grayscale' : 'cursor-pointer'}`}
                                            >
                                                <div className={`h-6 w-6 rounded-lg flex items-center justify-center transition-all ${isSelected ? 'bg-primary text-white' : 'bg-slate-50 text-slate-200 group-hover:text-slate-300'}`}>
                                                    {isSelected ? <Check className="h-4 w-4 stroke-[3]" /> : <Square className="h-4 w-4" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-primary' : 'text-slate-900'}`}>{name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">
                                                        {phone || 'No Phone'} {source === 'leads' && (item as any).campaignName && `• ${(item as any).campaignName}`}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Template Selector */}
                        <div className="space-y-4">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp Template</label>
                            <select
                                value={selectedTemplateName}
                                onChange={(e) => setSelectedTemplateName(e.target.value)}
                                className="w-full px-8 py-5 bg-slate-50 border border-slate-50 rounded-[32px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all font-bold text-slate-900 appearance-none cursor-pointer"
                            >
                                {templates.length === 0 ? (
                                    <option value="">No templates found</option>
                                ) : (
                                    templates.map(t => (
                                        <option key={t.name} value={t.name}>{t.name.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Dynamic Inputs */}
                        {allPlaceholderIds.length > 0 && (
                            <div className="space-y-6 animate-in fade-in duration-500">
                                <div className="flex items-center gap-2 ml-1">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <label className="text-xs font-extrabold text-[#0D121F] uppercase tracking-widest">Required Variables</label>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {allPlaceholderIds.map((p) => (
                                        <div key={p} className="space-y-3">
                                            <div className="flex justify-between items-center ml-1">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Variable {p}</label>
                                                {p === "1" && <span className="text-[8px] font-black text-primary uppercase bg-primary/5 px-1.5 py-0.5 rounded-md">Auto-fills Name</span>}
                                            </div>
                                            <input
                                                type="text"
                                                value={templateVariables[p] || ""}
                                                onChange={(e) => setTemplateVariables({ ...templateVariables, [p]: e.target.value })}
                                                placeholder={`Value for {{${p}}}`}
                                                className="w-full px-6 py-4 bg-slate-50 border border-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all font-bold text-slate-900"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        {selectedTemplate && (
                            <div className="space-y-4 pt-6 border-t border-slate-50">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Message Preview</label>
                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">
                                        {selectedTemplate.language}
                                    </span>
                                </div>
                                <div className="p-8 bg-slate-50/50 border border-slate-50 rounded-[32px] relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400" />
                                    <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap italic">
                                        "{previewText.replace(/{{1}}/g, source === 'students' ? ((lastSelectedItem as any)?.name || '[Student Name]') : ((lastSelectedItem as any)?.fullName || '[Lead Name]'))}"
                                    </p>
                                </div>
                            </div>
                        )}

                        <button
                            onClick={handleSendMessage}
                            disabled={sending || (selectedIds.size === 0 && !selectedStudent && !searchQuery.startsWith('+')) || !selectedTemplateName}
                            className="w-full py-6 bg-primary text-white rounded-[32px] font-bold shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 group"
                        >
                            {sending ? (
                                <Loader2 className="h-6 w-6 animate-spin" />
                            ) : (
                                <>
                                    {selectedIds.size > 1 ? `Broadcast to ${selectedIds.size} Recipients` : 'Send Message'}
                                    <Send className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </section>
                </div>

                {/* Right: History */}
                <div className="space-y-8">
                    <section className="bg-white rounded-[40px] border border-slate-100 shadow-sm p-10 space-y-8 h-fit">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4 text-slate-400">
                                <History className="h-6 w-6" />
                                <h2 className="text-xl font-extrabold text-[#0D121F] font-outfit">History</h2>
                            </div>
                            <span className="px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 border border-slate-100">Audit Log</span>
                        </div>

                        <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                            {history.length === 0 ? (
                                <div className="py-12 text-center space-y-4 opacity-50">
                                    <Clock className="h-10 w-10 mx-auto text-slate-200" />
                                    <p className="text-sm font-bold text-slate-400">No messages sent yet.</p>
                                </div>
                            ) : (
                                history.map(item => (
                                    <div key={item.id} className="p-5 bg-slate-50 rounded-3xl space-y-3 border border-slate-50 hover:border-slate-100 transition-colors group/history">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm group-hover/history:text-primary transition-colors">{item.toName}</p>
                                                <p className="text-[10px] text-slate-400 font-bold tracking-widest">{item.toNumber}</p>
                                            </div>
                                            {item.status === 'sent' ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-red-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-white w-fit px-2 py-0.5 rounded-full border border-slate-100">
                                                {(item as any).template || 'Direct'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-slate-600 font-medium line-clamp-2 italic">"{item.message}"</p>
                                        <p className="text-[10px] text-slate-400 font-medium pt-2 border-t border-slate-200/50">
                                            {item.createdAt?.toDate ? format(item.createdAt.toDate(), "MMM d, h:mm a") : "Just now"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
