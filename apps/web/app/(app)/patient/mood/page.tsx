"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Smile, CheckCircle, Clock, AlertCircle, Sparkles, Target, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface MoodRecord {
  id: string;
  moodType: string;
  stressLevel: number;
  anxietyLevel: number;
  sleepQuality: number;
  notes: string | null;
  recordedDate: string;
  wellnessGoal: string | null;
  wellnessActivity: string | null;
  activityDescription: string | null;
  activityPriority: string | null;
  activityStatus: 'Pending' | 'Completed';
  activityCompletedDate: string | null;
}

interface MoodSummary {
  totalEntries: number;
  averageStress: number;
  averageAnxiety: number;
  averageSleep: number;
}

const MOOD_OPTIONS = [
  { label: 'Happy', emoji: '😊' },
  { label: 'Calm', emoji: '😌' },
  { label: 'Normal', emoji: '😐' },
  { label: 'Stressed', emoji: '😫' },
  { label: 'Anxious', emoji: '😰' },
  { label: 'Sad', emoji: '😢' },
  { label: 'Angry', emoji: '😤' },
];

export default function MoodTrackingPage() {
  const queryClient = useQueryClient();

  const [moodType, setMoodType] = useState('Happy');
  const [stressLevel, setStressLevel] = useState(5);
  const [anxietyLevel, setAnxietyLevel] = useState(4);
  const [sleepQuality, setSleepQuality] = useState(7);
  const [notes, setNotes] = useState('');

  // Fetch past mood records
  const { data: records, isLoading: loadingRecords } = useQuery<MoodRecord[]>({
    queryKey: ['mood', 'records'],
    queryFn: () => apiFetch<MoodRecord[]>('/mood-tracking'),
  });

  // Fetch 7-day summary
  const { data: summary, isLoading: loadingSummary } = useQuery<MoodSummary>({
    queryKey: ['mood', 'summary'],
    queryFn: () => apiFetch<MoodSummary>('/mood-tracking/summary'),
  });

  // Mutation: Log new mood
  const logMoodMutation = useMutation({
    mutationFn: (data: {
      moodType: string;
      stressLevel: number;
      anxietyLevel: number;
      sleepQuality: number;
      notes?: string;
    }) =>
      apiFetch<MoodRecord>('/mood-tracking', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newRecord) => {
      toast.success("Mood recorded successfully!");
      if (newRecord.wellnessGoal) {
        toast.info(`Wellness recommendation generated: ${newRecord.wellnessGoal}`);
      }
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['mood'] });
      queryClient.invalidateQueries({ queryKey: ['patient', 'mood-summary'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record mood.");
    },
  });

  // Mutation: Complete activity
  const completeActivityMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<MoodRecord>(`/mood-tracking/${id}/complete`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      toast.success("Wellness activity marked as completed! Great job.");
      queryClient.invalidateQueries({ queryKey: ['mood'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update activity status.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logMoodMutation.mutate({
      moodType,
      stressLevel: Number(stressLevel),
      anxietyLevel: Number(anxietyLevel),
      sleepQuality: Number(sleepQuality),
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emotional & Mood Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Log daily indicators to trigger our deterministic clinical wellness rule engine.
        </p>
      </div>

      {/* 7-Day Statistics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Logged Entries</span>
          <p className="text-2xl font-bold mt-1">{loadingSummary ? '...' : summary?.totalEntries ?? 0}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Avg Stress (1-10)</span>
          <p className="text-2xl font-bold mt-1 text-amber-600">{loadingSummary ? '...' : summary?.averageStress ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Avg Anxiety (1-10)</span>
          <p className="text-2xl font-bold mt-1 text-rose-600">{loadingSummary ? '...' : summary?.averageAnxiety ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-muted-foreground font-medium">Avg Sleep (1-10)</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{loadingSummary ? '...' : summary?.averageSleep ?? '-'}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Mood Logging Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Today's Check-in</CardTitle>
              <CardDescription>How are you feeling right now?</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Mood Selector Buttons */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">Current Emotion</label>
                  <div className="grid grid-cols-4 gap-2">
                    {MOOD_OPTIONS.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setMoodType(item.label)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all text-xs ${
                          moodType === item.label
                            ? 'border-primary bg-primary/10 font-bold shadow-xs'
                            : 'bg-card hover:bg-muted text-foreground'
                        }`}
                      >
                        <span className="text-xl">{item.emoji}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stress Slider / Numeric Input */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Stress Level</span>
                    <span className="font-bold">{stressLevel} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Anxiety Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Anxiety Level</span>
                    <span className="font-bold">{anxietyLevel} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={anxietyLevel}
                    onChange={(e) => setAnxietyLevel(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Sleep Quality Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Sleep Quality</span>
                    <span className="font-bold">{sleepQuality} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Optional Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Personal Notes</label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., Busy workday, feeling tired..."
                    className="text-xs"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={logMoodMutation.isPending}>
                  {logMoodMutation.isPending ? 'Analyzing...' : 'Submit Daily Check-in'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History & Rule-Engine Recommended Tasks */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold tracking-tight">Recent Check-ins & Prescribed Activities</h2>
          
          <div className="space-y-4">
            {loadingRecords ? (
              <p className="text-xs text-muted-foreground">Loading history...</p>
            ) : records && records.length > 0 ? (
              records.map((rec) => (
                <Card key={rec.id} className="p-5 overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                        {rec.moodType}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rec.recordedDate).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                        {rec.notes && (
                          <p className="text-xs text-foreground italic mt-0.5">"{rec.notes}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium">
                      <span>Stress: <strong className="text-amber-600">{rec.stressLevel}</strong></span>
                      <span>Anxiety: <strong className="text-rose-600">{rec.anxietyLevel}</strong></span>
                      <span>Sleep: <strong className="text-emerald-600">{rec.sleepQuality}</strong></span>
                    </div>
                  </div>

                  {/* Rule Engine Recommendation Section */}
                  {rec.wellnessGoal ? (
                    <div className="mt-4 p-4 rounded-xl bg-secondary/50 border border-primary/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <Target className="w-4 h-4" /> Recommended Goal: {rec.wellnessGoal}
                        </div>
                        {rec.activityPriority && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            rec.activityPriority === 'High'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-primary/10 text-primary'
                          }`}>
                            {rec.activityPriority} Priority
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-foreground">
                        Activity: {rec.wellnessActivity}
                      </p>
                      {rec.activityDescription && (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {rec.activityDescription}
                        </p>
                      )}
                      
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Status: <strong className={rec.activityStatus === 'Completed' ? 'text-emerald-600' : 'text-amber-600'}>
                            {rec.activityStatus}
                          </strong>
                        </span>
                        {rec.activityStatus !== 'Completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => completeActivityMutation.mutate(rec.id)}
                            disabled={completeActivityMutation.isPending}
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Complete Task
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-3 italic">
                      Parameters within healthy thresholds — continue your daily routine.
                    </p>
                  )}
                </Card>
              ))
            ) : (
              <Card className="p-8 text-center text-muted-foreground text-sm">
                No entries yet. Use the check-in form on the left to log your first mood!
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
