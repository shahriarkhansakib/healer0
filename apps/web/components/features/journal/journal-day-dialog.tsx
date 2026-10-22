"use client";

import { useState } from "react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Smile,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Brain,
  Clock,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  content: string;
  mood: string | null;
  aiSentiment: string | null;
  aiSummary: string | null;
  entryDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface JournalDayDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  entries: JournalEntry[];
}

const MOOD_OPTIONS = [
  "Happy",
  "Calm",
  "Grateful",
  "Normal",
  "Worried",
  "Stressed",
  "Sad",
  "Anxious",
  "Angry",
];

export function JournalDayDialog({
  isOpen,
  onClose,
  selectedDate,
  entries,
}: JournalDayDialogProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mood, setMood] = useState("Calm");
  const [customTime, setCustomTime] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setMood("Calm");
    setCustomTime("");
    setShowForm(false);
  };

  const handleDialogChange = (open: boolean) => {
    if (!open) {
      resetForm();
      onClose();
    }
  };

  const createMutation = useMutation({
    mutationFn: (data: {
      title: string;
      content: string;
      mood: string;
      entryDate: string;
    }) =>
      apiFetch<JournalEntry>("/journals", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (newEntry) => {
      toast.success("Journal entry recorded.");
      if (newEntry.aiSentiment) {
        toast.info(`Sentiment analyzed: ${newEntry.aiSentiment}`);
      }
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["journal", "entries"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save journal.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ success: boolean }>(`/journals/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success("Entry removed.");
      queryClient.invalidateQueries({ queryKey: ["journal", "entries"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete entry.");
    },
  });

  if (!selectedDate) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const now = new Date();
    const finalDate = new Date(selectedDate);
    if (customTime) {
      const [hours, minutes] = customTime.split(":").map(Number);
      finalDate.setHours(hours, minutes, 0, 0);
    } else {
      finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }

    createMutation.mutate({
      title: title.trim(),
      content: content.trim(),
      mood,
      entryDate: finalDate.toISOString(),
    });
  };

  const formattedDate = format(selectedDate, "EEEE, MMMM d, yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between pr-6">
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
                <CalendarIcon className="w-5 h-5 text-primary" />
                {formattedDate}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {entries.length === 0
                  ? "No reflections recorded for this day."
                  : `${entries.length} ${
                      entries.length === 1 ? "reflection" : "reflections"
                    } logged on this day.`}
              </DialogDescription>
            </div>

            {!showForm && (
              <Button
                size="sm"
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" /> Add Reflection
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Scrollable Content: Form or Entries */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
          {/* New Reflection Form */}
          {showForm && (
            <Card className="border-primary/30 bg-primary/5 shadow-xs">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary" />
                    New Daily Reflection
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Private & Secure
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Title / Theme
                      </label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="E.g., Morning mindfulness, Difficult meeting..."
                        className="text-xs"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground">
                        Primary Mood
                      </label>
                      <select
                        value={mood}
                        onChange={(e) => setMood(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-card px-2.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        {MOOD_OPTIONS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Optional Time Selector */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Reflection Time (Optional)
                      </label>
                      {customTime && (
                        <button
                          type="button"
                          onClick={() => setCustomTime("")}
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                        >
                          Reset to Now
                        </button>
                      )}
                    </div>
                    <Input
                      type="time"
                      value={customTime}
                      onChange={(e) => setCustomTime(e.target.value)}
                      className="text-xs h-8"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Leave blank to automatically save at current time.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Your Thoughts
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={5}
                      placeholder="Describe your day, experiences, or any thoughts that shaped your emotional state..."
                      className="w-full rounded-md border border-input bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowForm(false)}
                      disabled={createMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={createMutation.isPending}
                      className="flex items-center gap-1.5"
                    >
                      {createMutation.isPending ? (
                        "Saving..."
                      ) : (
                        "Save & Analyze Entry"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Existing Entries List */}
          {entries.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-medium px-1">
                <span>Reflections for this day</span>
                <span>{entries.length} total</span>
              </div>

              {entries.map((entry) => {
                const entryTime = format(
                  new Date(entry.entryDate || entry.createdAt),
                  "h:mm a"
                );

                return (
                  <Card
                    key={entry.id}
                    className="border-border/60 hover:border-border transition-colors bg-card/40"
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {entryTime}
                          </span>

                          {entry.mood && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                              <Smile className="w-3 h-3" />
                              {entry.mood}
                            </span>
                          )}

                          {entry.aiSentiment && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                entry.aiSentiment === "Positive"
                                  ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : entry.aiSentiment === "Negative"
                                  ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                  : "bg-muted text-muted-foreground border border-border"
                              }`}
                            >
                              {entry.aiSentiment}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive hover:bg-destructive/10 text-xs"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {entry.title}
                        </h4>
                        <p className="text-xs text-foreground/80 mt-1 whitespace-pre-wrap leading-relaxed">
                          {entry.content}
                        </p>
                      </div>

                      {entry.aiSummary && (
                        <div className="p-2.5 rounded-lg bg-muted/60 border border-border/40 text-[11px] space-y-1">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Brain className="w-3 h-3" /> Summary:
                          </span>
                          <p className="text-muted-foreground leading-relaxed">
                            {entry.aiSummary}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : !showForm ? (
            <div className="text-center py-12 px-4 border border-dashed border-border/60 rounded-xl space-y-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  No entries for this date
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Click "Add Reflection" above to record your feelings and thoughts.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
