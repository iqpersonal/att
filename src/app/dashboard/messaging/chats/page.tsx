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
    CheckCheck
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
}

interface Conversation {
    id: string;
    contactName: string;
    contactPhone: string;
    lastMessage: string;
    lastContactTime: any;
    unreadCount: number;
    updatedAt: any;
}

export default function ChatsPage() {
    const { tenantId, user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. Fetch Conversations
    useEffect(() => {
        if (!tenantId) return;

        const q = query(
            collection(db, "tenants", tenantId, "conversations"),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Conversation[];
            setConversations(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [tenantId]);

    // 2. Fetch Messages for selected conversation
    useEffect(() => {
        if (!tenantId || !selectedConvo) return;

        const q = query(
            collection(db, "tenants", tenantId, "conversations", selectedConvo.id, "messages"),
            orderBy("timestamp", "asc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Message[];
            setMessages(data);

            // Mark as read if unreadCount > 0
            if (selectedConvo.unreadCount > 0) {
                updateDoc(doc(db, "tenants", tenantId, "conversations", selectedConvo.id), {
                    unreadCount: 0
                });
            }
        });

        return () => unsubscribe();
    }, [tenantId, selectedConvo]);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !selectedConvo || !tenantId) return;

        const text = newMessage;
        setNewMessage("");
        setSending(true);

        try {
            const result = await sendWhatsAppFreeText(selectedConvo.contactPhone, text, tenantId);

            if (result.success) {
                const convoRef = doc(db, "tenants", tenantId, "conversations", selectedConvo.id);
                const msgId = result.data?.messages?.[0]?.id;

                // 1. Add Message to sub-collection
                await addDoc(collection(convoRef, "messages"), {
                    text,
                    type: 'outbound',
                    status: 'sent',
                    metaId: msgId,
                    timestamp: serverTimestamp()
                });

                // 2. Update Conversation Metadata
                await updateDoc(convoRef, {
                    lastMessage: text,
                    updatedAt: serverTimestamp()
                });
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err: any) {
            console.error("Failed to send message:", err);
            alert("Failed to send message. Is the 24h window open?");
        } finally {
            setSending(false);
        }
    };

    const filteredConversations = conversations.filter(c =>
        c.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.contactPhone.includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-100px)] gap-6 p-6 overflow-hidden">
            {/* Left: Contact List */}
            <div className="w-80 lg:w-96 bg-white rounded-[32px] border border-slate-100 flex flex-col overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-50">
                    <h1 className="text-xl font-bold text-slate-900 mb-4 font-outfit">Messages</h1>
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
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
                        <div className="text-center py-10 text-slate-400">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">No chats found</p>
                        </div>
                    ) : (
                        filteredConversations.map(convo => (
                            <button
                                key={convo.id}
                                onClick={() => setSelectedConvo(convo)}
                                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${selectedConvo?.id === convo.id
                                        ? "bg-primary/5 border border-primary/20 shadow-sm"
                                        : "hover:bg-slate-50 border border-transparent"
                                    }`}
                            >
                                <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0 uppercase font-bold border-2 border-white shadow-sm">
                                    {convo.contactName.charAt(0)}
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-bold text-slate-900 truncate">{convo.contactName}</p>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {convo.updatedAt?.toDate ? format(convo.updatedAt.toDate(), "h:mm a") : ""}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-slate-500 truncate font-medium">{convo.lastMessage}</p>
                                        {convo.unreadCount > 0 && (
                                            <span className="h-5 w-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                                                {convo.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right: Chat Window */}
            <div className="flex-1 bg-white rounded-[40px] border border-slate-100 shadow-sm flex flex-col overflow-hidden relative">
                {selectedConvo ? (
                    <>
                        {/* Header */}
                        <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white z-10 shadow-[0_4px_12px_rgba(0,0,0,0.01)]">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold shadow-inner">
                                    {selectedConvo.contactName.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="font-bold text-slate-900 font-outfit">{selectedConvo.contactName}</h2>
                                    <p className="text-xs text-emerald-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        Active
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"><Phone className="h-5 w-5" /></button>
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"><Video className="h-5 w-5" /></button>
                                <button className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"><MoreVertical className="h-5 w-5" /></button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                            {messages.map((msg, idx) => {
                                const isOutbound = msg.type === 'outbound';
                                const showTimestamp = idx === 0 ||
                                    (messages[idx - 1] && msg.timestamp?.seconds - messages[idx - 1].timestamp?.seconds > 300);

                                return (
                                    <div key={msg.id} className="space-y-4">
                                        {showTimestamp && (
                                            <div className="flex justify-center my-6">
                                                <span className="px-4 py-1.5 bg-white shadow-sm border border-slate-100 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                    {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "EEEE, MMM d • h:mm a") : "Just now"}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] group relative animate-in ${isOutbound ? 'slide-in-from-right-4' : 'slide-in-from-left-4'} duration-300`}>
                                                <div className={`p-4 rounded-[24px] shadow-sm ${isOutbound
                                                        ? 'bg-primary text-white rounded-tr-none'
                                                        : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'
                                                    }`}>
                                                    <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                                </div>
                                                <div className={`flex items-center gap-1.5 mt-2 ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                    <span className="text-[10px] font-bold text-slate-400 pr-1">
                                                        {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), "h:mm a") : ""}
                                                    </span>
                                                    {isOutbound && (
                                                        msg.status === 'read' ? <CheckCheck className="h-3.5 w-3.5 text-blue-500" /> :
                                                            msg.status === 'delivered' ? <CheckCheck className="h-3.5 w-3.5 text-slate-300" /> :
                                                                <Check className="h-3.5 w-3.5 text-slate-300" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-50">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                                <button type="button" className="p-3 hover:bg-slate-50 rounded-2xl transition-colors text-slate-400"><Paperclip className="h-5 w-5" /></button>
                                <div className="flex-1 relative">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type your message..."
                                        disabled={sending}
                                        className="w-full pl-6 pr-14 py-4 bg-slate-50 border-none rounded-[24px] focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/10 transition-all font-medium text-slate-900 outline-none placeholder:text-slate-300"
                                    />
                                    <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-slate-300 hover:text-primary transition-colors">
                                        <Smile className="h-5 w-5" />
                                    </button>
                                </div>
                                <button
                                    type="submit"
                                    disabled={sending || !newMessage.trim()}
                                    className="h-14 w-14 bg-primary text-white rounded-[20px] flex items-center justify-center shadow-xl shadow-primary/30 hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {sending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
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
                            <p className="text-slate-400 text-sm font-medium">Choose a contact from the list to start messaging in real-time.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
