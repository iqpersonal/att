"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    Facebook,
    Loader2,
    Save,
    AlertCircle,
    CheckCircle2,
    Lock,
    ExternalLink,
    Sparkles,
    MessageSquare,
    ChevronDown
} from "lucide-react";

export default function IntegrationsPage() {
    const { user, tenantId, features } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [pageId, setPageId] = useState("");
    const [accessToken, setAccessToken] = useState("");
    const [adAccountId, setAdAccountId] = useState("");
    const [whatsappAutoAck, setWhatsappAutoAck] = useState(false);
    const [whatsappAckTemplate, setWhatsappAckTemplate] = useState("lead_acknowledgment");
    const [templates, setTemplates] = useState<string[]>([]);

    // Gate access: Only tenants with "leads" feature
    const isLeadsEnabled = features?.includes("leads");

    useEffect(() => {
        if (!tenantId || !user) return;

        const fetchConfig = async () => {
            try {
                // Fetch existing config from sub-collection to keep it secure
                // Path: tenants/{tenantId}/integrations/meta
                const docRef = doc(db, "tenants", tenantId, "integrations", "meta");
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setPageId(data.pageId || "");
                    setAccessToken(data.accessToken || "");
                    setAdAccountId(data.adAccountId || "");
                    setWhatsappAutoAck(data.whatsappAutoAck || false);
                    setWhatsappAckTemplate(data.whatsappAckTemplate || "lead_acknowledgment");
                }
            } catch (error) {
                console.error("Error fetching integration config:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchTemplates = async () => {
            if (!tenantId) return;
            try {
                const res = await fetch(`/api/messaging/whatsapp/templates?tenantId=${tenantId}`);
                const data = await res.json();
                if (data.success) {
                    setTemplates(data.templates.map((t: any) => t.name));
                }
            } catch (e) {
                console.error("Error templates:", e);
            }
        };

        if (isLeadsEnabled) {
            fetchConfig();
            fetchTemplates();
        } else {
            setLoading(false);
        }
    }, [tenantId, user, isLeadsEnabled]);

    const [testing, setTesting] = useState(false);

    const handleTestConnection = async () => {
        if (!pageId || !accessToken) {
            alert("Please enter Page ID and Access Token first.");
            return;
        }
        setTesting(true);
        try {
            // Test by fetching page details
            const url = `https://graph.facebook.com/v21.0/${pageId}?fields=name,id&access_token=${accessToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.id && data.id === pageId) {
                alert(`Success! Connected to: ${data.name}`);
            } else {
                alert(`Connection failed: ${data.error?.message || "Unknown error"}`);
            }
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        } finally {
            setTesting(false);
        }
    };

    const handleSave = async () => {
        if (!tenantId) return;
        setSaving(true);
        try {
            const docRef = doc(db, "tenants", tenantId, "integrations", "meta");
            console.log("Saving integration data:", {
                pageId,
                whatsappAutoAck,
                whatsappAckTemplate
            });
            await setDoc(docRef, {
                pageId,
                accessToken,
                adAccountId,
                whatsappAutoAck,
                whatsappAckTemplate,
                updatedAt: new Date().toISOString(),
                updatedBy: user?.uid
            }, { merge: true });

            alert("Integration settings saved successfully!");
        } catch (error) {
            console.error("Error saving integration config:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (!loading && !isLeadsEnabled) {
        return (
            <div className="flex h-[70vh] items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <Lock className="h-12 w-12 text-slate-300 mx-auto" />
                    <h1 className="text-2xl font-bold text-slate-900 font-outfit">Feature Locked</h1>
                    <p className="text-slate-500">
                        Social Media Integrations are part of the <strong>Premium Lead Management</strong> module.
                        Please upgrade your subscription to connect Facebook & Instagram.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-12">
            <header className="mb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-blue-100">
                    <Facebook className="h-3 w-3" />
                    Social Connect
                </div>
                <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Integrations</h1>
                <p className="text-slate-400 font-medium font-outfit mt-2">Connect your Meta assets to automatically import leads.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Connection Card */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Facebook className="h-40 w-40 text-blue-600" />
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-xl font-bold text-[#0D121F] font-outfit mb-6 flex items-center gap-3">
                            <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <Facebook className="h-5 w-5" />
                            </div>
                            Facebook & Instagram
                        </h2>

                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Facebook Page ID</label>
                                <input
                                    type="text"
                                    value={pageId}
                                    onChange={(e) => setPageId(e.target.value)}
                                    placeholder="e.g. 1029384756..."
                                    className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 outline-none placeholder:text-slate-300 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                                    System User Access Token
                                    <a href="https://developers.facebook.com/docs/marketing-api/system-users/guide" target="_blank" rel="noreferrer" className="ml-2 text-blue-500 hover:underline inline-flex items-center gap-0.5 normal-case font-medium">
                                        (Get Token <ExternalLink className="h-2.5 w-2.5" />)
                                    </a>
                                </label>
                                <div className="relative">
                                    <input
                                        type="password"
                                        value={accessToken}
                                        onChange={(e) => setAccessToken(e.target.value)}
                                        placeholder="EAA..."
                                        className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 outline-none placeholder:text-slate-300 text-sm pr-12"
                                    />
                                    <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Ad Account ID (Optional)</label>
                                <input
                                    type="text"
                                    value={adAccountId}
                                    onChange={(e) => setAdAccountId(e.target.value)}
                                    placeholder="act_..."
                                    className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-blue-500/20 focus:ring-4 focus:ring-blue-500/5 transition-all font-bold text-slate-900 outline-none placeholder:text-slate-300 text-sm"
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={handleTestConnection}
                                    disabled={testing || loading}
                                    className="flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-bold hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {testing ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                                        Test <ExternalLink className="h-4 w-4" />
                                    </>}
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || loading}
                                    className="flex-[2] py-4 bg-[#1877F2] text-white rounded-2xl font-bold hover:bg-[#166fe5] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
                                >
                                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                                        Connect Account <CheckCircle2 className="h-4 w-4" />
                                    </>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Automated Engagement Section */}
                <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Sparkles className="h-40 w-40 text-emerald-600" />
                    </div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-[#0D121F] font-outfit flex items-center gap-3">
                                <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                Automated Engagement
                            </h2>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={whatsappAutoAck}
                                    onChange={(e) => setWhatsappAutoAck(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        <div className={`space-y-6 transition-all duration-300 ${whatsappAutoAck ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                            <p className="text-sm font-medium text-slate-500 leading-relaxed">
                                Automatically send a WhatsApp message to students immediately after they submit a Facebook or Instagram lead form.
                            </p>

                            <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[28px] space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">Acknowledgment Template</label>
                                    <div className="relative">
                                        <select
                                            value={whatsappAckTemplate}
                                            onChange={(e) => setWhatsappAckTemplate(e.target.value)}
                                            className="w-full px-5 py-4 bg-white border border-emerald-100 rounded-2xl focus:ring-4 focus:ring-emerald-500/5 transition-all font-bold text-slate-900 outline-none appearance-none"
                                        >
                                            {templates.length === 0 ? (
                                                <option value="lead_acknowledgment">lead_acknowledgment (Default)</option>
                                            ) : (
                                                templates.map(t => <option key={t} value={t}>{t}</option>)
                                            )}
                                        </select>
                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 bg-white p-4 rounded-2xl border border-emerald-100/50">
                                    <AlertCircle className="h-4 w-4 text-emerald-500 mt-0.5" />
                                    <p className="text-[10px] font-medium text-slate-500 leading-tight">
                                        Ensure your chosen template uses <code>{`{{1}}`}</code> for the student's full name.
                                        The message will be sent instantly upon ingestion.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="space-y-8">
                    <div className="bg-slate-900 text-white p-8 rounded-[40px] shadow-lg">
                        <h3 className="text-xl font-bold font-outfit mb-4">How to connect?</h3>
                        <ol className="space-y-4 text-slate-300 text-sm font-medium">
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                                <p>Go to <strong>Meta Business Suite</strong> {'>'} Settings {'>'} Users {'>'} System Users.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                                <p>Create a System User and assign your Facebook Page and Ad Account to it.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                                <p>Generate a new Token with <code>leads_retrieval</code>, <code>pages_manage_ads</code>, <code>pages_read_engagement</code>, and <code>whatsapp_business_management</code> permissions.</p>
                            </li>
                            <li className="flex gap-3">
                                <span className="h-6 w-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-xs flex-shrink-0">4</span>
                                <p>Copy the Access Token and Page ID here.</p>
                            </li>
                        </ol>
                    </div>

                    <div className="bg-emerald-50 text-emerald-900 p-8 rounded-[40px] border border-emerald-100">
                        <h3 className="text-lg font-bold font-outfit mb-2 flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            Benefit
                        </h3>
                        <p className="text-sm font-medium opacity-80 leading-relaxed">
                            Once connected, any lead submitted through your "Instant Forms" on Facebook or Instagram ads will instantly appear in your Leads Dashboard. No more downloading CSVs!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
