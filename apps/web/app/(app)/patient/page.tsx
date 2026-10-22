"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import {
  Heart,
  Smile,
  Activity,
  Clock,
  Check,
  Calendar,
  Video,
  MessageSquare,
  AlertTriangle,
  ShieldCheck,
  Target,
  ArrowRight,
  TrendingUp,
  Info,
  ChevronRight,
  Pill,
  BookMarked,
  Bot,
  Users,
  ShieldAlert,
  CheckCircle2,
  Stethoscope,
  X,
  ClipboardList,
  Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";
import { toast } from "sonner";
import { getRecommendedTherapyForAssessment, MatchedTherapyRecommendation } from "@/lib/therapy-recommender";

interface MoodRecord {
  id: string;
  moodType: string;
  stressLevel: number;
  anxietyLevel: number;
  sleepQuality: number;
  wellnessGoal: string | null;
  wellnessActivity: string | null;
  activityStatus: string;
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
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical';
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

interface AssessmentResult {
  id: string;
  assessmentId: string;
  assessmentTitle?: string;
  assessmentCategory?: string;
  score: number;
  maxScore?: number;
  percentage?: number;
  severityLevel: string;
  identifiedProblem?: string;
  clinicalSummary?: string;
  suggestedFollowUp?: string;
  requiresFollowUp?: boolean;
  crisisAlert?: boolean;
  aiRecommendation?: string | null;
  completedDate: string;
}

interface MedicationItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PatientPrescription {
  id: string;
  title: string;
  doctorName: string;
  doctorSpecialization?: string;
  doctorHospital?: string;
  medications: MedicationItem[];
  notes?: string;
  createdAt: string;
}

const MOOD_QUICK_PRESETS = [
  { label: "Calm", emoji: "🌿", stress: 2, anxiety: 2, sleep: 8 },
  { label: "Content", emoji: "😊", stress: 3, anxiety: 2, sleep: 8 },
  { label: "Neutral", emoji: "😐", stress: 4, anxiety: 4, sleep: 7 },
  { label: "Stressed", emoji: "⚡", stress: 7, anxiety: 6, sleep: 6 },
  { label: "Down", emoji: "🌧️", stress: 6, anxiety: 7, sleep: 5 },
  { label: "Anxious", emoji: "💭", stress: 8, anxiety: 8, sleep: 5 },
];

function getSeverityBadgeClass(severity?: string) {
  const s = (severity || "").toUpperCase();
  if (s.includes("MINIMAL") || s.includes("NORMAL") || s.includes("HEALTHY") || s.includes("RESTFUL")) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (s.includes("MILD")) {
    return "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20";
  }
  if (s.includes("MODERATE")) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  }
  return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
}

function getProgressBarClass(severity?: string) {
  const s = (severity || "").toUpperCase();
  if (s.includes("MINIMAL") || s.includes("NORMAL") || s.includes("HEALTHY")) {
    return "bg-emerald-500";
  }
  if (s.includes("MILD")) {
    return "bg-teal-500";
  }
  if (s.includes("MODERATE")) {
    return "bg-amber-500";
  }
  return "bg-rose-500";
}

function getInsightAction(insight: AssessmentResult) {
  const text = `${insight.aiRecommendation || ""} ${insight.suggestedFollowUp || ""} ${insight.identifiedProblem || ""} ${insight.assessmentTitle || ""}`.toLowerCase();

  if (insight.crisisAlert || text.includes("crisis") || text.includes("self-harm")) {
    return {
      label: "Access Crisis Support",
      href: "/patient/emergency",
      icon: ShieldAlert,
    };
  }

  if (text.includes("breathing") || text.includes("respiration") || text.includes("anxiety") || text.includes("panic")) {
    return {
      label: "Start Box Breathing",
      href: "/patient/therapy",
      icon: Activity,
    };
  }

  if (text.includes("journal") || text.includes("thought") || text.includes("mood")) {
    return {
      label: "Open Thought Journal",
      href: "/patient/journal",
      icon: BookMarked,
    };
  }

  if (text.includes("sleep") || text.includes("insomnia") || text.includes("fatigue")) {
    return {
      label: "Sleep Hygiene Therapy",
      href: "/patient/therapy",
      icon: Clock,
    };
  }

  if (insight.requiresFollowUp || text.includes("consultation") || text.includes("therapist") || text.includes("psychologist") || text.includes("physician")) {
    return {
      label: "Book Psychologist Consultation",
      href: "/patient/appointments",
      icon: Stethoscope,
    };
  }

  return {
    label: "Start Guided Therapy",
    href: "/patient/therapy",
    icon: Activity,
  };
}

export default function PatientOverviewPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // Quick Check-in modal state
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState("Content");
  const [stressInput, setStressInput] = useState(3);
  const [anxietyInput, setAnxietyInput] = useState(3);
  const [sleepInput, setSleepInput] = useState(8);
  const [checkInNotes, setCheckInNotes] = useState("");

  // Clinical Impression Inspection Modal State
  const [selectedResultForModal, setSelectedResultForModal] = useState<AssessmentResult | null>(null);

  // 1. Fetch Mood & Wellness trends (last 7 days)
  const { data: moodSummary, isLoading: loadingMood } = useQuery<MoodSummary>({
    queryKey: ["patient", "mood-summary"],
    queryFn: () => apiFetch<MoodSummary>("/mood-tracking/summary"),
  });

  // 2. Fetch Appointments
  const { data: appointmentsData, isLoading: loadingAppts } = useQuery<Appointment[] | { data: Appointment[] }>({
    queryKey: ["patient", "appointments"],
    queryFn: () => apiFetch<Appointment[]>("/appointments?role=patient"),
  });

  const appointments: Appointment[] = useMemo(() => {
    if (Array.isArray(appointmentsData)) return appointmentsData;
    if (Array.isArray((appointmentsData as any)?.data)) return (appointmentsData as any).data;
    return [];
  }, [appointmentsData]);

  // 3. Fetch Therapy Exercise Progress
  const { data: therapyProgress } = useQuery<TherapyProgress[]>({
    queryKey: ["patient", "therapy-progress"],
    queryFn: () => apiFetch<TherapyProgress[]>("/therapy/progress"),
  });

  // 4. Fetch Clinical Assessments Results
  const { data: assessmentResults } = useQuery<AssessmentResult[]>({
    queryKey: ["patient", "assessments-results"],
    queryFn: () => apiFetch<AssessmentResult[]>("/assessments/results"),
  });

  // 5. Fetch Active Prescriptions
  const { data: prescriptions } = useQuery<PatientPrescription[]>({
    queryKey: ["appointments", "prescriptions"],
    queryFn: () => apiFetch<PatientPrescription[]>("/appointments/prescriptions"),
  });

  // Mutation: Submit Quick Mood Check-In
  const checkInMutation = useMutation({
    mutationFn: (data: {
      moodType: string;
      stressLevel: number;
      anxietyLevel: number;
      sleepQuality: number;
      notes?: string;
    }) =>
      apiFetch("/mood-tracking", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Daily check-in saved! Your wellness indicators are updated.");
      setIsCheckInOpen(false);
      setCheckInNotes("");
      queryClient.invalidateQueries({ queryKey: ["patient", "mood-summary"] });
      queryClient.invalidateQueries({ queryKey: ["mood"] });
    },
    onError: (err: any) => {
      let msg = "Failed to save daily check-in.";
      if (err?.message) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed?.moodType?.[0]) msg = `Mood selection: ${parsed.moodType[0]}`;
          else if (typeof parsed === "string") msg = parsed;
          else if (parsed?.message) msg = parsed.message;
        } catch {
          msg = err.message;
        }
      }
      toast.error(msg);
    },
  });

  const handleOpenPreset = (preset: typeof MOOD_QUICK_PRESETS[number]) => {
    setSelectedMood(preset.label);
    setStressInput(preset.stress);
    setAnxietyInput(preset.anxiety);
    setSleepInput(preset.sleep);
    setIsCheckInOpen(true);
  };

  const handleSaveCheckIn = (e: React.FormEvent) => {
    e.preventDefault();
    const canonicalMoodMap: Record<string, string> = {
      Content: "Happy",
      Neutral: "Normal",
      Down: "Sad",
    };
    const moodToSend = canonicalMoodMap[selectedMood] || selectedMood;

    checkInMutation.mutate({
      moodType: moodToSend,
      stressLevel: stressInput,
      anxietyLevel: anxietyInput,
      sleepQuality: sleepInput,
      notes: checkInNotes.trim() || undefined,
    });
  };

  const latestMood = moodSummary?.records?.[0];
  const hasLoggedToday = useMemo(() => {
    if (!latestMood?.recordedDate) return false;
    const recorded = new Date(latestMood.recordedDate);
    const today = new Date();
    return (
      recorded.getDate() === today.getDate() &&
      recorded.getMonth() === today.getMonth() &&
      recorded.getFullYear() === today.getFullYear()
    );
  }, [latestMood]);

  // Find upcoming scheduled appointment
  const upcomingAppointment = useMemo(() => {
    return appointments?.find(
      (a) => a.appointmentStatus === "Scheduled" && new Date(a.appointmentDate) >= new Date()
    );
  }, [appointments]);

  // Latest PHQ9 and GAD7 assessment scores
  const latestPHQ9 = useMemo(() => {
    return assessmentResults?.find((r) =>
      (r.assessmentTitle || "").toUpperCase().includes("PHQ") ||
      (r.assessmentCategory || "").toLowerCase().includes("depression")
    );
  }, [assessmentResults]);

  const latestGAD7 = useMemo(() => {
    return assessmentResults?.find((r) =>
      (r.assessmentTitle || "").toUpperCase().includes("GAD") ||
      (r.assessmentCategory || "").toLowerCase().includes("anxiety")
    );
  }, [assessmentResults]);

  // Active Clinical Insight: Select highest priority assessment finding or latest screening
  const activeClinicalInsight = useMemo(() => {
    if (!assessmentResults || assessmentResults.length === 0) return null;
    // 1. Check for crisis alert
    const crisisItem = assessmentResults.find((r) => r.crisisAlert);
    if (crisisItem) return crisisItem;
    // 2. Check for assessment requiring clinical follow-up
    const followUpItem = assessmentResults.find((r) => r.requiresFollowUp);
    if (followUpItem) return followUpItem;
    // 3. Check for elevated severity (Moderate, Severe, etc.)
    const elevatedItem = assessmentResults.find(
      (r) => ["MODERATE", "SEVERE", "EXTREMELY SEVERE", "HIGH"].includes((r.severityLevel || "").toUpperCase())
    );
    if (elevatedItem) return elevatedItem;
    // 4. Default to the most recent completed assessment result
    return assessmentResults[0];
  }, [assessmentResults]);

  // Recommended Therapy Program matched to active clinical insight
  const activeMatchedTherapy = useMemo(() => {
    if (!activeClinicalInsight) return null;
    return getRecommendedTherapyForAssessment(activeClinicalInsight);
  }, [activeClinicalInsight]);

  // Recommended Therapy Program for PHQ-9 — only when the user has a real result
  const phq9MatchedTherapy = useMemo(() => {
    if (!latestPHQ9) return null;
    return getRecommendedTherapyForAssessment({
      assessmentTitle: "PHQ-9 Depression Screener",
      assessmentCategory: "Depression",
      severityLevel: latestPHQ9.severityLevel,
      identifiedProblem: latestPHQ9.identifiedProblem,
    });
  }, [latestPHQ9]);

  // Recommended Therapy Program for GAD-7 — only when the user has a real result
  const gad7MatchedTherapy = useMemo(() => {
    if (!latestGAD7) return null;
    return getRecommendedTherapyForAssessment({
      assessmentTitle: "GAD-7 Anxiety Screener",
      assessmentCategory: "Anxiety",
      severityLevel: latestGAD7.severityLevel,
      identifiedProblem: latestGAD7.identifiedProblem,
    });
  }, [latestGAD7]);

  // Whether the user has any mood data at all
  const hasMoodData = (moodSummary?.totalEntries ?? 0) > 0;

  // Dynamic Holistic Wellness Score calculation — null when no data exists
  const wellnessScore = useMemo(() => {
    if (!moodSummary || moodSummary.totalEntries === 0) return null;
    const avgStress = moodSummary.averageStress || 3;
    const avgAnxiety = moodSummary.averageAnxiety || 3;
    const avgSleep = moodSummary.averageSleep || 7.5;
    return Math.round(
      Math.max(15, Math.min(100, avgSleep * 4 + (10 - avgStress) * 3 + (10 - avgAnxiety) * 3))
    );
  }, [moodSummary]);

  // Computed metrics — null when no data exists so cards can show empty states
  const currentStress: number | null = latestMood
    ? latestMood.stressLevel
    : (moodSummary?.averageStress ?? null);
  const currentAnxiety: number | null = latestMood
    ? latestMood.anxietyLevel
    : (moodSummary?.averageAnxiety ?? null);
  const currentSleep: number | null = latestMood
    ? latestMood.sleepQuality
    : (moodSummary?.averageSleep ?? null);

  const phq9Percentage = latestPHQ9 && latestPHQ9.maxScore
    ? Math.round((latestPHQ9.score / latestPHQ9.maxScore) * 100)
    : null;
  const gad7Percentage = latestGAD7 && latestGAD7.maxScore
    ? Math.round((latestGAD7.score / latestGAD7.maxScore) * 100)
    : null;

  const userName = session?.user?.name ? session.user.name.split(" ")[0] : "Friend";

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 font-sans">
      {/* Pending Doctor Review Banner */}
      <PendingReviewBanner />

      {/* 1. Welcoming Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-card to-card border border-border/70 p-6 sm:p-8 shadow-xs">
        {/* Soft background ambient glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Personal Care Sanctuary</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {greeting}, {userName} 🌿
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
              Take a steady breath. Here is your daily well-being overview, care protocol, and upcoming clinical consultations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsCheckInOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs h-10 px-5 rounded-xl shadow-xs flex items-center gap-2"
            >
              <Smile className="w-4 h-4" />
              {hasLoggedToday ? "Update Today's Check-in" : "Log Today's Mood"}
            </Button>

            <Link href="/patient/emergency">
              <Button
                variant="outline"
                className="text-xs h-10 px-4 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Crisis Support</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 1-Tap Mood Selector strip */}
        <div className="relative z-10 mt-6 pt-6 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs font-semibold text-muted-foreground">
            How is your mind feeling right now?
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {MOOD_QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleOpenPreset(preset)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background/80 hover:bg-muted border border-border/80 hover:border-primary/40 text-foreground transition-all duration-150 shrink-0 shadow-2xs hover:scale-105 active:scale-95"
              >
                <span>{preset.emoji}</span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Vitality & Wellness KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Holistic Wellness Balance */}
        <Card className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Wellness Index
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Heart className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            {wellnessScore !== null ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {wellnessScore}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${wellnessScore}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-muted-foreground/40 tracking-tight font-mono">--</span>
                  <span className="text-xs text-muted-foreground font-mono">/ 100</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                </div>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
            <span>Overall Balance</span>
            <span className={wellnessScore !== null ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-muted-foreground/60 font-medium italic"}>
              {wellnessScore !== null
                ? wellnessScore >= 80 ? "Optimal Zone" : wellnessScore >= 60 ? "Stable Condition" : "Attention Recommended"
                : "Log a check-in first"}
            </span>
          </p>
        </Card>

        {/* Card 2: Stress Level */}
        <Card className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Stress Load
            </span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            {currentStress !== null ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {currentStress}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">/ 10</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, currentStress * 10)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-muted-foreground/40 tracking-tight font-mono">--</span>
                  <span className="text-xs text-muted-foreground font-mono">/ 10</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                </div>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
            <span>Autonomic State</span>
            <span className={currentStress !== null ? "text-teal-600 dark:text-teal-400 font-semibold" : "text-muted-foreground/60 font-medium italic"}>
              {currentStress !== null
                ? currentStress <= 3 ? "Low & Regulated" : currentStress <= 6 ? "Moderate Pressure" : "Elevated Strain"
                : "No data yet"}
            </span>
          </p>
        </Card>

        {/* Card 3: Anxiety Level */}
        <Card className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Anxiety State
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Smile className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            {currentAnxiety !== null ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {currentAnxiety}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">/ 10</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, currentAnxiety * 10)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-muted-foreground/40 tracking-tight font-mono">--</span>
                  <span className="text-xs text-muted-foreground font-mono">/ 10</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                </div>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
            <span>Emotional Tension</span>
            <span className={currentAnxiety !== null ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground/60 font-medium italic"}>
              {currentAnxiety !== null
                ? currentAnxiety <= 3 ? "Minimal / Calm" : currentAnxiety <= 6 ? "Controlled" : "Heightened"
                : "No data yet"}
            </span>
          </p>
        </Card>

        {/* Card 4: Sleep Restfulness */}
        <Card className="p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Restful Sleep
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="my-3">
            {currentSleep !== null ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-foreground tracking-tight font-mono">
                    {currentSleep}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">hrs avg</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentSleep / 10) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-muted-foreground/40 tracking-tight font-mono">--</span>
                  <span className="text-xs text-muted-foreground font-mono">hrs avg</span>
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                </div>
              </>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
            <span>Circadian Recovery</span>
            <span className={currentSleep !== null ? "text-sky-600 dark:text-sky-400 font-semibold" : "text-muted-foreground/60 font-medium italic"}>
              {currentSleep !== null
                ? currentSleep >= 7 ? "Restorative Cycle" : "Needs Sleep Hygiene"
                : "No data yet"}
            </span>
          </p>
        </Card>
      </div>

      {/* 3. Main Dashboard Workspace (Balanced Equal-Level Grid) */}
      <div className="space-y-6">
        {/* ROW 1: Care Protocol & Next Consultation (Matched Height) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Today's Daily Care Protocol */}
          <Card className="p-6 flex flex-col justify-between h-full shadow-xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Today's Care Protocol
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Daily healthy actions recommended by your clinical team
                  </p>
                </div>
                <span className="text-xs font-semibold font-mono text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                  {hasLoggedToday ? "1 of 3 Completed" : "0 of 3 Completed"}
                </span>
              </div>

              <div className="space-y-3">
                {/* Item 1: Mood check-in */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      hasLoggedToday
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {hasLoggedToday ? <Check className="w-4 h-4 stroke-[3]" /> : <Smile className="w-4 h-4" />}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Daily Mood & Emotion Log</h4>
                      <p className="text-[11px] text-muted-foreground">
                        {hasLoggedToday
                          ? `Logged today as ${latestMood?.moodType || "Completed"}`
                          : "Check in with your feelings for personalized recommendations"}
                      </p>
                    </div>
                  </div>
                  {!hasLoggedToday ? (
                    <Button
                      size="sm"
                      onClick={() => setIsCheckInOpen(true)}
                      className="text-xs h-7 px-3 bg-primary text-primary-foreground font-semibold"
                    >
                      Check in
                    </Button>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Done
                    </span>
                  )}
                </div>

                {/* Item 2: Therapy practice */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">5-Minute Mindful Respiration</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Box breathing exercise to regulate the parasympathetic system
                      </p>
                    </div>
                  </div>
                  <Link href="/patient/therapy">
                    <Button variant="outline" size="sm" className="text-xs h-7 px-3">
                      Start Exercise
                    </Button>
                  </Link>
                </div>

                {/* Item 3: Evening journal */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      <BookMarked className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Evening Thought Journal</h4>
                      <p className="text-[11px] text-muted-foreground">
                        Reflect on one positive moment and process cognitive thoughts
                      </p>
                    </div>
                  </div>
                  <Link href="/patient/journal">
                    <Button variant="outline" size="sm" className="text-xs h-7 px-3">
                      Open Journal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: Upcoming Clinical Consultation */}
          <Card className="p-6 flex flex-col justify-between h-full shadow-xs border-primary/30">
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Next Consultation
                </h3>
                <Link
                  href="/patient/appointments"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Manage</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {upcomingAppointment ? (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {upcomingAppointment.consultationType === "Video" ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      {upcomingAppointment.consultationType} Visit
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {upcomingAppointment.sessionDurationMinutes || 50} mins
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {upcomingAppointment.doctorName || "Attending Psychologist"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(upcomingAppointment.appointmentDate).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </div>

                  {upcomingAppointment.consultationReason && (
                    <p className="text-xs text-muted-foreground bg-background/80 p-2 rounded-lg border border-border/60">
                      Reason: {upcomingAppointment.consultationReason}
                    </p>
                  )}

                  <Button asChild className="w-full text-xs font-semibold h-9 mt-2">
                    <Link href="/patient/appointments">
                      View Appointment Details
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-muted/20 border border-dashed border-border/80 text-center space-y-2 flex-1 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">No visits scheduled this week</h4>
                  <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                    Have health questions or need a follow-up? Connect with our licensed physicians & therapists.
                  </p>
                  <Button asChild size="sm" className="mt-2 text-xs h-8">
                    <Link href="/patient/appointments">
                      Schedule a Visit
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* ROW 2: Active Prescriptions & Self-Care Toolkit (Matched Height) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Card 3: Active Prescriptions & Treatment Plan */}
          <Card className="p-6 flex flex-col justify-between h-full shadow-xs">
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                    <Pill className="w-4 h-4 text-indigo-500" />
                    Active Prescriptions & Regimen
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Direct orders and session regimens issued by your attending psychologists
                  </p>
                </div>
                <Link
                  href="/patient/appointments"
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {prescriptions && prescriptions.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {prescriptions.slice(0, 2).map((rx) => (
                    <div
                      key={rx.id}
                      className="p-4 rounded-xl border border-border/80 bg-card hover:border-indigo-500/40 transition-colors space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-foreground">{rx.title}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Issued by {rx.doctorName} {rx.doctorSpecialization && `• ${rx.doctorSpecialization}`}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          Rx Active
                        </span>
                      </div>

                      {rx.medications && rx.medications.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                          {rx.medications.map((m, idx) => (
                            <div key={idx} className="text-xs bg-muted/40 p-2 rounded-lg">
                              <span className="font-semibold text-foreground block">{m.medicationName} ({m.dosage})</span>
                              <span className="text-[11px] text-muted-foreground">{m.frequency} • {m.duration}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-dashed border-border/80 text-center space-y-1.5 flex-1 flex flex-col items-center justify-center">
                  <p className="text-xs text-foreground font-semibold">No active prescriptions on file</p>
                  <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                    When your psychologist prescribes a treatment regimen during your visit, your regimen schedule will be visible here.
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Card 4: Self-Care Exploration Hub */}
          <Card className="p-6 flex flex-col justify-between h-full shadow-xs">
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="pb-2 border-b border-border/50">
                <h3 className="text-base font-bold text-foreground tracking-tight">
                  Self-Care Toolkit
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Quick access to daily exercises and emotional support
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1">
                <Link
                  href="/patient/therapy"
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 hover:border-teal-500/40 transition-all text-left flex flex-col justify-center space-y-1.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground block">Therapy & Calm</span>
                  <span className="text-[10px] text-muted-foreground block">Guided CBT & audio</span>
                </Link>

                <Link
                  href="/patient/journal"
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 hover:border-indigo-500/40 transition-all text-left space-y-1.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center transition-transform group-hover:scale-110">
                    <BookMarked className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground block">Daily Journal</span>
                  <span className="text-[10px] text-muted-foreground block">Reflective diary</span>
                </Link>

                <Link
                  href="/patient/counseling"
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 hover:border-sky-500/40 transition-all text-left space-y-1.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground block">AI Companion</span>
                  <span className="text-[10px] text-muted-foreground block">24/7 self-reflection</span>
                </Link>

                <Link
                  href="/patient/community"
                  className="p-3.5 rounded-xl border border-border/80 bg-card hover:bg-muted/50 hover:border-amber-500/40 transition-all text-left space-y-1.5 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-foreground block">Peer Circle</span>
                  <span className="text-[10px] text-muted-foreground block">Encouragement space</span>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* ROW 3: Clinical Assessment Trajectory & Active Insights Feed (Full-Width Baseline Anchor) */}
        <Card className="p-6 space-y-5 shadow-xs w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border/50 gap-2">
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Clinical Assessment Trajectory & Insights Feed
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Standardized psychiatric screening indicators with personalized clinical guidance
              </p>
            </div>
            <Link
              href="/patient/assessments"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Assessment Battery</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ACTIVE CLINICAL RECOMMENDATION BANNER */}
          {activeClinicalInsight ? (
            (() => {
              const action = getInsightAction(activeClinicalInsight);
              const ActionIcon = action.icon;
              return (
                <div className="space-y-4">
                  {/* Top: Active Recommendation Strip */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-teal-500/10 to-indigo-500/10 border border-primary/25 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                          <CheckCircle2 className="w-3 h-3 text-primary" />
                          Active Clinical Recommendation
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                          {activeClinicalInsight.assessmentTitle || "Validated Screening"}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSeverityBadgeClass(
                            activeClinicalInsight.severityLevel
                          )}`}
                        >
                          {activeClinicalInsight.severityLevel} Level
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-foreground tracking-tight">
                        {activeClinicalInsight.identifiedProblem || "Clinical Screening Pattern Identified"}
                      </h4>

                      <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
                        {activeClinicalInsight.aiRecommendation ||
                          activeClinicalInsight.suggestedFollowUp ||
                          "Maintain steady autonomic regulation and balanced lifestyle habits."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start md:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedResultForModal(activeClinicalInsight)}
                        className="text-xs h-9 px-3.5 rounded-xl border-border/80 hover:bg-background/80"
                      >
                        Clinical Impression
                      </Button>

                      <Button asChild size="sm" className="text-xs h-9 px-4 rounded-xl font-semibold shadow-xs">
                        <Link href={action.href}>
                          <ActionIcon className="w-3.5 h-3.5 mr-1.5" />
                          {action.label}
                        </Link>
                      </Button>
                    </div>
                  </div>

                  {/* Dedicated Clinically Matched Therapy Program Card */}
                  {activeMatchedTherapy && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-card border border-primary/20 shadow-xs space-y-3.5 hover:border-primary/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            {activeMatchedTherapy.emoji}
                          </span>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground">
                                {activeMatchedTherapy.programTitle}
                              </h4>
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {activeMatchedTherapy.modality}
                              </span>
                              <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/60">
                                {activeMatchedTherapy.difficultyLevel} Level
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {activeMatchedTherapy.durationWeeks} Weeks • {activeMatchedTherapy.sessionCount} Clinical Modules • {activeMatchedTherapy.dailyMinutes} mins/day
                            </p>
                          </div>
                        </div>

                        <Button asChild size="sm" className="text-xs h-9 px-4 rounded-xl font-semibold shrink-0 self-start sm:self-auto shadow-xs">
                          <Link href={`/patient/therapy?program=${encodeURIComponent(activeMatchedTherapy.programTitle)}`}>
                            Begin Therapy Program
                            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                          </Link>
                        </Button>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <strong className="text-foreground font-semibold">Clinical Indication: </strong>
                        {activeMatchedTherapy.matchReason} {activeMatchedTherapy.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-1">
                          Curriculum Targets:
                        </span>
                        {activeMatchedTherapy.therapeuticGoals.map((goal, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2.5 py-0.5 rounded-md bg-muted/60 border border-border/60 text-foreground"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-primary shrink-0" />
                            {goal}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-primary/25 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                    Clinical Insights Feed
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                    Baseline Calibration Ready
                  </span>
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  Personalize Your Clinical Care Protocol
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                  Complete your standardized psychiatric screening (PHQ-9 & GAD-7) to generate instant AI-backed clinical recommendations, therapy exercises, and physician-reviewed protocols.
                </p>
              </div>
              <Button asChild size="sm" className="text-xs h-9 px-4 rounded-xl font-semibold shrink-0">
                <Link href="/patient/assessments">
                  Take 3-Min Screening
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </Button>
            </div>
          )}

          {/* DYNAMIC SCREENING GAUGES: PHQ-9 & GAD-7 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* PHQ-9 Depression Screener */}
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3 hover:border-primary/40 transition-colors">
              {latestPHQ9 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">PHQ-9 Depression Screener</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getSeverityBadgeClass(
                            latestPHQ9.severityLevel
                          )}`}
                        >
                          {latestPHQ9.severityLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Score: {latestPHQ9.score} / {latestPHQ9.maxScore ?? 27} ({phq9Percentage}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedResultForModal(latestPHQ9)}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressBarClass(latestPHQ9.severityLevel)}`}
                      style={{ width: `${phq9Percentage}%` }}
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      {latestPHQ9.identifiedProblem}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {latestPHQ9.suggestedFollowUp || latestPHQ9.clinicalSummary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                    <Link
                      href={`/patient/therapy?program=${encodeURIComponent(phq9MatchedTherapy!.programTitle)}`}
                      className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold hover:underline"
                    >
                      <span>{phq9MatchedTherapy!.emoji} {phq9MatchedTherapy!.programTitle}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/patient/assessments"
                      className="font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <span>Retake</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">PHQ-9 Depression Screener</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border/60">
                          Not Screened
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">Score: -- / 27</span>
                    </div>
                    <Link href="/patient/assessments" className="text-[11px] font-semibold text-primary hover:underline">
                      Take Screener
                    </Link>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">No screening data yet</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Take the 3-minute PHQ-9 screening to assess your depression indicators and unlock personalized clinical guidance.
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/40 text-[11px]">
                    <Link
                      href="/patient/assessments"
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Start Screener</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* GAD-7 Anxiety Screener */}
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3 hover:border-primary/40 transition-colors">
              {latestGAD7 ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">GAD-7 Anxiety Screener</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${getSeverityBadgeClass(
                            latestGAD7.severityLevel
                          )}`}
                        >
                          {latestGAD7.severityLevel}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Score: {latestGAD7.score} / {latestGAD7.maxScore ?? 21} ({gad7Percentage}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedResultForModal(latestGAD7)}
                      className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressBarClass(latestGAD7.severityLevel)}`}
                      style={{ width: `${gad7Percentage}%` }}
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      {latestGAD7.identifiedProblem}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {latestGAD7.suggestedFollowUp || latestGAD7.clinicalSummary}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px]">
                    <Link
                      href={`/patient/therapy?program=${encodeURIComponent(gad7MatchedTherapy!.programTitle)}`}
                      className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      <span>{gad7MatchedTherapy!.emoji} {gad7MatchedTherapy!.programTitle}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href="/patient/assessments"
                      className="font-semibold text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <span>Retake</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-xs">GAD-7 Anxiety Screener</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border/60">
                          Not Screened
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">Score: -- / 21</span>
                    </div>
                    <Link href="/patient/assessments" className="text-[11px] font-semibold text-primary hover:underline">
                      Take Screener
                    </Link>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="bg-muted-foreground/20 h-2 rounded-full w-0" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">No screening data yet</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Take the 3-minute GAD-7 screening to assess your anxiety indicators and receive tailored clinical recommendations.
                    </p>
                  </div>

                  <div className="flex items-center justify-end pt-2 border-t border-border/40 text-[11px]">
                    <Link
                      href="/patient/assessments"
                      className="font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>Start Screener</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 4. Quick Mood Check-In Dialog Modal */}
      <Dialog open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Smile className="w-5 h-5 text-primary" />
              Daily Mood & Wellness Check-in
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Rate your current indicators to update your wellness trajectory and care plan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCheckIn} className="space-y-4 pt-2">
            {/* Mood Emotion Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Selected Mood</label>
              <div className="grid grid-cols-3 gap-2">
                {MOOD_QUICK_PRESETS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => {
                      setSelectedMood(m.label);
                      setStressInput(m.stress);
                      setAnxietyInput(m.anxiety);
                      setSleepInput(m.sleep);
                    }}
                    className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-medium border transition-all ${
                      selectedMood === m.label
                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Slider 1: Stress Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Stress Level</span>
                <span className="font-mono font-bold text-primary">{stressInput} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={stressInput}
                onChange={(e) => setStressInput(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 (Calm)</span>
                <span>10 (Overwhelmed)</span>
              </div>
            </div>

            {/* Slider 2: Anxiety Level */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Anxiety Level</span>
                <span className="font-mono font-bold text-primary">{anxietyInput} / 10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={anxietyInput}
                onChange={(e) => setAnxietyInput(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 (At peace)</span>
                <span>10 (Severe panic)</span>
              </div>
            </div>

            {/* Slider 3: Sleep Restfulness */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-foreground">Sleep Quality / Hours</span>
                <span className="font-mono font-bold text-primary">{sleepInput} hrs</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={sleepInput}
                onChange={(e) => setSleepInput(Number(e.target.value))}
                className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>1 (Insomnia)</span>
                <span>12 (Deep rest)</span>
              </div>
            </div>

            {/* Quick Note */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Personal Notes (Optional)</label>
              <Input
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
                placeholder="What contributed to how you feel today?"
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCheckInOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={checkInMutation.isPending}
                className="text-xs font-semibold bg-primary text-primary-foreground"
              >
                {checkInMutation.isPending ? "Saving..." : "Save Daily Check-in"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Clinical Impression & Assessment Detail Modal */}
      <Dialog
        open={!!selectedResultForModal}
        onOpenChange={(open) => !open && setSelectedResultForModal(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-3xl p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                <ShieldCheck className="w-3 h-3" />
                Validated Clinical Screener
              </span>
              {selectedResultForModal && (
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getSeverityBadgeClass(
                    selectedResultForModal.severityLevel
                  )}`}
                >
                  {selectedResultForModal.severityLevel} Severity
                </span>
              )}
            </div>
            <DialogTitle className="text-lg font-bold text-foreground pt-1">
              {selectedResultForModal?.assessmentTitle || "Clinical Assessment Evaluation"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedResultForModal?.completedDate &&
                `Completed on ${new Date(selectedResultForModal.completedDate).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}`}
            </DialogDescription>
          </DialogHeader>

          {selectedResultForModal && (
            <div className="space-y-3.5 text-xs">
              {/* Score strip */}
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Clinical Instrument Score</span>
                  <span className="text-xl font-mono font-bold text-foreground">
                    {selectedResultForModal.score} / {selectedResultForModal.maxScore || 27}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-muted-foreground block">Trajectory Index</span>
                  <span className="text-sm font-mono font-bold text-primary">
                    {selectedResultForModal.percentage ??
                      Math.round(
                        (selectedResultForModal.score / (selectedResultForModal.maxScore || 27)) * 100
                      )}
                    %
                  </span>
                </div>
              </div>

              {/* Identified Problem */}
              {selectedResultForModal.identifiedProblem && (
                <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-1">
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider block text-primary">
                    Identified Diagnostic Pattern
                  </span>
                  <p className="font-semibold text-foreground text-xs">
                    {selectedResultForModal.identifiedProblem}
                  </p>
                </div>
              )}

              {/* AI Recommendation */}
              {(selectedResultForModal.aiRecommendation || selectedResultForModal.suggestedFollowUp) && (
                <div className="p-3.5 rounded-xl border border-primary/25 bg-primary/5 space-y-1">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recommended Clinical Protocol
                  </span>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {selectedResultForModal.aiRecommendation || selectedResultForModal.suggestedFollowUp}
                  </p>
                </div>
              )}

              {/* Full Clinical Summary */}
              {selectedResultForModal.clinicalSummary && (
                <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                    Diagnostic Impression Summary
                  </span>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    {selectedResultForModal.clinicalSummary}
                  </p>
                </div>
              )}

              {/* Follow-up flag */}
              {selectedResultForModal.requiresFollowUp && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="text-[11px] font-medium leading-tight">
                    Clinical team follow-up is recommended based on symptom reflection criteria.
                  </span>
                </div>
              )}

              {/* Recommended Therapy Intervention */}
              {(() => {
                const modalTherapy = getRecommendedTherapyForAssessment(selectedResultForModal);
                return (
                  <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched Therapy Intervention
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {modalTherapy.modality}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="text-xl p-1.5 rounded-lg bg-card border shrink-0">
                          {modalTherapy.emoji}
                        </span>
                        <div>
                          <h5 className="font-bold text-foreground text-xs">{modalTherapy.programTitle}</h5>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{modalTherapy.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-primary/15 text-[10px] text-muted-foreground">
                      <span>{modalTherapy.durationWeeks} Weeks • {modalTherapy.sessionCount} Modules • {modalTherapy.dailyMinutes}m/day</span>
                      <Button asChild size="sm" className="h-7 text-xs px-3 rounded-lg font-semibold bg-primary text-primary-foreground">
                        <Link href={`/patient/therapy?program=${encodeURIComponent(modalTherapy.programTitle)}`}>
                          Launch Program
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedResultForModal(null)}
              className="text-xs h-8 px-4 rounded-xl"
            >
              Close
            </Button>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="text-xs h-8 px-3 rounded-xl">
                <Link href="/patient/assessments">
                  <ClipboardList className="w-3.5 h-3.5 mr-1" />
                  Retake Test
                </Link>
              </Button>
              <Button asChild size="sm" className="text-xs h-8 px-3.5 rounded-xl font-semibold">
                <Link href="/patient/appointments">
                  <Stethoscope className="w-3.5 h-3.5 mr-1" />
                  Book Specialist
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
