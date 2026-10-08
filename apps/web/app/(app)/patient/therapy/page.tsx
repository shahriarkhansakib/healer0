"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Sparkles, Play, CheckCircle, Clock, Filter, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface TherapyProgram {
  id: string;
  title: string;
  resourceType: string;
  category: string;
  description: string;
  difficultyLevel: string;
  durationMinutes: number;
  audioUrl: string | null;
  videoUrl: string | null;
}

interface UserProgress {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  completionTime: string | null;
  status: 'Completed' | 'Skipped' | 'In Progress';
  progressPercentage: number;
}

const CATEGORIES = ['All', 'CBT', 'Anxiety', 'Sleep', 'Focus', 'Meditation'];

export default function TherapyPage() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Fetch all therapy programs
  const { data: programs, isLoading: loadingPrograms } = useQuery<TherapyProgram[]>({
    queryKey: ['therapy', 'programs'],
    queryFn: () => apiFetch<TherapyProgram[]>('/therapy/programs'),
  });

  // Fetch user's progress records
  const { data: progressList, isLoading: loadingProgress } = useQuery<UserProgress[]>({
    queryKey: ['therapy', 'progress'],
    queryFn: () => apiFetch<UserProgress[]>('/therapy/progress'),
  });

  // Mutation: Start program
  const startProgressMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiFetch<UserProgress>(`/therapy/progress/${resourceId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      toast.success("Activity started!");
      queryClient.invalidateQueries({ queryKey: ['therapy', 'progress'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start program.");
    },
  });

  // Mutation: Complete/Update progress to 100%
  const completeProgressMutation = useMutation({
    mutationFn: ({ id, progressPercentage }: { id: string; progressPercentage: number }) =>
      apiFetch<UserProgress>(`/therapy/progress/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ progressPercentage, status: 'Completed' }),
      }),
    onSuccess: () => {
      toast.success("Activity marked as completed! 🎉");
      queryClient.invalidateQueries({ queryKey: ['therapy', 'progress'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update progress.");
    },
  });

  const filteredPrograms = programs?.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category.toLowerCase() === selectedCategory.toLowerCase() ||
           p.resourceType.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Therapy Programs & Exercises</h1>
        <p className="text-sm text-muted-foreground">
          Evidence-based psychological exercises, CBT cognitive reframing, and guided mindfulness.
        </p>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground mr-1" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-secondary hover:bg-muted text-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Programs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loadingPrograms ? (
          <p className="text-sm text-muted-foreground col-span-3">Loading exercises...</p>
        ) : filteredPrograms && filteredPrograms.length > 0 ? (
          filteredPrograms.map((prog) => {
            const progress = progressList?.find((p) => p.resourceId === prog.id);
            const isCompleted = progress?.status === 'Completed' || (progress?.progressPercentage ?? 0) >= 100;
            const isInProgress = progress?.status === 'In Progress';

            return (
              <Card key={prog.id} className="flex flex-col justify-between overflow-hidden hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                      {prog.category}
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {prog.durationMinutes} mins
                    </span>
                  </div>
                  <CardTitle className="text-base font-semibold">{prog.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-3 leading-relaxed mt-1">
                    {prog.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0 space-y-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Level: <strong>{prog.difficultyLevel}</strong></span>
                    <span>Type: <strong>{prog.resourceType}</strong></span>
                  </div>

                  {/* Progress Indicator */}
                  {progress && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Progress:</span>
                        <span className="font-semibold">{progress.progressPercentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-300"
                          style={{ width: `${progress.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {isCompleted ? (
                      <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-600 bg-emerald-500/10 rounded-lg">
                        <CheckCircle className="w-4 h-4" /> Completed
                      </div>
                    ) : isInProgress ? (
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => completeProgressMutation.mutate({ id: progress.id, progressPercentage: 100 })}
                        disabled={completeProgressMutation.isPending}
                      >
                        <CheckCircle className="w-4 h-4 mr-1.5" /> Mark Complete
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => startProgressMutation.mutate(prog.id)}
                        disabled={startProgressMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-1.5 text-primary" /> Start Program
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="col-span-3 p-12 text-center text-muted-foreground text-sm">
            No programs found for category "{selectedCategory}".
          </Card>
        )}
      </div>
    </div>
  );
}
