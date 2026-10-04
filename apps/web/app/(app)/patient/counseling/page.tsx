"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Bot, Send, CheckCircle2, Clock, Plus, Sparkles, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
  const [inputMessage, setInputMessage] = useState("");

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

  // Mutation: Create session
  const createSessionMutation = useMutation({
    mutationFn: (sessionType: string) =>
      apiFetch<CounselingSession>('/counseling/sessions', {
        method: 'POST',
        body: JSON.stringify({ sessionType }),
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
        body: JSON.stringify({ messageText: text }),
      }),
    onSuccess: () => {
      setInputMessage("");
      queryClient.invalidateQueries({ queryKey: ['counseling', 'messages', currentSessionId] });
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || !currentSessionId) return;
    sendMessageMutation.mutate(inputMessage.trim());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Counseling Sanctuary</h1>
        <p className="text-sm text-muted-foreground">
          24/7 confidential counseling, emotional validation, and cognitive support.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[720px]">
        {/* Left Column: Sessions List & Start New */}
        <div className="flex flex-col gap-4">
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
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      currentSessionId === s.id
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-foreground">{s.sessionType}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          s.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {s.status}
                      </span>
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
        <div className="lg:col-span-2">
          <Card className="h-full flex flex-col overflow-hidden">
            {activeSession ? (
              <>
                <CardHeader className="py-3 px-5 border-b flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{activeSession.sessionType}</CardTitle>
                      <CardDescription className="text-xs">
                        Status: <span className="text-foreground font-medium">{activeSession.status}</span>
                      </CardDescription>
                    </div>
                  </div>
                  {activeSession.status === 'Active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => endSessionMutation.mutate(activeSession.id)}
                      disabled={endSessionMutation.isPending}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> End Session
                    </Button>
                  )}
                </CardHeader>

                {/* Message Log */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-muted/10">
                  {loadingMessages ? (
                    <p className="text-xs text-muted-foreground text-center py-6">Loading conversation...</p>
                  ) : messages && messages.length > 0 ? (
                    // Display reverse chronological or chronological
                    [...messages].reverse().map((msg) => {
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
                            <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.emotionDetected && (
                              <span className="px-1.5 py-0.5 rounded bg-muted font-medium text-foreground">
                                {msg.emotionDetected}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <Sparkles className="w-10 h-10 text-primary/40 mb-2" />
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
