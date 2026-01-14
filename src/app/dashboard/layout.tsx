"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { SidebarProvider, useSidebar } from "@/context/SidebarContext";
import { usePathname } from "next/navigation";
import { RoleGuard } from "@/components/RoleGuard";
import { MENU_PERMISSIONS } from "@/lib/rbac";
import ErrorBoundary from "@/components/ErrorBoundary";

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();
    const pathname = usePathname();

    // Get permission for current path
    const requiredPermission = MENU_PERMISSIONS[pathname];

    return (
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? "ml-20" : "ml-72"}`}>
            <ErrorBoundary>
                <RoleGuard permission={requiredPermission}>
                    {children}
                </RoleGuard>
            </ErrorBoundary>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SidebarProvider>
            <div className="min-h-screen bg-[#F8FAFC] flex">
                <Sidebar />
                <DashboardContent>
                    {children}
                </DashboardContent>
            </div>
        </SidebarProvider>
    );
}