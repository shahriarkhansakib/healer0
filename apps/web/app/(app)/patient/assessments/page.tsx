"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Calendar,
  ShieldAlert,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
  PhoneCall,
  Sparkles,
  Languages,
  Layers,
  Compass,
  Star,
  CheckCircle,
  Award,
  BookOpen,
  Filter,
  Check,
  HeartHandshake,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getQuestionBanglaText,
  getOptionBanglaLabel,
  getTimeframeBangla,
  getAssessmentTitleBangla,
  getAssessmentDescriptionBangla,
  BANGLA_ASSESSMENT_TITLES,
} from "@/lib/translations/assessment-questions-bn";

interface OptionItem {
  id: string;
  label: string;
  score: number;
}

interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionCode?: string;
  questionText: string;
  options?: OptionItem[];
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  scoreMapping?: Record<string, number>;
  orderIndex: number;
}

interface Assessment {
  id: string;
  code?: string;
  title: string;
  category: string;
  description: string;
  totalQuestions: number;
  timeframe?: string;
  questions?: AssessmentQuestion[];
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

interface AssessmentDomain {
  code: string;
  name: string;
  badge: string;
  icon: string;
  subtitle: string;
  description: string;
  matchCodes: string[];
}

const GRADIENT_MAP: Record<string, string> = {
  purple: "from-indigo-600/90 via-purple-600/80 to-purple-400/90",
  emerald: "from-emerald-600/90 via-emerald-500/80 to-teal-400/90",
  teal: "from-teal-600/90 via-teal-500/80 to-cyan-400/90",
  green: "from-green-600/90 via-emerald-500/80 to-lime-400/90",
  blue: "from-sky-500/90 via-blue-600/80 to-indigo-500/90",
  lime: "from-emerald-500/90 via-lime-500/80 to-green-400/90",
  ocean: "from-blue-600/90 via-sky-500/80 to-cyan-400/90",
  mint: "from-teal-500/90 via-emerald-500/80 to-teal-400/90",
};

const ASSESSMENT_META: Record<string, { emoji: string; gradient: string }> = {
  depression: { emoji: "🌧️", gradient: "purple" },
  anxiety: { emoji: "⚡", gradient: "teal" },
  stress: { emoji: "🔥", gradient: "ocean" },
  burnout: { emoji: "🥀", gradient: "lime" },
  self_esteem: { emoji: "💎", gradient: "emerald" },
  emotional_intelligence: { emoji: "💡", gradient: "teal" },
  personality: { emoji: "🎭", gradient: "purple" },
  sleep_quality: { emoji: "🌙", gradient: "ocean" },
  relationship_satisfaction: { emoji: "💕", gradient: "emerald" },
  resilience: { emoji: "🌳", gradient: "lime" },
  life_satisfaction: { emoji: "☀️", gradient: "teal" },
  social_anxiety: { emoji: "👥", gradient: "ocean" },
  ocd: { emoji: "🔄", gradient: "purple" },
  adhd: { emoji: "🎯", gradient: "lime" },
  autism: { emoji: "🧩", gradient: "emerald" },
  ptsd: { emoji: "🛡️", gradient: "ocean" },
  iq: { emoji: "🧠", gradient: "purple" },
  src_dass21: { emoji: "📊", gradient: "purple" },
  src_ds: { emoji: "🌧️", gradient: "blue" },
  src_as: { emoji: "⚡", gradient: "teal" },
  src_duocs: { emoji: "🔄", gradient: "ocean" },
  src_sias: { emoji: "👥", gradient: "mint" },
  src_marital: { emoji: "💍", gradient: "emerald" },
  src_love_obsession: { emoji: "❤️‍🔥", gradient: "lime" },
};

const ASSESSMENT_DOMAINS: AssessmentDomain[] = [
  {
    code: "Mood",
    name: "Mood & Depressive Well-Being",
    badge: "5 Modules",
    icon: "🌧️",
    subtitle: "PHQ-9, DASS-21, Depression Scale (DS), Burnout & Life Appraisal",
    description: "Reflect on low mood patterns, depression severity scales, energy depletion, and overarching life satisfaction.",
    matchCodes: ["depression", "src_dass21", "src_ds", "burnout", "life_satisfaction"],
  },
  {
    code: "Anxiety",
    name: "Anxiety & Somatic Tension",
    badge: "5 Modules",
    icon: "⚡",
    subtitle: "Anxiety Scale (AS), SIAS, GAD-7, Situational Stress & Social Fear",
    description: "Screen for persistent worry, somatic anxiety, physiological tension, and evaluative discomfort in group situations.",
    matchCodes: ["anxiety", "src_as", "src_sias", "stress", "social_anxiety"],
  },
  {
    code: "Trauma",
    name: "Trauma & Cognitive Intrusions",
    badge: "3 Modules",
    icon: "🛡️",
    subtitle: "PTSD Reactivity, DUOCS & Obsessive-Compulsive Checking Loops",
    description: "Screen for traumatic memories and hyperarousal, as well as intrusive thoughts and OCD checking patterns.",
    matchCodes: ["ptsd", "ocd", "src_duocs"],
  },
  {
    code: "Focus",
    name: "Attention & Neurodiversity",
    badge: "2 Modules",
    icon: "🎯",
    subtitle: "Executive Function, Inattention & Autistic Traits",
    description: "Reflect on focus, procrastination, and everyday sensory and social communication preferences without clinical labels.",
    matchCodes: ["adhd", "autism"],
  },
  {
    code: "Sleep",
    name: "Restorative Sleep Quality",
    badge: "1 Module",
    icon: "🌙",
    subtitle: "Sleep Architecture, Daytime Fatigue & Drowsiness",
    description: "Assess nighttime sleep continuity, latency to fall asleep, and evaluate daytime alertness to preserve health and safety.",
    matchCodes: ["sleep_quality"],
  },
  {
    code: "Self",
    name: "Self-Worth & Resilience",
    badge: "2 Modules",
    icon: "🌱",
    subtitle: "Perceived Self-Esteem & Adversity Recovery Agility",
    description: "Examine core self-confidence and develop psychological agility to bounce back constructively from setbacks.",
    matchCodes: ["self_esteem", "resilience"],
  },
  {
    code: "Social",
    name: "Relationships, Marriage & Attachment",
    badge: "4 Modules",
    icon: "🤝",
    subtitle: "Marital Adjustment (MAT), Obsessive Love, Boundaries & Emotional Skills",
    description: "Assess marital harmony, relationship satisfaction, attachment obsession patterns, and emotional awareness.",
    matchCodes: ["relationship_satisfaction", "src_marital", "src_love_obsession", "emotional_intelligence"],
  },
  {
    code: "Mind",
    name: "Cognitive Puzzles & Personality",
    badge: "2 Modules",
    icon: "🧠",
    subtitle: "Reasoning Practice & Big-Five Disposition Profile",
    description: "Engage with 10 original logic deduction puzzles and map self-reported Big-Five trait dimensions across daily situations.",
    matchCodes: ["iq", "personality"],
  },
];

export default function AssessmentsPage() {
  const queryClient = useQueryClient();

  // Top Hub Tab: 'assessments' | 'results' | 'safety'
  const [activeTab, setActiveTab] = useState<"assessments" | "results" | "safety">("assessments");

  // Orbital Navigation & Spotlight States
  const [selectedDomainIndex, setSelectedDomainIndex] = useState<number>(0);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<"orbital" | "grid">("orbital");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Active Assessment Taking States
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [isBanglaMode, setIsBanglaMode] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    | "activity"
    | "breakdown"
    | "baseline"
    | "exitConfirm"
    | "instructions"
    | "resultDetail"
    | null
  >(null);
  const [inspectingResult, setInspectingResult] = useState<AssessmentResult | null>(null);

  // 1. Fetch available assessments
  const { data: assessments, isLoading: loadingAssessments } = useQuery<Assessment[]>({
    queryKey: ["assessments", "list"],
    queryFn: () => apiFetch<Assessment[]>("/assessments"),
  });

  // 2. Fetch detailed active assessment with questions
  const { data: activeAssessment, isLoading: loadingActive } = useQuery<Assessment>({
    queryKey: ["assessments", "detail", activeAssessmentId],
    queryFn: () => apiFetch<Assessment>(`/assessments/${activeAssessmentId}`),
    enabled: !!activeAssessmentId,
  });

  // 3. Fetch past results
  const { data: pastResults, isLoading: loadingResults } = useQuery<AssessmentResult[]>({
    queryKey: ["assessments", "results"],
    queryFn: () => apiFetch<AssessmentResult[]>("/assessments/results"),
  });

  // 4. Submit assessment mutation
  const submitMutation = useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      apiFetch<AssessmentResult>(`/assessments/${id}/submit`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      }),
    onSuccess: (result) => {
      toast.success("Assessment submitted and scored successfully! ✨");
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ["assessments", "results"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit assessment.");
    },
  });

  const handleStart = (id: string) => {
    setActiveAssessmentId(id);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setLastResult(null);
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeAssessmentId || !activeAssessment?.questions) return;

    const unanswered = activeAssessment.questions.filter((q) => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions before submitting (${unanswered.length} remaining).`);
      return;
    }

    submitMutation.mutate({
      id: activeAssessmentId,
      answers: selectedAnswers,
    });
  };

  // Derive normalized question options
  const getQuestionOptions = (q: AssessmentQuestion): OptionItem[] => {
    if (Array.isArray(q.options) && q.options.length > 0) {
      return q.options;
    }
    const mapping = q.scoreMapping || {};
    const fallback: OptionItem[] = [];
    if (q.optionA) fallback.push({ id: "A", label: q.optionA, score: mapping["A"] ?? mapping["option_a"] ?? 0 });
    if (q.optionB) fallback.push({ id: "B", label: q.optionB, score: mapping["B"] ?? mapping["option_b"] ?? 1 });
    if (q.optionC) fallback.push({ id: "C", label: q.optionC, score: mapping["C"] ?? mapping["option_c"] ?? 2 });
    if (q.optionD) fallback.push({ id: "D", label: q.optionD, score: mapping["D"] ?? mapping["option_d"] ?? 3 });
    if (q.optionE) fallback.push({ id: "E", label: q.optionE, score: mapping["E"] ?? mapping["option_e"] ?? 4 });
    return fallback;
  };

  // Categories list: dynamically derived from all assessments
  const dynamicCategories = Array.from(new Set(assessments?.map((a) => a.category) || [])).filter(Boolean);
  const categories = ["All", ...dynamicCategories];

  const filteredAssessments = assessments?.filter((a) => {
    if (selectedCategory === "All") return true;
    return a.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  // Domain selection helpers
  const activeDomain = ASSESSMENT_DOMAINS[selectedDomainIndex] || ASSESSMENT_DOMAINS[0];
  const domainAssessments =
    assessments?.filter((a) =>
      activeDomain.matchCodes.some((code) => code.toLowerCase() === (a.code || "").toLowerCase())
    ) || [];

  const currentSpotlightAssessment =
    domainAssessments.find((a) => a.id === selectedAssessmentId) || domainAssessments[0];

  // Stepper calculations
  const questionsList = activeAssessment?.questions || [];
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = questionsList.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const currentQuestion = questionsList[currentQuestionIdx];

  // Real-time support trigger evaluation per methodology safetyRules
  const activeSupportTrigger = (() => {
    for (const [qId, optId] of Object.entries(selectedAnswers)) {
      const q = questionsList.find((item) => item.id === qId || item.questionCode === qId);
      if (!q) continue;
      const code = q.questionCode || "";
      if ((code === "dep_11" || code === "dep_12") && (optId.includes("yes") || optId.includes("unsure"))) {
        return {
          type: "crisis",
          title: "Immediate Crisis & Self-Harm Support Notice",
          message: "Your response indicates thoughts of self-harm. Compassionate, confidential help is available 24/7.",
          actionText: "Call / Text 988",
          actionHref: "tel:988",
        };
      }
      if (code === "slp_11" && (optId.includes("yes") || optId.includes("unsure"))) {
        return {
          type: "sleepiness",
          title: "Driving & Equipment Safety Notice",
          message: "Sleepiness makes driving or operating dangerous equipment unsafe. Please choose a safe travel alternative rather than continuing.",
          actionText: "Sleep Tips",
          actionHref: "/patient/therapy",
        };
      }
      if (code === "rel_11" && (optId.includes("yes") || optId.includes("unsure"))) {
        return {
          type: "relationship",
          title: "Confidential Relationship Safety Support",
          message: "You have the right to feel safe setting boundaries. Confidential relationship assistance is always available 24/7.",
          actionText: "Call 1-800-799-SAFE",
          actionHref: "tel:18007997233",
        };
      }
      if ((code === "src_love_obsession_12" || code === "src_love_obsession_13") && (optId.includes("option_1") || optId.includes("yes"))) {
        return {
          type: "relationship",
          title: "Relationship Boundaries & Safety Advisory",
          message: "আপনার প্রতিক্রিয়া নির্দেশ করছে যে সম্পর্কের আচরণ নিয়ন্ত্রণে পেশাদার বিশেষজ্ঞের পরামর্শ নেওয়া উচিত। গোপন নজরদারি বা ধ্বংসাত্মক আবেগ নিরসনে মানসিক স্বাস্থ্য সহায়তা নিন।",
          actionText: "Call / Text 988",
          actionHref: "tel:988",
        };
      }
    }
    return null;
  })();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in-50 duration-200">
      {/* =========================================================================
          TOP HERO & HUB NAVIGATION (MATCHING THERAPY & RELAXATION AESTHETIC)
          ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clinical Psychometric Assessment Battery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Clinical Mental Health Assessments
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Standardized psychometric screening instruments with validated score ranges, problem evaluation, and clinical triage.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border shadow-2xs self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab("assessments");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "assessments"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Assessments ({assessments?.length || 17})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("results");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "results"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>My Results {pastResults && pastResults.length > 0 ? `(${pastResults.length})` : ""}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("safety");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "safety"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Crisis & Safety</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: CLINICAL ASSESSMENTS (ORBITAL ARC HERO + SPOTLIGHT CARD)
          ========================================================================= */}
      {activeTab === "assessments" && !activeAssessmentId && !lastResult && (
        <div className="space-y-8">
          {/* =========================================================================
              CALM THERAPEUTIC TEAL / GLASSMORPHIC ORBITAL ARC HERO
              ========================================================================= */}
          <div className="relative rounded-3xl border border-teal-500/25 bg-linear-to-b from-teal-950/20 via-card to-card dark:from-teal-950/40 dark:via-background dark:to-background p-6 sm:p-8 overflow-hidden backdrop-blur-xl shadow-xl space-y-6">
            {/* Soft Ambient Teal Backlight Glow */}
            <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[520px] h-64 bg-teal-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Top HUD Bar */}
            <div className="relative z-10 flex items-center justify-between gap-4 text-xs">
              {/* Left Pill */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300">
                <Compass className="w-3.5 h-3.5" />
                <span className="tracking-wider uppercase">Clinical Domains</span>
              </div>

              {/* Center Carousel Counter & Nav */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-card/80 border border-teal-500/20 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx =
                      selectedDomainIndex === 0 ? ASSESSMENT_DOMAINS.length - 1 : selectedDomainIndex - 1;
                    setSelectedDomainIndex(nextIdx);
                    const nextDomain = ASSESSMENT_DOMAINS[nextIdx];
                    const nextAsmts = assessments?.filter((a) =>
                      nextDomain.matchCodes.some((code) => code.toLowerCase() === (a.code || "").toLowerCase())
                    );
                    if (nextAsmts && nextAsmts.length > 0) {
                      setSelectedAssessmentId(nextAsmts[0].id);
                    }
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                  title="Previous domain"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold tracking-widest text-[11px] text-foreground">
                  {String(selectedDomainIndex + 1).padStart(2, "0")} /{" "}
                  {String(ASSESSMENT_DOMAINS.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (selectedDomainIndex + 1) % ASSESSMENT_DOMAINS.length;
                    setSelectedDomainIndex(nextIdx);
                    const nextDomain = ASSESSMENT_DOMAINS[nextIdx];
                    const nextAsmts = assessments?.filter((a) =>
                      nextDomain.matchCodes.some((code) => code.toLowerCase() === (a.code || "").toLowerCase())
                    );
                    if (nextAsmts && nextAsmts.length > 0) {
                      setSelectedAssessmentId(nextAsmts[0].id);
                    }
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                  title="Next domain"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right Mode Switcher: Orbital Spotlight vs Browse All Grid */}
              <button
                type="button"
                onClick={() => setDisplayMode((prev) => (prev === "orbital" ? "grid" : "orbital"))}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-card/80 border border-teal-500/20 text-[11px] text-muted-foreground hover:text-foreground hover:border-teal-500/40 transition-colors shadow-2xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-teal-500" />
                <span className="hidden sm:inline">
                  {displayMode === "orbital" ? "Orbital Spotlight" : "Browse All Grid"}
                </span>
              </button>
            </div>

            {/* =========================================================================
                THE CURVED ORBITAL ARC (Tilted Cards along trajectory)
                ========================================================================= */}
            <div className="relative pt-4 pb-2">
              {/* SVG Trajectory dashed curve */}
              <svg
                className="absolute top-1/2 left-0 w-full -translate-y-1/2 h-28 pointer-events-none stroke-teal-500/25 dark:stroke-teal-400/20"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 800 120"
              >
                <path d="M 20 90 Q 400 15 780 90" strokeWidth="1.5" strokeDasharray="4 6" />
              </svg>

              {/* Domain Cards Container */}
              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-6 px-2 scrollbar-none">
                {ASSESSMENT_DOMAINS.map((domain, idx) => {
                  const isSelected = idx === selectedDomainIndex;
                  const diff = idx - selectedDomainIndex;

                  let rotationDeg = 0;
                  let translateYPx = 0;
                  if (diff === -2) {
                    rotationDeg = -8;
                    translateYPx = 16;
                  } else if (diff === -1) {
                    rotationDeg = -4;
                    translateYPx = 6;
                  } else if (diff === 0) {
                    rotationDeg = 0;
                    translateYPx = -4;
                  } else if (diff === 1) {
                    rotationDeg = 4;
                    translateYPx = 6;
                  } else if (diff === 2) {
                    rotationDeg = 8;
                    translateYPx = 16;
                  } else {
                    rotationDeg = diff > 0 ? 10 : -10;
                    translateYPx = 22;
                  }

                  const domainCount =
                    assessments?.filter((a) =>
                      domain.matchCodes.some((code) => code.toLowerCase() === (a.code || "").toLowerCase())
                    ).length || domain.matchCodes.length;

                  return (
                    <button
                      key={domain.code}
                      type="button"
                      onClick={() => {
                        setSelectedDomainIndex(idx);
                        const nextAsmts = assessments?.filter((a) =>
                          domain.matchCodes.some((code) => code.toLowerCase() === (a.code || "").toLowerCase())
                        );
                        if (nextAsmts && nextAsmts.length > 0) {
                          setSelectedAssessmentId(nextAsmts[0].id);
                        }
                      }}
                      style={{
                        transform: `rotate(${rotationDeg}deg) translateY(${translateYPx}px)`,
                      }}
                      className={`relative flex flex-col items-center justify-between w-24 sm:w-28 h-28 sm:h-32 rounded-3xl p-3 transition-all duration-300 ease-out select-none flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-teal-500/15 dark:bg-teal-900/40 border-2 border-teal-400 dark:border-teal-300 shadow-[0_0_25px_rgba(45,212,191,0.4)] scale-105 z-20"
                          : "bg-card/75 dark:bg-teal-950/30 border border-teal-500/20 hover:border-teal-400/50 hover:bg-card/90 opacity-75 hover:opacity-100 z-10"
                      }`}
                    >
                      {/* Top Star Badge */}
                      <div className="self-end">
                        <Star
                          className={`w-3 h-3 ${
                            isSelected
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </div>

                      {/* Domain Icon */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-transform ${
                          isSelected ? "scale-110 drop-shadow-md" : "opacity-80"
                        }`}
                      >
                        {domain.icon}
                      </div>

                      {/* Domain Code / Name */}
                      <div className="text-center space-y-0.5 w-full">
                        <p
                          className={`text-xs font-extrabold tracking-wider truncate ${
                            isSelected
                              ? "text-teal-600 dark:text-teal-300 font-black"
                              : "text-foreground/80"
                          }`}
                        >
                          {domain.code}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium truncate">
                          {domainCount} {domainCount === 1 ? "Module" : "Modules"}
                        </p>
                      </div>

                      {/* Active glowing indicator pip */}
                      {isSelected && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Central Orbital Anchor Dial */}
            <div className="flex flex-col items-center justify-center space-y-2 pt-1 relative z-10">
              <div className="w-13 h-13 rounded-full bg-teal-950/80 dark:bg-teal-950 border-2 border-teal-400 shadow-[0_0_22px_rgba(45,212,191,0.45)] flex items-center justify-center text-2xl transition-all duration-300">
                <span>{activeDomain.icon}</span>
              </div>

              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-card/90 border border-teal-500/30 text-teal-600 dark:text-teal-300 shadow-xs">
                <span>
                  📍 {domainAssessments.length} Clinical {domainAssessments.length === 1 ? "Assessment" : "Assessments"} Active
                </span>
              </div>
            </div>

            {/* Headline & Subtitle Reveal */}
            <div className="text-center space-y-1.5 max-w-2xl mx-auto pt-1 relative z-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                {activeDomain.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-teal-600 dark:text-teal-400 uppercase">
                {activeDomain.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                {activeDomain.description}
              </p>
            </div>
          </div>

          {/* =========================================================================
              SPOTLIGHT CARD WITH MINI-SWITCHER (USER CHOICE #3)
              ========================================================================= */}
          {displayMode === "orbital" && currentSpotlightAssessment && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              {/* Mini-Switcher for domains with multiple assessments */}
              {domainAssessments.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-card border border-teal-500/25 max-w-xl mx-auto shadow-xs">
                  {domainAssessments.map((asmt) => {
                    const isSelected = asmt.id === currentSpotlightAssessment.id;
                    const meta = ASSESSMENT_META[asmt.code || ""] || { emoji: "📋", gradient: "teal" };
                    const pastResult = pastResults?.find((r) => r.assessmentId === asmt.id);

                    return (
                      <button
                        key={asmt.id}
                        type="button"
                        onClick={() => setSelectedAssessmentId(asmt.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[180px] cursor-pointer ${
                          isSelected
                            ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span className="text-base">{meta.emoji}</span>
                        <span className="truncate">{asmt.title}</span>
                        {pastResult && (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Featured Spotlight Card */}
              {(() => {
                const asmt = currentSpotlightAssessment;
                const meta = ASSESSMENT_META[asmt.code || ""] || { emoji: "📋", gradient: "teal" };
                const gradientClass = GRADIENT_MAP[meta.gradient] || GRADIENT_MAP.teal;
                const pastResult = pastResults?.find((r) => r.assessmentId === asmt.id);

                return (
                  <div className="max-w-4xl mx-auto rounded-3xl border border-teal-500/25 bg-card shadow-xl overflow-hidden backdrop-blur-md">
                    {/* Header Banner matching gradient */}
                    <div
                      className={`relative h-44 sm:h-52 bg-linear-to-r ${gradientClass} p-6 sm:p-8 flex items-end justify-between overflow-hidden select-none`}
                    >
                      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

                      <div className="flex items-center gap-4 z-10">
                        <span className="text-6xl sm:text-7xl drop-shadow-lg transition-transform hover:scale-105">
                          {meta.emoji}
                        </span>
                        <div className="text-white space-y-1">
                          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/30">
                            {asmt.category} Assessment
                          </span>
                          <h3 className="text-xl sm:text-3xl font-black text-white">
                            {asmt.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/90 line-clamp-2 max-w-lg">
                            {asmt.description}
                          </p>
                        </div>
                      </div>

                      <div className="z-10 flex flex-col items-end gap-2 shrink-0">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/25 backdrop-blur-md text-white border border-white/30 shadow-xs">
                          {asmt.totalQuestions} Questions
                        </span>
                        <span className="text-xs font-semibold text-white/90 bg-black/20 backdrop-blur-sm px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Clock className="w-3 h-3" /> ~{Math.max(2, Math.round(asmt.totalQuestions * 0.5))} mins
                        </span>
                      </div>
                    </div>

                    {/* Spotlight Card Body */}
                    <div className="p-6 sm:p-8 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-teal-500/5 dark:bg-teal-950/20 border border-teal-500/20 text-xs">
                        <div className="space-y-1">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="w-4 h-4 text-teal-500" />
                            Recall Timeframe & Instructions:
                          </span>
                          <p className="text-muted-foreground leading-relaxed pl-5.5">
                            {asmt.timeframe || "Consider your recent everyday experiences over the past few weeks."}
                          </p>
                        </div>

                        {pastResult && (
                          <div className="shrink-0 flex items-center gap-2 p-2 px-3 rounded-xl bg-card border text-[11px]">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <div>
                              <span className="text-muted-foreground block text-[10px]">Last Score:</span>
                              <span className="font-bold text-foreground">
                                {pastResult.score}/{pastResult.maxScore || 40} ({pastResult.severityLevel})
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Info className="w-4 h-4 text-teal-500 shrink-0" />
                          <span>Voluntary research-informed reflection activity. Responses remain confidential.</span>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          {pastResult && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setInspectingResult(pastResult);
                                setActiveModal("resultDetail");
                              }}
                              className="rounded-full text-xs"
                            >
                              View Previous Result
                            </Button>
                          )}
                          <Button
                            type="button"
                            onClick={() => handleStart(asmt.id)}
                            className="w-full sm:w-auto rounded-full bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2 shadow-md hover:shadow-teal-500/25 transition-all cursor-pointer"
                          >
                            <span>{pastResult ? "Retake Assessment" : "Start Assessment"}</span>
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================================
              BROWSE ALL GRID MODE
              ========================================================================= */}
          {displayMode === "grid" && (
            <div className="space-y-6">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-teal-600 text-white shadow-sm font-semibold"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Assessment Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingAssessments ? (
                  <p className="text-sm text-muted-foreground col-span-3 py-8 text-center">
                    Loading clinical screening tests...
                  </p>
                ) : filteredAssessments && filteredAssessments.length > 0 ? (
                  filteredAssessments.map((a) => {
                    const meta = ASSESSMENT_META[a.code || ""] || { emoji: "📋", gradient: "teal" };
                    const pastResult = pastResults?.find((r) => r.assessmentId === a.id);

                    return (
                      <Card
                        key={a.id}
                        className="flex flex-col justify-between hover:border-teal-500/50 transition-all shadow-sm rounded-3xl overflow-hidden group"
                      >
                        <CardHeader className="space-y-3 pb-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-3xl transition-transform group-hover:scale-110">
                              {meta.emoji}
                            </span>
                            <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                              {a.category}
                            </span>
                          </div>
                          <div>
                            <CardTitle className="text-base font-bold leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {a.title}
                            </CardTitle>
                            <CardDescription className="text-xs leading-relaxed line-clamp-2 mt-1">
                              {a.description}
                            </CardDescription>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 pt-2 border-t">
                            <span className="flex items-center gap-1">
                              <ClipboardList className="w-3.5 h-3.5 text-teal-500" />
                              {a.totalQuestions} Questions
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-teal-500" />
                              ~{Math.max(2, Math.round(a.totalQuestions * 0.5))} mins
                            </span>
                          </div>
                          <Button
                            size="sm"
                            className="w-full rounded-full bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
                            onClick={() => handleStart(a.id)}
                          >
                            <span>{pastResult ? "Retake Assessment" : "Take Assessment"}</span>
                            <ArrowRight className="w-4 h-4 ml-1.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="col-span-3 p-8 text-center text-muted-foreground text-sm rounded-3xl">
                    No assessments found for this category.
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: MY RESULTS (HISTORY SCREEN)
          ========================================================================= */}
      {activeTab === "results" && !activeAssessmentId && !lastResult && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between pb-2 border-b">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Completed Assessment History</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Past psychometric screening responses, reflective scoring summaries, and clinical recommendations.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-muted text-muted-foreground">
              {pastResults?.length || 0} Records
            </span>
          </div>

          {loadingResults ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading completed history...</p>
          ) : pastResults && pastResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pastResults.map((res) => {
                const asmt = assessments?.find((a) => a.id === res.assessmentId);
                const meta = ASSESSMENT_META[asmt?.code || ""] || { emoji: "📋", gradient: "teal" };

                return (
                  <Card
                    key={res.id}
                    className="p-5 space-y-4 rounded-3xl bg-card border hover:border-teal-500/40 transition-all shadow-xs flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-3xl">{meta.emoji}</span>
                          <div>
                            <h4 className="font-bold text-sm text-foreground leading-snug">
                              {res.assessmentTitle || "Clinical Assessment"}
                            </h4>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-teal-500" />
                              {new Date(res.completedDate).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                            res.severityLevel === "Severe" || res.severityLevel === "High"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : res.severityLevel === "Moderate"
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {res.severityLevel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs py-2 px-3 rounded-2xl bg-muted/50 border">
                        <span className="text-muted-foreground text-[11px]">Score Summary:</span>
                        <span className="font-bold text-foreground font-mono">
                          {res.score} / {res.maxScore || 40} ({res.percentage ?? Math.round((res.score / (res.maxScore || 40)) * 100)}%)
                        </span>
                      </div>

                      {res.clinicalSummary && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {res.clinicalSummary}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setInspectingResult(res);
                          setActiveModal("resultDetail");
                        }}
                        className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 p-0 h-auto font-semibold"
                      >
                        View Impression →
                      </Button>

                      {asmt && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleStart(asmt.id)}
                          className="rounded-full text-xs h-7 px-3"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" /> Retake
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12 text-center text-muted-foreground text-sm rounded-3xl space-y-3">
              <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <p>You haven't completed any assessments yet.</p>
              <Button
                type="button"
                onClick={() => setActiveTab("assessments")}
                className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Explore Assessments
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 3: CRISIS & SAFETY (RESOURCES SCREEN)
          ========================================================================= */}
      {activeTab === "safety" && !activeAssessmentId && !lastResult && (
        <div className="space-y-6 animate-in fade-in-50 duration-200 max-w-4xl mx-auto">
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 space-y-2">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Immediate Support & Emergency Notice</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you or someone you know is struggling or in crisis, help is available. You are not alone, and compassionate, trained professionals are available 24 hours a day, 7 days a week.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5 rounded-3xl border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">988 Suicide & Crisis Lifeline</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">24/7 Free & Confidential</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Call or text 988 anytime for free, confidential mental health crisis support across the United States & Canada.
              </p>
              <a
                href="tel:988"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 transition shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call or Text 988
              </a>
            </Card>

            <Card className="p-5 rounded-3xl border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Crisis Text Line</span>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">24/7 SMS Support</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect with a volunteer crisis counselor by text message for support with anxiety, depression, or distress.
              </p>
              <a
                href="sms:741741?body=HOME"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-secondary text-secondary-foreground font-bold text-xs hover:bg-secondary/80 transition shadow-xs"
              >
                Text "HOME" to 741741
              </a>
            </Card>

            <Card className="p-5 rounded-3xl border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">National Domestic Violence Hotline</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold">24/7 Confidential</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confidential relationship safety planning, crisis intervention, and resources for individuals affected by relationship fear or abuse.
              </p>
              <a
                href="tel:18007997233"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 1-800-799-SAFE (7233)
              </a>
            </Card>

            <Card className="p-5 rounded-3xl border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">Emergency Services</span>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-[10px] font-bold">Immediate Dispatch</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                If you are in immediate physical danger, experiencing medical emergency, or cannot stay safe, contact emergency services.
              </p>
              <a
                href="tel:911"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" /> Call 911 / Local Emergency
              </a>
            </Card>
          </div>
        </div>
      )}

      {/* =========================================================================
          ACTIVE ASSESSMENT QUESTION STEPPER VIEW
          ========================================================================= */}
      {activeAssessment && !lastResult && (
        <div className="relative rounded-[2.8rem] bg-gradient-to-b from-[#041209] via-[#07190e] to-[#030d06] text-white p-6 sm:p-8 md:p-12 overflow-hidden shadow-2xl border border-[#143d26]/70 min-h-[580px] flex flex-col justify-between animate-in fade-in duration-300">
          {/* Ambient terraced hill contours & mist overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-36 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-lime-500/10 blur-3xl" />
            <div className="absolute -bottom-36 -left-36 w-96 h-96 rounded-full bg-emerald-600/15 blur-3xl" />

            <svg
              className="absolute inset-0 w-full h-full object-cover opacity-25"
              preserveAspectRatio="none"
              viewBox="0 0 1000 700"
            >
              <defs>
                <linearGradient id="terraceSlope" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#226738" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#081c10" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <path d="M0,170 Q250,130 500,180 T1000,160 L1000,700 L0,700 Z" fill="url(#terraceSlope)" />
              <path d="M0,260 Q300,220 600,270 T1000,240 L1000,700 L0,700 Z" fill="#0d2817" fillOpacity="0.3" />
              <path d="M0,360 Q220,310 520,370 T1000,340 L1000,700 L0,700 Z" fill="#081d11" fillOpacity="0.35" />
              <path d="M0,470 Q350,420 700,480 T1000,460 L1000,700 L0,700 Z" fill="#05140b" fillOpacity="0.45" />

              <path d="M-50,190 C200,150 400,210 700,170 S950,200 1050,180" stroke="#34d399" strokeWidth="1" strokeOpacity="0.25" fill="none" />
              <path d="M-50,280 C250,240 450,300 750,260 S950,290 1050,270" stroke="#4ade80" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
              <path d="M-50,370 C200,340 500,400 800,360 S950,390 1050,370" stroke="#86efac" strokeWidth="1" strokeOpacity="0.25" fill="none" />
              <path d="M-50,470 C300,430 600,490 850,450 S950,480 1050,460" stroke="#a7f3d0" strokeWidth="0.8" strokeOpacity="0.2" fill="none" />
            </svg>
          </div>

          {/* Top Bar: Clean Exit & Progress */}
          <div className="relative z-10 flex items-center justify-between pb-4">
            <button
              type="button"
              onClick={() => setActiveModal("exitConfirm")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-lime-400/40 text-emerald-100 text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Exit Assessment
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const next = !isBanglaMode;
                  setIsBanglaMode(next);
                  if (next) {
                    toast.info("বাংলা অনুবাদ সক্রিয় করা হয়েছে (Bangla translation enabled)");
                  } else {
                    toast.info("Switched to English original");
                  }
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                  isBanglaMode
                    ? "bg-lime-400/20 text-lime-300 border-lime-400/60 shadow-xs font-semibold"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/10 hover:border-white/20"
                }`}
                title={isBanglaMode ? "Switch to English" : "বাংলায় দেখুন (Translate to Bangla)"}
              >
                <Languages className="w-3.5 h-3.5 text-lime-400" />
                <span>{isBanglaMode ? "বাংলা (অনূদিত)" : "বাংলা / BN"}</span>
              </button>

              <span className="text-xs font-mono px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/10 text-emerald-200/80">
                Item {currentQuestionIdx + 1} of {totalCount}
              </span>
            </div>
          </div>

          {/* Real-time support trigger banner per methodology rule #24 */}
          {activeSupportTrigger && (
            <div className="relative z-20 mb-3 p-3.5 sm:p-4 rounded-2xl bg-rose-500/20 border border-rose-500/50 text-rose-100 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-600 text-white shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="font-bold text-white text-xs">{activeSupportTrigger.title}</h5>
                  <p className="text-[11px] text-rose-100/90 mt-0.5">{activeSupportTrigger.message}</p>
                </div>
              </div>
              <a
                href={activeSupportTrigger.actionHref}
                className="px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-xs transition"
              >
                <PhoneCall className="w-3.5 h-3.5" /> {activeSupportTrigger.actionText}
              </a>
            </div>
          )}

          {/* Center Brand Header */}
          <div className="relative z-10 text-center py-2 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-7 h-7 rounded-full bg-lime-400/25 blur-md pointer-events-none" />
                <svg width="26" height="26" viewBox="0 0 32 32" fill="none" className="relative z-10">
                  <path d="M16 16 C12 9 6 10 4 13 C2 16 5 21 11 20 C14 19.5 15.5 17.5 16 16 Z" fill="#eab308" />
                  <path d="M16 16 C20 8 26 7 28 10 C30 14 27 20 21 20 C17.5 20 16.5 17.5 16 16 Z" fill="#84cc16" />
                  <path d="M16 16 C15.8 22 15 25 14 28" stroke="#4ade80" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center">
                Healer<span className="text-[#a3e635]">AI</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight text-white font-sans">
              {isBanglaMode
                ? (getAssessmentTitleBangla(activeAssessment.code) || getAssessmentTitleBangla(activeAssessment.title) || activeAssessment.title)
                : activeAssessment.title}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70 max-w-lg mx-auto font-normal">
              {isBanglaMode
                ? (getAssessmentDescriptionBangla(activeAssessment.code) || activeAssessment.description)
                : activeAssessment.description}
            </p>

            {/* Recall Context / Timeframe Pill per Rule #17 */}
            {activeAssessment.timeframe && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-emerald-200/90 max-w-xl mx-auto mt-1 backdrop-blur-xs">
                <Clock className="w-3.5 h-3.5 text-lime-400 shrink-0" />
                <span>{isBanglaMode ? getTimeframeBangla(activeAssessment.timeframe) : activeAssessment.timeframe}</span>
              </div>
            )}
          </div>

          {/* Central Floating Glowing MCQ Card */}
          <div className="relative z-10 max-w-3xl mx-auto w-full my-4">
            <div className="relative rounded-[2rem] bg-white/[0.06] backdrop-blur-xl border border-white/[0.12] p-6 sm:p-8 space-y-6 shadow-2xl">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-wider text-lime-300 font-semibold uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
                    Question {currentQuestionIdx + 1} of {totalCount}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const next = !isBanglaMode;
                      setIsBanglaMode(next);
                      if (next) {
                        toast.info("বাংলা অনুবাদ সক্রিয় করা হয়েছে (Bangla translation enabled)");
                      } else {
                        toast.info("Switched to English original");
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                      isBanglaMode
                        ? "bg-lime-400 text-black shadow-[0_0_16px_rgba(163,230,53,0.45)] font-semibold border border-lime-300 ring-1 ring-lime-400/50"
                        : "bg-white/[0.08] hover:bg-white/[0.15] text-emerald-200 border border-white/10 hover:border-lime-400/40"
                    }`}
                  >
                    <Languages className={`w-3.5 h-3.5 ${isBanglaMode ? "text-black" : "text-lime-400"}`} />
                    <span>{isBanglaMode ? "বাংলা (অনূদিত)" : "বাংলা অনুবাদ (Translate)"}</span>
                  </button>
                </div>

                {loadingActive ? (
                  <div className="py-6 text-center text-sm text-emerald-200/60">
                    Loading clinical questions...
                  </div>
                ) : currentQuestion ? (
                  <div className="space-y-2">
                    <h2 className="text-lg sm:text-xl md:text-2xl font-normal text-white/95 leading-relaxed font-sans">
                      {isBanglaMode
                        ? getQuestionBanglaText(currentQuestion.questionText, currentQuestion.questionCode)
                        : currentQuestion.questionText}
                    </h2>

                    {isBanglaMode && (
                      <div className="flex items-start gap-2 pt-1 text-xs text-emerald-200/60">
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-semibold shrink-0">
                          English
                        </span>
                        <span className="italic line-clamp-2">{currentQuestion.questionText}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-emerald-200/60">No questions available.</p>
                )}
              </div>

              {/* Options Row */}
              {currentQuestion && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getQuestionOptions(currentQuestion).map((opt) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                      const banglaOptLabel = getOptionBanglaLabel(opt.label);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswerSelect(currentQuestion.id, opt.id)}
                          className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center cursor-pointer ${
                            isSelected
                              ? "bg-lime-400/20 border-2 border-lime-400 text-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.35)] ring-1 ring-lime-400/40 font-semibold scale-[1.02]"
                              : "bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-lime-400/30 text-white/90"
                          }`}
                        >
                          <span className="text-center font-medium">
                            {isBanglaMode ? banglaOptLabel : opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => Math.max(p - 1, 0))}
                      title="Previous Question"
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                        currentQuestionIdx > 0
                          ? "bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-white hover:text-lime-300"
                          : "opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-white/40"
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {currentQuestionIdx < totalCount - 1 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedAnswers[currentQuestion.id]) {
                            toast.error("Please choose a response option to continue.");
                            return;
                          }
                          setCurrentQuestionIdx((p) => p + 1);
                        }}
                        title="Next Question"
                        className="w-12 h-12 rounded-full bg-lime-400 hover:bg-lime-300 text-black flex items-center justify-center shadow-[0_0_24px_rgba(163,230,53,0.55)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
                      >
                        <ChevronRight className="w-6 h-6 stroke-[2.5]" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSubmit()}
                        disabled={submitMutation.isPending}
                        className="px-5 py-3 rounded-full bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_24px_rgba(163,230,53,0.6)] transition-all transform hover:scale-105 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>{submitMutation.isPending ? "Scoring..." : "Submit"}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Card Footer: Question Navigator Pills */}
              <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full sm:max-w-md">
                  {questionsList.map((q, idx) => {
                    const isCurrent = currentQuestionIdx === idx;
                    const isAnswered = !!selectedAnswers[q.id];
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setCurrentQuestionIdx(idx)}
                        className={`w-7 h-7 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          isCurrent
                            ? "bg-lime-400 text-black shadow-[0_0_12px_rgba(163,230,53,0.6)] font-bold scale-110"
                            : isAnswered
                            ? "bg-lime-400/20 text-lime-300 border border-lime-400/40 hover:bg-lime-400/30"
                            : "bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <span className="text-[11px] text-emerald-200/60 font-mono self-end sm:self-auto">
                  {answeredCount} of {totalCount} Answered ({progressPercent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Exit Confirmation Modal */}
          <Dialog open={activeModal === "exitConfirm"} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-sm rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-primary" /> Exit Assessment?
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Your current progress ({answeredCount}/{totalCount} answered) will not be saved until submitted.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Keep Taking
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setActiveAssessmentId(null);
                    setSelectedAnswers({});
                    setActiveModal(null);
                  }}
                  className="rounded-full"
                >
                  Exit to Catalogue
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* =========================================================================
          SCREENING RESULT DISPLAY SCREEN (BENTO GRID LAYOUT)
          ========================================================================= */}
      {lastResult && (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
          {/* Crisis Alert Banner */}
          {lastResult.crisisAlert && (
            <div className="p-5 rounded-3xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-rose-600 text-white shadow-xs">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">
                    Immediate Crisis Safety Notice
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                    Your responses indicated thoughts related to self-harm. Confidential, compassionate support is available 24/7.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href="tel:988"
                  className="px-4 py-2 rounded-full bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition flex items-center gap-1.5 shadow-xs"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call or Text 988
                </a>
                <Button asChild variant="outline" size="sm" className="rounded-full text-xs border-rose-400">
                  <Link href="/patient/emergency">Emergency Resources</Link>
                </Button>
              </div>
            </div>
          )}

          {/* Row 1: Hero Overview Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-[2.2rem] bg-gradient-to-br from-[#1d633d] via-[#155131] to-[#0c351e] text-white p-7 md:p-8 relative overflow-hidden shadow-sm flex flex-col justify-between border border-[#237446]/40 min-h-[300px]">
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 right-12 w-64 h-64 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h2 className="text-4xl md:text-5xl font-medium tracking-tight font-sans text-white">
                    Overview
                  </h2>
                  <p className="text-xs text-emerald-100/80 mt-1 font-medium">
                    {lastResult.assessmentTitle || "Clinical Screener"}
                  </p>
                </div>

                <span className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 border border-white/10">
                  {lastResult.severityLevel === "Profile"
                    ? "Reflective Profile"
                    : lastResult.assessmentCategory?.toLowerCase().includes("reasoning") ||
                      lastResult.assessmentTitle?.toLowerCase().includes("iq")
                    ? `${lastResult.score}/${lastResult.maxScore || 10} Correct`
                    : `${lastResult.severityLevel} Level`}
                </span>
              </div>

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-8">
                <div className="flex items-center gap-7">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-emerald-200/90 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-300" />
                      {lastResult.assessmentCategory?.toLowerCase().includes("reasoning") ||
                      lastResult.assessmentTitle?.toLowerCase().includes("iq")
                        ? "Accuracy"
                        : "Score Ratio"}
                    </span>
                    <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {lastResult.percentage ?? Math.round((lastResult.score / (lastResult.maxScore || 40)) * 100)}%
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-emerald-200/90 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {lastResult.assessmentCategory?.toLowerCase().includes("reasoning") ||
                      lastResult.assessmentTitle?.toLowerCase().includes("iq")
                        ? "Solved Puzzles"
                        : "Score Index"}
                    </span>
                    <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {lastResult.score}{" "}
                      <span className="text-lg font-medium text-emerald-200/80">
                        / {lastResult.maxScore || 40}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="relative w-44 h-36 shrink-0 self-center sm:self-end">
                  <div className="absolute top-1 left-2 z-20 flex items-center gap-1.5 bg-white/95 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Health
                  </div>

                  <div className="absolute bottom-6 right-0 z-20 flex items-center gap-1.5 bg-white/95 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {lastResult.requiresFollowUp ? "Triage" : "Stable"}
                  </div>

                  <svg viewBox="0 0 160 140" fill="none" className="w-full h-full drop-shadow-md">
                    <path d="M 60 130 V 45 C 60 25 80 15 105 15 H 115" stroke="#e4efe7" strokeWidth="5" strokeLinecap="round" />
                    <rect x="100" y="10" width="30" height="12" rx="4" fill="#d1e6d8" />
                    <path d="M 103 22 L 80 115 H 145 L 127 22 Z" fill="url(#lightGradient)" opacity="0.4" />
                    <rect x="50" y="115" width="85" height="22" rx="6" fill="#f0f5f1" />
                    <rect x="55" y="118" width="75" height="4" rx="2" fill="#88b598" />
                    <path d="M 92 115 Q 92 80 90 60" stroke="#36a366" strokeWidth="4" strokeLinecap="round" />
                    <path d="M 92 90 Q 75 75 70 85 Q 82 95 92 92" fill="#58c985" />
                    <path d="M 92 80 Q 110 65 118 75 Q 106 88 92 82" fill="#44b873" />
                    <path d="M 90 60 Q 75 40 85 45 Q 90 55 90 60" fill="#69db96" />
                    <path d="M 90 60 Q 105 40 100 48 Q 94 58 90 60" fill="#50c580" />
                    <defs>
                      <linearGradient id="lightGradient" x1="115" y1="22" x2="115" y2="115" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#ffffff" stopOpacity="0.8" />
                        <stop offset="1" stopColor="#43b672" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Card 2: Clinical Summary Impression */}
            <div className="lg:col-span-5 rounded-[2.2rem] bg-[#f4f7f4] dark:bg-[#15221b] border border-[#e2e8e2] dark:border-white/10 p-6 md:p-7 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-primary/10 text-primary">
                      <Activity className="w-4 h-4" />
                    </span>
                    <h3 className="font-bold text-sm text-foreground">Clinical Impression</h3>
                  </div>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    Evaluated
                  </span>
                </div>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-3.5 rounded-2xl bg-white dark:bg-card border space-y-1 shadow-2xs">
                    <span className="font-bold text-foreground block text-[11px] text-primary">
                      Identified Construct Pattern
                    </span>
                    <p className="text-foreground font-medium leading-relaxed">
                      {lastResult.identifiedProblem || "Screening Profile Completed"}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white dark:bg-card border space-y-1 shadow-2xs">
                    <span className="font-bold text-foreground block text-[11px] text-teal-600 dark:text-teal-400">
                      Recommendation & Next Steps
                    </span>
                    <p className="text-muted-foreground leading-relaxed">
                      {lastResult.suggestedFollowUp || "Maintain healthy wellness routines."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveModal("breakdown")}
                  className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-4 cursor-pointer"
                >
                  View Full Answers ({activeAssessment?.questions?.length || 10})
                </Button>

                {lastResult.requiresFollowUp && (
                  <Button asChild size="sm" variant="outline" className="rounded-full text-xs">
                    <Link href="/patient/appointments">Book Consultation</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Research-Informed Self-Reflection Guidance Disclaimer */}
          <div className="p-4 rounded-2xl bg-muted/40 border text-[11px] text-muted-foreground flex items-start gap-2.5">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-foreground">Clinical Self-Reflection Guidance:</strong> This is an original, research-informed self-reflection activity, not a validated diagnostic test. It cannot diagnose or rule out conditions, assess safety, or measure IQ. A qualified healthcare professional can help you evaluate personal symptoms or concerns.
            </p>
          </div>

          {/* Controls: Back to Tests & Retake */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              onClick={() => {
                setActiveAssessmentId(null);
                setLastResult(null);
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ← Back to All Assessments
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (lastResult.assessmentId) handleStart(lastResult.assessmentId);
              }}
              className="rounded-full text-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Retake Assessment
            </Button>
          </div>

          {/* Response Breakdown Modal */}
          <Dialog open={activeModal === "breakdown"} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    {lastResult.assessmentTitle || "Clinical Screener"} — Question Responses
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => setIsBanglaMode((p) => !p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      isBanglaMode
                        ? "bg-primary/20 text-primary border-primary/50 font-semibold"
                        : "bg-muted hover:bg-muted/80 text-foreground border-border"
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>{isBanglaMode ? "বাংলা (অনূদিত)" : "বাংলা অনুবাদ"}</span>
                  </button>
                </div>
                <DialogDescription className="text-xs">
                  Review of all questions, chosen answers, and points scored.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50 border text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Final Total Score</span>
                  <span className="text-xl font-extrabold text-foreground">
                    {lastResult.score} / {lastResult.maxScore || 40} ({lastResult.percentage ?? Math.round((lastResult.score / (lastResult.maxScore || 40)) * 100)}%)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground block text-[11px]">Severity Level</span>
                  <span className="font-bold text-primary">{lastResult.severityLevel}</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                {activeAssessment?.questions?.map((q, idx) => {
                  const selectedOptId = selectedAnswers[q.id];
                  const opts = getQuestionOptions(q);
                  const chosenOpt = opts.find((o) => o.id === selectedOptId);
                  return (
                    <div key={q.id} className="p-3.5 rounded-xl border bg-card space-y-1.5 text-xs">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-semibold text-foreground">
                          Item {idx + 1}. {isBanglaMode ? getQuestionBanglaText(q.questionText, q.questionCode) : q.questionText}
                        </span>
                        {chosenOpt && (
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-bold font-mono text-[10px] shrink-0">
                            +{chosenOpt.score} pts
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-medium text-foreground">
                          {chosenOpt ? (isBanglaMode ? getOptionBanglaLabel(chosenOpt.label) : chosenOpt.label) : "Answered"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t gap-3">
                <Button asChild size="sm" className="rounded-full bg-teal-600 hover:bg-teal-700 text-white">
                  <Link href="/patient/appointments">Book Consultation</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Detail Dialog for Inspecting Past Result */}
      {inspectingResult && (
        <Dialog open={activeModal === "resultDetail"} onOpenChange={() => setActiveModal(null)}>
          <DialogContent className="max-w-lg rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-500" />
                {inspectingResult.assessmentTitle || "Clinical Assessment Result"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Completed on {new Date(inspectingResult.completedDate).toLocaleDateString([], {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-muted/50 border flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground text-[10px] block">Recorded Score</span>
                <span className="text-xl font-bold text-foreground">
                  {inspectingResult.score} / {inspectingResult.maxScore || 40} ({inspectingResult.percentage ?? Math.round((inspectingResult.score / (inspectingResult.maxScore || 40)) * 100)}%)
                </span>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                {inspectingResult.severityLevel} Level
              </span>
            </div>

            {inspectingResult.clinicalSummary && (
              <div className="p-4 rounded-2xl border space-y-1 text-xs">
                <span className="font-bold text-foreground block">Clinical Summary Impression</span>
                <p className="text-muted-foreground leading-relaxed">
                  {inspectingResult.clinicalSummary}
                </p>
              </div>
            )}

            {inspectingResult.suggestedFollowUp && (
              <div className="p-4 rounded-2xl border space-y-1 text-xs">
                <span className="font-bold text-foreground block">Recommended Action</span>
                <p className="text-muted-foreground leading-relaxed">
                  {inspectingResult.suggestedFollowUp}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveModal(null)}
                className="rounded-full text-xs"
              >
                Close
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setActiveModal(null);
                  handleStart(inspectingResult.assessmentId);
                }}
                className="rounded-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold"
              >
                Retake Assessment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}