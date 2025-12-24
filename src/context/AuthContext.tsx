"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextType {
    user: User | null;
    tenantId: string | null;
    role: string | null;
    isSuspended: boolean;
    features: string[];
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    tenantId: null,
    role: null,
    isSuspended: false,
    features: [],
    loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [isSuspended, setIsSuspended] = useState(false);
    const [features, setFeatures] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Fetch tenantId from Firestore user profile
                try {
                    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        const tid = userData.tenantId || null;
                        setTenantId(tid);
                        setRole(userData.role || "admin");

                        // Check if tenant is suspended and fetch features
                        if (tid) {
                            const tenantDoc = await getDoc(doc(db, "tenants", tid));
                            if (tenantDoc.exists()) {
                                const tData = tenantDoc.data();
                                setFeatures(tData.features || []);

                                if (userData.role !== "super-admin" && tData.status === "suspended") {
                                    setIsSuspended(true);
                                } else {
                                    setIsSuspended(false);
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user tenantId:", error);
                }
                setUser(firebaseUser);
            } else {
                setUser(null);
                setTenantId(null);
                setRole(null);
                setIsSuspended(false);
                setFeatures([]);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, tenantId, role, isSuspended, features, loading }}>
            {isSuspended ? (
                <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-center">
                    <div className="max-w-md space-y-6">
                        <div className="h-20 w-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto text-red-500">
                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-black text-white font-outfit">Access Suspended</h1>
                        <p className="text-slate-400 font-medium font-outfit">
                            This institution has been temporarily suspended by the platform administrator. Please contact support for more information.
                        </p>
                    </div>
                </div>
            ) : (
                !loading && children
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
