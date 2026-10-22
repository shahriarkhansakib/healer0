"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Bot, Send, CheckCircle2, Clock, Plus, ShieldAlert, Cpu, ChevronDown, Check, Sparkles, Trash2, AlertCircle, ArrowLeft } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CounselingSession {
  id: string;
  sessionType: 'Basic Counseling' | 'Deep Counseling' | 'Crisis Support';
  startTime: string;
  endTime: string | null;
  status: 'Active' | 'Completed';
}

interface CounselingMessage {
  id: string;
  sessionId: string;
  sender: 'User' | 'AI';
  messageText: string;
  emotionDetected: string | null;
  createdAt: string;
}

export default function CounselingPage() {
  const queryClient = useQueryClient();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'Basic Counseling' | 'Deep Counseling' | 'Crisis Support'>('Basic Counseling');
  const [selectedProvider, setSelectedProvider] = useState<'groq' | 'tokenharbor' | 'auto'>('groq');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch list of sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery<CounselingSession[]>({
    queryKey: ['counseling', 'sessions'],
    queryFn: () => apiFetch<CounselingSession[]>('/counseling/sessions'),
  });

  // Automatically select the first active session if none is selected
  const activeSession = sessions?.find(s => s.id === activeSessionId) || sessions?.find(s => s.status === 'Active') || sessions?.[0];
  const currentSessionId = activeSessionId || activeSession?.id;

  // Fetch messages for currently selected session
  const { data: messages, isLoading: loadingMessages } = useQuery<CounselingMessage[]>({
    queryKey: ['counseling', 'messages', currentSessionId],
    queryFn: () => apiFetch<CounselingMessage[]>(`/counseling/sessions/${currentSessionId}/messages`),
    enabled: !!currentSessionId,
    refetchInterval: 5000,
  });

  // Auto-scroll on new messages or when pending response
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentSessionId]);

  // Mutation: Create session
  const createSessionMutation = useMutation({
    mutationFn: (sessionType: string) =>
      apiFetch<CounselingSession>('/counseling/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionType, provider: selectedProvider }),
      }),
    onSuccess: (newSession) => {
      toast.success("New counseling session started.");
      queryClient.invalidateQueries({ queryKey: ['counseling', 'sessions'] });
      setActiveSessionId(newSession.id);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start session.");
    },
  });

  // Mutation: Send message
  const sendMessageMutation = useMutation({
    mutationFn: (text: string) =>
      apiFetch<CounselingMessage>(`/counseling/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ messageText: text, provider: selectedProvider }),
      }),
    onSuccess: () => {
      setInputMessage("");
      queryClient.invalidateQueries({ queryKey: ['counseling', 'messages', currentSessionId] });
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to send message.");
    },
  });

  // Mutation: End session
  const endSessionMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<CounselingSession>(`/counseling/sessions/${id}/end`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      toast.success("Session completed.");
      queryClient.invalidateQueries({ queryKey: ['counseling', 'sessions'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to end session.");
    },
  });

  // Mutation: Delete session
  const deleteSessionMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/counseling/sessions/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, deletedId) => {
      toast.success("Conversation deleted.");
      queryClient.invalidateQueries({ queryKey: ['counseling', 'sessions'] });
      if (currentSessionId === deletedId) {
        setActiveSessionId(null);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete conversation.");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSessionId || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(inputMessage.trim());
  };

  const engineOptions = [
    {
      id: 'groq' as const,
      label: 'Groq (120B)',
      badge: 'Default',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      description: 'Primary clinical engine with 5-layer API failover.',
    },
    {
      id: 'tokenharbor' as const,
      label: 'Token Harbor (MiMo)',
      badge: 'MiMo-v2.6',
      badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      description: 'Xiaomi MiMo-v2.6 Flash omnimodal model.',
    },
    {
      id: 'auto' as const,
      label: 'Auto (Smart Fallback)',
      badge: 'Adaptive',
      badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      description: 'Dynamic fallback across all available engines.',
    },
  ];

  const currentEngine = engineOptions.find((o) => o.id === selectedProvider) || engineOptions[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Counseling Sanctuary</h1>
        <p className="text-sm text-muted-foreground">
          24/7 confidential counseling and emotional validation with selectable AI engines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[520px] lg:h-[720px]">
        {/* Left Column: Sessions List & Start New */}
        <div className={cn("flex flex-col gap-4", activeSessionId && "hidden lg:flex")}>
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">Your Sessions</CardTitle>
              <CardDescription>Select or start a conversation</CardDescription>
            </CardHeader>

            {/* Start Session Controls */}
            <div className="p-4 border-b bg-muted/30 space-y-3">
              <label className="text-xs font-semibold text-muted-foreground">Session Tier</label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {(['Basic Counseling', 'Deep Counseling', 'Crisis Support'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`py-1.5 px-2 rounded border text-center transition-all ${
                      selectedType === type
                        ? 'bg-primary text-primary-foreground font-semibold border-primary'
                        : 'bg-card hover:bg-muted text-foreground'
                    }`}
                  >
                    {type.split(' ')[0]}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="w-full"
                onClick={() => createSessionMutation.mutate(selectedType)}
                disabled={createSessionMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Start New Session
              </Button>
            </div>

            {/* Sessions Scroll List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loadingSessions ? (
                <p className="text-xs text-muted-foreground p-3">Loading sessions...</p>
              ) : sessions && sessions.length > 0 ? (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setActiveSessionId(s.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all group relative ${
                      currentSessionId === s.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">{s.sessionType}</span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            s.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {s.status}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm("Are you sure you want to delete this conversation?")) {
                              deleteSessionMutation.mutate(s.id);
                            }
                          }}
                          disabled={deleteSessionMutation.isPending}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                          title="Delete conversation"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(s.startTime).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No sessions yet. Click above to start one!
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Chat Window */}
        <div className={cn("lg:col-span-2", !activeSessionId && "hidden lg:block")}>
          <Card className="h-full flex flex-col overflow-hidden">
            {activeSession ? (
              <>
                <CardHeader className="py-3 px-4 sm:px-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="lg:hidden p-1.5 h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                      onClick={() => setActiveSessionId(null)}
                      aria-label="Back to sessions list"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-sm sm:text-base font-semibold">{activeSession.sessionType}</CardTitle>
                        {activeSession.sessionType === 'Crisis Support' && (
                          <span className="flex items-center gap-1 text-[10px] font-medium bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                            <ShieldAlert className="w-3 h-3" /> 24/7 Lifeline: 988
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-xs">
                        Status: <span className="text-foreground font-medium">{activeSession.status}</span>
                      </CardDescription>
                    </div>
                  </div>

                  {/* Engine Model Dropdown, End & Delete Session */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Redesigned Dropdown Menu */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen((prev) => !prev)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-muted/50 hover:bg-muted text-xs font-medium transition-all shadow-xs"
                        aria-expanded={isDropdownOpen}
                        aria-haspopup="true"
                      >
                        <Cpu className="w-3.5 h-3.5 text-primary" />
                        <span className="text-muted-foreground">Engine:</span>
                        <span className="font-semibold text-foreground">
                          {currentEngine.label}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                            isDropdownOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-64 rounded-xl border bg-card p-1.5 shadow-xl z-50">
                          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Select AI Engine</span>
                            <Sparkles className="w-3 h-3 text-primary/70" />
                          </div>
                          <div className="space-y-1 mt-1">
                            {engineOptions.map((item) => {
                              const isSelected = selectedProvider === item.id;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedProvider(item.id);
                                    setIsDropdownOpen(false);
                                  }}
                                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                    isSelected
                                      ? 'bg-primary/10 text-primary font-medium'
                                      : 'hover:bg-muted text-foreground'
                                  }`}
                                >
                                  <div className="flex-1 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-foreground">{item.label}</span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${item.badgeClass}`}
                                      >
                                        {item.badge}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                                      {item.description}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <Check className="w-4 h-4 text-primary shrink-0 ml-1" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {activeSession.status === 'Active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => endSessionMutation.mutate(activeSession.id)}
                        disabled={endSessionMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this entire conversation?")) {
                          deleteSessionMutation.mutate(activeSession.id);
                        }
                      }}
                      disabled={deleteSessionMutation.isPending}
                      className="text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardHeader>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/10">
                  {loadingMessages ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Loading conversation...</p>
                  ) : messages && messages.length > 0 ? (
                    <>
                      {[...messages].reverse().map((msg) => {
                        const isUser = msg.sender === 'User';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                                isUser
                                  ? 'bg-primary text-primary-foreground rounded-br-none'
                                  : 'bg-card border text-foreground rounded-bl-none shadow-xs'
                              }`}
                            >
                              <p className="whitespace-pre-wrap">{msg.messageText}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-muted-foreground">
                              <span>
                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {msg.emotionDetected && (
                                <span
                                  className={`px-1.5 py-0.5 rounded font-medium ${
                                    msg.emotionDetected.toLowerCase().includes('crisis')
                                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                                      : isUser
                                        ? 'bg-primary/10 text-primary-foreground/90 font-medium'
                                        : msg.emotionDetected.includes('MiMo')
                                          ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold'
                                          : msg.emotionDetected.includes('Groq')
                                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold'
                                            : 'bg-muted text-foreground'
                                  }`}
                                >
                                  {isUser ? `Emotion: ${msg.emotionDetected}` : msg.emotionDetected}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {sendMessageMutation.isPending && (
                        <div className="flex flex-col items-start">
                          <div className="bg-card border text-foreground rounded-2xl rounded-bl-none p-3.5 shadow-xs flex items-center gap-2.5">
                            <Bot className="w-4 h-4 text-primary animate-pulse" />
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              {selectedProvider === 'groq'
                                ? 'Groq (120B) is reflecting'
                                : selectedProvider === 'tokenharbor'
                                  ? 'Token Harbor (MiMo) is reflecting'
                                  : 'AI Counselor is reflecting'}
                              <span className="inline-flex gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
                              </span>
                            </span>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <Bot className="w-10 h-10 text-primary/40 mb-2" />
                      <p className="text-sm font-medium text-foreground">Begin Your Conversation</p>
                      <p className="text-xs max-w-sm mt-1">
                        Type below to share how you're feeling, discuss any challenges, or ask for guidance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                {activeSession.status === 'Active' ? (
                  <form onSubmit={handleSendMessage} className="p-3 border-t bg-card flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Share what is on your mind..."
                      className="flex-1"
                      disabled={sendMessageMutation.isPending}
                    />
                    <Button type="submit" disabled={!inputMessage.trim() || sendMessageMutation.isPending}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                ) : (
                  <div className="p-3 border-t bg-muted/40 text-center text-xs text-muted-foreground">
                    This session has been completed and is in read-only mode.
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-8 text-center text-muted-foreground">
                <p>Select or create a counseling session to start chatting.</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
