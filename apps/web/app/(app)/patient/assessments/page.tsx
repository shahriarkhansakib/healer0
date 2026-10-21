"use client";

import { useState, useEffect, useRef } from "react";
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
  ScrollText,
  Stethoscope,
  ShieldCheck,
  Target,
  Brain,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { getRecommendedTherapyForAssessment } from "@/lib/therapy-recommender";
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
  const [displayMode, setDisplayMode] = useState<"orbital" | "grid">("grid");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Active Assessment Taking States
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [runnerMode, setRunnerMode] = useState<"scroll" | "stepper">("scroll");
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

  const stepAdvanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stepperPillsRef = useRef<HTMLDivElement | null>(null);

  // Clean up any pending step advance timers on unmount
  useEffect(() => {
    return () => {
      if (stepAdvanceTimeoutRef.current) {
        clearTimeout(stepAdvanceTimeoutRef.current);
      }
    };
  }, []);

  // When question advances in step view, smoothly center the active question pill and reveal rear numbers
  useEffect(() => {
    if (runnerMode === "stepper" && activeAssessmentId) {
      const scrollPillIntoView = () => {
        const activePill = document.getElementById(`stepper-pill-${currentQuestionIdx}`);
        const container = stepperPillsRef.current;
        if (activePill && container) {
          const targetScrollLeft =
            activePill.offsetLeft - container.clientWidth / 2 + activePill.clientWidth / 2;
          container.scrollTo({
            left: Math.max(0, targetScrollLeft),
            behavior: "smooth",
          });
        }
      };

      const rafId = requestAnimationFrame(scrollPillIntoView);
      return () => cancelAnimationFrame(rafId);
    }
  }, [currentQuestionIdx, runnerMode, activeAssessmentId]);

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
    if (stepAdvanceTimeoutRef.current) {
      clearTimeout(stepAdvanceTimeoutRef.current);
    }
    setActiveAssessmentId(id);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setLastResult(null);
  };

  const handleAnswerSelect = (questionId: string, optionId: string, currentIdx?: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));

    // In stepper mode, gently auto-advance to next question and center the number navigator
    if (runnerMode === "stepper") {
      if (stepAdvanceTimeoutRef.current) {
        clearTimeout(stepAdvanceTimeoutRef.current);
      }
      const questionsCount = activeAssessment?.questions?.length || 0;
      if (currentQuestionIdx < questionsCount - 1) {
        stepAdvanceTimeoutRef.current = setTimeout(() => {
          setCurrentQuestionIdx((prev) => Math.min(prev + 1, questionsCount - 1));
        }, 240);
      }
    } else if (runnerMode === "scroll" && currentIdx !== undefined && activeAssessment?.questions && currentIdx < activeAssessment.questions.length - 1) {
      setTimeout(() => {
        const nextElem = document.getElementById(`question-card-${currentIdx + 1}`);
        if (nextElem) {
          nextElem.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 220);
    }
  };

  const scrollToFirstUnanswered = () => {
    if (!activeAssessment?.questions) return;
    const firstUnansweredIdx = activeAssessment.questions.findIndex((q) => !selectedAnswers[q.id]);
    if (firstUnansweredIdx !== -1) {
      const elem = document.getElementById(`question-card-${firstUnansweredIdx}`);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeAssessmentId || !activeAssessment?.questions) return;

    const unanswered = activeAssessment.questions.filter((q) => !selectedAnswers[q.id]);
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions before submitting (${unanswered.length} remaining).`);
      scrollToFirstUnanswered();
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
      {!activeAssessmentId && !lastResult && (
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border p-6 md:p-8 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Clinical Psychometric Assessment Battery</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Clinical Mental Health Assessments
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Standardized psychometric screening instruments with validated score ranges, problem evaluation, and clinical triage.
          </p>
        </div>

        {/* Hub Tabs & View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-full bg-[#111c1d]/90 border border-white/[0.08] shadow-inner backdrop-blur-md shrink-0 max-w-full overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setActiveTab("assessments");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "assessments"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 shrink-0" />
            <span>Assessments</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                activeTab === "assessments"
                  ? "bg-white/20 text-white"
                  : "bg-white/[0.08] text-zinc-400"
              }`}
            >
              {assessments?.length || 24}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("results");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "results"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <Award className="w-3.5 h-3.5 shrink-0" />
            <span>My Results</span>
            {pastResults && pastResults.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none ${
                  activeTab === "results"
                    ? "bg-white/20 text-white"
                    : "bg-white/[0.08] text-zinc-400"
                }`}
              >
                {pastResults.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("safety");
              setActiveAssessmentId(null);
              setLastResult(null);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === "safety"
                ? "bg-teal-600 text-white shadow-xs"
                : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>Crisis & Safety</span>
          </button>

          {activeTab === "assessments" && (
            <>
              <div className="h-4 w-px bg-white/10 mx-1 shrink-0" />
              <button
                type="button"
                onClick={() => setDisplayMode((prev) => (prev === "grid" ? "orbital" : "grid"))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                  displayMode === "orbital"
                    ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-xs"
                    : "border-white/10 text-zinc-400 hover:text-zinc-100 hover:border-white/20 hover:bg-white/[0.04]"
                }`}
                title={displayMode === "grid" ? "Switch to Orbital Spotlight view" : "Switch to Default Grid view"}
              >
                <Layers className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span>{displayMode === "grid" ? "Orbital View" : "Grid View"}</span>
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* =========================================================================
          TAB 1: CLINICAL ASSESSMENTS (ORBITAL ARC HERO + SPOTLIGHT CARD)
          ========================================================================= */}
      {activeTab === "assessments" && !activeAssessmentId && !lastResult && (
        <div className="space-y-8">
          {/* =========================================================================
              DEFAULT INTERFACE: CATEGORY PILLS & 3-COLUMN CLINICAL ASSESSMENTS GRID
              ========================================================================= */}
          {displayMode === "grid" && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-teal-600 text-white font-semibold shadow-xs"
                          : "bg-[#131f20] hover:bg-[#1a2d2f] text-zinc-400 hover:text-zinc-100 border border-teal-950/40"
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* Assessment Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingAssessments ? (
                  <div className="text-sm text-muted-foreground col-span-3 py-12 text-center">
                    Loading clinical screening tests...
                  </div>
                ) : filteredAssessments && filteredAssessments.length > 0 ? (
                  filteredAssessments.map((a) => {
                    const meta = ASSESSMENT_META[a.code || ""] || { emoji: "📋", gradient: "teal" };
                    const pastResult = pastResults?.find((r) => r.assessmentId === a.id);

                    return (
                      <div
                        key={a.id}
                        className="rounded-3xl bg-[#121c1d] border border-[#1c2d2f] p-6 flex flex-col justify-between hover:border-teal-500/40 transition-all duration-200 shadow-sm group"
                      >
                        {/* Top: Emoji & Category Badge */}
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <span className="text-3xl select-none transition-transform group-hover:scale-105">
                            {meta.emoji}
                          </span>
                          <span className="text-xs font-medium text-teal-400 bg-teal-950/60 border border-teal-800/40 px-2.5 py-0.5 rounded-full select-none">
                            {a.category}
                          </span>
                        </div>

                        {/* Middle: Title & Description */}
                        <div className="space-y-1.5 mb-4">
                          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug group-hover:text-teal-400 transition-colors">
                            {a.title}
                          </h3>
                          <p className="text-xs text-zinc-400/90 leading-relaxed line-clamp-3 min-h-[44px]">
                            {a.description}
                          </p>
                        </div>

                        {/* Bottom: Questions Count, Time Estimate & Take Assessment Button */}
                        <div className="pt-1">
                          <div className="flex items-center justify-between text-xs text-zinc-400 mb-4">
                            <span className="flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5 text-zinc-400" />
                              <span>{a.totalQuestions} Questions</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-zinc-400" />
                              <span>~{Math.max(2, Math.round(a.totalQuestions * 0.5))} mins</span>
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStart(a.id)}
                            className="w-full py-2.5 px-4 rounded-xl sm:rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-150 shadow-sm cursor-pointer"
                          >
                            <span>{pastResult ? "Retake Assessment" : "Take Assessment"}</span>
                            <ArrowRight className="w-4 h-4 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-3 p-8 text-center text-muted-foreground text-sm rounded-3xl bg-[#121c1d] border border-[#1c2d2f]">
                    No assessments found for this category.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              ALTERNATIVE ORBITAL SPOTLIGHT MODE (Available on toggle)
              ========================================================================= */}
          {displayMode === "orbital" && (
            <div className="space-y-8 animate-in fade-in-50 duration-200">
              {/* CALM THERAPEUTIC TEAL / GLASSMORPHIC ORBITAL ARC HERO */}
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
          {currentSpotlightAssessment && (
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
        <div className="relative rounded-[2.8rem] bg-gradient-to-b from-[#041209] via-[#07190e] to-[#030d06] text-white p-6 sm:p-8 md:p-12 shadow-2xl border border-[#143d26]/70 min-h-[580px] space-y-8 animate-in fade-in duration-300">
          {/* Ambient terraced hill contours & mist overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[2.8rem]">
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

          {/* Top Bar: Clean Exit, View Mode & Language */}
          <div className="relative z-10 flex items-center justify-between pb-2 gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveModal("exitConfirm")}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-lime-400/40 text-emerald-100 text-xs font-medium transition-all shadow-xs cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Exit Assessment
            </button>

            <div className="flex items-center gap-2">
              {/* Runner Mode Switcher: Continuous Scroll vs Step-by-Step */}
              <button
                type="button"
                onClick={() => setRunnerMode((prev) => (prev === "scroll" ? "stepper" : "scroll"))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer ${
                  runnerMode === "scroll"
                    ? "bg-lime-400/20 text-lime-300 border-lime-400/60 shadow-xs font-semibold"
                    : "bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/10 hover:border-white/20"
                }`}
                title={runnerMode === "scroll" ? "Switch to Step-by-Step view" : "Switch to Continuous Scroll view"}
              >
                <ScrollText className="w-3.5 h-3.5 text-lime-400" />
                <span>{runnerMode === "scroll" ? "Scroll View" : "Step View"}</span>
              </button>

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
                {answeredCount} of {totalCount} Answered
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

          {/* =========================================================================
              ACTIVE RUNNER: CONTINUOUS SCROLL SYSTEM vs STEPPER VIEW
              ========================================================================= */}
          {runnerMode === "scroll" ? (
            <div className="relative z-10 space-y-6 max-w-3xl mx-auto w-full my-2">
              {/* Sticky Quick-Navigation & Progress Bar */}
              <div className="sticky top-4 z-30 backdrop-blur-xl bg-[#041209]/95 border border-white/[0.12] rounded-2xl p-3 sm:p-4 shadow-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">Progress</span>
                    <span className="text-lime-300 font-mono font-bold">
                      {answeredCount} of {totalCount} Answered ({progressPercent}%)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {answeredCount < totalCount && (
                      <button
                        type="button"
                        onClick={scrollToFirstUnanswered}
                        className="text-[11px] font-medium text-lime-400 hover:text-lime-300 underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Next Unanswered →
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress Bar Line */}
                <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-lime-400 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(163,230,53,0.7)]"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Quick Jump Number Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
                  {questionsList.map((q, idx) => {
                    const isAnswered = !!selectedAnswers[q.id];
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => {
                          const elem = document.getElementById(`question-card-${idx}`);
                          if (elem) {
                            elem.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        title={`Jump to Question ${idx + 1}${isAnswered ? " (Answered)" : " (Unanswered)"}`}
                        className={`w-7 h-7 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center justify-center cursor-pointer ${
                          isAnswered
                            ? "bg-lime-400/25 text-lime-300 border border-lime-400/60 shadow-xs hover:bg-lime-400 hover:text-black"
                            : "bg-white/[0.06] text-white/50 border border-white/5 hover:bg-white/[0.12] hover:text-white"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Questions Cards Stream */}
              <div className="space-y-6">
                {loadingActive ? (
                  <div className="py-12 text-center text-sm text-emerald-200/60">
                    Loading clinical questions...
                  </div>
                ) : questionsList.length > 0 ? (
                  questionsList.map((q, idx) => {
                    const isAnswered = !!selectedAnswers[q.id];
                    const selectedOptId = selectedAnswers[q.id];
                    const options = getQuestionOptions(q);

                    return (
                      <div
                        key={q.id}
                        id={`question-card-${idx}`}
                        className={`relative rounded-[2rem] bg-white/[0.06] backdrop-blur-xl border p-6 sm:p-8 space-y-5 shadow-xl transition-all duration-300 scroll-mt-36 ${
                          isAnswered
                            ? "border-lime-400/35 bg-white/[0.08]"
                            : "border-white/[0.12] hover:border-white/20"
                        }`}
                      >
                        {/* Card Header: Question Number & Answered Indicator */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-mono tracking-wider text-lime-300 font-semibold uppercase flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isAnswered ? "bg-lime-400" : "bg-white/40 animate-pulse"
                              }`}
                            />
                            Question {idx + 1} of {totalCount}
                          </span>

                          <div className="flex items-center gap-2">
                            {isAnswered ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-lime-400/20 text-lime-300 border border-lime-400/40">
                                <Check className="w-3 h-3 stroke-[2.5]" /> Answered
                              </span>
                            ) : (
                              <span className="text-[11px] text-emerald-200/50 font-mono">
                                Required
                              </span>
                            )}

                            {isAnswered && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAnswers((prev) => {
                                    const next = { ...prev };
                                    delete next[q.id];
                                    return next;
                                  });
                                }}
                                title="Clear response"
                                className="p-1 rounded-full text-white/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Question Text */}
                        <div className="space-y-1.5">
                          <h3 className="text-base sm:text-lg md:text-xl font-normal text-white/95 leading-relaxed font-sans">
                            {isBanglaMode
                              ? getQuestionBanglaText(q.questionText, q.questionCode)
                              : q.questionText}
                          </h3>

                          {isBanglaMode && (
                            <div className="flex items-start gap-2 pt-1 text-xs text-emerald-200/60">
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-emerald-300 font-semibold shrink-0">
                                English
                              </span>
                              <span className="italic line-clamp-2">{q.questionText}</span>
                            </div>
                          )}
                        </div>

                        {/* Options Row */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-1">
                          {options.map((opt) => {
                            const isSelected = selectedOptId === opt.id;
                            const banglaOptLabel = getOptionBanglaLabel(opt.label);

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleAnswerSelect(q.id, opt.id, idx)}
                                className={`px-4 sm:px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center cursor-pointer ${
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
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-emerald-200/60 text-center py-8">No questions available.</p>
                )}
              </div>

              {/* Bottom Completion & Submission Card */}
              <div
                id="assessment-submit-section"
                className="rounded-[2rem] bg-white/[0.07] backdrop-blur-xl border border-white/[0.14] p-6 sm:p-8 space-y-5 text-center shadow-2xl"
              >
                <div className="space-y-2 max-w-md mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-lime-400/15 text-lime-300 border border-lime-400/30">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>
                      {answeredCount === totalCount
                        ? "All Questions Completed"
                        : `${totalCount - answeredCount} Question${
                            totalCount - answeredCount === 1 ? "" : "s"
                          } Remaining`}
                    </span>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-bold text-white">
                    {answeredCount === totalCount
                      ? "Ready to Submit Your Assessment"
                      : "Complete All Questions to Finish"}
                  </h4>
                  <p className="text-xs sm:text-sm text-emerald-200/70">
                    {answeredCount === totalCount
                      ? "Your responses will be instantly evaluated with clinical score bands and evidence-based recommendations."
                      : "Clinical psychometric validity requires every item in this screening battery to be answered."}
                  </p>
                </div>

                {/* Progress bar in submit card */}
                <div className="max-w-md mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-emerald-200/70 font-mono">
                    <span>Completion</span>
                    <span>{answeredCount} / {totalCount} ({progressPercent}%)</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-lime-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(163,230,53,0.7)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  {answeredCount < totalCount && (
                    <button
                      type="button"
                      onClick={scrollToFirstUnanswered}
                      className="px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white font-medium text-xs transition-all cursor-pointer"
                    >
                      Jump to First Unanswered
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={submitMutation.isPending}
                    className="px-8 py-3.5 rounded-full bg-lime-400 hover:bg-lime-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_28px_rgba(163,230,53,0.65)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>
                      {submitMutation.isPending ? "Evaluating & Scoring..." : "Submit Assessment"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* STEPPER VIEW (PRESERVED UNDER TOGGLE) */
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
                  <div
                    ref={stepperPillsRef}
                    className="relative flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-full sm:max-w-md scroll-smooth"
                  >
                    {questionsList.map((q, idx) => {
                      const isCurrent = currentQuestionIdx === idx;
                      const isAnswered = !!selectedAnswers[q.id];
                      return (
                        <button
                          key={q.id}
                          id={`stepper-pill-${idx}`}
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
          )}

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

          {/* Clinically Matched Therapy Program & Diagnostic Telemetry Presentation */}
          {(() => {
            const matchedTherapy = getRecommendedTherapyForAssessment(lastResult);
            const scorePercentage =
              lastResult.percentage ??
              Math.round((lastResult.score / (lastResult.maxScore || 40)) * 100);

            const getSeverityColor = (sev: string) => {
              const lower = (sev || "").toLowerCase();
              if (lower.includes("severe") || lower.includes("high") || lower.includes("crisis")) {
                return {
                  badge: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
                  text: "text-rose-600 dark:text-rose-400",
                  bar: "bg-rose-500",
                };
              }
              if (lower.includes("moderately severe")) {
                return {
                  badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
                  text: "text-orange-600 dark:text-orange-400",
                  bar: "bg-orange-500",
                };
              }
              if (lower.includes("moderate") || lower.includes("medium")) {
                return {
                  badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
                  text: "text-amber-600 dark:text-amber-400",
                  bar: "bg-amber-500",
                };
              }
              if (lower.includes("mild")) {
                return {
                  badge: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
                  text: "text-yellow-600 dark:text-yellow-400",
                  bar: "bg-yellow-500",
                };
              }
              return {
                badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                text: "text-emerald-600 dark:text-emerald-400",
                bar: "bg-emerald-500",
              };
            };

            const sevColors = getSeverityColor(lastResult.severityLevel);

            const severityTiers = [
              { label: "Minimal", range: "0-20%", color: "bg-emerald-500", key: "minimal" },
              { label: "Mild", range: "21-40%", color: "bg-yellow-500", key: "mild" },
              { label: "Moderate", range: "41-60%", color: "bg-amber-500", key: "moderate" },
              { label: "Mod. Severe", range: "61-80%", color: "bg-orange-500", key: "moderately severe" },
              { label: "Severe", range: "81-100%", color: "bg-rose-500", key: "severe" },
            ];

            return (
              <div className="space-y-6">
                {/* Result Header & Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/70">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Clinical Assessment Complete
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(lastResult.completedDate || Date.now()).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                      {lastResult.assessmentTitle || "Clinical Screener Result"}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setActiveAssessmentId(null);
                        setLastResult(null);
                      }}
                      className="rounded-full text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      All Assessments
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (lastResult.assessmentId) handleStart(lastResult.assessmentId);
                      }}
                      className="rounded-full text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Retake
                    </Button>
                  </div>
                </div>

                {/* ROW 1: Hero Diagnostic Telemetry & Matched Therapy Bento Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Left Card: Quantitative Diagnostic Telemetry (6 cols) */}
                  <div className="lg:col-span-6 rounded-3xl bg-card border border-border/80 p-6 md:p-7 shadow-xs flex flex-col justify-between space-y-6 relative overflow-hidden">
                    <div className="space-y-5">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Activity className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            Diagnostic Telemetry & Score Profile
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${sevColors.badge}`}
                          >
                            {lastResult.severityLevel === "Profile"
                              ? "Reflective Profile"
                              : `${lastResult.severityLevel} Level`}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                              lastResult.requiresFollowUp
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            }`}
                          >
                            {lastResult.requiresFollowUp ? "Triage Indicated" : "Autonomic Stable"}
                          </span>
                        </div>
                      </div>

                      {/* Score Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/30 border border-border/70">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Recorded Score
                          </span>
                          <p className="text-3xl font-extrabold text-foreground tracking-tight">
                            {lastResult.score}{" "}
                            <span className="text-base font-normal text-muted-foreground">
                              / {lastResult.maxScore || 40}
                            </span>
                          </p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Calculated Ratio
                          </span>
                          <p className="text-3xl font-extrabold text-primary tracking-tight">
                            {scorePercentage}%
                          </p>
                        </div>
                      </div>

                      {/* 5-Tier Severity Spectrum Visualization */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-muted-foreground">
                            Clinical Severity Spectrum
                          </span>
                          <span className="font-mono text-foreground font-bold">
                            Tier: {lastResult.severityLevel}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {severityTiers.map((tier) => {
                            const isCurrent =
                              lastResult.severityLevel
                                .toLowerCase()
                                .includes(tier.key) ||
                              (tier.key === "minimal" &&
                                lastResult.severityLevel.toLowerCase().includes("normal"));
                            return (
                              <div key={tier.key} className="space-y-1 text-center">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${
                                    isCurrent
                                      ? `${tier.color} shadow-xs ring-2 ring-primary/40`
                                      : "bg-muted-foreground/20 opacity-40"
                                  }`}
                                />
                                <span
                                  className={`text-[9px] block leading-tight ${
                                    isCurrent
                                      ? "font-bold text-foreground"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {tier.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Construct Pattern & Narrative Impression */}
                      <div className="space-y-3 pt-1">
                        <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-primary">
                            <Brain className="w-3.5 h-3.5" />
                            <span className="font-bold text-[11px]">
                              Identified Construct Pattern
                            </span>
                          </div>
                          <p className="text-xs text-foreground font-medium leading-relaxed">
                            {lastResult.identifiedProblem || "Clinical Screening Profile Completed"}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                            <Activity className="w-3.5 h-3.5" />
                            <span className="font-bold text-[11px]">
                              Clinical Impression & Guidance
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {lastResult.clinicalSummary ||
                              lastResult.suggestedFollowUp ||
                              "Your responses indicate consistent emotional equilibrium and healthy coping mechanisms."}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Triage Banner */}
                    <div
                      className={`p-3 rounded-2xl text-xs flex items-center gap-2.5 border ${
                        lastResult.requiresFollowUp
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <p className="text-[11px] leading-relaxed">
                        {lastResult.requiresFollowUp
                          ? "Clinical follow-up indicated • Symptoms suggest value in reviewing these results with an attending clinician."
                          : "Autonomic stability observed • No acute psychological distress indicated at this time."}
                      </p>
                    </div>
                  </div>

                  {/* Right Card: Clinically Matched Therapy Program (6 cols) */}
                  <div className="lg:col-span-6 rounded-3xl bg-gradient-to-br from-card via-card to-primary/[0.04] border-2 border-primary/30 p-6 md:p-7 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden">
                    <div className="space-y-5">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/50">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-primary/15 text-primary border border-primary/25">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          Clinically Matched Therapy Program
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wide px-2.5 py-0.5 rounded-full bg-muted font-bold text-muted-foreground border">
                          {matchedTherapy.modality}
                        </span>
                      </div>

                      {/* Program Identity */}
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/25 text-3xl flex items-center justify-center shrink-0 shadow-xs">
                          {matchedTherapy.emoji}
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                              {matchedTherapy.programTitle}
                            </h3>
                            <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/60">
                              {matchedTherapy.difficultyLevel} Level
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {matchedTherapy.description}
                          </p>
                        </div>
                      </div>

                      {/* Program Curriculum Metrics */}
                      <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-muted/40 border border-border/70 text-center">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground block">
                            Duration
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {matchedTherapy.durationWeeks} Weeks
                          </span>
                        </div>
                        <div className="space-y-0.5 border-x border-border/60">
                          <span className="text-[10px] font-semibold text-muted-foreground block">
                            Curriculum
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {matchedTherapy.sessionCount} Sessions
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-semibold text-muted-foreground block">
                            Daily Target
                          </span>
                          <span className="text-xs font-bold text-foreground">
                            {matchedTherapy.dailyMinutes} mins/day
                          </span>
                        </div>
                      </div>

                      {/* Clinical Match Rationale Callout */}
                      <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 space-y-1">
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5" /> Clinical Matching Indication
                        </span>
                        <p className="text-xs text-foreground/90 leading-relaxed">
                          {matchedTherapy.matchReason}
                        </p>
                      </div>

                      {/* Therapeutic Goals */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-muted-foreground block">
                          Core Curriculum Targets:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedTherapy.therapeuticGoals.map((goal, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-background text-foreground border border-border/80 shadow-2xs"
                            >
                              <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 1-Click Action to Launch Matched Therapy */}
                    <div className="pt-2">
                      <Button
                        asChild
                        className="w-full h-11 rounded-2xl font-bold text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                      >
                        <Link
                          href={`/patient/therapy?program=${encodeURIComponent(
                            matchedTherapy.programTitle
                          )}`}
                        >
                          Begin {matchedTherapy.programTitle}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* ROW 2: Actionable Care Pathways & Integrated Patient Workflow */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Card 1: Clinical Consultation */}
                  <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        Clinical Consultation
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {lastResult.requiresFollowUp
                          ? "Your responses indicate symptoms that warrant professional review. Schedule a one-on-one session with an attending specialist."
                          : "Your screening profile is archived in your electronic health record. Consult your physician anytime to review."}
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold">
                      <Link href="/patient/appointments">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {lastResult.requiresFollowUp ? "Book Consultation" : "View Appointments"}
                      </Link>
                    </Button>
                  </div>

                  {/* Card 2: Question Response Breakdown */}
                  <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ClipboardList className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        Item-Level Response Audit
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Inspect every question, your selected answers, and scoring breakdown with complete English and Bengali translation options.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveModal("breakdown")}
                      className="w-full rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                      View Answers ({activeAssessment?.questions?.length || questionsList.length || 10})
                    </Button>
                  </div>

                  {/* Card 3: Reflective Thought Journal */}
                  <div className="p-5 rounded-2xl bg-card border border-border/80 shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors">
                    <div className="space-y-2">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Brain className="w-4 h-4" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        Reflective Self-Care & Journal
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Track daily emotional fluctuations and cognitive patterns in your private, clinical thought journal to support therapy.
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full rounded-xl text-xs font-semibold">
                      <Link href="/patient/journal">
                        <ArrowUpRight className="w-3.5 h-3.5 mr-1.5" />
                        Open Thought Journal
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* ROW 3: Research-Informed Clinical Self-Reflection Disclaimer */}
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 text-[11px] text-muted-foreground flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-foreground">Clinical Self-Reflection Guidance:</strong> This assessment battery is an original, research-informed self-reflection protocol designed for psychological education and progress tracking, not a validated diagnostic test. It cannot diagnose or rule out medical conditions. A licensed healthcare specialist can evaluate personal clinical symptoms.
                  </p>
                </div>
              </div>
            );
          })()}

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
      {inspectingResult && (() => {
        const inspectingMatchedTherapy = getRecommendedTherapyForAssessment(inspectingResult);
        const scorePercentage =
          inspectingResult.percentage ??
          Math.round((inspectingResult.score / (inspectingResult.maxScore || 40)) * 100);

        const getSevColor = (sev: string) => {
          const lower = (sev || "").toLowerCase();
          if (lower.includes("severe") || lower.includes("high") || lower.includes("crisis")) {
            return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30";
          }
          if (lower.includes("moderately severe")) {
            return "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30";
          }
          if (lower.includes("moderate") || lower.includes("medium")) {
            return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
          }
          if (lower.includes("mild")) {
            return "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
          }
          return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
        };

        return (
          <Dialog open={activeModal === "resultDetail"} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl p-6 sm:p-7 space-y-5">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    {inspectingResult.assessmentTitle || "Clinical Assessment Result"}
                  </DialogTitle>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getSevColor(inspectingResult.severityLevel)}`}>
                    {inspectingResult.severityLevel} Level
                  </span>
                </div>
                <DialogDescription className="text-xs">
                  Completed on{" "}
                  {new Date(inspectingResult.completedDate).toLocaleDateString([], {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}{" "}
                  {inspectingResult.assessmentCategory && `• Domain: ${inspectingResult.assessmentCategory}`}
                </DialogDescription>
              </DialogHeader>

              {/* Score & Telemetry Strip */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-muted/40 border border-border/80 text-xs">
                <div>
                  <span className="text-muted-foreground text-[11px] block font-medium">Recorded Score</span>
                  <span className="text-2xl font-extrabold text-foreground tracking-tight">
                    {inspectingResult.score}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {inspectingResult.maxScore || 40}
                    </span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground text-[11px] block font-medium">Calculated Ratio</span>
                  <span className="text-2xl font-extrabold text-primary tracking-tight">
                    {scorePercentage}%
                  </span>
                </div>
              </div>

              {/* Clinical Impression & Findings */}
              <div className="space-y-3">
                {inspectingResult.identifiedProblem && (
                  <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1">
                    <span className="font-bold text-[11px] text-primary flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" /> Identified Construct Pattern
                    </span>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {inspectingResult.identifiedProblem}
                    </p>
                  </div>
                )}

                {inspectingResult.clinicalSummary && (
                  <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1">
                    <span className="font-bold text-[11px] text-teal-600 dark:text-teal-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> Clinical Summary Impression
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {inspectingResult.clinicalSummary}
                    </p>
                  </div>
                )}

                {inspectingResult.suggestedFollowUp && (
                  <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-1">
                    <span className="font-bold text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Recommended Clinical Action
                    </span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {inspectingResult.suggestedFollowUp}
                    </p>
                  </div>
                )}
              </div>

              {/* Clinically Matched Therapy Program Block */}
              {inspectingMatchedTherapy && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-card to-primary/[0.04] border-2 border-primary/25 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                      Recommended Therapy Program
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded bg-muted font-bold text-muted-foreground border">
                      {inspectingMatchedTherapy.modality}
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-2xl flex items-center justify-center shrink-0">
                      {inspectingMatchedTherapy.emoji}
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-bold text-foreground">
                          {inspectingMatchedTherapy.programTitle}
                        </h4>
                        <span className="text-[10px] font-semibold text-muted-foreground px-2 py-0.5 rounded-full bg-muted border border-border/60">
                          {inspectingMatchedTherapy.difficultyLevel} Level
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {inspectingMatchedTherapy.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-foreground/90 leading-relaxed">
                    <strong className="text-primary block font-semibold mb-0.5">Clinical Matching Indication:</strong>
                    {inspectingMatchedTherapy.matchReason}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {inspectingMatchedTherapy.therapeuticGoals.map((goal, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-background text-foreground border border-border/80"
                      >
                        <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {goal}
                      </span>
                    ))}
                  </div>

                  <Button asChild size="sm" className="w-full rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                    <Link
                      href={`/patient/therapy?program=${encodeURIComponent(
                        inspectingMatchedTherapy.programTitle
                      )}`}
                    >
                      Begin {inspectingMatchedTherapy.programTitle}
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* Action Buttons Footer */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-border/60 gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveModal(null)}
                  className="rounded-full text-xs"
                >
                  Close
                </Button>

                <div className="flex items-center gap-2">
                  {inspectingResult.requiresFollowUp && (
                    <Button asChild variant="outline" size="sm" className="rounded-full text-xs">
                      <Link href="/patient/appointments">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        Book Consultation
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => {
                      setActiveModal(null);
                      handleStart(inspectingResult.assessmentId);
                    }}
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                    Retake Assessment
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}