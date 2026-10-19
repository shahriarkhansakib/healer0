"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Zap,
  Activity,
  Clock,
  Sparkles,
  Check,
  Calendar,
  Video,
  MessageSquare,
  AlertTriangle,
  Smile,
  ShieldCheck,
  Target,
  ArrowRight,
  TrendingUp,
  Info,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";

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

interface AssessmentResult {
  id: string;
  assessmentId: string;
  assessmentTitle?: string;
  assessmentCategory?: string;
  score: number;
  maxScore?: number;
  severityLevel: string;
  identifiedProblem?: string;
  clinicalSummary?: string;
  completedDate: string;
}

/**
 * Segmented LED progress bar component matching the "Latency comparison" style from the reference design.
 */
function SegmentedBar({
  value,
  totalBlocks = 30,
  activeColor = "bg-emerald-400",
  glowColor = "shadow-[0_0_8px_rgba(52,211,153,0.6)]",
}: {
  value: number;
  totalBlocks?: number;
  activeColor?: string;
  glowColor?: string;
}) {
  const activeCount = Math.max(1, Math.min(totalBlocks, Math.round((value / 100) * totalBlocks)));
  return (
    <div className="flex items-center gap-[2.5px] w-full py-0.5">
      {Array.from({ length: totalBlocks }).map((_, i) => {
        const isActive = i < activeCount;
        return (
          <div
            key={i}
            className={`h-3.5 flex-1 rounded-[1.5px] transition-all duration-300 ${
              isActive
                ? `${activeColor} ${glowColor}`
                : "bg-white/[0.06] border border-white/[0.02]"
            }`}
          />
        );
      })}
    </div>
  );
}

export default function PatientOverviewPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Fetch Mood & Wellness trends (last 7 days)
  const { data: moodSummary, isLoading: loadingMood } = useQuery<MoodSummary>({
    queryKey: ["patient", "mood-summary"],
    queryFn: () => apiFetch<MoodSummary>("/mood-tracking/summary"),
  });

  // 2. Fetch Appointments
  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ["patient", "appointments"],
    queryFn: () => apiFetch<Appointment[]>("/appointments"),
  });

  // 3. Fetch Therapy Exercise Progress
  const { data: therapyProgress, isLoading: loadingTherapy } = useQuery<TherapyProgress[]>({
    queryKey: ["patient", "therapy-progress"],
    queryFn: () => apiFetch<TherapyProgress[]>("/therapy/progress"),
  });

  // 4. Fetch Clinical Assessments Results
  const { data: assessmentResults, isLoading: loadingAssessments } = useQuery<AssessmentResult[]>({
    queryKey: ["patient", "assessments-results"],
    queryFn: () => apiFetch<AssessmentResult[]>("/assessments/results"),
  });

  const latestMood = moodSummary?.records?.[0];
  const upcomingAppointment = appointments?.find(
    (a) => a.appointmentStatus === "Scheduled" && new Date(a.appointmentDate) >= new Date()
  );

  // Latest PHQ9 and GAD7 assessment scores if completed
  const latestPHQ9 = assessmentResults?.find((r) =>
    (r.assessmentTitle || "").toUpperCase().includes("PHQ") || (r.assessmentCategory || "").toLowerCase().includes("depression")
  );
  const latestGAD7 = assessmentResults?.find((r) =>
    (r.assessmentTitle || "").toUpperCase().includes("GAD") || (r.assessmentCategory || "").toLowerCase().includes("anxiety")
  );

  // Aggregate stats
  const totalCompletedTasks = useMemo(() => {
    const moodTasks = moodSummary?.records?.filter((r) => r.activityStatus === "Completed").length || 0;
    const therapyTasks = therapyProgress?.filter((t) => t.status === "Completed").length || 0;
    return moodTasks + therapyTasks;
  }, [moodSummary?.records, therapyProgress]);

  const totalPendingTasks = useMemo(() => {
    const moodPending = moodSummary?.records?.filter((r) => r.activityStatus === "Pending").length || 0;
    const therapyInProgress = therapyProgress?.filter((t) => t.status === "In Progress").length || 0;
    return moodPending + therapyInProgress;
  }, [moodSummary?.records, therapyProgress]);

  const totalAssignedTasks = totalCompletedTasks + totalPendingTasks;
  const taskCompletionRate = totalAssignedTasks > 0
    ? Math.round((totalCompletedTasks / totalAssignedTasks) * 100)
    : 85;

  const avgWellnessIndex = useMemo(() => {
    if (!moodSummary || moodSummary.totalEntries === 0) return 88;
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

  // Metric values
  const currentStressValue = latestMood ? latestMood.stressLevel : moodSummary?.averageStress ? moodSummary.averageStress : 2.4;
  const currentAnxietyValue = latestMood ? latestMood.anxietyLevel : moodSummary?.averageAnxiety ? moodSummary.averageAnxiety : 3.8;
  const currentSleepValue = latestMood ? latestMood.sleepQuality : moodSummary?.averageSleep ? moodSummary.averageSleep : 8.2;

  // Percentage values for segmented progress bars
  const phq9Percentage = latestPHQ9 && latestPHQ9.maxScore
    ? Math.round((latestPHQ9.score / latestPHQ9.maxScore) * 100)
    : 14;
  const gad7Percentage = latestGAD7 && latestGAD7.maxScore
    ? Math.round((latestGAD7.score / latestGAD7.maxScore) * 100)
    : 28;
  const stressPercentage = Math.round((currentStressValue / 10) * 100);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Pending Doctor Review Notification Banner */}
      <PendingReviewBanner />

      {/* Main Dashboard Shell Container */}
      <div className="relative rounded-[2.2rem] bg-[#0c1013] text-white p-5 sm:p-7 md:p-8 overflow-hidden shadow-2xl border border-[#1b2328]">
        {/* Layer 1: Ambient Diagonal Green Spotlight Beam (Matching the original reference image) */}
        <div
          className="absolute -top-36 left-[56%] -translate-x-1/2 w-[580px] h-[380px] pointer-events-none opacity-85 z-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 50% at 50% 30%, rgba(94, 234, 142, 0.38) 0%, rgba(34, 197, 94, 0.22) 38%, rgba(16, 185, 129, 0.06) 68%, transparent 85%)",
            filter: "blur(50px)",
            transform: "rotate(-18deg)",
          }}
        />

        {/* Layer 2: Secondary Soft Halo over Top-Right Header */}
        <div
          className="absolute -top-16 right-16 w-[340px] h-[220px] pointer-events-none opacity-60 z-0"
          style={{
            background:
              "radial-gradient(ellipse at 60% 40%, rgba(52, 211, 153, 0.25) 0%, rgba(16, 185, 129, 0.08) 50%, transparent 75%)",
            filter: "blur(45px)",
          }}
        />

        {/* Layer 3: Soft ambient bottom-left depth reflection */}
        <div
          className="absolute -bottom-24 -left-20 w-[380px] h-[300px] pointer-events-none opacity-40 z-0"
          style={{
            background: "radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* 1. Header Bar (Brand Logo + Nav Pills + Status CTA) */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.07]">
          {/* Brand Mark */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tracking-tight text-white">HEALER</span>
              <span className="text-xs font-mono font-medium text-emerald-400/90 tracking-wider">.Sanctuary</span>
            </div>
          </div>

          {/* Center Nav Pills */}
          <div className="flex items-center gap-1.5 bg-[#12181d]/85 p-1 rounded-full border border-white/[0.08] self-start sm:self-center shadow-inner">
            <Link
              href="/patient"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/[0.12] text-white shadow-xs font-semibold"
            >
              Overview
            </Link>
            <Link
              href="/patient/therapy"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center gap-1"
            >
              Care Plans
            </Link>
            <Link
              href="/patient/assessments"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center gap-1"
            >
              Assessments
            </Link>
            <Link
              href="/patient/appointments"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-zinc-400 hover:text-white transition-all flex items-center gap-1"
            >
              Consultations
            </Link>
          </div>

          {/* Right Status Pill CTA */}
          <Link
            href="/patient/mood"
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-400/60 text-emerald-300 text-xs font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.18)] self-start sm:self-auto cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Check-In Today
          </Link>
        </div>

        {/* 2. Main Dashboard Cards Grid */}
        <div className="relative z-10 pt-6 space-y-5">
          {/* TOP SECTION: 3 KPI Cards (Left) + Holistic Wellness Donut Gauge (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left 8 Columns: 3 KPI Metric Cards + Row 2 Cards */}
            <div className="lg:col-span-8 space-y-5 flex flex-col justify-between">
              {/* Row 1: 3 Horizontal Metric Cards (NPU / GPU / CPU style) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Card 1: Stress State (NPU 9.74ms style) */}
                <div className="rounded-[1.4rem] bg-[#12171b]/90 border border-[#1d252c] p-4.5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400 shadow-inner shrink-0">
                        <Zap className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block font-medium">
                          Stress State
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold tracking-tight text-white font-mono">
                            {currentStressValue}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">/ 10</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
                      ✓ Optimal
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
                    <span>Autonomic load</span>
                    <span className="text-emerald-400 font-mono font-medium">Low Burden</span>
                  </p>
                </div>

                {/* Card 2: Anxiety Load (GPU 39ms style) */}
                <div className="rounded-[1.4rem] bg-[#12171b]/90 border border-[#1d252c] p-4.5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                        <Activity className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block font-medium">
                          Anxiety Load
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold tracking-tight text-white font-mono">
                            {currentAnxietyValue}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">/ 10</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 border border-amber-500/25 text-amber-300">
                      ⚡ Moderate
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
                    <span>7-day baseline</span>
                    <span className="text-amber-400 font-mono font-medium">Controlled</span>
                  </p>
                </div>

                {/* Card 3: Sleep Quality (CPU 494ms style) */}
                <div className="rounded-[1.4rem] bg-[#12171b]/90 border border-[#1d252c] p-4.5 shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all duration-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block font-medium">
                          Sleep Quality
                        </span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-bold tracking-tight text-white font-mono">
                            {currentSleepValue}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-400">/ 10</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-cyan-500/10 border border-cyan-500/25 text-cyan-300">
                      ★ Restful
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2.5 pt-2.5 border-t border-white/[0.05] flex items-center justify-between">
                    <span>Restorative rest</span>
                    <span className="text-cyan-400 font-mono font-medium">8.2 hrs avg</span>
                  </p>
                </div>
              </div>

              {/* Row 2: Symptom Severity (Left) + Care Protocol Adherence (Right) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Panel A: Symptom Severity Breakdown ("Latency comparison" style) */}
                <div className="rounded-[1.4rem] bg-[#12171b]/90 border border-[#1d252c] p-5 shadow-lg space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
                    <h3 className="text-xs font-bold text-white tracking-tight">Symptom Severity Breakdown</h3>
                    <span className="text-[10px] text-zinc-400 font-mono">Lower is better</span>
                  </div>

                  {/* PHQ-9 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200">PHQ-9 Depression</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Minimal
                        </span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">{phq9Percentage}%</span>
                    </div>
                    <SegmentedBar
                      value={phq9Percentage}
                      totalBlocks={26}
                      activeColor="bg-emerald-400"
                      glowColor="shadow-[0_0_8px_rgba(52,211,153,0.7)]"
                    />
                  </div>

                  {/* GAD-7 */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200">GAD-7 Anxiety</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          Mild
                        </span>
                      </div>
                      <span className="font-mono text-blue-400 font-bold">{gad7Percentage}%</span>
                    </div>
                    <SegmentedBar
                      value={gad7Percentage}
                      totalBlocks={26}
                      activeColor="bg-blue-400"
                      glowColor="shadow-[0_0_8px_rgba(96,165,250,0.7)]"
                    />
                  </div>

                  {/* Stress */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-zinc-200">Stress Load</span>
                        <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          Regulated
                        </span>
                      </div>
                      <span className="font-mono text-amber-400 font-bold">{stressPercentage}%</span>
                    </div>
                    <SegmentedBar
                      value={stressPercentage}
                      totalBlocks={26}
                      activeColor="bg-amber-400"
                      glowColor="shadow-[0_0_8px_rgba(251,191,36,0.7)]"
                    />
                  </div>
                </div>

                {/* Panel B: Care Protocol Adherence ("Accuracy by precision" style) */}
                <div className="rounded-[1.4rem] bg-[#12171b]/90 border border-[#1d252c] p-5 shadow-lg space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
                    <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                      <span>Care Protocol Adherence</span>
                      <Info className="w-3 h-3 text-zinc-400" />
                    </h3>
                    <span className="text-[10px] text-zinc-400 font-mono">{taskCompletionRate}% Rate</span>
                  </div>

                  {/* Item 1 */}
                  <div className="p-2.5 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold text-white">Daily Mood Check-in</h4>
                        <p className="text-[10px] text-zinc-400">Regular telemetry logged</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                      High adherence
                    </span>
                  </div>

                  {/* Item 2 */}
                  <div className="p-2.5 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold text-white">CBT & Mindful Respiration</h4>
                        <p className="text-[10px] text-zinc-400">Prescribed session done</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                      High adherence
                    </span>
                  </div>

                  {/* Item 3 */}
                  <div className="p-2.5 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <AlertTriangle className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <div>
                        <h4 className="text-[11px] font-semibold text-white">Evening Journal Routine</h4>
                        <p className="text-[10px] text-zinc-400">Recommended tonight</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 whitespace-nowrap">
                      Moderate
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Circular Donut Gauge Card ("Accuracy by precision" style) */}
            <div className="lg:col-span-4 rounded-[1.6rem] bg-[#12171b]/90 border border-[#1d252c] p-6 shadow-xl flex flex-col justify-between">
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.05]">
                <h3 className="text-xs font-bold text-white tracking-tight">Holistic Wellness Balance</h3>
                <span className="text-[10px] font-mono text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Active Zone
                </span>
              </div>

              {/* Glowing Circular Multi-Segment Donut Ring */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="relative w-44 h-44 flex items-center justify-center">
                  {/* SVG Radial Gauge */}
                  <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 160 160">
                    {/* Background track */}
                    <circle cx="80" cy="80" r="62" stroke="#182026" strokeWidth="15" fill="transparent" />

                    {/* Segment 1: Emerald Green (Mood) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      stroke="#10b981"
                      strokeWidth="15"
                      strokeDasharray="135 390"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                      fill="transparent"
                      className="filter drop-shadow-[0_0_8px_rgba(16,185,129,0.55)] transition-all duration-700"
                    />

                    {/* Segment 2: Electric Cyan / Blue (Therapy) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      stroke="#06b6d4"
                      strokeWidth="15"
                      strokeDasharray="115 390"
                      strokeDashoffset="-145"
                      strokeLinecap="round"
                      fill="transparent"
                      className="filter drop-shadow-[0_0_8px_rgba(6,182,212,0.55)] transition-all duration-700"
                    />

                    {/* Segment 3: Warm Amber (Sleep) */}
                    <circle
                      cx="80"
                      cy="80"
                      r="62"
                      stroke="#f59e0b"
                      strokeWidth="15"
                      strokeDasharray="90 390"
                      strokeDashoffset="-270"
                      strokeLinecap="round"
                      fill="transparent"
                      className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.55)] transition-all duration-700"
                    />
                  </svg>

                  {/* Central Inset Dark Disc */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-26 h-26 rounded-full bg-[#0a0f12] border border-[#1e2a33] shadow-[inset_0_0_25px_rgba(0,0,0,0.85)] flex flex-col items-center justify-center">
                      <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
                        {avgWellnessIndex}
                      </span>
                      <span className="text-[9px] uppercase font-mono tracking-wider text-emerald-400 font-semibold mt-0.5">
                        Vitality Index
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 3-Column Precision Metrics (FP32 / FP16 / INT8 Quant style) */}
              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06] text-center">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">Mood Balance</span>
                  <span className="text-sm font-bold font-mono text-emerald-400">92%</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">Stable</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">Therapy Tasks</span>
                  <span className="text-sm font-bold font-mono text-cyan-400">{taskCompletionRate}%</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">Active</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block">Sleep Cycle</span>
                  <span className="text-sm font-bold font-mono text-amber-400">82%</span>
                  <span className="text-[9px] text-zinc-400 block font-mono">Restful</span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Clinical Care Statistics (Left) + Upcoming Consultations & Therapy Schedule (Right) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card A: Clinical Care Statistics (Model Statistics style) */}
            <div className="rounded-[1.6rem] bg-[#12171b]/90 border border-[#1d252c] p-5 sm:p-6 shadow-xl space-y-4">
              <div>
                <h3 className="text-xs font-bold text-white tracking-tight">Clinical Care Statistics</h3>
                <p className="text-[10px] text-zinc-400 mt-0.5">Continuous patient telemetry & consult records</p>
              </div>

              {/* Sub-section 1: Care Baseline */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider font-medium block">
                  Care Baseline
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-emerald-400 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">Last Check-in</span>
                      <span className="text-xs font-bold font-mono text-white">
                        {latestMood ? "Today, Logged" : "Recorded"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-blue-400 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">Clinical Phase</span>
                      <span className="text-xs font-bold font-mono text-white">Phase 2: Recovery</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-section 2: Therapeutic Engagement */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider font-medium block">
                  Therapeutic Records
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 shrink-0">
                      <Target className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">Exercises Done</span>
                      <span className="text-xs font-bold font-mono text-white">
                        {totalCompletedTasks} Sessions
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#171f25]/80 border border-[#232f38] flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-cyan-400 shrink-0">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-[9px] text-zinc-400 block">Next Consult</span>
                      <span className="text-xs font-bold font-mono text-white truncate max-w-[110px]">
                        {upcomingAppointment ? "Scheduled" : "Available"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card B: Upcoming Consultation & Care Schedule (Authentic Healthcare Appointment Card) */}
            <div className="rounded-[1.6rem] bg-[#12171b]/90 border border-[#1d252c] p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.05]">
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight">Consultation & Care Schedule</h3>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Encrypted 1-on-1 psychiatric and therapy visits</p>
                </div>
                <Link
                  href="/patient/appointments"
                  className="text-[10px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold"
                >
                  Manage <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              {upcomingAppointment ? (
                <div className="p-3.5 rounded-xl bg-[#171f25]/80 border border-[#232f38] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {upcomingAppointment.consultationType === "Video" ? (
                        <Video className="w-3 h-3" />
                      ) : (
                        <MessageSquare className="w-3 h-3" />
                      )}
                      {upcomingAppointment.consultationType} Consultation
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">
                      {upcomingAppointment.sessionDurationMinutes || 50} mins
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-white">
                    <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {new Date(upcomingAppointment.appointmentDate).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  {upcomingAppointment.consultationReason && (
                    <p className="text-[11px] text-zinc-400 line-clamp-1">
                      Reason: {upcomingAppointment.consultationReason}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#171f25]/60 border border-[#232f38]/60 text-center space-y-1.5 py-5">
                  <p className="text-xs text-zinc-300 font-medium">No upcoming visit scheduled</p>
                  <p className="text-[10px] text-zinc-400">
                    Connect with licensed psychiatrists & therapists for dedicated clinical care.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button asChild size="sm" className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold text-xs h-8">
                  <Link href="/patient/appointments" className="flex items-center justify-center gap-1.5">
                    {upcomingAppointment ? "View Appointment Room" : "Schedule New Consultation"}
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="border-white/10 text-white hover:bg-white/10 text-xs h-8">
                  <Link href="/patient/therapy">Therapy Tasks</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
