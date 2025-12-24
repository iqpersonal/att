import Link from "next/link";
import { GraduationCap, ArrowRight, CheckCircle2, Shield, Zap, Target } from "lucide-react";

export default function Home() {
    return (
        <main className="min-h-screen bg-[#F8FAFC]">
            {/* Navigation */}
            <nav className="fixed top-0 inset-x-0 z-50 glass border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-primary/10 p-2 rounded-xl">
                            <GraduationCap className="h-6 w-6 text-primary" />
                        </div>
                        <span className="text-2xl font-extrabold text-[#0F172A] tracking-tight font-outfit">
                            Studio<span className="text-primary">School</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors">
                            Sign In
                        </Link>
                        <Link href="/signup" className="px-6 py-3 text-sm font-bold text-white bg-primary rounded-2xl hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:scale-105 active:scale-95">
                            Get Started
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-32 px-8 overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/5 border border-primary/10 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-fade-in">
                        <Zap className="h-3 w-3" /> The Future of School Management
                    </div>
                    <h1 className="text-6xl md:text-7xl font-extrabold text-[#0F172A] mb-8 tracking-tight max-w-4xl font-outfit leading-[1.1]">
                        Elevate Your School with <span className="text-primary italic">Intelligence</span>
                    </h1>
                    <p className="text-lg md:text-xl text-slate-500 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
                        A clean, modern platform designed for elite educational institutions.
                        Streamline attendance, student roster, and engagement with ease.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-5">
                        <Link href="/signup" className="flex items-center justify-center gap-2 px-10 py-5 bg-primary text-white rounded-[20px] font-bold hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 group">
                            Start Free Trial <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="flex items-center justify-center gap-2 px-10 py-5 bg-white text-slate-700 border border-slate-100 rounded-[20px] font-bold hover:bg-slate-50 transition-all shadow-xl shadow-slate-200/50">
                            Book a Demo
                        </button>
                    </div>

                    {/* Background Visual Elements */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full h-[800px]">
                        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] opacity-40 animate-float" />
                        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[150px] opacity-30 animate-float" style={{ animationDelay: '-3s' }} />
                    </div>
                </div>
            </section>

            {/* Stats / Proof */}
            <section className="px-8 pb-32">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-white rounded-[48px] p-12 shadow-2xl shadow-slate-200/50 border border-slate-100">
                        <div className="grid md:grid-cols-3 gap-12 divide-y md:divide-y-0 md:divide-x divide-slate-50">
                            {[
                                { title: "Seamless Attendance", desc: "Automated digital logs with real-time analytics for every class.", icon: CheckCircle2 },
                                { title: "Professional Roster", desc: "Comprehensive student profiles with history and performance tracking.", icon: Target },
                                { title: "Secure & Reliable", desc: "Enterprise-grade security ensuring your school data stays safe.", icon: Shield }
                            ].map((feature, i) => (
                                <div key={i} className="pt-8 md:pt-0 md:px-12 first:pl-0 last:pr-0">
                                    <div className="bg-primary/5 w-14 h-14 rounded-2xl flex items-center justify-center mb-8">
                                        <feature.icon className="h-7 w-7 text-primary" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-[#0F172A] mb-4 font-outfit">{feature.title}</h3>
                                    <p className="text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="px-8 py-20 border-t border-slate-100 bg-white">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2.5 opacity-50 grayscale">
                        <GraduationCap className="h-6 w-6 text-slate-900" />
                        <span className="text-xl font-extrabold text-slate-900 tracking-tight font-outfit uppercase">
                            StudioSchool
                        </span>
                    </div>
                    <div className="text-slate-400 text-sm font-medium">
                        &copy; 2025 StudioSchool Inc. All rights reserved.
                    </div>
                </div>
            </footer>
        </main>
    );
}
