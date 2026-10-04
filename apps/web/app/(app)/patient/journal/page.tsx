"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { BookMarked, Plus, Trash2, Calendar, Smile, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood: string | null;
  aiSentiment: string | null;
  aiSummary: string | null;
  createdAt: string;
}

export default function JournalPage() {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('Happy');
  const [showForm, setShowForm] = useState(false);

  // Fetch journal entries
  const { data: entries, isLoading } = useQuery<JournalEntry[]>({
    queryKey: ['journal', 'entries'],
    queryFn: () => apiFetch<JournalEntry[]>('/journals'),
  });

  // Mutation: Create journal entry
  const createMutation = useMutation({
    mutationFn: (data: { title: string; content: string; mood?: string }) =>
      apiFetch<JournalEntry>('/journals', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newEntry) => {
      toast.success("Journal entry recorded.");
      if (newEntry.aiSentiment) {
        toast.info(`Sentiment analyzed: ${newEntry.aiSentiment}`);
      }
      setTitle('');
      setContent('');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save journal.");
    },
  });

  // Mutation: Delete entry
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/journals/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success("Entry removed.");
      queryClient.invalidateQueries({ queryKey: ['journal', 'entries'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete entry.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      mood,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reflective Daily Journal</h1>
          <p className="text-sm text-muted-foreground">
            A private space for self-reflection with instant sentiment recognition & AI summarization.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {showForm ? 'Close Editor' : 'New Journal Entry'}
        </Button>
      </div>

      {/* New Journal Form */}
      {showForm && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Write a Reflection</CardTitle>
            <CardDescription className="text-xs">Express your emotions freely and securely.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-xs font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="E.g. Overcoming pressure before exams..."
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Mood Tag</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    {['Happy', 'Calm', 'Normal', 'Worried', 'Stressed', 'Sad', 'Anxious'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Your Thoughts</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  placeholder="Describe your day, experiences, or any thoughts that shaped your emotional state..."
                  className="w-full rounded-md border border-input bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save & Analyze Entry'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Journal Entries List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Your Reflections</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading journal entries...</p>
        ) : entries && entries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="flex flex-col justify-between hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(entry.createdAt).toLocaleDateString([], {
                        dateStyle: 'medium',
                      })}
                    </span>
                    {entry.aiSentiment && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        entry.aiSentiment === 'Positive'
                          ? 'bg-emerald-500/10 text-emerald-600'
                          : entry.aiSentiment === 'Negative'
                            ? 'bg-rose-500/10 text-rose-600'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {entry.aiSentiment} Sentiment
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base font-semibold">{entry.title}</CardTitle>
                  {entry.mood && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Smile className="w-3.5 h-3.5 text-primary" /> Mood: <strong>{entry.mood}</strong>
                    </span>
                  )}
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed line-clamp-4">
                    {entry.content}
                  </p>

                  {entry.aiSummary && (
                    <div className="p-3 rounded-xl bg-muted/60 text-[11px] space-y-1">
                      <span className="font-semibold text-primary flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Summary:
                      </span>
                      <p className="text-muted-foreground">{entry.aiSummary}</p>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 text-xs h-8"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            You haven't written any journal entries yet. Click "New Journal Entry" above to begin!
          </Card>
        )}
      </div>
    </div>
  );
}
