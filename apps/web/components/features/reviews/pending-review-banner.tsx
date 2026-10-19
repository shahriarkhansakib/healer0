"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  DoctorReviewDialog,
  PendingReview,
} from "@/components/features/reviews/doctor-review-dialog";
import { Button } from "@/components/ui/button";
import { Star, X, UserCheck, Sparkles } from "lucide-react";

interface PendingReviewBannerProps {
  className?: string;
}

export function PendingReviewBanner({ className = "" }: PendingReviewBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<PendingReview | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch appointments pending review
  const { data: pendingList = [] } = useQuery<PendingReview[]>({
    queryKey: ["appointments", "pending-reviews"],
    queryFn: () => apiFetch<PendingReview[]>("/appointments/pending-reviews"),
  });

  if (isDismissed || pendingList.length === 0) {
    return null;
  }

  const current = pendingList[0];

  const handleOpenDialog = () => {
    setSelectedAppointment(current);
    setIsDialogOpen(true);
  };

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-card p-4 sm:p-5 shadow-sm animate-in fade-in-50 duration-200 ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
              <Star className="w-5 h-5 fill-amber-500" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Rate Your Doctor
                </span>
                <span className="text-[11px] text-muted-foreground">• Completed Session</span>
              </div>

              <h3 className="text-sm sm:text-base font-semibold text-foreground">
                How was your consultation with Dr. {current.doctorName}?
              </h3>

              <p className="text-xs text-muted-foreground">
                You recently completed a {current.consultationType} consultation on{" "}
                {new Date(current.appointmentDate).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
                . Your feedback helps maintain high clinical standards and assists other patients.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="text-xs h-9 px-3 text-muted-foreground hover:text-foreground"
            >
              Later
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenDialog}
              className="text-xs h-9 px-4 flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-medium shadow-sm"
            >
              <Star className="w-4 h-4 fill-white" />
              Rate Doctor
            </Button>
          </div>
        </div>
      </div>

      {/* Review Dialog Pop-up */}
      <DoctorReviewDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        appointment={selectedAppointment}
      />
    </>
  );
}
