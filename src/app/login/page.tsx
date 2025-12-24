"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { GraduationCap, Mail, Lock, ArrowRight, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/dashboard");
        } catch (err: any) {
            setError(err.message || "Failed to sign in. Please check your credentials.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
            {/* Left Side Visual - Modern Education Vibe */}
            <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-[#0F172A]">
                <div className="relative z-10 flex items-center gap-3">
                    <div className="bg-primary/20 p-2.5 rounded-2xl backdrop-blur-xl border border-white/10">
                        <GraduationCap className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <span className="text-2xl font-extrabold text-white tracking-tight font-outfit">
                        Studio<span className="text-primary">School</span>
                    </span>
                </div>

                <div className="relative z-10 space-y-8 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                        <Sparkles className="h-3 w-3" /> Intelligence for Educators
                    </div>
                    <h2 className="text-5xl font-extrabold text-white leading-[1.2] font-outfit">
                        Empowering the next generation of <span className="text-primary italic">leaders.</span>
                    </h2>
                    <p className="text-slate-400 text-lg font-medium leading-relaxed">
                        Join elite institutions worldwide using StudioSchool to master their operations and student engagement.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 p-8 glass rounded-[32px] border-white/5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 shadow-xl shadow-primary/20" />
                    <div>
                        <p className="text-white font-bold">Trusted by 2,000+ Schools</p>
                        <p className="text-slate-500 text-sm font-medium italic">"The benchmark in education software"</p>
                    </div>
                </div>

                {/* Animated Background Decor */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -mr-40 -mt-40 animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -ml-20 -mb-20 animate-float" />
            </div>

            {/* Right Side - Refined Form */}
            <div className="flex flex-col items-center justify-center p-8 md:p-16 lg:p-24 bg-white/50 backdrop-blur-sm">
                <div className="max-w-[440px] w-full space-y-10">
                    <div className="lg:hidden flex items-center gap-2.5 mb-12">
                        <GraduationCap className="h-8 w-8 text-primary" />
                        <span className="text-2xl font-extrabold text-slate-900 tracking-tight font-outfit">StudioSchool</span>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-4xl font-extrabold text-slate-900 font-outfit tracking-tight">Welcome Back</h1>
                        <p className="text-slate-500 font-medium text-lg">Sign in to your professional dashboard</p>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-[13px] font-bold flex items-center gap-3 animate-shake">
                            <div className="h-2 w-2 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2.5">
                            <label className="text-[13px] font-bold text-slate-700 ml-1 uppercase tracking-wider">Work Email</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="name@school.com"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Password</label>
                                <Link href="/forgot-password" title="Forgot Password" className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors">
                                    Forgot?
                                </Link>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-slate-900 font-medium placeholder:text-slate-400"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 ml-1 py-1">
                            <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-200 text-primary focus:ring-primary/10 transition-all cursor-pointer" />
                            <span className="text-[14px] font-semibold text-slate-500">Stay signed in for 30 days</span>
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
                                    Sign In <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                        <div className="relative flex justify-center text-[12px] font-bold uppercase tracking-[0.2em] text-slate-400">
                            <span className="bg-white px-4">New to StudioSchool?</span>
                        </div>
                    </div>

                    <Link href="/signup" className="w-full flex items-center justify-center py-4 bg-white border border-slate-200 text-slate-700 rounded-[20px] font-bold hover:bg-slate-50 transition-all hover:border-slate-300">
                        Create Professional Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
