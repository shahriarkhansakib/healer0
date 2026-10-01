"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ClipboardList, CheckCircle2, AlertCircle, ArrowRight, Award, RotateCcw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  scoreMapping: Record<string, number>;
  orderIndex: number;
}

interface Assessment {
  id: string;
  title: string;
  category: string;
  description: string;
  totalQuestions: number;
  questions?: AssessmentQuestion[];
}

interface AssessmentResult {
  id: string;
  assessmentId: string;
  score: number;
  severityLevel: 'Low' | 'Medium' | 'High';
  aiRecommendation: string | null;
  completedDate: string;
}

export default function AssessmentsPage() {
  const queryClient = useQueryClient();

  const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<AssessmentResult | null>(null);

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

  // Mutation: Submit assessment answers
  const submitMutation = useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: Record<string, string> }) =>
      apiFetch<AssessmentResult>(`/assessments/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
    onSuccess: (result) => {
      toast.success("Assessment submitted successfully!");
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: ['assessments', 'results'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit assessment.");
    },
  });

  const handleStart = (id: string) => {
    setActiveAssessmentId(id);
    setSelectedAnswers({});
    setLastResult(null);
  };

  const handleAnswerSelect = (questionId: string, optionKey: string) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssessmentId || !activeAssessment?.questions) return;

    if (Object.keys(selectedAnswers).length < activeAssessment.questions.length) {
      toast.error("Please answer all questions before submitting.");
      return;
    }

    submitMutation.mutate({
      id: activeAssessmentId,
      answers: selectedAnswers,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Clinical Mental Health Assessments</h1>
        <p className="text-sm text-muted-foreground">
          Standardized psychometric tests to evaluate symptoms of depression, anxiety, and daily stress.
        </p>
      </div>

      {/* Assessment Question Active Screen */}
      {activeAssessment && !lastResult && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="border-b bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {activeAssessment.category}
                </span>
                <CardTitle className="text-xl font-bold mt-2">{activeAssessment.title}</CardTitle>
                <CardDescription className="text-xs mt-1">{activeAssessment.description}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setActiveAssessmentId(null)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {loadingActive ? (
              <p className="text-sm text-muted-foreground">Loading questions...</p>
            ) : activeAssessment.questions && activeAssessment.questions.length > 0 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {activeAssessment.questions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border bg-card space-y-3">
                    <p className="text-sm font-semibold text-foreground">
                      {idx + 1}. {q.questionText}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {[
                        { key: 'option_a', text: q.optionA },
                        { key: 'option_b', text: q.optionB },
                        { key: 'option_c', text: q.optionC },
                        { key: 'option_d', text: q.optionD },
                      ].map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => handleAnswerSelect(q.id, opt.key)}
                          className={`p-3 rounded-lg border text-left transition-all ${
                            selectedAnswers[q.id] === opt.key
                              ? 'border-primary bg-primary/10 font-bold text-foreground'
                              : 'bg-card hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {opt.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <Button type="submit" className="w-full" disabled={submitMutation.isPending}>
                  {submitMutation.isPending ? "Calculating Results..." : "Submit Completed Assessment"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No questions found for this test.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result Display Screen */}
      {lastResult && (
        <Card className="border-emerald-500/50 bg-emerald-500/5 shadow-md">
          <CardHeader className="text-center pb-2">
            <Award className="w-12 h-12 text-emerald-600 mx-auto mb-2" />
            <CardTitle className="text-2xl font-bold">Assessment Complete</CardTitle>
            <CardDescription>Here is your clinical evaluation</CardDescription>
          </CardHeader>
          <CardContent className="max-w-xl mx-auto space-y-4 text-center">
            <div className="flex justify-center items-center gap-6 py-4">
              <div>
                <span className="text-xs text-muted-foreground">Total Score</span>
                <p className="text-3xl font-extrabold text-foreground">{lastResult.score}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div>
                <span className="text-xs text-muted-foreground">Severity Level</span>
                <p className={`text-xl font-bold ${
                  lastResult.severityLevel === 'High' ? 'text-rose-600' :
                  lastResult.severityLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {lastResult.severityLevel}
                </p>
              </div>
            </div>

            {lastResult.aiRecommendation && (
              <div className="p-4 rounded-xl bg-card border text-left text-xs leading-relaxed space-y-1">
                <span className="font-semibold text-primary block">Clinical Recommendation:</span>
                <p className="text-foreground">{lastResult.aiRecommendation}</p>
              </div>
            )}

            <Button onClick={() => { setActiveAssessmentId(null); setLastResult(null); }} className="w-full">
              Back to Assessments
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List of Available Assessments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Available Screening Tests</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loadingAssessments ? (
            <p className="text-sm text-muted-foreground col-span-3">Loading available assessments...</p>
          ) : assessments && assessments.length > 0 ? (
            assessments.map((a) => (
              <Card key={a.id} className="flex flex-col justify-between hover:border-primary/50 transition-colors">
                <CardHeader>
                  <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10 w-fit">
                    {a.category}
                  </span>
                  <CardTitle className="text-base font-semibold mt-2">{a.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed line-clamp-3">
                    {a.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>{a.totalQuestions} Questions</span>
                    <span>~5 Minutes</span>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => handleStart(a.id)}
                  >
                    Take Test <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="col-span-3 p-8 text-center text-muted-foreground text-sm">
              No assessments currently published.
            </Card>
          )}
        </div>
      </div>

      {/* Historical Results */}
      {pastResults && pastResults.length > 0 && (
        <div className="space-y-4 pt-4 border-t">
          <h2 className="text-lg font-semibold tracking-tight">Your Previous Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastResults.map((res) => (
              <Card key={res.id} className="p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-foreground">Score: {res.score}</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                    res.severityLevel === 'High' ? 'bg-rose-500/10 text-rose-600' :
                    res.severityLevel === 'Medium' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                  }`}>
                    {res.severityLevel} Severity
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2 italic">
                  "{res.aiRecommendation}"
                </p>
                <span className="text-[10px] text-muted-foreground block">
                  {new Date(res.completedDate).toLocaleDateString([], { dateStyle: 'medium' })}
                </span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
