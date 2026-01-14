"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    onSnapshot,
    orderBy,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    limit,
    getDocs,
    startAfter,
    QueryConstraint,
    QueryDocumentSnapshot
} from "firebase/firestore";
import {
    Search,
    Send,
    User,
    MessageSquare,
    Loader2,
    CheckCircle2,
    Clock,
    X,
    MoreVertical,
    Phone,
    Video,
    Paperclip,
    Smile,
    ChevronLeft,
    Check,
    CheckCheck,
    ChevronDown
} from "lucide-react";
import { format } from "date-fns";
import { sendWhatsAppFreeText } from "@/lib/messaging";

interface Message {
    id: string;
    text: string;
    type: 'inbound' | 'outbound';
    status?: 'sent' | 'delivered' | 'read';
    timestamp: any;
    metaId?: string;
    message?: string;
}

interface Conversation {
    id: string;
    participantName: string;
    participantPhone: string;
    lastMessage: string;
    lastContactTime: any;
    unreadCount: number;
    updatedAt: any;
}

const CONVERSATIONS_PER_PAGE = 50;

export default function ChatsPage() {
    const { tenantId, user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const fetchConversations = async (reset = true) => {
        if (!tenantId || tenantId === 'undefined') return;
        if (!reset) setLoadingMore(true);
        try {
            const constraints: QueryConstraint[] = [
                orderBy("updatedAt", "desc"),
                limit(CONVERSATIONS_PER_PAGE + 1)
            ];
            if (!reset && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }
            const q = query(collection(db, "tenants", tenantId, "conversations"), ...constraints);
            const snapshot = await getDocs(q);
            const docs = snapshot.docs;
            const hasMoreItems = docs.length > CONVERSATIONS_PER_PAGE;
            const itemsToShow = docs.slice(0, CONVERSATIONS_PER_PAGE);
            const convoList = itemsToShow.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Conversation[];
            if (reset) {
                setConversations(convoList);
            } else {
                setConversations(prev => [...prev, ...convoList]);
            }
            setHasMore(hasMoreItems);
            if (itemsToShow.length > 0) {
                setLastDoc(itemsToShow[itemsToShow.length - 1]);
            }
            setLoading(false);
        } catch (error) {
            console.error("Error fetching conversations:", error);
            setLoading(false);
        } finally {
            if (!reset) setLoadingMore(false);
        }
    };

    useEffect(() => {
        if (!tenantId || tenantId === 'undefined') return;
        fetchConversations(true);
    }, [tenantId]);

    useEffect(() => {
        if (!tenantId || !selectedConvo || tenantId === 'undefined') return;

        const q = query(
            collection(db, "tenants", tenantId, "conversations", selectedConvo.id, "messages"),
            orderBy("timestamp", "asc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const data = (snapshot.docs || []).map(doc => {
                    const docData = doc.data();
                    return {
                        id: doc.id,
                        text: docData.text || docData.message, 
                        ...docData
                    };
                }) as Message[];
                setMessages(data);

                if (selectedConvo.unreadCount > 0) {
                    updateDoc(doc(db, "tenants", tenantId, "conversations", selectedConvo.id), {
                        unreadCount: 0
                    });
                }
            },
            (error) => {
                console.error("[Chat] Listener error:", error);
            }
        );

        return () => {
            unsubscribe();
        };
    }, [tenantId, selectedConvo]);

    useEffect(() => {
        const messagesContainer = document.querySelector('[data-messages-container]');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedConvo || !tenantId) return;

        const text = newMessage;
        setNewMessage("");
        setSending(true);

        try {
            const result = await sendWhatsAppFreeText(selectedConvo.participantPhone, text, tenantId);

            if (result.success) {
                const convoRef = doc(db, "tenants", tenantId, "conversations", selectedConvo.id);
                const msgId = result.data?.messages?.[0]?.id;
                
                await addDoc(collection(convoRef, "messages"), {
                    text,
                    type: "outbound",
                    status: "sent",
                    metaId: msgId,
                    timestamp: serverTimestamp()
                });
                
                await updateDoc(convoRef, {
                    lastMessage: text,
                    updatedAt: serverTimestamp()
                });
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err: any) {
            console.error(err);
            alert("Failed to send message.");
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = (conversations || []).filter(c => {
        const displayName = c.participantName ?? c.participantPhone ?? "Unknown";
        return displayName.toLowerCase().includes(searchQuery.toLowerCase()) || (c.participantPhone ?? "").includes(searchQuery);
    });

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 p-6 overflow-hidden">
            <div className="w-80 lg:w-96 bg-white rounded-[32px] border border-slate-100 flex flex-col overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50">
                    <h1 className="text-xl font-bold text-slate-900 mb-4 font-outfit">Messages</h1>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-700 group-focus-within:text-primary transition-colors" />
                        <input
                            type="text"
                            placeholder="Search chats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-primary/10 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filteredConversations.length === 0 ? (
                        <div className="text-center py-10 text-slate-700">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">No chats found</p>
                        </div>
                    ) : (
                        <>
                            {filteredConversations.map(convo => {
                                const displayName = convo.participantName ?? convo.participantPhone ?? "Unknown";
                                const avatarLetter = (displayName ?? "?").charAt(0);
                                return (
                                    <button
                                        key={convo.id}
                                        onClick={() => setSelectedConvo(convo)}
                                        className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedConvo?.id === convo.id
                                                ? "bg-primary/5 border border-primary/20 shadow-sm"
                                                : "hover:bg-slate-50 border border-transparent"
                                            }`}
                                    >
                                        <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-800 shrink-0 uppercase font-bold border-2 border-white shadow-sm">
                                            {avatarLetter}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-bold text-slate-900 truncate">
                                                    {displayName}
                                                    {convo.participantName && convo.participantPhone && (
                                                        <span className="ml-1 text-[10px] font-normal text-slate-500">
                                                            ({convo.participantPhone})
                                                        </span>
                                                    )}
                                                </p>
                                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                                                    {convo.updatedAt?.toDate ? format(convo.updatedAt.toDate(), "h:mm a") : ""}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs text-slate-800 truncate font-medium">{convo.lastMessage ?? "No message"}</p>
                                                {convo.unreadCount > 0 && (
                                                    <span className="h-5 w-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                                                        {convo.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
                {selectedConvo ? (
                    <>
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white z-10 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shadow-inner">
                                    {(selectedConvo.participantName || selectedConvo.participantPhone || "?").charAt(0)}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 font-outfit">
                                        {selectedConvo.participantName ?? selectedConvo.participantPhone ?? "Unknown"}
                                        {selectedConvo.participantName && selectedConvo.participantPhone && (
                                            <span className="ml-2 text-sm font-normal text-slate-500">
                                                ({selectedConvo.participantPhone})
                                            </span>
                                        )}
                                    </h2>
                                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700"><Phone className="h-5 w-5" /></button>
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700"><Video className="h-5 w-5" /></button>
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-700"><MoreVertical className="h-5 w-5" /></button>
                            </div>
                        </div>

                        <div data-messages-container className="flex-1 overflow-y-auto p-8 space-y-4 bg-gradient-to-b from-slate-50/50 to-white">
                            {(messages || []).map((msg, idx) => {
                                const isOutbound = msg.type === "outbound";
                                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                                const showTimestamp = idx === 0 || (prevMsg && msg.timestamp?.seconds - prevMsg.timestamp?.seconds > 300);

                                return (
                                    <div key={msg.id} className="space-y-3">
                                        {showTimestamp && (
                                            <div className="flex justify-center my-6">
                                                <span className="px-3 py-1 bg-white/80 backdrop-blur-sm shadow-sm border border-slate-200/50 rounded-full text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                                                    {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "EEEE, MMM d  h:mm a") : "Just now"}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                                            <div className={`max-w-[75%] group relative animate-in ${isOutbound ? "slide-in-from-right-4" : "slide-in-from-left-4"} duration-300`}>
                                                <div className={`px-4 py-3 rounded-2xl shadow-md transition-all hover:shadow-lg ${
                                                    isOutbound
                                                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-br-md"
                                                        : "bg-white text-slate-800 rounded-bl-md border border-slate-100 shadow-sm"
                                                }`}>
                                                    <p className={`text-[15px] font-medium leading-relaxed whitespace-pre-wrap break-words ${isOutbound ? "text-white" : "text-slate-900"}`}>
                                                        {msg.text || msg.message || "(No message content)"}
                                                    </p>
                                                </div>
                                                <div className={`flex items-center gap-1.5 mt-1.5 px-1 ${isOutbound ? "justify-end" : "justify-start"}`}>
                                                    <span className="text-[11px] font-semibold text-slate-500">
                                                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "h:mm a") : "Sending..."}
                                                    </span>
                                                    {isOutbound && (
                                                        msg.status === "read" ? <CheckCheck className="h-4 w-4 text-blue-500" /> :
                                                        msg.status === "delivered" ? <CheckCheck className="h-4 w-4 text-slate-400" /> :
                                                        <Check className="h-4 w-4 text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-6 bg-white border-t border-slate-100 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <button type="button" className="p-3 hover:bg-slate-100 rounded-full transition-all text-slate-600 hover:text-primary">
                                    <Paperclip className="h-5 w-5" />
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        disabled={sending}
                                        className="w-full pl-5 pr-14 py-3.5 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-emerald-500/20 focus:bg-white focus:border-emerald-500/50 transition-all font-normal text-[15px] text-slate-900 outline-none placeholder:text-slate-500"
                                    />
                                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors">
                                        <Smile className="h-5 w-5" />
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                                >
                                    {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
                        <div className="h-24 w-24 bg-slate-50 rounded-[40px] flex items-center justify-center text-slate-200 shadow-inner">
                            <MessageSquare className="h-12 w-12" />
                        </div>
                        <div className="max-w-xs space-y-2">
                            <h3 className="text-xl font-bold text-slate-900 font-outfit">Select a conversation</h3>
                            <p className="text-slate-700 text-sm font-medium">Choose a contact from the list to start messaging in real-time.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}