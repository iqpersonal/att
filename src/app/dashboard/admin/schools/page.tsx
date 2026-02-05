"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import {
    Building2,
    Search,
    Loader2,
    Calendar,
    Crown,
    Target,
    AlertCircle,
    Plus,
    X,
    BookOpen,
    GraduationCap,
    Clock
} from "lucide-react";

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface Tenant {
    id: string;
    name: string;
    ownerId: string;
    createdAt: string;
    status: "active" | "suspended";
    features?: string[];
    studentCount?: number;
}
