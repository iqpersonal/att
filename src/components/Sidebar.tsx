"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import {
    LayoutDashboard,
    Users,
    Calendar,
    LogOut,
    Settings,
    GraduationCap,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Target,
    Lock,
    Building2,
    Megaphone,
    Crown,
    Share2,
    MessageSquare,
    Send
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSidebar } from "@/context/SidebarContext";

interface MenuItem {
    title: string;
    icon: any;
    href: string;
    feature?: string;
}

const menuItems: MenuItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
    { title: "Students", icon: Users, href: "/dashboard/students" },
    { title: "Leads", icon: Target, href: "/dashboard/leads", feature: "leads" },
    { title: "Social Connect", icon: Share2, href: "/dashboard/leads/integrations", feature: "leads" },
    { title: "Batches", icon: GraduationCap, href: "/dashboard/batches" },
    { title: "Attendance", icon: Calendar, href: "/dashboard/attendance" },
    { title: "WhatsApp Center", icon: Send, href: "/dashboard/messaging" },
    { title: "Chat Center", icon: MessageSquare, href: "/dashboard/messaging/chats" },
    { title: "Settings", icon: Settings, href: "/dashboard/settings" },
];

const superAdminItems: MenuItem[] = [
    { title: "Overview", icon: LayoutDashboard, href: "/dashboard/admin" },
    { title: "Schools", icon: Building2, href: "/dashboard/admin/schools" },
    { title: "Announcements", icon: Megaphone, href: "/dashboard/admin/announcements" },
    { title: "Settings", icon: Settings, href: "/dashboard/admin/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { role, features } = useAuth();
    const { isCollapsed, toggle } = useSidebar();

    const currentItems = role === "super-admin" ? superAdminItems : menuItems;

    const handleLogout = async () => {
        await signOut(auth);
        router.push("/");
    };

    return (
        <aside
            className={`${isCollapsed ? "w-20" : "w-72"} bg-white border-r border-slate-100 flex flex-col fixed inset-y-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-all duration-300 group/sidebar`}
        >
            {/* Toggle Button - Visible on Sidebar Hover */}
            <button
                onClick={toggle}
                className="absolute -right-3 top-10 h-7 w-7 bg-white border border-slate-100 rounded-full flex items-center justify-center shadow-md text-slate-400 hover:text-primary transition-all opacity-0 group-hover/sidebar:opacity-100 z-[60]"
            >
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>

            {/* Logo Section */}
            <div className={`flex items-center gap-3 mb-10 mt-8 px-6 ${isCollapsed ? "justify-center px-0" : ""}`}>
                <div className="bg-primary/10 p-2.5 rounded-2xl shrink-0">
                    <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                {!isCollapsed && (
                    <span className="text-xl font-extrabold text-[#0D121F] tracking-tight font-outfit whitespace-nowrap animate-in fade-in duration-500">
                        Studio<span className="text-primary">School</span>
                    </span>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 px-3">
                {!isCollapsed && (
                    <p className="px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-6 truncate animate-in fade-in duration-500">
                        Internal Systems
                    </p>
                )}

                <div className="space-y-1.5">
                    {currentItems.map((item) => {
                        const isActive = pathname === item.href;
                        const isLocked = item.feature && !features.includes(item.feature) && role !== "super-admin";

                        return (
                            <Link
                                key={item.title}
                                href={isLocked ? "#" : item.href}
                                onClick={(e) => isLocked && e.preventDefault()}
                                title={isCollapsed ? item.title : ""}
                                className={`group/item w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300 ${isActive
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 border border-primary/10"
                                    : isLocked
                                        ? "text-slate-300 cursor-not-allowed border border-transparent"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                                    } ${isCollapsed ? "justify-center px-0 h-12 w-12 mx-auto" : ""}`}
                            >
                                <item.icon className={`h-5 w-5 shrink-0 transition-transform duration-300 ${isActive ? "scale-105" : "group-hover/item:scale-105"}`} />

                                {!isCollapsed && (
                                    <>
                                        <span className="font-bold text-[14px] whitespace-nowrap flex-1">{item.title}</span>
                                        {isLocked ? (
                                            <Lock className="h-3 w-3 opacity-40" />
                                        ) : isActive ? (
                                            <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all text-slate-300" />
                                        )}
                                    </>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Logout Section */}
            <div className={`mt-auto pb-8 pt-6 border-t border-slate-50 ${isCollapsed ? "px-0" : "px-4"}`}>
                <button
                    onClick={handleLogout}
                    title={isCollapsed ? "Sign Out" : ""}
                    className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-slate-400 hover:text-red-500 hover:bg-red-50/50 rounded-2xl transition-all group font-bold text-[14px] ${isCollapsed ? "justify-center px-0 h-12 w-12 mx-auto" : ""}`}
                >
                    <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform shrink-0" />
                    {!isCollapsed && <span className="whitespace-nowrap">Sign Out</span>}
                </button>
            </div>
        </aside>
    );
}
