"use client";

import { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  ShieldCheck,
  Clock,
  User,
  Users,
  Search,
  ArrowLeft,
  ChevronRight,
  Pill,
  FileText,
  Calendar,
  Sparkles,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";

export interface ConversationParticipant {
  userId: string;
  doctorId?: string;
  patientId?: string;
  name: string;
  email: string;
  image: string | null;
  role: "doctor" | "patient";
  specialization?: string;
  hospitalAffiliation?: string;
}

export interface ConversationSummary {
  otherUser: ConversationParticipant;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderRole: "doctor" | "patient";
    createdAt: string | Date;
    isRead: boolean;
  } | null;
  unreadCount: number;
}

export interface ChatMessageItem {
  id: string;
  patientUserId: string;
  doctorUserId: string;
  senderId: string;
  senderRole: "patient" | "doctor";
  messageText: string;
  attachmentUrl: string | null;
  isRead: boolean;
  readAt: string | Date | null;
  createdAt: string | Date;
}

export interface ThreadResponse {
  messages: ChatMessageItem[];
  otherUser: ConversationParticipant;
}

const CLINICAL_QUICK_RESPONSES = [
  "Prescription issued — please check your Prescriptions tab.",
  "How are your symptoms progressing today?",
  "Please remember to take your medication with meals and stay hydrated.",
  "Please schedule a follow-up consultation so we can review your vitals.",
  "I have reviewed your inquiry and will follow up shortly.",
];

function DoctorMessagesContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const patientIdParam = searchParams.get("patientId") || searchParams.get("userId");

  const [activePatientUserId, setActivePatientUserId] = useState<string | null>(patientIdParam || null);
  const [searchFilter, setSearchFilter] = useState("");
  const [messageInput, setMessageInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch conversations list
  const { data: conversations = [], isLoading: loadingConversations } = useQuery<ConversationSummary[]>({
    queryKey: ["messages", "conversations"],
    queryFn: async () => {
      const res = await apiFetch<{ data: ConversationSummary[] } | ConversationSummary[]>("/messages/conversations");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray((res as { data: ConversationSummary[] }).data)) {
        return (res as { data: ConversationSummary[] }).data;
      }
      return [];
    },
    refetchInterval: 5000,
  });

  const hasInitializedRef = useRef(false);

  // Automatically select the initial conversation ONCE on load, without overriding manual clicks
  useEffect(() => {
    if (hasInitializedRef.current) return;

    if (patientIdParam) {
      const matched = conversations.find(
        (c) =>
          c.otherUser.userId === patientIdParam ||
          (c.otherUser as any).patientId === patientIdParam ||
          c.otherUser.email === patientIdParam
      );
      if (matched) {
        setActivePatientUserId(matched.otherUser.userId);
        hasInitializedRef.current = true;
      } else if (conversations.length > 0) {
        setActivePatientUserId(patientIdParam);
        hasInitializedRef.current = true;
      }
    } else if (conversations.length > 0) {
      setActivePatientUserId(conversations[0].otherUser.userId);
      hasInitializedRef.current = true;
    }
  }, [patientIdParam, conversations]);

  // 2. Fetch active chat thread
  const { data: threadData, isLoading: loadingThread } = useQuery<ThreadResponse>({
    queryKey: ["messages", "thread", activePatientUserId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ThreadResponse } | ThreadResponse>(`/messages/thread/${activePatientUserId}`);
      if ("data" in res && res.data) return res.data;
      return res as ThreadResponse;
    },
    enabled: !!activePatientUserId,
    refetchInterval: 3000,
  });

// Sync activePatientUserId if resolved
  useEffect(() => {
    if (threadData?.otherUser?.userId && activePatientUserId && activePatientUserId !== threadData.otherUser.userId) {
      if ((threadData.otherUser as any).patientId === activePatientUserId) {
        setActivePatientUserId(threadData.otherUser.userId);
      }
    }
  }, [threadData?.otherUser, activePatientUserId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (threadData?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [threadData?.messages]);

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: (payload: { targetUserId: string; messageText: string }) =>
      apiFetch("/messages/send", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      setMessageInput("");
      queryClient.invalidateQueries({ queryKey: ["messages", "thread", activePatientUserId] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deliver message.");
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activePatientUserId) {
      toast.error("Please select a patient to message.");
      return;
    }
    if (!messageInput.trim()) return;

    sendMutation.mutate({
      targetUserId: activePatientUserId,
      messageText: messageInput.trim(),
    });
  };

  // Filter conversations by search term
  const filteredConversations = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    if (!searchFilter.trim()) return conversations;
    const q = searchFilter.toLowerCase();
    return conversations.filter(
      (c) =>
        c.otherUser.name.toLowerCase().includes(q) ||
        c.otherUser.email.toLowerCase().includes(q) ||
        (c.lastMessage && c.lastMessage.text.toLowerCase().includes(q))
    );
  }, [conversations, searchFilter]);

  const activePatient = useMemo(() => {
    if (threadData?.otherUser) return threadData.otherUser;
    return conversations.find((c) => c.otherUser.userId === activePatientUserId)?.otherUser || null;
  }, [threadData, conversations, activePatientUserId]);

  const formatMessageTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/doctor"
              className="p-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all shrink-0 shadow-2xs cursor-pointer"
              title="Back to Psychologist Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shrink-0">
              <MessageSquare className="w-5 h-5 text-teal-600" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 truncate">
              Patient Messaging & Clinical Chat
            </h1>
          </div>
          <p className="text-xs text-slate-500 pl-0 sm:pl-1">
            Secure, real-time asynchronous communication with your booked clinical patients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/doctor/sessions/prescriptions">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 shadow-2xs">
              <Pill className="w-3.5 h-3.5 text-indigo-600" /> Issue Prescription
            </Button>
          </Link>
          <Link href="/doctor/patients">
            <Button size="sm" className="text-xs bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1.5 shadow-xs">
              <Users className="w-3.5 h-3.5" /> Patient Records
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Dual-Pane Messaging Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-14.5rem)] min-h-[580px]">
        {/* ========================================================================= */}
        {/* LEFT PANE: CONVERSATION LIST (COL 1-4)                                   */}
        {/* ========================================================================= */}
        <div className="md:col-span-4 lg:col-span-4 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {/* Conversation Search Header */}
          <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Booked Patients
              </span>
              <span className="text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                {conversations.length} contacts
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Search patient by name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 h-8 text-xs bg-white border-slate-200 rounded-lg focus-visible:ring-1 focus-visible:ring-teal-500"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {loadingConversations ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Loading patient chats...</p>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <Users className="w-5 h-5" />
                </div>
                <p className="text-xs font-medium text-slate-700">No patient conversations found</p>
                <p className="text-[11px] text-slate-400 max-w-[200px] mx-auto">
                  Patients who book a consultation or appointment with you will automatically appear here.
                </p>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected = c.otherUser.userId === activePatientUserId;
                const hasUnread = c.unreadCount > 0;

                return (
                  <button
                    key={c.otherUser.userId}
                    onClick={() => setActivePatientUserId(c.otherUser.userId)}
                    className={cn(
                      "w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer",
                      isSelected
                        ? "bg-teal-50/70 border-l-4 border-l-teal-600"
                        : "hover:bg-slate-50/80 border-l-4 border-l-transparent"
                    )}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-2xs">
                        {c.otherUser.name.slice(0, 2).toUpperCase()}
                      </div>
                      {hasUnread && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-semibold text-xs text-slate-900 truncate">
                          {c.otherUser.name}
                        </span>
                        {c.lastMessage && (
                          <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                            {formatMessageTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mb-1">
                        {c.otherUser.email}
                      </p>

                      {c.lastMessage ? (
                        <p
                          className={cn(
                            "text-xs truncate",
                            hasUnread ? "font-semibold text-slate-900" : "text-slate-500"
                          )}
                        >
                          {c.lastMessage.senderRole === "doctor" ? "You: " : ""}
                          {c.lastMessage.text}
                        </p>
                      ) : (
                        <p className="text-[11px] italic text-slate-400">Ready to initiate chat</p>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: ACTIVE CHAT THREAD (COL 5-12)                                */}
        {/* ========================================================================= */}
        <div className="md:col-span-8 lg:col-span-8 flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          {activePatient ? (
            <>
              {/* Active Header */}
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {activePatient.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900 truncate">
                        {activePatient.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800 border border-teal-200 shrink-0">
                        Patient
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{activePatient.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href="/doctor/sessions/prescriptions">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shadow-2xs">
                      <Pill className="w-3.5 h-3.5 text-indigo-600" /> Issue Rx
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/20 scrollbar-thin">
                {loadingThread ? (
                  <div className="p-12 text-center space-y-2">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs text-slate-400">Loading conversation history...</p>
                  </div>
                ) : !threadData?.messages || threadData.messages.length === 0 ? (
                  <div className="p-12 text-center space-y-3 max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center mx-auto shadow-2xs">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-sm text-slate-800">
                      Start Clinical Conversation with {activePatient.name}
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      You can send treatment updates, medication instructions, or follow-up questions directly to the patient.
                    </p>
                  </div>
                ) : (
                  threadData.messages.map((msg) => {
                    const isDoctorSender = msg.senderRole === "doctor";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2 max-w-[85%] sm:max-w-[75%]",
                          isDoctorSender ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 mb-1",
                            isDoctorSender
                              ? "bg-teal-700 text-white"
                              : "bg-slate-200 text-slate-700"
                          )}
                        >
                          {isDoctorSender ? "Psy" : "Pt"}
                        </div>

                        <div className="space-y-1">
                          <div
                            className={cn(
                              "p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed shadow-2xs break-words",
                              isDoctorSender
                                ? "bg-teal-600 text-white rounded-br-xs font-normal"
                                : "bg-white border border-slate-200 text-slate-800 rounded-bl-xs"
                            )}
                          >
                            {msg.messageText}
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-1 text-[10px] font-mono px-1",
                              isDoctorSender ? "justify-end text-slate-400" : "text-slate-400"
                            )}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isDoctorSender && (
                              msg.isRead ? (
                                <span title="Read by patient">
                                  <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
                                </span>
                              ) : (
                                <span title="Delivered">
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Template Chips */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/70 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 shrink-0 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" /> Templates:
                </span>
                {CLINICAL_QUICK_RESPONSES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessageInput(tmpl)}
                    className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-white hover:bg-teal-50 hover:text-teal-700 border border-slate-200 text-slate-600 transition-colors shrink-0 cursor-pointer shadow-2xs"
                  >
                    {tmpl}
                  </button>
                ))}
              </div>

              {/* Message Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white">
                <Input
                  type="text"
                  placeholder={`Send clinical message to ${activePatient.name}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendMutation.isPending}
                  className="h-10 text-xs sm:text-sm bg-slate-50 border-slate-200 rounded-xl focus-visible:ring-1 focus-visible:ring-teal-500"
                />
                <Button
                  type="submit"
                  disabled={sendMutation.isPending || !messageInput.trim()}
                  className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-semibold">Send</span>
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h2 className="text-base font-bold text-slate-900">Select a Patient to Chat</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose a patient from the left panel to review past clinical correspondence or send a direct message.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DoctorMessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
          Loading clinical messaging center...
        </div>
      }
    >
      <DoctorMessagesContent />
    </Suspense>
  );
}
