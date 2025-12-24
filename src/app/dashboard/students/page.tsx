"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    UserPlus,
    Search,
    MoreVertical,
    Filter,
    Loader2,
    X,
    GraduationCap,
    Mail,
    Hash,
    BookOpen,
    ArrowUpRight,
    ChevronDown,
    MessageSquare,
    Phone
} from "lucide-react";
import { sendEmail, sendWhatsApp } from "@/lib/messaging";
import { useAuth } from "@/context/AuthContext";

interface Student {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    class: string;
    gender: string;
    phoneNumber?: string;
    tenantId: string;
    status: "active" | "inactive";
}


export default function StudentsPage() {
    const { tenantId } = useAuth();
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // New Student Form State
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newRoll, setNewRoll] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [notifying, setNotifying] = useState<string | null>(null);
    const [newClass, setNewClass] = useState("");
    const [newGender, setNewGender] = useState("male");
    const [submitting, setSubmitting] = useState(false);

    const handleAnnouncement = async (student: Student, method: 'email' | 'whatsapp') => {
        setNotifying(student.id);
        const subject = "School Announcement";
        const emailBody = `
            <h2>Announcement from StudioSchool</h2>
            <p>Hello ${student.name},</p>
            <p>We are reaching out with an important update regarding your academic status and upcoming schedules.</p>
            <p>Please check your dashboard for more details.</p>
            <p>Regards,<br>StudioSchool Team</p>
        `;

        try {
            if (method === 'email') {
                await sendEmail(student.email, subject, emailBody);
            } else {
                // Meta requires pre-approved templates. Using 'general_announcement' as a default.
                await sendWhatsApp(
                    student.phoneNumber || student.email,
                    "general_announcement",
                    [
                        {
                            type: "body",
                            parameters: [
                                { type: "text", text: student.name }
                            ]
                        }
                    ],
                    tenantId || "studio-school-beta"
                );
            }
            alert(`Message sent to ${student.name} via ${method}`);
        } catch (error) {
            console.error("Announcement error:", error);
            alert("Failed to send message.");
        } finally {
            setNotifying(null);
        }
    };

    useEffect(() => {
        const q = query(
            collection(db, "students"),
            where("tenantId", "==", tenantId || "studio-school-beta")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const studentData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Student[];
            setStudents(studentData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await addDoc(collection(db, "students"), {
                name: newName,
                email: newEmail,
                rollNumber: newRoll,
                class: newClass,
                gender: newGender,
                phoneNumber: newPhone,
                tenantId: tenantId || "studio-school-beta",
                status: "active",
                createdAt: serverTimestamp(),
            });
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            console.error("Error adding student:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const resetForm = () => {
        setNewName("");
        setNewEmail("");
        setNewRoll("");
        setNewPhone("");
        setNewClass("");
        setNewGender("male");
    };

    const filteredStudents = students.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.rollNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-12 min-h-screen bg-[#F8FAFC]">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
                <div className="space-y-1">
                    <h1 className="text-4xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Student Roster</h1>
                    <p className="text-slate-400 font-medium font-outfit">Manage and monitor student enrollments and records.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-[24px] font-bold shadow-2xl shadow-primary/30 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                >
                    <UserPlus className="h-5 w-5" />
                    Enroll New Student
                </button>
            </header>

            {/* Enhanced Filters & Search */}
            <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
                <div className="flex-1 w-full relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder="Search students by name, roll number, or class..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-100 rounded-[28px] pl-14 pr-6 py-4.5 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                    />
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button className="flex items-center gap-2 px-8 py-4.5 bg-white border border-slate-100 rounded-[24px] text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm group">
                        <Filter className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                        Refine Search
                        <ChevronDown className="h-4 w-4 ml-1 opacity-40" />
                    </button>
                    <div className="h-12 w-px bg-slate-100 hidden md:block" />
                    <p className="text-sm font-bold text-slate-400 whitespace-nowrap px-2">
                        {filteredStudents.length} Students Total
                    </p>
                </div>
            </div>

            {/* Contemporary Student Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-50">
                                <th className="px-10 py-7 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Student Details</th>
                                <th className="px-10 py-7 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Roll Index</th>
                                <th className="px-10 py-7 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Classification</th>
                                <th className="px-10 py-7 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Current Status</th>
                                <th className="px-10 py-7 text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="relative">
                                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="h-6 w-6 bg-white rounded-full" />
                                                </div>
                                            </div>
                                            <p className="text-slate-900 font-bold text-lg font-outfit">Retrieving Roster</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="bg-slate-50 p-6 rounded-full">
                                                <Search className="h-10 w-10 text-slate-200" />
                                            </div>
                                            <p className="text-slate-900 font-bold text-xl">No Matches Found</p>
                                            <p className="text-slate-400 font-medium">Try adjusting your filters or search keywords.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-primary/[0.01] transition-colors group">
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="h-12 w-12 rounded-3xl bg-primary/5 flex items-center justify-center text-primary font-bold text-sm tracking-tighter group-hover:scale-110 transition-all duration-300">
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-[#0D121F] text-base group-hover:text-primary transition-colors">{student.name}</div>
                                                    <div className="text-sm text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                                                        <Mail className="h-3 w-3 opacity-40" />
                                                        {student.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2 text-slate-600 font-bold">
                                                <Hash className="h-4 w-4 text-slate-300" />
                                                {student.rollNumber}
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2.5">
                                                <div className="bg-slate-50 p-2 rounded-xl text-slate-400">
                                                    <BookOpen className="h-4 w-4" />
                                                </div>
                                                <span className="font-bold text-slate-700 text-sm">Class {student.class}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-7">
                                            <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Active
                                            </span>
                                        </td>
                                        <td className="px-10 py-7">
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    onClick={() => handleAnnouncement(student, 'email')}
                                                    disabled={!!notifying}
                                                    title="Send Email"
                                                    className="p-3 bg-slate-50 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
                                                >
                                                    {notifying === student.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    onClick={() => handleAnnouncement(student, 'whatsapp')}
                                                    disabled={!!notifying}
                                                    title="Send WhatsApp"
                                                    className="p-3 bg-slate-50 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-2xl transition-all"
                                                >
                                                    <MessageSquare className="h-4 w-4" />
                                                </button>
                                                <div className="h-6 w-px bg-slate-100 mx-1" />
                                                <button className="p-3 text-slate-200 hover:text-slate-500 hover:bg-slate-50 rounded-2xl transition-all">
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Polished Enrollment Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[48px] w-full max-w-2xl shadow-3xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                        <div className="p-10 border-b border-slate-50 flex items-center justify-between relative">
                            <div className="space-y-1">
                                <h2 className="text-3xl font-extrabold text-[#0D121F] font-outfit tracking-tight">Student Enrollment</h2>
                                <p className="text-slate-400 font-medium font-outfit">Fill in the official details to enroll a new student.</p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-4 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all group"
                            >
                                <X className="h-6 w-6 group-hover:rotate-90 transition-transform" />
                            </button>
                        </div>

                        <form onSubmit={handleAddStudent} className="p-12 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Legal Name</label>
                                    <div className="relative group">
                                        <GraduationCap className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Email Identifier</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="email"
                                            required
                                            value={newEmail}
                                            onChange={(e) => setNewEmail(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                            placeholder="john@school.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Official Roll Number</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={newRoll}
                                            onChange={(e) => setNewRoll(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                            placeholder="Index: 101"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number (WhatsApp)</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="tel"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                            placeholder="e.g. +919000000000"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Academic Class</label>
                                    <div className="relative group">
                                        <BookOpen className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input
                                            type="text"
                                            required
                                            value={newClass}
                                            onChange={(e) => setNewClass(e.target.value)}
                                            className="w-full pl-14 pr-6 py-4.5 bg-slate-50 border border-slate-100 rounded-[24px] focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-slate-900 font-bold placeholder:text-slate-300"
                                            placeholder="e.g. 10A"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2 space-y-4">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Gender Specification</label>
                                    <div className="flex gap-6">
                                        {["male", "female", "other"].map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setNewGender(g)}
                                                className={`flex-1 py-4.5 rounded-[24px] font-extrabold border-2 transition-all capitalize text-sm tracking-wide ${newGender === g
                                                    ? "bg-primary text-white border-primary shadow-xl shadow-primary/20 active:scale-95"
                                                    : "bg-white text-slate-400 border-slate-50 hover:border-slate-100 hover:text-slate-600"
                                                    }`}
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 flex gap-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-5 bg-slate-50 text-slate-500 rounded-[24px] font-bold hover:bg-slate-100 transition-all active:scale-95"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-5 bg-primary text-white rounded-[24px] font-bold hover:bg-primary/90 transition-all shadow-2xl shadow-primary/30 disabled:opacity-70 flex items-center justify-center gap-3 active:scale-95 group"
                                >
                                    {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                        <>
                                            Save Enrollment Record <ArrowUpRight className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
