"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    Settings,
    Save,
    Loader2,
    Globe,
    Mail,
    Smartphone,
    AlertCircle,
    ToggleLeft,
    ToggleRight
} from "lucide-react";

export default function PlatformSettingsPage() {
    const { role } = useAuth();
    const [saving, setSaving] = useState(false);
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [platformName, setPlatformName] = useState("StudioSchool");
    const [supportEmail, setSupportEmail] = useState("support@studioschool.com");

    const handleSave = async () => {
        setSaving(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert("Platform settings saved successfully!");
        } catch (error) {
            console.error("Save failed:", error);
        } finally {
            setSaving(false);
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
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 border border-slate-200">
                        <Settings className="h-3 w-3" />
                        Configuration
                    </div>
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Platform Settings</h1>
                    <p className="text-slate-400 font-medium font-outfit mt-2">Manage global configurations and system defaults.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/25"
                >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <>
                        Save Changes <Save className="h-4 w-4" />
                    </>}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    {/* Branding */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <h2 className="text-xl font-bold text-[#0D121F] font-outfit mb-6 flex items-center gap-3">
                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                <Globe className="h-5 w-5" />
                            </div>
                            Platform Identity
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Platform Name</label>
                                <input
                                    type="text"
                                    value={platformName}
                                    onChange={(e) => setPlatformName(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Support Email</label>
                                <input
                                    type="email"
                                    value={supportEmail}
                                    onChange={(e) => setSupportEmail(e.target.value)}
                                    className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-2xl focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* System Control */}
                    <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
                        <h2 className="text-xl font-bold text-[#0D121F] font-outfit mb-6 flex items-center gap-3">
                            <div className="h-10 w-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            System Control
                        </h2>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                                <p className="font-bold text-slate-900">Maintenance Mode</p>
                                <p className="text-xs text-slate-400 font-medium">Prevent new logins globally.</p>
                            </div>
                            <button
                                onClick={() => setMaintenanceMode(!maintenanceMode)}
                                className={`transition-colors ${maintenanceMode ? "text-red-500" : "text-slate-300"}`}
                            >
                                {maintenanceMode ? <ToggleRight className="h-10 w-10" /> : <ToggleLeft className="h-10 w-10" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
