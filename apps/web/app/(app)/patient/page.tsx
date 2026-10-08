"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Smile, Bot, Calendar, CheckCircle2, HeartPulse, Clock,
  Activity, TrendingUp, Target, Video, MessageSquare, Check, Flame,
  BarChart3, LineChart as LineChartIcon
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface MoodRecord {
  id: string;
  moodType: string;
  stressLevel: number;
  anxietyLevel: number;
  sleepQuality: number;
  wellnessGoal: string | null;
  wellnessActivity: string | null;
  activityDescription?: string | null;
  activityPriority?: string | null;
  activityStatus: string;
  activityCompletedDate?: string | null;
  notes?: string | null;
  recordedDate: string;
}

interface MoodSummary {
  totalEntries: number;
  averageStress: number;
  averageAnxiety: number;
  averageSleep: number;
  records?: MoodRecord[];
}

interface Appointment {
  id: string;
  appointmentDate: string;
  consultationType: string;
  appointmentStatus: string;
  consultationReason: string | null;
  sessionDurationMinutes?: number;
}

interface TherapyProgress {
  id: string;
  resourceId: string;
  startTime: string;
  completionTime: string | null;
  status: string;
  progressPercentage: number;
}

interface ChartDayData {
  day: string;
  date: string;
  wellnessScore: number | null;
  stress: number | null;
  anxiety: number | null;
  sleep: number | null;
  completedTasks: number;
  pendingTasks: number;
  hasRecord: boolean;
}

export default function PatientOverviewPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [graphTab, setGraphTab] = useState<'trajectory' | 'tasks'>('trajectory');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Mood & Wellness trends (last 7 days)
  const { data: moodSummary, isLoading: loadingMood } = useQuery<MoodSummary>({
    queryKey: ['patient', 'mood-summary'],
    queryFn: () => apiFetch<MoodSummary>('/mood-tracking/summary'),
  });

  // 2. Fetch Appointments
  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['patient', 'appointments'],
    queryFn: () => apiFetch<Appointment[]>('/appointments'),
  });

  // 3. Fetch Therapy Exercise Progress
  const { data: therapyProgress, isLoading: loadingTherapy } = useQuery<TherapyProgress[]>({
    queryKey: ['patient', 'therapy-progress'],
    queryFn: () => apiFetch<TherapyProgress[]>('/therapy/progress'),
  });

  const latestMood = moodSummary?.records?.[0];
  const upcomingAppointment = appointments?.find(
    (a) => a.appointmentStatus === 'Scheduled' && new Date(a.appointmentDate) >= new Date()
  );

  // Calculate 7-day day-by-day metrics for performance & improvement graph
  const chartData = useMemo<ChartDayData[]>(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const result: ChartDayData[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayName = i === 0 ? 'Today' : days[d.getDay()];
      const dateStr = d.toISOString().slice(0, 10);
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const matchingMood = moodSummary?.records?.find((r) => {
        const recDate = new Date(r.recordedDate);
        return recDate >= dayStart && recDate <= dayEnd;
      });

      const matchingTherapyDone = therapyProgress?.filter((t) => {
        if (t.status !== 'Completed' || !t.completionTime) return false;
        const compDate = new Date(t.completionTime);
        return compDate >= dayStart && compDate <= dayEnd;
      }).length || 0;

      const moodDone = matchingMood?.activityStatus === 'Completed' ? 1 : 0;
      const moodPending = matchingMood?.activityStatus === 'Pending' ? 1 : 0;
      const totalDone = moodDone + matchingTherapyDone;

      let wellnessScore: number | null = null;
      let stress: number | null = null;
      let anxiety: number | null = null;
      let sleep: number | null = null;

      if (matchingMood) {
        stress = matchingMood.stressLevel;
        anxiety = matchingMood.anxietyLevel;
        sleep = matchingMood.sleepQuality;
        // Formula: Sleep (0-40 pts) + Inverted Stress (0-30 pts) + Inverted Anxiety (0-30 pts) = Max 100
        wellnessScore = Math.round(
          Math.max(10, Math.min(100, sleep * 4 + (10 - stress) * 3 + (10 - anxiety) * 3))
        );
      }

      result.push({
        day: dayName,
        date: dateStr,
        wellnessScore,
        stress,
        anxiety,
        sleep,
        completedTasks: totalDone,
        pendingTasks: moodPending,
        hasRecord: !!matchingMood || totalDone > 0,
      });
    }

    return result;
  }, [moodSummary?.records, therapyProgress]);

  // Aggregate KPI stats
  const totalCompletedTasks = useMemo(() => {
    const moodTasks = moodSummary?.records?.filter((r) => r.activityStatus === 'Completed').length || 0;
    const therapyTasks = therapyProgress?.filter((t) => t.status === 'Completed').length || 0;
    return moodTasks + therapyTasks;
  }, [moodSummary?.records, therapyProgress]);

  const totalPendingTasks = useMemo(() => {
    const moodPending = moodSummary?.records?.filter((r) => r.activityStatus === 'Pending').length || 0;
    const therapyInProgress = therapyProgress?.filter((t) => t.status === 'In Progress').length || 0;
    return moodPending + therapyInProgress;
  }, [moodSummary?.records, therapyProgress]);

  const totalAssignedTasks = totalCompletedTasks + totalPendingTasks;
  const taskCompletionRate = totalAssignedTasks > 0
    ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
    : 0;

  // Average weekly wellness index
  const avgWellnessIndex = useMemo(() => {
    if (!moodSummary || moodSummary.totalEntries === 0) return 0;
    return Math.round(
      Math.max(
        10,
        Math.min(
          100,
          moodSummary.averageSleep * 4 +
            (10 - moodSummary.averageStress) * 3 +
            (10 - moodSummary.averageAnxiety) * 3
        )
      )
    );
  }, [moodSummary]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1.5 z-50">
          <p className="font-semibold text-foreground text-sm border-b pb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill || entry.stroke }}
                />
                {entry.name}:
              </span>
              <span className="font-semibold text-foreground">
                {entry.value !== null && entry.value !== undefined ? entry.value : 'No record'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Pending Doctor Review Notification Banner */}
      <PendingReviewBanner />

      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary p-8 border">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <HeartPulse className="w-3.5 h-3.5" />
            Holistic Health Sanctuary
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to Your Healing Space
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Monitor your daily emotions, access guided therapies, connect with licensed professionals, 
            or reflect in your private AI-assisted journal.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="sm">
              <Link href="/patient/mood" className="flex items-center gap-2">
                <Smile className="w-4 h-4" /> Log Today's Mood
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/patient/counseling" className="flex items-center gap-2">
                <Bot className="w-4 h-4" /> Start AI Counseling
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Snapshot Cards Grid: Weekly Wellness, Mood & Wellbeing, Consultation Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Weekly Wellness Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Weekly Wellness</CardTitle>
              <CardDescription>7-Day Average Scores</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Activity className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingMood ? (
              <div className="min-h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                Loading wellness trends...
              </div>
            ) : moodSummary && moodSummary.totalEntries > 0 ? (
              <div className="space-y-3">
                {/* Overall Wellness Gauge */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-secondary/50 border border-border/50">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" /> Overall Wellness Index
                  </span>
                  <span className="text-base font-bold text-primary">
                    {avgWellnessIndex} <span className="text-xs text-muted-foreground font-normal">/ 100</span>
                  </span>
                </div>

                {/* Metric Bars */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Stress Level:</span>
                      <span className="font-semibold text-foreground">{moodSummary.averageStress} / 10</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          moodSummary.averageStress > 7 ? 'bg-destructive' : moodSummary.averageStress > 4 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${(moodSummary.averageStress / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Anxiety Level:</span>
                      <span className="font-semibold text-foreground">{moodSummary.averageAnxiety} / 10</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          moodSummary.averageAnxiety > 7 ? 'bg-destructive' : moodSummary.averageAnxiety > 4 ? 'bg-amber-500' : 'bg-primary'
                        }`}
                        style={{ width: `${(moodSummary.averageAnxiety / 10) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Sleep Quality:</span>
                      <span className="font-semibold text-foreground">{moodSummary.averageSleep} / 10</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${(moodSummary.averageSleep / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{moodSummary.totalEntries} logs recorded this week</span>
                  <Link href="/patient/mood" className="text-primary hover:underline font-medium">
                    View Logs →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">No wellness scores logged this week.</p>
                <p className="text-xs text-muted-foreground">Log your emotional state to see average stress, anxiety, and sleep ratings.</p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/patient/mood">Check in today</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. Mood & Wellbeing Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Mood & Wellbeing</CardTitle>
              <CardDescription>Latest Emotional Check-in</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Smile className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {loadingMood ? (
              <div className="min-h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                Loading mood status...
              </div>
            ) : latestMood ? (
              <div className="space-y-3">
                {/* Latest Mood Tag */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Current State</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
                    <Smile className="w-3.5 h-3.5" />
                    {latestMood.moodType}
                  </span>
                </div>

                {/* Rule-Engine Prescribed Goal & Activity */}
                {latestMood.wellnessGoal ? (
                  <div className="p-3 rounded-xl bg-muted/60 border border-border/60 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-foreground">
                      <Target className="w-3.5 h-3.5 text-primary" /> Goal: {latestMood.wellnessGoal}
                    </div>
                    {latestMood.wellnessActivity && (
                      <p className="text-muted-foreground leading-relaxed">
                        Prescribed Task: <span className="text-foreground font-medium">{latestMood.wellnessActivity}</span>
                      </p>
                    )}
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">Task Status:</span>
                      {latestMood.activityStatus === 'Completed' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground">
                    Logged: {new Date(latestMood.recordedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} at {new Date(latestMood.recordedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}

                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link href="/patient/mood" className="flex items-center justify-center gap-2">
                    <Smile className="w-4 h-4 text-primary" /> Update Today's Mood
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">No recent mood check-ins.</p>
                <p className="text-xs text-muted-foreground">
                  Track your daily mood to receive deterministic wellness plans and therapy recommendations.
                </p>
                <Button asChild size="sm" className="mt-2">
                  <Link href="/patient/mood">Log Mood Now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3. Consultation Schedule Card */}
        <Card className="flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Consultation Schedule</CardTitle>
              <CardDescription>Clinical Appointments</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Calendar className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingAppts ? (
              <div className="min-h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                Checking appointments...
              </div>
            ) : upcomingAppointment ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-secondary/50 border border-border/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                      {upcomingAppointment.consultationType === 'Video' ? (
                        <Video className="w-3.5 h-3.5" />
                      ) : (
                        <MessageSquare className="w-3.5 h-3.5" />
                      )}
                      {upcomingAppointment.consultationType} Consultation
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {upcomingAppointment.sessionDurationMinutes || 50} mins
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground pt-1">
                    <Clock className="w-4 h-4 text-primary shrink-0" />
                    {new Date(upcomingAppointment.appointmentDate).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </div>

                  {upcomingAppointment.consultationReason && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Reason: {upcomingAppointment.consultationReason}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button asChild size="sm" className="w-full">
                    <Link href="/patient/appointments">View Schedule</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm text-muted-foreground">No upcoming visits scheduled.</p>
                <p className="text-xs text-muted-foreground">
                  Connect with licensed psychiatrists and therapists for dedicated 1-on-1 care.
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/patient/appointments">Schedule Appointment</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Performance & Improvement Analytics Section */}
      <Card className="overflow-hidden border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg font-bold tracking-tight">
                Task Performance & Improvement Analytics
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Continuous 7-day monitoring of therapy exercises, completed wellness tasks, and recovery progress.
            </CardDescription>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center p-1 bg-muted rounded-xl self-start sm:self-center">
            <button
              onClick={() => setGraphTab('trajectory')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                graphTab === 'trajectory'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LineChartIcon className="w-3.5 h-3.5" />
              Improvement Trajectory
            </button>
            <button
              onClick={() => setGraphTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                graphTab === 'tasks'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Task Execution
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* KPI Metrics Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-card border flex flex-col justify-between space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Tasks Completed
              </span>
              <div className="text-xl font-bold text-foreground">
                {totalCompletedTasks}
                <span className="text-xs text-muted-foreground font-normal ml-1">tasks</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border flex flex-col justify-between space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> Completion Rate
              </span>
              <div className="text-xl font-bold text-foreground">
                {taskCompletionRate}%
                <span className="text-xs text-muted-foreground font-normal ml-1">adherence</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border flex flex-col justify-between space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Wellness Index
              </span>
              <div className="text-xl font-bold text-foreground">
                {avgWellnessIndex > 0 ? avgWellnessIndex : '—'}
                <span className="text-xs text-muted-foreground font-normal ml-1">/ 100</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-card border flex flex-col justify-between space-y-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Sleep Quality
              </span>
              <div className="text-xl font-bold text-foreground">
                {moodSummary?.averageSleep ? `${moodSummary.averageSleep}/10` : '—'}
                <span className="text-xs text-muted-foreground font-normal ml-1">avg</span>
              </div>
            </div>
          </div>

          {/* Interactive Graph Canvas */}
          <div className="w-full h-64 pt-2">
            {!isMounted ? (
              <div className="w-full h-full rounded-xl bg-muted/20 animate-pulse flex items-center justify-center text-xs text-muted-foreground">
                Loading performance metrics...
              </div>
            ) : graphTab === 'trajectory' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wellnessScoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="sleepGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="day" stroke="currentColor" opacity={0.6} fontSize={12} tickLine={false} />
                  <YAxis stroke="currentColor" opacity={0.6} fontSize={12} tickLine={false} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="wellnessScore"
                    name="Wellness Improvement Score (%)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#wellnessScoreGrad)"
                    connectNulls
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                  <XAxis dataKey="day" stroke="currentColor" opacity={0.6} fontSize={12} tickLine={false} />
                  <YAxis stroke="currentColor" opacity={0.6} fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="completedTasks"
                    name="Completed Tasks"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="pendingTasks"
                    name="Pending Tasks"
                    fill="#64748b"
                    opacity={0.35}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Recovery & Wellness metrics automatically update with every mood log and therapy activity.
            </span>
            <Link href="/patient/therapy" className="text-primary hover:underline font-medium">
              Explore Therapy Programs →
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
