"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, User, ArrowRight, Loader2, Sparkles, Building2, Globe } from "lucide-react";
import { doc, setDoc } from "firebase/firestore";
import Link from "next/link";

export default function SignupPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [schoolId, setSchoolId] = useState("");
    const [schoolName, setSchoolName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            const tid = schoolId.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');

            // Save user to Firestore with tenantId
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name,
                email,
                role: "admin",
                tenantId: tid,
                createdAt: new Date().toISOString(),
            });

            // Initialize Tenant
            await setDoc(doc(db, "tenants", tid), {
                id: tid,
                name: schoolName,
                ownerId: user.uid,
                createdAt: new Date().toISOString(),
                status: "active"
            });

            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Failed to create account. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
            {/* Right Side Visual - Educational Excellence Path */}
            <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-[#0F172A] lg:order-2 text-right items-end">
                <div className="relative z-10 flex items-center gap-3">
                    <span className="text-2xl font-extrabold text-white tracking-tight font-outfit">
                        Studio<span className="text-primary">School</span>
                    </span>
                    <div className="bg-primary/20 p-2.5 rounded-2xl backdrop-blur-xl border border-white/10">
                        <GraduationCap className="h-7 w-7 text-primary-foreground" />
                    </div>
                </div>

                <div className="relative z-10 space-y-8 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                        Professional Edition <Sparkles className="h-3 w-3" />
                    </div>
                    <h2 className="text-5xl font-extrabold text-white leading-[1.2] font-outfit">
                        Designed for <span className="text-primary italic">Excellence</span> in all departments.
                    </h2>
                    <ul className="space-y-4">
                        {[
                            "Strategic Academic Planning",
                            "Real-time Enterprise Reports",
                            "Advanced Student CRM",
                            "Universal Microsoft Sync"
                        ].map((text, i) => (
                            <li key={i} className="flex items-center justify-end gap-3 text-slate-400 font-medium">
                                {text} <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="relative z-10 flex items-center gap-4 p-8 glass rounded-[32px] border-white/5 text-left">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/20 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <p className="text-white font-bold text-sm tracking-tight">Institutional Enterprise Level</p>
                        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Status: Secure & Online</p>
                    </div>
                </div>

                {/* Animated Background Decor */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -ml-40 -mt-40 animate-pulse" />
                <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-[100px] -mr-20 -mb-20 animate-float" />
            </div>

            {/* Left Side - Refined Signup Form */}
            <div className="flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-white/50 backdrop-blur-sm lg:order-1">
                <div className="max-w-[440px] w-full space-y-10">
                    <div className="lg:hidden flex items-center gap-2.5 mb-12">
                        <GraduationCap className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-outfit">StudioSchool</span>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-extrabold text-slate-900 font-outfit tracking-tight">Get Started</h1>
                        <p className="text-slate-500 font-medium text-lg">Create your professional educator account</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[13px] font-bold flex items-center gap-3 animate-shake">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSignup} className="space-y-6">
                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="Prof. John Doe"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Institution Name</label>
                            <div className="relative group">
                                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="Greenwood High School"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Unique Identifier (ID)</label>
                            <div className="relative group">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="e.g. greenwood-primary"
                                    required
                                />
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-wider">This will be your school's private domain ID</p>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Institution Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="admin@school.ac.in"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Secure Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="At least 6 characters"
                                    minLength={6}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4.5 bg-primary text-white rounded-[20px] font-bold hover:bg-primary/90 transition-all shadow-2xl shadow-primary/20 disabled:opacity-70 disabled:cursor-not-allowed group active:scale-95 py-4"
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Create Account <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            <span className="bg-white px-4">Already have an account?</span>
                        </div>
                    </div>

                    <Link href="/login" className="w-full flex items-center justify-center py-4 bg-white border border-slate-200 text-slate-700 rounded-[20px] font-bold hover:bg-slate-50 transition-all hover:border-slate-300">
                        Sign In Instead
                    </Link>
                </div>
            </div>
        </div>
    );
}
