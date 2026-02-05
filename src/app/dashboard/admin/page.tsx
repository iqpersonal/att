"use client";

export const dynamic = 'force-dynamic';

import { useAuth } from "@/context/AuthContext";
import { RoleGuard } from "@/components/RoleGuard";

export default function AdminDashboardPage() {
    return (
        <RoleGuard roles={['super-admin']}>
            <div className="p-8">
                <h1 className="text-3xl font-bold mb-6 font-outfit">System Overview</h1>
                <p className="text-slate-600">Welcome to the Super Admin control panel.</p>
                {/* Admin specific content here */}
            </div>
        </RoleGuard>
    );
}
