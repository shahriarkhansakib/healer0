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
  ArrowUp,
  Award,
  RotateCcw,
  Calendar,
  HeartHandshake,
  ShieldAlert,
  Clock,
  Activity,
  ChevronLeft,
  ChevronRight,
  Info,
  PhoneCall,
  Sparkles,
  Video,
  Image as ImageIcon,
  Mic,
  Bell,
  PenLine,
  User,
  Languages,
  Globe,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
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

export default function AssessmentsPage() {
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("Fri");
  const [assessmentMode, setAssessmentMode] = useState<'basic' | 'expert'>('basic');
  const [isBanglaMode, setIsBanglaMode] = useState<boolean>(false);
  const [activeModal, setActiveModal] = useState<
    | 'activity'
    | 'analytics'
    | 'alerts'
    | 'breakdown'
    | 'baseline'
    | 'questionNav'
    | 'careTeam'
    | 'instructions'
    | 'emergencySupport'
    | 'exitConfirm'
    | 'profile'
    | null
  >(null);

  // Fetch available assessments
  const { data: assessments, isLoading: loadingAssessments } = useQuery<Assessment[]>({
    queryKey: ['assessments', 'list'],
    queryFn: () => apiFetch<Assessment[]>('/assessments'),
  });

  // Fetch detailed active assessment with questions
  const { data: activeAssessment, isLoading: loadingActive } = useQuery<Assessment>({
    queryKey: ['assessments', 'detail', activeAssessmentId],
    queryFn: () => apiFetch<Assessment>(`/assessments/${activeAssessmentId}`),
    enabled: !!activeAssessmentId,
  });

  // Fetch past results
  const { data: pastResults, isLoading: loadingResults } = useQuery<AssessmentResult[]>({
    queryKey: ['assessments', 'results'],
    queryFn: () => apiFetch<AssessmentResult[]>('/assessments/results'),
  });

  // Submit assessment answers mutation
  const submitMutation = useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      apiFetch<AssessmentResult>(`/assessments/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
    onSuccess: (result) => {
      toast.success("Assessment submitted and scored successfully!");
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'results'] });
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
    // Fallback for legacy 4-option questions
    const mapping = q.scoreMapping || {};
    const fallback: OptionItem[] = [];
    if (q.optionA) fallback.push({ id: 'A', label: q.optionA, score: mapping['A'] ?? mapping['option_a'] ?? 0 });
    if (q.optionB) fallback.push({ id: 'B', label: q.optionB, score: mapping['B'] ?? mapping['option_b'] ?? 1 });
    if (q.optionC) fallback.push({ id: 'C', label: q.optionC, score: mapping['C'] ?? mapping['option_c'] ?? 2 });
    if (q.optionD) fallback.push({ id: 'D', label: q.optionD, score: mapping['D'] ?? mapping['option_d'] ?? 3 });
    return fallback;
  };

  // Categories list
  const categories = ["All", "Depression", "Anxiety", "Psychological Distress", "Self-Esteem", "Well-Being", "Self-Efficacy", "Loneliness"];

  const filteredAssessments = assessments?.filter((a) => {
    if (selectedCategory === "All") return true;
    return a.category.toLowerCase().includes(selectedCategory.toLowerCase());
  });

  // Calculate current progress
  const questionsList = activeAssessment?.questions || [];
  const answeredCount = Object.keys(selectedAnswers).length;
  const totalCount = questionsList.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;
  const currentQuestion = questionsList[currentQuestionIdx];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Header (Visible only when not taking an assessment and no result displayed) */}
      {!activeAssessmentId && !lastResult && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-primary/10 text-primary">
                <ClipboardList className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold tracking-tight">Clinical Mental Health Assessments</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Standardized psychometric screening instruments with validated score ranges, problem evaluation, and clinical triage.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg border">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>Scores provide preliminary screening feedback and clinical triage suggestions, not a standalone medical diagnosis.</span>
          </div>
        </div>
      )}

      {/* 1. Assessment Question Active Stepper View — Pure MCQ Focus */}
      {activeAssessment && !lastResult && (
        <div className="relative rounded-[2.8rem] bg-gradient-to-b from-[#041209] via-[#07190e] to-[#030d06] text-white p-6 sm:p-8 md:p-12 overflow-hidden shadow-2xl border border-[#143d26]/70 min-h-[580px] flex flex-col justify-between animate-in fade-in duration-300">
          {/* Ambient terraced hill contours & mist overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Ambient radiant blurs */}
            <div className="absolute -top-36 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-lime-500/10 blur-3xl" />
            <div className="absolute -bottom-36 -left-36 w-96 h-96 rounded-full bg-emerald-600/15 blur-3xl" />

            {/* Layered Terraced Mountain Contours (Tea Plantation Ridges) */}
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

              {/* Individual contour terrace lines */}
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
              onClick={() => setActiveModal('exitConfirm')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.14] border border-white/10 hover:border-lime-400/40 text-emerald-100 text-xs font-medium transition-all shadow-xs"
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
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  isBanglaMode
                    ? 'bg-lime-400/20 text-lime-300 border-lime-400/60 shadow-xs font-semibold'
                    : 'bg-white/[0.06] hover:bg-white/[0.12] text-white/80 border-white/10 hover:border-white/20'
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
              {isBanglaMode && activeAssessment.code && BANGLA_ASSESSMENT_TITLES[activeAssessment.code]
                ? BANGLA_ASSESSMENT_TITLES[activeAssessment.code].title
                : activeAssessment.title}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/70 max-w-lg mx-auto font-normal">
              {isBanglaMode && activeAssessment.code && BANGLA_ASSESSMENT_TITLES[activeAssessment.code]
                ? BANGLA_ASSESSMENT_TITLES[activeAssessment.code].subtitle
                : activeAssessment.description}
            </p>
          </div>

          {/* Central Floating Glowing MCQ Card */}
          <div className="relative z-10 max-w-3xl mx-auto w-full my-4">
            {/* Ambient Lime perimeter glow */}
            <div className="absolute -inset-1 rounded-[2.6rem] bg-gradient-to-r from-lime-400/25 via-emerald-400/10 to-lime-400/25 blur-xl opacity-75 pointer-events-none" />

            <div className="relative rounded-[2.3rem] bg-[#0c1e13]/85 backdrop-blur-2xl border border-lime-400/40 shadow-[0_0_40px_rgba(132,204,22,0.18)] p-6 sm:p-8 md:p-10 space-y-6">
              {/* Prompt Row: Sparkle + Question + Dedicated Bangla Translation Button */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-lime-400/90 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Sparkles className="w-3.5 h-3.5" /> Item {currentQuestionIdx + 1} of {totalCount}
                    </span>
                    {activeAssessment.timeframe && (
                      <span className="text-emerald-200/60 font-mono text-[11px]">
                        • {isBanglaMode ? `সময়কাল: ${getTimeframeBangla(activeAssessment.timeframe)}` : `Recall: ${activeAssessment.timeframe.replace(/_/g, ' ')}`}
                      </span>
                    )}
                  </div>

                  {/* Bangla Translation Button on Question */}
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
                    title={isBanglaMode ? "Switch back to English" : "প্রশ্নটি বাংলায় অনুবাদ করুন (Translate question to Bangla)"}
                  >
                    <Languages className={`w-3.5 h-3.5 ${isBanglaMode ? 'text-black' : 'text-lime-400'}`} />
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

              {/* Options Row (Pill tags) & Right Navigation Controls */}
              {currentQuestion && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  {/* Option Pills */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {getQuestionOptions(currentQuestion).map((opt) => {
                      const isSelected = selectedAnswers[currentQuestion.id] === opt.id;
                      const banglaOptLabel = getOptionBanglaLabel(opt.label);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleAnswerSelect(currentQuestion.id, opt.id)}
                          className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-lime-400/20 border-2 border-lime-400 text-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.35)] ring-1 ring-lime-400/40 font-semibold scale-[1.02]'
                              : 'bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 hover:border-lime-400/30 text-white/90'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isSelected ? 'bg-lime-400 text-black' : 'bg-white/15 text-white/70'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <span className="flex flex-col text-left">
                            <span>{isBanglaMode ? banglaOptLabel : opt.label}</span>
                            {isBanglaMode && banglaOptLabel !== opt.label && (
                              <span className="text-[9px] text-white/45 font-normal -mt-0.5">
                                {opt.label}
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right Circle Buttons: Circular Prev/Reset + Bright Lime Arrow (↑) */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={currentQuestionIdx === 0}
                      onClick={() => setCurrentQuestionIdx((p) => Math.max(p - 1, 0))}
                      title="Previous Question"
                      className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                        currentQuestionIdx > 0
                          ? 'bg-white/[0.06] hover:bg-white/[0.14] border-white/15 text-white hover:text-lime-300'
                          : 'opacity-30 cursor-not-allowed bg-white/[0.02] border-white/5 text-white/40'
                      }`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (currentQuestionIdx < totalCount - 1) {
                          setCurrentQuestionIdx((p) => Math.min(p + 1, totalCount - 1));
                        } else {
                          handleSubmit();
                        }
                      }}
                      title={currentQuestionIdx < totalCount - 1 ? 'Next Question' : 'Submit Assessment'}
                      disabled={submitMutation.isPending}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                        selectedAnswers[currentQuestion.id]
                          ? 'bg-[#84cc16] hover:bg-[#a3e635] text-black shadow-[0_0_18px_rgba(132,204,22,0.5)] scale-105 active:scale-95'
                          : 'bg-[#84cc16]/70 hover:bg-[#84cc16] text-black/80'
                      }`}
                    >
                      {currentQuestionIdx < totalCount - 1 ? (
                        <ArrowUp className="w-5 h-5 stroke-[2.5]" />
                      ) : submitMutation.isPending ? (
                        <Activity className="w-5 h-5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Card Footer: Question Navigator Pills (1, 2, 3...) & Progress */}
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
                        className={`w-7 h-7 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center justify-center ${
                          isCurrent
                            ? 'bg-lime-400 text-black shadow-[0_0_12px_rgba(163,230,53,0.6)] font-bold scale-110'
                            : isAnswered
                            ? 'bg-lime-400/20 text-lime-300 border border-lime-400/40 hover:bg-lime-400/30'
                            : 'bg-white/[0.06] text-white/50 hover:bg-white/[0.12] hover:text-white'
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
          <Dialog open={activeModal === 'exitConfirm'} onOpenChange={() => setActiveModal(null)}>
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

      {/* 2. Screening Result Display Screen (Bento Grid Layout) */}
      {lastResult && (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
          {/* Crisis Alert (Safety rule trigger) */}
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

          {/* Row 1: Hero Overview (col-span-7) + Activity Overview (col-span-5) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Card 1: Lush Botanical Green Hero Overview Card */}
            <div className="lg:col-span-7 rounded-[2.2rem] bg-gradient-to-br from-[#1d633d] via-[#155131] to-[#0c351e] text-white p-7 md:p-8 relative overflow-hidden shadow-sm flex flex-col justify-between border border-[#237446]/40 min-h-[300px]">
              {/* Background ambient lighting */}
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 right-12 w-64 h-64 rounded-full bg-emerald-300/10 blur-2xl pointer-events-none" />

              {/* Top Row: Title & Category Pill */}
              <div className="relative z-10 flex items-start justify-between">
                <div>
                  <h2 className="text-4xl md:text-5xl font-medium tracking-tight font-sans text-white">
                    Overview
                  </h2>
                  <p className="text-xs text-emerald-100/80 mt-1 font-medium">
                    {lastResult.assessmentTitle || 'Clinical Screener'}
                  </p>
                </div>

                <span className="text-[11px] font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 border border-white/10">
                  {lastResult.severityLevel} Severity
                </span>
              </div>

              {/* Bottom Row: Stats & Botanical / Sensor Station Graphic */}
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-8">
                {/* Left Metrics */}
                <div className="flex items-center gap-7">
                  <div className="space-y-1">
                    <span className="text-xs font-medium text-emerald-200/90 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-300" /> Score Ratio
                    </span>
                    <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {lastResult.percentage ?? Math.round((lastResult.score / (lastResult.maxScore || 27)) * 100)}%
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-medium text-emerald-200/90 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" /> Score Index
                    </span>
                    <p className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                      {lastResult.score}{' '}
                      <span className="text-lg font-medium text-emerald-200/80">
                        / {lastResult.maxScore || 27}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right Graphic: Stylized Health & Vitality Node with Floating Pills */}
                <div className="relative w-44 h-36 shrink-0 self-center sm:self-end">
                  {/* Floating Micro Tag 1: Health */}
                  <div className="absolute top-1 left-2 z-20 flex items-center gap-1.5 bg-white/95 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Health
                  </div>

                  {/* Floating Micro Tag 2: Status */}
                  <div className="absolute bottom-6 right-0 z-20 flex items-center gap-1.5 bg-white/95 text-emerald-950 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    {lastResult.requiresFollowUp ? 'Triage' : 'Stable'}
                  </div>

                  {/* Stylized Botanical Lamp SVG */}
                  <svg viewBox="0 0 160 140" fill="none" className="w-full h-full drop-shadow-md">
                    {/* Lamp arch */}
                    <path
                      d="M 60 130 V 45 C 60 25 80 15 105 15 H 115"
                      stroke="#e4efe7"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                    <rect x="100" y="10" width="30" height="12" rx="4" fill="#d1e6d8" />
                    {/* Gentle light cone */}
                    <path d="M 103 22 L 80 115 H 145 L 127 22 Z" fill="url(#lightGradient)" opacity="0.4" />
                    {/* Planter Box */}
                    <rect x="50" y="115" width="85" height="22" rx="6" fill="#f0f5f1" />
                    <rect x="55" y="118" width="75" height="4" rx="2" fill="#88b598" />
                    {/* Plant Stems and Leaves */}
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

            {/* Card 2: Activity Overview & Trajectory Card */}
            <div className="lg:col-span-5 rounded-[2.2rem] bg-[#f4f7f4] dark:bg-[#15221b] border border-[#e2e8e2] dark:border-white/10 p-6 md:p-7 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3">
                  <h3 className="text-base font-bold text-foreground">Activity Overview</h3>
                  <button
                    type="button"
                    onClick={() => setActiveModal('activity')}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium transition cursor-pointer"
                  >
                    Details
                  </button>
                </div>

                {/* Day selector row */}
                <div className="flex items-center justify-between pt-1 pb-4 text-xs font-semibold text-muted-foreground">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => {
                    const isSelected = selectedDay === day;
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setSelectedDay(day)}
                        className="flex flex-col items-center gap-1 group transition cursor-pointer"
                      >
                        <span className="text-[11px] group-hover:text-foreground">{day}</span>
                        {isSelected ? (
                          <span className="w-8 h-8 rounded-full bg-[#102418] dark:bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                            {day}
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-foreground/80 hover:bg-muted/70">
                            •
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Symptom Curve Waveform with Tooltip Pill */}
              <div className="relative py-4 my-auto">
                {/* Floating Wave Tooltip Pill */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white dark:bg-[#1e2f25] border border-border/80 px-2.5 py-1 rounded-full text-[10px] font-bold text-foreground shadow-xs flex items-center gap-1 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {lastResult.severityLevel}
                </div>

                {/* Vertical Guide Column behind peak */}
                <div className="absolute inset-y-2 left-[44%] w-10 bg-white/70 dark:bg-white/5 rounded-xl border border-dashed border-emerald-500/30 pointer-events-none" />

                {/* Seed / Indicator Icon */}
                <div className="absolute top-6 left-[49%] -translate-x-1/2 z-10 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-xs" />

                <svg viewBox="0 0 320 70" fill="none" className="w-full h-18">
                  {/* Grid baseline lines */}
                  <line x1="0" y1="20" x2="320" y2="20" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />
                  <line x1="0" y1="45" x2="320" y2="45" stroke="currentColor" strokeOpacity="0.08" strokeDasharray="3 3" />

                  {/* Smooth spline wave */}
                  <path
                    d="M 10 48 Q 45 48 70 38 T 130 45 T 160 22 T 200 44 T 260 32 T 310 46"
                    stroke="#1a472c"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="dark:stroke-emerald-400"
                  />
                </svg>

                {/* Milestone Timestamps */}
                <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground pt-2">
                  <span>10:00</span>
                  <span>12:00</span>
                  <span>14:00</span>
                  <span>16:00</span>
                  <span>18:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: 3 Columns -> Analytics (4 cols) + Critical Alerts (4 cols) + Schedule Next Steps (4 cols) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
            {/* Card 3: Deep Forest Symptom Analytics Card */}
            <div className="lg:col-span-4 rounded-[2.2rem] bg-[#0e2216] text-white p-6 md:p-7 border border-[#183925] shadow-sm flex flex-col justify-between relative overflow-hidden min-h-[280px]">
              <div className="flex items-center justify-between pb-2">
                <h3 className="text-base font-bold text-white">Severity Analytics</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal('analytics')}
                  className="text-xs text-emerald-300/80 font-medium cursor-pointer hover:text-white transition"
                >
                  Details
                </button>
              </div>

              {/* Chart container with glowing line & pill */}
              <div className="relative py-4 my-auto">
                {/* Floating score tag */}
                <div className="absolute top-1 left-[48%] -translate-x-1/2 bg-white text-[#0e2216] px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-md flex items-center gap-1 z-10">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {lastResult.score} pts
                </div>

                {/* Vertical Marker Line */}
                <div className="absolute top-6 bottom-4 left-[48%] w-px bg-white/40 pointer-events-none" />
                <div className="absolute top-6 left-[48%] -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-sm z-10" />

                <svg viewBox="0 0 240 90" fill="none" className="w-full h-24">
                  {/* Subtle horizontal grid lines */}
                  <line x1="0" y1="25" x2="240" y2="25" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
                  <line x1="0" y1="55" x2="240" y2="55" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />
                  <line x1="0" y1="80" x2="240" y2="80" stroke="#ffffff" strokeOpacity="0.08" strokeDasharray="3 3" />

                  {/* Secondary dashed reference curve */}
                  <path
                    d="M 5 78 C 40 75 70 70 115 52 C 160 38 195 44 235 34"
                    stroke="#eab308"
                    strokeWidth="1.8"
                    strokeDasharray="4 3"
                    opacity="0.8"
                  />

                  {/* Primary symptom curve */}
                  <path
                    d="M 5 76 C 35 72 70 65 115 42 C 150 25 185 32 235 22"
                    stroke="#43d27b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Timeline Axis */}
                <div className="flex justify-between items-center text-[10px] font-mono text-emerald-200/60 pt-2">
                  <span>0 days</span>
                  <span>14 days</span>
                  <span>30 days</span>
                </div>
              </div>
            </div>

            {/* Card 4: Golden Amber Critical Alerts Card */}
            <div className="lg:col-span-4 rounded-[2.2rem] bg-[#f7b833] text-[#1b231c] p-6 md:p-7 shadow-sm flex flex-col justify-between min-h-[280px]">
              <div className="flex items-center justify-between pb-3">
                <h3 className="text-base font-bold text-[#1b231c]">Critical Alerts</h3>
                <button
                  type="button"
                  onClick={() => setActiveModal('alerts')}
                  className="text-xs font-semibold text-[#1b231c]/80 cursor-pointer hover:text-black transition"
                >
                  See All
                </button>
              </div>

              {/* 3 Notification / Findings Rows (All Clickable) */}
              <div className="space-y-2.5 my-auto">
                {/* Alert 1 */}
                <div
                  onClick={() => setActiveModal('alerts')}
                  className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-black/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-emerald-800 shadow-xs shrink-0">
                      <Activity className="w-4 h-4 text-emerald-700" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#1b231c]">
                        Symptom Finding
                      </span>
                      <p className="text-[11px] font-medium text-[#1b231c]/80 line-clamp-1">
                        {lastResult.identifiedProblem || 'Moderate Profile'}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#18231c] text-[#f7b833] flex items-center justify-center text-[10px] font-bold shrink-0">
                    ✓
                  </div>
                </div>

                {/* Alert 2 */}
                <div
                  onClick={() => setActiveModal('alerts')}
                  className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-black/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-700 shadow-xs shrink-0">
                      <HeartHandshake className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#1b231c]">
                        Clinical Follow-up
                      </span>
                      <p className="text-[11px] font-medium text-[#1b231c]/80 line-clamp-1">
                        {lastResult.requiresFollowUp
                          ? 'Specialist Visit Advised'
                          : 'Self-Care Protocol Sufficient'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                      lastResult.requiresFollowUp
                        ? 'bg-[#18231c] text-[#f7b833]'
                        : 'bg-[#18231c] text-white'
                    }`}
                  >
                    {lastResult.requiresFollowUp ? '!' : '✓'}
                  </div>
                </div>

                {/* Alert 3 */}
                <div
                  onClick={() => setActiveModal('alerts')}
                  className="flex items-center justify-between gap-3 p-1.5 rounded-xl hover:bg-black/5 cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-rose-700 shadow-xs shrink-0">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#1b231c]">
                        Safety Evaluation
                      </span>
                      <p className="text-[11px] font-medium text-[#1b231c]/80 line-clamp-1">
                        {lastResult.crisisAlert ? 'Immediate Review Needed' : 'Self-Harm Risk: Negative'}
                      </p>
                    </div>
                  </div>
                  <div className="w-5 h-5 rounded-full bg-[#18231c] text-[#f7b833] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {lastResult.crisisAlert ? '!' : '✓'}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 5: Schedule & Action Plan Card */}
            <div className="lg:col-span-4 rounded-[2.2rem] bg-[#f4f7f4] dark:bg-[#15221b] border border-[#e2e8e2] dark:border-white/10 p-6 md:p-7 shadow-sm flex flex-col justify-between min-h-[280px]">
              <div className="space-y-3.5 my-auto">
                {/* Row 1: Doctor Consultation */}
                <div className="flex items-center justify-between gap-2 p-1">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Psychiatry Consultation
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" /> Dr. Asif Mahmud
                    </span>
                  </div>
                  <Button asChild size="sm" className="h-7 px-3 text-[11px] rounded-full bg-[#1a5535] hover:bg-[#134229] text-white">
                    <Link href="/patient/appointments">Book Now</Link>
                  </Button>
                </div>

                {/* Row 2: CBT Module */}
                <div className="flex items-center justify-between gap-2 p-1 border-t border-border/60 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      CBT Anxiety & Mood Program
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" /> Guided Module • 15m
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 px-3 text-[11px] rounded-full">
                    <Link href="/patient/therapy">Start</Link>
                  </Button>
                </div>

                {/* Row 3: Daily Journaling / Routine */}
                <div className="flex items-center justify-between gap-2 p-1 border-t border-border/60 pt-3">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-foreground block">
                      Daily Mood & Journaling
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" /> Evening Routine
                    </span>
                  </div>
                  <Button asChild variant="outline" size="sm" className="h-7 px-3 text-[11px] rounded-full">
                    <Link href="/patient/journal">Open Journal</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Stacked Horizontal Strip Cards (Container #12 & #17 Style) */}
          <div className="space-y-3 pt-2">
            {/* Strip 1: Current Screening Evaluation */}
            <div className="rounded-full sm:rounded-[2.2rem] bg-white dark:bg-[#15221b] border border-[#e0e7e1] dark:border-white/10 p-3.5 px-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">
                  Assessment #1 — {lastResult.assessmentTitle || 'Clinical Screener'}
                </span>
              </div>

              {/* Stats Chips & Circular Gauge */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                {/* Circular Percentage Dial */}
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" fill="none" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="#22c55e"
                      strokeWidth="2.5"
                      strokeDasharray="100"
                      strokeDashoffset={100 - (lastResult.percentage || Math.round((lastResult.score / (lastResult.maxScore || 27)) * 100))}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-foreground">
                    {lastResult.percentage ?? Math.round((lastResult.score / (lastResult.maxScore || 27)) * 100)}%
                  </span>
                </div>

                <span className="flex items-center gap-1">
                  <span className="text-emerald-500 font-bold">💧</span> Score: {lastResult.score} / {lastResult.maxScore || 27}
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-amber-500 font-bold">🌱</span> Severity: {lastResult.severityLevel}
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-blue-500 font-bold">🧪</span> {lastResult.requiresFollowUp ? 'Action Needed' : 'Normal'}
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-emerald-500 font-bold">🌡️</span> Confirmed
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => setActiveModal('breakdown')}
                className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white px-5 text-xs font-semibold shadow-xs cursor-pointer"
              >
                Details
              </Button>
            </div>

            {/* Strip 2: Secondary / Baseline Reference */}
            <div className="rounded-full sm:rounded-[2.2rem] bg-white dark:bg-[#15221b] border border-[#e0e7e1] dark:border-white/10 p-3.5 px-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-foreground">
                  Baseline Reference — Generalized Anxiety (GAD-7)
                </span>
              </div>

              {/* Stats Chips & Circular Gauge */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-muted-foreground">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <svg className="w-10 h-10 -rotate-90">
                    <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.5" className="text-muted/40" fill="none" />
                    <circle
                      cx="20"
                      cy="20"
                      r="16"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="100"
                      strokeDashoffset="35"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-foreground">78%</span>
                </div>

                <span className="flex items-center gap-1">
                  <span className="text-emerald-500 font-bold">💧</span> 5 / 21 pts
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-amber-500 font-bold">🌱</span> Severity: Mild
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-blue-500 font-bold">🧪</span> Monitored
                </span>

                <span className="flex items-center gap-1">
                  <span className="text-emerald-500 font-bold">🌡️</span> Baseline
                </span>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const gad7 = assessments?.find(
                    (a) => a.code === 'GAD7' || a.category.toLowerCase().includes('anxiety'),
                  );
                  if (gad7) {
                    handleStart(gad7.id);
                    toast.info('Starting GAD-7 Anxiety Assessment...');
                  } else {
                    setActiveModal('baseline');
                  }
                }}
                className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white px-5 text-xs font-semibold shadow-xs cursor-pointer"
              >
                Details
              </Button>
            </div>
          </div>

          {/* Row 4: Clinical Summary Narrative Box */}
          {lastResult.clinicalSummary && (
            <div className="p-5 rounded-[2rem] bg-card border text-xs leading-relaxed space-y-1.5 shadow-xs">
              <div className="flex items-center gap-2 font-semibold text-primary">
                <Activity className="w-4 h-4" />
                <span>Clinical Impression & Recommendation:</span>
              </div>
              <p className="text-muted-foreground pl-6 leading-relaxed">
                {lastResult.clinicalSummary} {lastResult.suggestedFollowUp}
              </p>
            </div>
          )}

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

          {/* Modals for Functional Details Buttons */}

          {/* 1. Full Response Breakdown Modal */}
          <Dialog open={activeModal === 'breakdown'} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl p-6">
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-primary" />
                    {lastResult.assessmentTitle || 'Clinical Screener'} — Question Responses
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={() => setIsBanglaMode((p) => !p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                      isBanglaMode
                        ? 'bg-primary/20 text-primary border-primary/50 font-semibold'
                        : 'bg-muted hover:bg-muted/80 text-foreground border-border'
                    }`}
                  >
                    <Languages className="w-3.5 h-3.5" />
                    <span>{isBanglaMode ? 'বাংলা (অনূদিত)' : 'বাংলা অনুবাদ'}</span>
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
                    {lastResult.score} / {lastResult.maxScore || 27} ({lastResult.percentage ?? Math.round((lastResult.score / (lastResult.maxScore || 27)) * 100)}%)
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
                        <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                          {chosenOpt?.id || '-'}
                        </span>
                        <span className="font-medium text-foreground">
                          {chosenOpt ? (isBanglaMode ? getOptionBanglaLabel(chosenOpt.label) : chosenOpt.label) : 'Answered'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t gap-3">
                <Button asChild size="sm" className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white">
                  <Link href="/patient/appointments">Book Consultation</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 2. Activity Overview Details Modal */}
          <Dialog open={activeModal === 'activity'} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" /> Activity & Trajectory Schedule
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Weekly monitoring adherence and recommended symptom tracking intervals.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3.5 rounded-2xl bg-muted/50 border space-y-1">
                  <span className="font-bold text-foreground block">Active Selection: {selectedDay}</span>
                  <p className="text-muted-foreground leading-relaxed">
                    Symptom trajectory is continuously calibrated during tracking intervals between 10:00 and 18:00.
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Daily Monitoring Protocol:</span>
                  {[
                    { time: '10:00 AM', label: 'Morning baseline & emotional state check' },
                    { time: '12:00 PM', label: 'Mid-day stress management & breathing' },
                    { time: '14:00 PM', label: 'Cognitive load & energy tracking' },
                    { time: '16:00 PM', label: 'Afternoon tension & mood review' },
                    { time: '18:00 PM', label: 'Evening relaxation & wind-down journal' },
                  ].map((slot) => (
                    <div key={slot.time} className="flex items-center justify-between p-2.5 rounded-xl border bg-card">
                      <span className="font-mono text-[11px] font-bold text-primary">{slot.time}</span>
                      <span className="text-muted-foreground">{slot.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <Button asChild size="sm" className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white">
                  <Link href="/patient/mood">Log Mood Check-in</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 3. Severity Analytics Details Modal */}
          <Dialog open={activeModal === 'analytics'} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" /> Severity Analytics & Projections
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Clinical scoring scale breakdown and recovery trajectory milestones.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-muted/50 border text-center">
                    <span className="text-[11px] text-muted-foreground block">Current Score</span>
                    <span className="text-2xl font-extrabold text-foreground">{lastResult.score} pts</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-muted/50 border text-center">
                    <span className="text-[11px] text-muted-foreground block">Severity Classification</span>
                    <span className="text-lg font-bold text-primary">{lastResult.severityLevel}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl border bg-card space-y-1.5">
                  <span className="font-bold text-foreground block">Clinical Finding:</span>
                  <p className="text-muted-foreground leading-relaxed">
                    {lastResult.clinicalSummary || 'Validated clinical psychometric evaluation.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="font-semibold text-foreground block">Recovery Milestones:</span>
                  <div className="p-2.5 rounded-xl border bg-card flex justify-between items-center">
                    <span className="font-bold">Day 0 (Baseline)</span>
                    <span className="text-muted-foreground">Screening Completed ({lastResult.score} pts)</span>
                  </div>
                  <div className="p-2.5 rounded-xl border bg-card flex justify-between items-center">
                    <span className="font-bold">Day 14 (Review)</span>
                    <span className="text-muted-foreground">Re-assessment checkpoint</span>
                  </div>
                  <div className="p-2.5 rounded-xl border bg-card flex justify-between items-center">
                    <span className="font-bold">Day 30 (Goal)</span>
                    <span className="text-emerald-600 font-semibold">Subclinical Recovery Target</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-3 border-t">
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 4. Clinical Alerts Details Modal */}
          <Dialog open={activeModal === 'alerts'} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" /> Clinical Alerts & Triage Rules
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Detailed inspection of diagnostic findings and safety protocols.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3.5 rounded-2xl border bg-card space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">1. Core Symptom Profile</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px]">Validated</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lastResult.identifiedProblem} (Score: {lastResult.score} / {lastResult.maxScore || 27})
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border bg-card space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">2. Professional Follow-up Priority</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      lastResult.requiresFollowUp ? 'bg-blue-500/10 text-blue-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {lastResult.requiresFollowUp ? 'Recommended' : 'Routine'}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lastResult.suggestedFollowUp || 'No critical immediate follow-up required.'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl border bg-card space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">3. Safety & Crisis Rule</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      lastResult.crisisAlert ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                    }`}>
                      {lastResult.crisisAlert ? 'Crisis Flag' : 'Negative'}
                    </span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {lastResult.crisisAlert
                      ? 'Self-harm thoughts indicated. Urgent support recommended (988 Lifeline).'
                      : 'No critical self-harm or urgent safety concerns endorsed in this screening.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {lastResult.requiresFollowUp ? (
                  <Button asChild size="sm" className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white">
                    <Link href="/patient/appointments">Book Consultation</Link>
                  </Button>
                ) : <div />}
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* 5. Baseline Reference GAD-7 Modal */}
          <Dialog open={activeModal === 'baseline'} onOpenChange={() => setActiveModal(null)}>
            <DialogContent className="max-w-lg rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> Generalized Anxiety (GAD-7) Baseline
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Standardized 7-question psychometric tool for anxiety screening.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <p className="text-muted-foreground leading-relaxed">
                  Screening for anxiety symptoms alongside your current assessment provides a comprehensive multi-domain evaluation of mood and cognitive tension.
                </p>
                <div className="p-3 rounded-2xl bg-muted/50 border flex justify-between items-center">
                  <div>
                    <span className="font-bold text-foreground block">GAD-7 Anxiety Screener</span>
                    <span className="text-muted-foreground text-[11px]">7 Questions • ~3 Minutes</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    Validated
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                {(() => {
                  const gad7 = assessments?.find(
                    (a) => a.code === 'GAD7' || a.category.toLowerCase().includes('anxiety'),
                  );
                  return gad7 ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveModal(null);
                        handleStart(gad7.id);
                      }}
                      className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white"
                    >
                      Start GAD-7 Test <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setActiveModal(null);
                        setActiveAssessmentId(null);
                        setLastResult(null);
                      }}
                      className="rounded-full bg-[#1e5d3c] hover:bg-[#16482e] text-white"
                    >
                      Browse All Tests
                    </Button>
                  );
                })()}
                <Button variant="outline" size="sm" onClick={() => setActiveModal(null)} className="rounded-full">
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* 3. Catalogue: Available Screening Tests (Filtered by Category) */}
      {!activeAssessmentId && !lastResult && (
        <div className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Screening Test Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingAssessments ? (
              <p className="text-sm text-muted-foreground col-span-3 py-8 text-center">
                Loading clinical screening tests...
              </p>
            ) : filteredAssessments && filteredAssessments.length > 0 ? (
              filteredAssessments.map((a) => (
                <Card key={a.id} className="flex flex-col justify-between hover:border-primary/50 transition-all shadow-sm">
                  <CardHeader className="space-y-2 pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                        {a.category}
                      </span>
                      {a.code && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground font-bold">
                          {a.code}
                        </span>
                      )}
                    </div>
                    <CardTitle className="text-base font-bold leading-snug">{a.title}</CardTitle>
                    <CardDescription className="text-xs leading-relaxed line-clamp-3">
                      {a.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4 pt-2 border-t">
                      <span className="flex items-center gap-1">
                        <ClipboardList className="w-3.5 h-3.5" />
                        {a.totalQuestions} Questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ~{Math.max(2, Math.round(a.totalQuestions * 0.5))} mins
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => handleStart(a.id)}
                    >
                      Take Assessment <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="col-span-3 p-8 text-center text-muted-foreground text-sm">
                No assessments found for this category.
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 4. Previous Screening History */}
      {!activeAssessmentId && !lastResult && pastResults && pastResults.length > 0 && (
        <div className="space-y-4 pt-6 border-t">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight">Your Completed Assessment History</h2>
            <span className="text-xs text-muted-foreground">{pastResults.length} records</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastResults.map((res) => (
              <Card key={res.id} className="p-4 space-y-3 text-xs bg-card hover:border-primary/40 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-bold text-foreground text-sm block">
                      {res.assessmentTitle || 'Clinical Assessment'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(res.completedDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                      res.severityLevel === 'Severe' || res.severityLevel === 'Moderately Severe' || res.severityLevel === 'High'
                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                        : res.severityLevel === 'Moderate'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {res.severityLevel}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs py-1 border-y">
                  <span className="text-muted-foreground">Score:</span>
                  <span className="font-bold text-foreground">
                    {res.score} / {res.maxScore || 27}
                  </span>
                </div>

                {res.identifiedProblem && (
                  <p className="text-foreground font-semibold line-clamp-1">
                    {res.identifiedProblem}
                  </p>
                )}

                <p className="text-muted-foreground line-clamp-2 italic">
                  "{res.suggestedFollowUp || res.aiRecommendation}"
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
