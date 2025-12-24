"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
    User,
    Link as LinkIcon,
    Shield,
    Bell,
    Globe,
    LogOut,
    CheckCircle2,
    Loader2,
    Video,
    ChevronRight,
    Mail,
    Smartphone,
    CreditCard,
    MessageSquare,
    Building2,
    Info
} from "lucide-react";
import { getAvatarUrl } from "@/lib/avatar";
import { TeamsMeetingList } from "@/components/TeamsMeetingList";

type TabType = "profile" | "school" | "integrations" | "security" | "notifications";

export default function SettingsPage() {
    const { data: session } = useSession();
    const { user: firebaseUser, tenantId } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>("profile");
    const [isLinked, setIsLinked] = useState(false);
    const [linking, setLinking] = useState(false);

    // School States
    const [schoolName, setSchoolName] = useState("");
    const [savingSchool, setSavingSchool] = useState(false);

    // WhatsApp States
    const [waToken, setWaToken] = useState("");
    const [waPhoneId, setWaPhoneId] = useState("");
    const [waBusinessId, setWaBusinessId] = useState("");
    const [savingWa, setSavingWa] = useState(false);

    // Teams Config States
    const [teamsJoinUrl, setTeamsJoinUrl] = useState("");
    const [teamsMeetingId, setTeamsMeetingId] = useState("");
    const [teamsPasscode, setTeamsPasscode] = useState("");
    const [teamsInstructions, setTeamsInstructions] = useState("");
    const [savingTeamsConfig, setSavingTeamsConfig] = useState(false);

    // Azure App Config States
    const [azureClientId, setAzureClientId] = useState("");
    const [azureTenantId, setAzureTenantId] = useState("");
    const [azureClientSecret, setAzureClientSecret] = useState("");
    const [azureCoordinatorEmail, setAzureCoordinatorEmail] = useState("");


    useEffect(() => {
        if (session) {
            setIsLinked(!!(session as any)?.refreshToken);
        }
    }, [session]);

    useEffect(() => {
        const fetchSchoolData = async () => {
            if (!tenantId) return;
            try {
                const schoolRef = doc(db, "tenants", tenantId);
                const schoolSnap = await getDoc(schoolRef);
                if (schoolSnap.exists()) {
                    setSchoolName(schoolSnap.data().name || "");
                }
            } catch (error) {
                console.error("Error fetching school data:", error);
            }
        };
        fetchSchoolData();
    }, [tenantId]);

    const handleSaveSchool = async () => {
        if (!tenantId) return;
        setSavingSchool(true);
        try {
            await setDoc(doc(db, "tenants", tenantId), {
                name: schoolName,
                updatedAt: new Date()
            }, { merge: true });
            alert("School profile updated successfully!");
        } catch (error) {
            console.error("Error saving school data:", error);
            alert("Failed to update school profile.");
        } finally {
            setSavingSchool(false);
        }
    };

    useEffect(() => {
        const fetchWaConfig = async () => {
            try {
                const configRef = doc(db, "tenants", tenantId || "tellus-teams", "config", "whatsapp");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    setWaToken(data.accessToken || "");
                    setWaPhoneId(data.phoneNumberId || "");
                    setWaBusinessId(data.wabaId || "");
                }
            } catch (error) {
                console.error("Error fetching WA config:", error);
            }
        };

        const fetchTeamsConfig = async () => {
            if (!tenantId) return;
            try {
                const configRef = doc(db, "tenants", tenantId, "config", "teams");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    const data = configSnap.data();
                    setTeamsJoinUrl(data.joinUrl || "");
                    setTeamsMeetingId(data.meetingId || "");
                    setTeamsPasscode(data.passcode || "");
                    setTeamsInstructions(data.instructions || "");

                    // Load Azure Config if present
                    setAzureClientId(data.azureClientId || "");
                    setAzureTenantId(data.azureTenantId || "");
                    setAzureClientSecret(data.azureClientSecret || "");
                    setAzureCoordinatorEmail(data.azureCoordinatorEmail || "");
                } else {
                    console.log(`[Settings] No Teams config found for tenant: ${tenantId}`);
                }
            } catch (error) {
                console.error("Error fetching Teams config:", error);
            }
        };

        fetchWaConfig();
        fetchTeamsConfig();
    }, [tenantId]);

    const handleSaveWhatsApp = async () => {
        setSavingWa(true);
        try {
            const configRef = doc(db, "tenants", tenantId || "tellus-teams", "config", "whatsapp");
            await setDoc(configRef, {
                accessToken: waToken,
                phoneNumberId: waPhoneId,
                wabaId: waBusinessId,
                updatedAt: new Date()
            }, { merge: true });
            alert("WhatsApp configuration saved successfully!");
        } catch (error) {
            console.error("Error saving WA config:", error);
            alert("Failed to save configuration.");
        } finally {
            setSavingWa(false);
        }
    };

    const handleSaveTeamsConfig = async () => {
        setSavingTeamsConfig(true);
        try {
            const configRef = doc(db, "tenants", tenantId || "tellus-teams", "config", "teams");
            await setDoc(configRef, {
                joinUrl: teamsJoinUrl,
                meetingId: teamsMeetingId,
                passcode: teamsPasscode,
                instructions: teamsInstructions,
                azureClientId,
                azureTenantId,
                azureClientSecret,
                azureCoordinatorEmail,
                updatedAt: new Date()
            }, { merge: true });
            alert("Teams configuration saved successfully!");
        } catch (error) {
            console.error("Error saving Teams config:", error);
            alert("Failed to save Teams configuration.");
        } finally {
            setSavingTeamsConfig(false);
        }
    };

    const handleLinkAccount = async () => {
        if (!session || !firebaseUser) return;
        setLinking(true);
        try {
            const res = await fetch("/api/teams/link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: firebaseUser.uid }),
            });
            const data = await res.json();
            if (data.success) {
                setIsLinked(true);
            }
        } catch (error) {
            console.error("Linking error:", error);
        } finally {
            setLinking(false);
        }
    };

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: "profile", label: "Profile", icon: User },
        { id: "school", label: "School Profile", icon: Building2 },
        { id: "integrations", label: "Integrations", icon: LinkIcon },
        { id: "security", label: "Security", icon: Shield },
        { id: "notifications", label: "Notifications", icon: Bell },
    ];

    return (
        <div className="p-12">
            <header className="mb-12">
                <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Account Settings</h1>
                <p className="text-slate-400 font-medium font-outfit mt-2">Manage your personal profile and system preferences.</p>
            </header>

            <div className="flex gap-12">
                {/* Tabs Sidebar */}
                <div className="w-64 space-y-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl font-bold text-sm transition-all ${activeTab === tab.id
                                ? "bg-primary text-white shadow-xl shadow-primary/20"
                                : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                                }`}
                        >
                            <tab.icon className="h-5 w-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-white rounded-[48px] border border-slate-100 shadow-sm p-12">
                    {activeTab === "profile" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="flex items-center gap-8 pb-12 border-b border-slate-50">
                                <div className="relative group">
                                    <img
                                        src={session?.user?.image || getAvatarUrl(session?.user?.email || session?.user?.name || "User")}
                                        alt="Avatar"
                                        className="h-24 w-24 rounded-[32px] object-cover ring-4 ring-slate-50"
                                    />
                                    <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                        <p className="text-white text-[10px] font-bold uppercase tracking-widest">Change</p>
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-extrabold text-[#0D121F] font-outfit">{session?.user?.name || "Principal Overview"}</h2>
                                    <p className="text-slate-400 font-medium">{session?.user?.email || "principal@studioschool.com"}</p>
                                    <div className="mt-4 flex gap-2">
                                        <span className="px-3 py-1 bg-primary/5 text-primary text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-primary/10">Administrator</span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                        <input
                                            type="text"
                                            defaultValue={session?.user?.name || ""}
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-50 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                                        <input
                                            type="email"
                                            defaultValue={session?.user?.email || ""}
                                            disabled
                                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-50 rounded-2xl opacity-60 cursor-not-allowed font-bold text-slate-900"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button className="px-10 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                                Save Profile Changes
                            </button>
                        </div>
                    )}

                    {activeTab === "school" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-primary">
                                            <Building2 className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">School Branding</h3>
                                            <p className="text-slate-400 font-medium">Update the public name of your institution.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveSchool}
                                        disabled={savingSchool}
                                        className="px-8 py-3 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        {savingSchool ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                                    </button>
                                </div>

                                <div className="space-y-6 pt-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Official Institution Name</label>
                                        <input
                                            type="text"
                                            value={schoolName}
                                            onChange={(e) => setSchoolName(e.target.value)}
                                            placeholder="e.g. Greenwood High School"
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-medium text-slate-900 shadow-sm"
                                        />
                                    </div>

                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl">
                                        <div className="flex items-center gap-4 text-slate-400">
                                            <Globe className="h-5 w-5" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold uppercase tracking-widest">School ID</span>
                                                <span className="font-bold text-slate-700">{tenantId}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-10 border-2 border-dashed border-slate-100 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4 py-20 grayscale opacity-50">
                                <Globe className="h-12 w-12 text-slate-300" />
                                <div>
                                    <h4 className="text-lg font-bold text-slate-400">Custom Domains</h4>
                                    <p className="text-slate-300 font-medium max-w-sm">Connect your own school domain (e.g. portal.greenwood.edu) to the platform.</p>
                                </div>
                                <span className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-bold uppercase tracking-widest border border-slate-100">Coming Soon</span>
                            </div>
                        </div>
                    )}

                    {activeTab === "integrations" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-6">
                                    <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                        <Video className="h-8 w-8 text-[#6264A7]" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">Microsoft Teams</h3>
                                        <p className="text-slate-400 font-medium">Sync calendars and track meeting attendance.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {isLinked ? (
                                        <div className="flex items-center gap-3 px-6 py-3 bg-emerald-50 text-emerald-600 rounded-2xl font-bold border border-emerald-100">
                                            <CheckCircle2 className="h-5 w-5" />
                                            Active Connection
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleLinkAccount}
                                            disabled={linking}
                                            className="px-8 py-3 bg-[#6264A7] text-white rounded-2xl font-bold shadow-xl shadow-[#6264A7]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {linking ? <Loader2 className="h-5 w-5 animate-spin" /> : <LinkIcon className="h-5 w-5" />}
                                            Securely Connect
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Teams Meeting Configuration */}
                            <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-[#6264A7]">
                                            <Video className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">Teams Meeting Details</h3>
                                            <p className="text-slate-400 font-medium">Set up default meeting coordinates.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveTeamsConfig}
                                        disabled={savingTeamsConfig}
                                        className="px-8 py-3 bg-[#6264A7] text-white rounded-2xl font-bold shadow-xl shadow-[#6264A7]/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        {savingTeamsConfig ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Details"}
                                    </button>
                                </div>

                                <div className="space-y-6 pt-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Meeting Join URL</label>
                                        <input
                                            type="url"
                                            value={teamsJoinUrl}
                                            onChange={(e) => setTeamsJoinUrl(e.target.value)}
                                            placeholder="https://teams.microsoft.com/l/meetup-join/..."
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6264A7]/5 focus:border-[#6264A7]/20 transition-all font-medium text-slate-900 shadow-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Meeting ID</label>
                                            <input
                                                type="text"
                                                value={teamsMeetingId}
                                                onChange={(e) => setTeamsMeetingId(e.target.value)}
                                                placeholder="e.g. 123 456 789 012"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6264A7]/5 focus:border-[#6264A7]/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Passcode</label>
                                            <input
                                                type="text"
                                                value={teamsPasscode}
                                                onChange={(e) => setTeamsPasscode(e.target.value)}
                                                placeholder="e.g. AbCdEf"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6264A7]/5 focus:border-[#6264A7]/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Instructions for Students</label>
                                        <textarea
                                            value={teamsInstructions}
                                            onChange={(e) => setTeamsInstructions(e.target.value)}
                                            placeholder="e.g. Please join 5 minutes early..."
                                            rows={3}
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#6264A7]/5 focus:border-[#6264A7]/20 transition-all font-medium text-slate-900 shadow-sm resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Azure App Configuration for Dynamic Features */}
                                <div className="space-y-6 pt-6 border-t border-slate-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-[#0D121F]">Azure App Registration</h4>
                                                <p className="text-slate-400 text-sm font-medium">Required for dynamic meeting fetching and attendance sync.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleSaveTeamsConfig}
                                            disabled={savingTeamsConfig}
                                            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                        >
                                            {savingTeamsConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Application (Client) ID</label>
                                            <input
                                                type="text"
                                                value={azureClientId}
                                                onChange={(e) => setAzureClientId(e.target.value)}
                                                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Directory (Tenant) ID</label>
                                            <input
                                                type="text"
                                                value={azureTenantId}
                                                onChange={(e) => setAzureTenantId(e.target.value)}
                                                placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Client Secret</label>
                                            <input
                                                type="password"
                                                value={azureClientSecret}
                                                onChange={(e) => setAzureClientSecret(e.target.value)}
                                                placeholder="Azure Client Secret Value"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Teams Coordinator Email</label>
                                            <input
                                                type="email"
                                                value={azureCoordinatorEmail}
                                                onChange={(e) => setAzureCoordinatorEmail(e.target.value)}
                                                placeholder="e.g. coordinator@school.com"
                                                className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                            />
                                            <p className="text-[10px] text-slate-400 font-medium ml-1 flex items-center gap-1">
                                                <Info className="h-3 w-3" />
                                                The system will fetch meetings from this user's calendar.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Meeting List Component */}
                                <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100">
                                    <TeamsMeetingList tenantId={tenantId} />
                                </div>
                            </div>

                            <div className="p-10 bg-slate-50 rounded-[40px] border border-slate-100 space-y-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-500">
                                            <MessageSquare className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">WhatsApp Cloud API</h3>
                                            <p className="text-slate-400 font-medium">Send notifications directly to parents.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSaveWhatsApp}
                                        disabled={savingWa}
                                        className="px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        {savingWa ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Config"}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Access Token</label>
                                        <input
                                            type="password"
                                            value={waToken}
                                            onChange={(e) => setWaToken(e.target.value)}
                                            placeholder="Meta Access Token"
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number ID</label>
                                        <input
                                            type="text"
                                            value={waPhoneId}
                                            onChange={(e) => setWaPhoneId(e.target.value)}
                                            placeholder="e.g. 1234567890"
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">WhatsApp Business Account ID (WABA)</label>
                                        <input
                                            type="text"
                                            value={waBusinessId}
                                            onChange={(e) => setWaBusinessId(e.target.value)}
                                            placeholder="e.g. 0987654321"
                                            className="w-full px-6 py-4 bg-white border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/20 transition-all font-medium text-slate-900 shadow-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            <section className="space-y-6">
                                <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">Security Preferences</h3>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                                                <Smartphone className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">Two-Factor Authentication</p>
                                                <p className="text-xs text-slate-400 font-medium">Add an extra layer of security to your account.</p>
                                            </div>
                                        </div>
                                        <button className="px-6 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all">Enable</button>
                                    </div>
                                    <div className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                                <Shield className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">Password Management</p>
                                                <p className="text-xs text-slate-400 font-medium">Last changed 3 months ago.</p>
                                            </div>
                                        </div>
                                        <button className="px-6 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all">Update</button>
                                    </div>
                                </div>
                            </section>

                            <section className="pt-12 border-t border-slate-50">
                                <h3 className="text-xl font-extrabold text-red-600 font-outfit mb-4">Danger Zone</h3>
                                <div className="p-8 bg-red-50/50 border border-red-100 rounded-[32px] flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-red-900">Sign Out of All Devices</p>
                                        <p className="text-sm text-red-600/60 font-medium">This will end your session on all other platforms.</p>
                                    </div>
                                    <button
                                        onClick={() => signOut()}
                                        className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-xl shadow-red-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Sign Out Now
                                    </button>
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-6">
                                <h3 className="text-xl font-extrabold text-[#0D121F] font-outfit">Email Alerts</h3>
                                <div className="space-y-4">
                                    {[
                                        "New student enrollment reports",
                                        "Weekly attendance performance summaries",
                                        "Teams integration status alerts",
                                        "System maintenance and updates"
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl">
                                            <span className="font-bold text-slate-700">{item}</span>
                                            <div className="h-6 w-11 bg-primary rounded-full relative">
                                                <div className="absolute right-1 top-1 h-4 w-4 bg-white rounded-full" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
