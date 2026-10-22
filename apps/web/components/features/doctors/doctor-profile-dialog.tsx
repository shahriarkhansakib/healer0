"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ShieldCheck,
  MapPin,
  Clock,
  Calendar,
  GraduationCap,
  Star,
  CalendarOff,
  Stethoscope,
  Sparkles,
  Award,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface DoctorQualificationItem {
  id: string;
  degree: string;
  institution: string;
  year: number;
}

export interface DoctorReviewItem {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
}

export interface DoctorProfileData {
  doctorId: string;
  profileId: string;
  name: string;
  email: string;
  image: string | null;
  specialization: string;
  licenseNumber: string;
  hospitalAffiliation: string | null;
  dutyStartTime: string;
  dutyEndTime: string;
  offDay: string;
  bio: string;
  isAvailableToday: boolean;
  qualifications: DoctorQualificationItem[];
  averageRating: number;
  reviewCount: number;
  recentReviews: DoctorReviewItem[];
}

interface DoctorProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: DoctorProfileData | null;
  onBookAppointment: (doctorId: string) => void;
}

export function DoctorProfileDialog({
  isOpen,
  onClose,
  doctor,
  onBookAppointment,
}: DoctorProfileDialogProps) {
  if (!doctor) return null;

  const initials = doctor.name
    .replace(/^Dr\.\s*/i, "")
    .trim()
    .slice(0, 2)
    .toUpperCase() || "DR";

  const handleBook = () => {
    onClose();
    onBookAppointment(doctor.doctorId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl w-[calc(100vw-2rem)] max-h-[88vh] overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Clinician Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                    {doctor.name}
                  </DialogTitle>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Clinician
                  </span>
                </div>
                <DialogDescription className="text-xs text-primary font-medium mt-0.5 truncate">
                  {doctor.specialization}
                </DialogDescription>
                {doctor.hospitalAffiliation && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{doctor.hospitalAffiliation}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Rating & Status Summary */}
            <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card border border-border shadow-2xs">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-sm font-bold text-foreground">{doctor.averageRating}</span>
                <span className="text-xs text-muted-foreground">({doctor.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                {doctor.isAvailableToday ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    On Duty Today
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-muted-foreground font-medium">
                    <CalendarOff className="w-3 h-3 text-muted-foreground" />
                    Off Today ({doctor.offDay})
                  </span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Clinical Schedule & Accreditation Details */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" /> Duty Hours
            </span>
            <p className="text-xs font-semibold text-foreground">
              {doctor.dutyStartTime} – {doctor.dutyEndTime}
            </p>
            <p className="text-[11px] text-muted-foreground">Standard 45-min slots</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" /> Weekly Schedule
            </span>
            <p className="text-xs font-semibold text-foreground">
              6 Days / Week
            </p>
            <p className="text-[11px] text-muted-foreground">Off every {doctor.offDay}</p>
          </div>

          <div className="p-3.5 rounded-2xl border border-border bg-card/60 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Psychology License
            </span>
            <p className="text-xs font-semibold text-foreground truncate">
              {doctor.licenseNumber}
            </p>
            <p className="text-[11px] text-muted-foreground">Verified Licensing Board</p>
          </div>
        </div>

        {/* Clinical Bio */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5 text-primary" /> Clinical Focus & Background
          </h4>
          <div className="p-4 rounded-2xl border border-border bg-card text-xs text-foreground/90 leading-relaxed space-y-2">
            <p>{doctor.bio}</p>
          </div>
        </div>

        {/* Verified Qualifications Timeline */}
        {Array.isArray(doctor.qualifications) && doctor.qualifications.length > 0 && (
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" /> Verified Degrees & Accreditations
            </h4>
            <div className="space-y-2">
              {doctor.qualifications.map((q) => (
                <div
                  key={q.id}
                  className="p-3 rounded-2xl border border-border bg-card flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{q.degree}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{q.institution}</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-lg bg-muted text-[11px] font-semibold text-foreground shrink-0 border border-border/50">
                    {q.year}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verified Patient Reviews */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Patient Feedback & Verified Reviews
            </h4>
            <span className="text-[11px] text-muted-foreground font-medium">
              {doctor.reviewCount} total verified reviews
            </span>
          </div>

          {!Array.isArray(doctor.recentReviews) || doctor.recentReviews.length === 0 ? (
            <div className="p-4 rounded-2xl border border-border bg-card text-center text-xs text-muted-foreground">
              No public reviews yet for this psychologist.
            </div>
          ) : (
            <div className="space-y-2.5">
              {doctor.recentReviews.map((rev) => {
                const dateStr = rev.createdAt
                  ? format(new Date(rev.createdAt), "MMM d, yyyy")
                  : "Recent consultation";

                return (
                  <div
                    key={rev.id}
                    className="p-3.5 rounded-2xl border border-border bg-card space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                          {rev.patientName[0] || "P"}
                        </div>
                        <span className="text-xs font-semibold text-foreground">
                          {rev.patientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < rev.rating
                                ? "fill-amber-500 text-amber-500"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                        <span className="text-[10px] text-muted-foreground ml-1.5">{dateStr}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground italic pl-7 leading-relaxed">
                      "{rev.comment}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border flex-wrap">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Back to Directory
          </Button>
          <Link href={`/patient/messages?doctorId=${doctor.doctorId}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs gap-1.5 shadow-2xs"
            >
              <MessageSquare className="w-3.5 h-3.5 text-primary" /> Send Message
            </Button>
          </Link>
          <Button
            type="button"
            size="sm"
            onClick={handleBook}
            className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
          >
            <Stethoscope className="w-3.5 h-3.5" /> Book Consultation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
