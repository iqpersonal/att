"use client";

import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/lib/rbac";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

interface RoleGuardProps {
    children: React.ReactNode;
    permission?: string;
    roles?: string[];
    fallback?: React.ReactNode;
}

export function RoleGuard({ children, permission, roles, fallback }: RoleGuardProps) {
    const { role, loading } = useAuth();
    const router = useRouter();

    const hasAccess = () => {
        if (!role) return false;
        if (role === 'super-admin') return true;
        
        if (roles && roles.includes(role)) return true;
        if (permission && canAccess(role, permission)) return true;
        
        // If neither permission nor roles provided, allow all authenticated
        if (!permission && !roles) return true;
        
        return false;
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!hasAccess()) {
        if (fallback) return <>{fallback}</>;
        
        return (
            <div className="flex flex-col items-center justify-center h-[70vh] p-6 text-center">
                <div className="h-20 w-20 bg-red-50 rounded-full flex items-center justify-center mb-6">
                    <ShieldAlert className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2 font-outfit">Access Denied</h2>
                <p className="text-slate-600 max-w-md mb-8">
                    You don't have the required permissions to access this section. 
                    Please contact your administrator if you believe this is an error.
                </p>
                <button 
                    onClick={() => router.push('/dashboard')}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:shadow-lg transition-all"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    return <>{children}</>;
}