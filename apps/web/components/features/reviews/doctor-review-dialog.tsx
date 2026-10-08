"use client";

import { useState } from "react";
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
import { toast } from "sonner";
import { Star, Sparkles, UserCheck, CheckCircle2 } from "lucide-react";

export interface PendingReview {
  id: string;
  appointmentId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string | null;
  appointmentDate: string;
  consultationType: string;
  sessionDurationMinutes?: number;
}

interface DoctorReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: PendingReview | null;
}

const RATING_LABELS: Record<number, string> = {
  1: "Poor Experience",
  2: "Fair Experience",
  3: "Good Experience",
  4: "Very Good Experience",
  5: "Excellent Experience",
};

const QUICK_TAGS = [
  "Empathetic",
  "Clear Explanations",
  "Punctual",
  "Attentive Listener",
  "Helpful Advice",
  "Reassuring",
];

export function DoctorReviewDialog({
  isOpen,
  onClose,
  appointment,
}: DoctorReviewDialogProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleClose = () => {
    setRating(5);
    setHoverRating(null);
    setComment("");
    setSelectedTags([]);
    onClose();
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const reviewMutation = useMutation({
    mutationFn: (data: { rating: number; comment?: string }) => {
      if (!appointment) throw new Error("No appointment selected");
      return apiFetch<{ success: boolean }>(
        `/appointments/${appointment.appointmentId}/review`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );
    },
    onSuccess: () => {
      toast.success(
        `Thank you! Your review for Dr. ${appointment?.doctorName || "Doctor"} has been recorded.`
      );
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["pending-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["patient"] });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit doctor review.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) return;

    let fullComment = comment.trim();
    if (selectedTags.length > 0) {
      const tagsNote = `Tags: ${selectedTags.join(", ")}`;
      fullComment = fullComment ? `${fullComment}\n\n${tagsNote}` : tagsNote;
    }

    reviewMutation.mutate({
      rating,
      comment: fullComment || "Great session.",
    });
  };

  if (!appointment) return null;

  const activeStars = hoverRating !== null ? hoverRating : rating;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="text-left pb-2 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Rate Dr. {appointment.doctorName}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {appointment.doctorSpecialization || "Clinical Consultation"} •{" "}
                {appointment.consultationType} on{" "}
                {new Date(appointment.appointmentDate).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-3">
          {/* Star Rating Section */}
          <div className="text-center space-y-2 py-2 bg-muted/30 rounded-xl border border-border/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Overall Rating
            </p>

            <div className="flex items-center justify-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= activeStars;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`Rate ${star} of 5 stars`}
                    className="p-1.5 rounded-lg hover:scale-115 transition-transform focus:outline-hidden"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        isFilled
                          ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                          : "text-muted-foreground/30 hover:text-muted-foreground/60"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-sm font-bold text-foreground transition-all">
              {RATING_LABELS[activeStars] || "Select your rating"}
            </p>
          </div>

          {/* Quick Compliment Badges */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              What stood out during your session? (Optional)
            </label>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/70 hover:text-foreground"
                    }`}
                  >
                    {isSelected && (
                      <CheckCircle2 className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                    )}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Written Feedback Comment Area */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">
              Doctor Feedback & Review
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Describe your experience with Dr. to help other patients..."
              className="w-full rounded-md border border-input bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={reviewMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={reviewMutation.isPending}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <Star className="w-4 h-4 fill-white" />
              {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
