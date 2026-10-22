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
  Calendar,
  AlertTriangle,
  CheckCheck,
  Check,
  Search,
  UserCheck,
  Stethoscope,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday } from "date-fns";
import { DoctorSlotBookingDialog } from "@/components/features/appointments/doctor-slot-booking-dialog";

export interface ConversationParticipant {
  userId: string;
  doctorId?: string;
  patientId?: string;
  name: string;
  email: string;
  image: string | null;
  role: 'doctor' | 'patient';
  specialization?: string;
  hospitalAffiliation?: string;
  dutyStartTime?: string;
  dutyEndTime?: string;
  offDay?: string;
  isAvailableToday?: boolean;
}

export interface ConversationSummary {
  otherUser: ConversationParticipant;
  lastMessage: {
    id: string;
    text: string;
    senderId: string;
    senderRole: 'doctor' | 'patient';
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
  senderRole: 'patient' | 'doctor';
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

const QUICK_INQUIRY_CHIPS = [
  "Medication side-effect inquiry",
  "Post-consultation symptom follow-up",
  "Requesting prescription renewal review",
  "Question regarding exercise regimen",
];

function PatientMessagesContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const doctorIdParam = searchParams.get("doctorId");

  const [activeDoctorUserId, setActiveDoctorUserId] = useState<string | null>(doctorIdParam || null);
  const [searchFilter, setSearchFilter] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [isBookingOpen, setIsBookingOpen] = useState(false);

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

  const hasInitializedSelection = useRef(false);

  // Automatically select the initial conversation ONCE on load, without overriding manual clicks
  useEffect(() => {
    if (hasInitializedSelection.current) return;

    if (doctorIdParam) {
      const matched = conversations.find(
        (c) =>
          c.otherUser.userId === doctorIdParam ||
          c.otherUser.doctorId === doctorIdParam
      );
      if (matched) {
        setActiveDoctorUserId(matched.otherUser.userId);
        hasInitializedSelection.current = true;
      } else if (conversations.length > 0) {
        setActiveDoctorUserId(doctorIdParam);
        hasInitializedSelection.current = true;
      }
    } else if (conversations.length > 0) {
      setActiveDoctorUserId(conversations[0].otherUser.userId);
      hasInitializedSelection.current = true;
    }
  }, [doctorIdParam, conversations]);

  // 2. Fetch active chat thread
  const { data: threadData, isLoading: loadingThread } = useQuery<ThreadResponse>({
    queryKey: ["messages", "thread", activeDoctorUserId],
    queryFn: async () => {
      const res = await apiFetch<{ data: ThreadResponse } | ThreadResponse>(`/messages/thread/${activeDoctorUserId}`);
      if ("data" in res && res.data) return res.data;
      return res as ThreadResponse;
    },
    enabled: !!activeDoctorUserId,
    refetchInterval: 3000,
  });

// Sync activeDoctorUserId to canonical userId if it was initialized with a doctorProfileId
  useEffect(() => {
    if (threadData?.otherUser?.userId && activeDoctorUserId && activeDoctorUserId !== threadData.otherUser.userId) {
      if (threadData.otherUser.doctorId === activeDoctorUserId) {
        setActiveDoctorUserId(threadData.otherUser.userId);
      }
    }
  }, [threadData?.otherUser, activeDoctorUserId]);

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
      queryClient.invalidateQueries({ queryKey: ["messages", "thread", activeDoctorUserId] });
      queryClient.invalidateQueries({ queryKey: ["messages", "conversations"] });
      queryClient.invalidateQueries({ queryKey: ["messages", "unread-count"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to deliver message.");
    },
  });

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeDoctorUserId) {
      toast.error("Please select a clinician to send a message.");
      return;
    }
    if (!messageInput.trim()) return;

    sendMutation.mutate({
      targetUserId: activeDoctorUserId,
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
        (c.otherUser.specialization && c.otherUser.specialization.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.text.toLowerCase().includes(q))
    );
  }, [conversations, searchFilter]);

  const activeClinician = useMemo(() => {
    if (!activeDoctorUserId) return null;
    if (
      threadData?.otherUser &&
      (threadData.otherUser.userId === activeDoctorUserId ||
        threadData.otherUser.doctorId === activeDoctorUserId)
    ) {
      return threadData.otherUser;
    }
    const matched = conversations.find(
      (c) =>
        c.otherUser.userId === activeDoctorUserId ||
        c.otherUser.doctorId === activeDoctorUserId
    );
    if (matched?.otherUser) return matched.otherUser;
    if (threadData?.otherUser) return threadData.otherUser;
    return null;
  }, [threadData, conversations, activeDoctorUserId]);

  const formatMessageTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    if (isToday(d)) return format(d, "h:mm a");
    if (isYesterday(d)) return `Yesterday, ${format(d, "h:mm a")}`;
    return format(d, "MMM d, h:mm a");
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <Link
              href="/patient/appointments"
              className="p-1.5 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0 shadow-2xs"
              title="Back to Appointments"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              Direct Clinical Messaging
            </h1>
          </div>
          <p className="text-xs text-muted-foreground pl-0 sm:pl-1">
            Continuous asynchronous care and routine inquiries with your attending clinical psychologists.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/patient/doctors">
            <Button variant="outline" size="sm" className="text-xs gap-1.5 shadow-2xs">
              <UserCheck className="w-3.5 h-3.5 text-primary" /> Browse Psychologist Directory
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setIsBookingOpen(true)}
            className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-xs"
          >
            <Calendar className="w-3.5 h-3.5" /> Book Consultation
          </Button>
        </div>
      </div>

      {/* Main Dual-Pane Messaging Container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100dvh-12rem)] md:h-[calc(100vh-14.5rem)] min-h-[500px]">
        {/* ========================================================================= */}
        {/* LEFT PANE: CONVERSATION LIST (COL 1-4)                                   */}
        {/* ========================================================================= */}
        <div className={cn(
          "md:col-span-4 lg:col-span-4 flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs",
          activeDoctorUserId && "hidden md:flex"
        )}>
          {/* Conversation Search Header */}
          <div className="p-3.5 border-b border-border space-y-2.5 bg-card/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Attending Psychologists
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                {conversations.length} contacts
              </span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search psychologist or message..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8.5 h-8.5 text-xs rounded-xl bg-background border-border/80"
              />
            </div>
          </div>

          {/* Conversation List Feed */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/60 scrollbar-thin">
            {loadingConversations ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-2xl bg-muted/60 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 bg-muted/60 rounded w-2/3" />
                      <div className="h-3 bg-muted/40 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <p className="text-xs font-semibold text-foreground">No conversations found</p>
                <p className="text-[11px] text-muted-foreground">
                  Browse the psychologist directory to initiate your first consultation thread.
                </p>
                <Link href="/patient/doctors">
                  <Button variant="outline" size="sm" className="text-xs mt-2">
                    Browse Directory
                  </Button>
                </Link>
              </div>
            ) : (
              filteredConversations.map((c) => {
                const isSelected =
                  c.otherUser.userId === activeDoctorUserId ||
                  c.otherUser.doctorId === activeDoctorUserId;
                const initials = c.otherUser.name
                  .replace(/^Dr\.\s*/i, "")
                  .trim()
                  .slice(0, 2)
                  .toUpperCase() || "DR";

                return (
                  <button
                    type="button"
                    key={c.otherUser.userId}
                    onClick={() => setActiveDoctorUserId(c.otherUser.userId)}
                    className={cn(
                      "w-full text-left p-3.5 flex items-start gap-3 transition-colors duration-150 cursor-pointer",
                      isSelected
                        ? "bg-primary/10 border-l-3 border-l-primary"
                        : "hover:bg-muted/40"
                    )}
                  >
                    {/* Avatar with duty indicator */}
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs shadow-inner">
                        {initials}
                      </div>
                      {c.otherUser.isAvailableToday !== undefined && (
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                            c.otherUser.isAvailableToday ? "bg-emerald-500" : "bg-amber-500"
                          )}
                          title={c.otherUser.isAvailableToday ? "On duty today" : "Off duty today"}
                        />
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {c.otherUser.name}
                        </h4>
                        {c.lastMessage && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {formatMessageTime(c.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-primary font-medium truncate mt-0.5">
                        {c.otherUser.specialization || "Clinical Specialist"}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-1">
                        <p className={cn(
                          "text-xs truncate",
                          c.unreadCount > 0 ? "font-bold text-foreground" : "text-muted-foreground"
                        )}>
                          {c.lastMessage ? c.lastMessage.text : "No messages exchanged yet."}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
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
        <div className={cn(
          "md:col-span-8 lg:col-span-8 flex flex-col rounded-2xl border border-border bg-card overflow-hidden shadow-xs",
          !activeDoctorUserId && "hidden md:flex"
        )}>
          {!activeDoctorUserId || !activeClinician ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">Select a psychologist to open conversation</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                Choose an attending psychologist from the sidebar or browse verified specialists in the directory to begin messaging.
              </p>
              <Link href="/patient/doctors">
                <Button size="sm" variant="outline" className="text-xs mt-2">
                  <UserCheck className="w-3.5 h-3.5 mr-1.5" /> Find Psychologists
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Active Clinician Top Bar */}
              <div className="p-3 sm:p-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveDoctorUserId(null)}
                    className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    aria-label="Back to contacts list"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-sm shadow-inner">
                      {activeClinician.name.replace(/^Dr\.\s*/i, "").trim().slice(0, 2).toUpperCase() || "DR"}
                    </div>
                    {activeClinician.isAvailableToday !== undefined && (
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                          activeClinician.isAvailableToday ? "bg-emerald-500" : "bg-amber-500"
                        )}
                      />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {activeClinician.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <ShieldCheck className="w-3 h-3" /> Verified Clinician
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {activeClinician.specialization || "Clinical Specialist"}
                      {activeClinician.hospitalAffiliation ? ` • ${activeClinician.hospitalAffiliation}` : ""}
                    </p>
                  </div>
                </div>

                {/* Duty Hours & Quick Consultation Trigger */}
                <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  {activeClinician.dutyStartTime && activeClinician.dutyEndTime && (
                    <div className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground text-[11px] font-medium hidden lg:flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{activeClinician.dutyStartTime} – {activeClinician.dutyEndTime}</span>
                    </div>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsBookingOpen(true)}
                    className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-2xs h-8"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Book Session
                  </Button>
                </div>
              </div>

              {/* Hospital Safety / Emergency Warning Banner */}
              <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">
                  Direct messaging is for non-urgent clinical inquiries. In emergency or crisis, please call <strong>999 </strong> or visit the nearest ER.
                </span>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10 scrollbar-thin">
                {loadingThread ? (
                  <div className="space-y-4">
                    <div className="h-12 bg-muted/40 rounded-2xl w-2/3 animate-pulse" />
                    <div className="h-12 bg-muted/40 rounded-2xl w-1/2 ml-auto animate-pulse" />
                    <div className="h-16 bg-muted/40 rounded-2xl w-3/4 animate-pulse" />
                  </div>
                ) : !threadData?.messages || threadData.messages.length === 0 ? (
                  <div className="p-8 text-center space-y-2 my-auto">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">Start conversation with {activeClinician.name}</p>
                    <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                      Send your questions regarding current medications, wellness routines, or follow-up insights.
                    </p>
                  </div>
                ) : (
                  threadData.messages.map((msg) => {
                    const isFromPatient = msg.senderRole === "patient";

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex items-end gap-2.5 max-w-[85%] sm:max-w-[75%]",
                          isFromPatient ? "ml-auto flex-row-reverse" : "mr-auto"
                        )}
                      >
                        {/* Doctor Avatar */}
                        {!isFromPatient && (
                          <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0 mb-1">
                            {activeClinician.name.replace(/^Dr\.\s*/i, "").trim().slice(0, 1) || "D"}
                          </div>
                        )}

                        <div className="space-y-1">
                          <div
                            className={cn(
                              "p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs break-words",
                              isFromPatient
                                ? "bg-primary text-primary-foreground rounded-br-xs font-medium"
                                : "bg-card border border-border text-foreground rounded-bl-xs"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{msg.messageText}</p>
                          </div>

                          {/* Timestamp and Read Status */}
                          <div
                            className={cn(
                              "flex items-center gap-1 text-[10px] text-muted-foreground px-1",
                              isFromPatient ? "justify-end" : "justify-start"
                            )}
                          >
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isFromPatient && (
                              <span title={msg.isRead ? "Read by clinician" : "Delivered"}>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                ) : (
                                  <Check className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Inquiry Chips */}
              <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-2 overflow-x-auto scrollbar-thin">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
                  Quick Topics:
                </span>
                {QUICK_INQUIRY_CHIPS.map((chip) => (
                  <button
                    type="button"
                    key={chip}
                    onClick={() => setMessageInput(chip)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3.5 border-t border-border bg-card flex items-center gap-2.5">
                <Input
                  type="text"
                  placeholder={`Send clinical inquiry to ${activeClinician.name}...`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  disabled={sendMutation.isPending}
                  className="h-10 text-xs rounded-xl bg-background border-border"
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMutation.isPending}
                  className="h-10 px-4 rounded-xl bg-primary text-primary-foreground font-semibold gap-1.5 shrink-0 shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Embedded Doctor Slot Booking Dialog */}
      <DoctorSlotBookingDialog
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        preSelectedDoctorId={activeDoctorUserId || undefined}
      />
    </div>
  );
}

export default function PatientMessagesPage() {
  return (
    <Suspense fallback={<div className="h-64 flex items-center justify-center text-sm text-muted-foreground">Loading messaging interface...</div>}>
      <PatientMessagesContent />
    </Suspense>
  );
}
