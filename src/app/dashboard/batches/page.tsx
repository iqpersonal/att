"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, where } from "firebase/firestore";

import { useAuth } from "@/context/AuthContext";
import {
    GraduationCap,
    Users,
    ArrowUpRight,
    Layers,
    Calendar as CalendarIcon,
    ChevronRight,
    Search,
    BookOpen
} from "lucide-react";
import Link from "next/link";

interface Batch {
    id: string;
    name: string;
    studentCount: number;
    description?: string;
}

export default function BatchesPage() {
    const { tenantId } = useAuth();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const studentsRef = collection(db, "students");
                const q = query(studentsRef, where("tenantId", "==", tenantId || "studio-school-beta"));
                const snapshot = await getDocs(q);

                const classMap: Record<string, number> = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const className = data.class || "Unassigned";
                    classMap[className] = (classMap[className] || 0) + 1;
                });

                const batchList: Batch[] = Object.entries(classMap).map(([name, count]) => ({
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    name,
                    studentCount: count,
                    description: `Standard academic group for ${name} students.`
                }));

                setBatches(batchList);
            } catch (error) {
                console.error("Error fetching batches:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchBatches();
    }, []);

    const filteredBatches = batches.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-12">
            {/* Header */}
            <header className="flex items-center justify-between mb-16">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-[0.2em] mb-1">
                        <Layers className="h-4 w-4" />
                        Academic Management
                    </div>
                    <h1 className="text-5xl font-extrabold text-[#0D121F] font-outfit tracking-tighter">
                        Course <span className="text-primary/40">Batches</span>
                    </h1>
                </div>
            </header>

            {/* Filters & Search */}
            <div className="mb-12">
                <div className="relative max-w-2xl">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Find a specific batch or class group..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-[32px] py-6 pl-16 pr-8 text-slate-900 placeholder:text-slate-300 font-bold shadow-sm focus:outline-none focus:ring-4 ring-primary/5 transition-all text-lg"
                    />
                </div>
            </div>

            {/* Batch Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-72 bg-white rounded-[48px] animate-pulse border border-slate-50" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredBatches.map((batch) => (
                        <Link
                            key={batch.id}
                            href={`/dashboard/batches/${batch.name}`}
                            className="bg-white p-10 rounded-[56px] border border-slate-50 shadow-sm hover:shadow-2xl hover:shadow-primary/10 transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-10 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0">
                                <ArrowUpRight className="h-6 w-6 text-primary" />
                            </div>
                            <div className="h-16 w-16 rounded-[24px] bg-primary/5 text-primary flex items-center justify-center mb-10 group-hover:scale-110 transition-transform duration-500">
                                <GraduationCap className="h-8 w-8" />
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-3xl font-extrabold text-[#0D121F] font-outfit group-hover:text-primary transition-colors">
                                    {batch.name}
                                </h3>
                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 text-slate-400 font-bold text-sm">
                                        <Users className="h-4 w-4" />
                                        {batch.studentCount} Students
                                    </div>
                                    <div className="flex items-center gap-2 text-primary font-bold text-sm bg-primary/5 px-3 py-1 rounded-full">
                                        Active
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredBatches.length === 0 && (
                <div className="py-24 bg-white rounded-[56px] border border-dashed border-slate-200 text-center">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BookOpen className="h-10 w-10 text-slate-200" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 font-outfit mb-2">No batches found</h3>
                    <p className="text-slate-400 max-w-sm mx-auto font-medium">Try searching for a different class name or assign students to classes first.</p>
                </div>
            )}
        </div>
    );
}
