"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Stethoscope,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  CalendarOff,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DoctorProfileDialog,
  DoctorProfileData,
} from "@/components/features/doctors/doctor-profile-dialog";
import { DoctorSlotBookingDialog } from "@/components/features/appointments/doctor-slot-booking-dialog";

export default function PatientDoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState<string>("all");
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false);

  // Modal states
  const [selectedProfileDoctor, setSelectedProfileDoctor] = useState<DoctorProfileData | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState<string | undefined>(undefined);

  // Fetch doctors directory
  const { data: doctors = [], isLoading: loadingDoctors } = useQuery<DoctorProfileData[]>({
    queryKey: ["doctors", "directory", searchQuery, selectedSpecialization, onlyAvailableToday],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedSpecialization && selectedSpecialization !== "all") {
        params.append("specialization", selectedSpecialization);
      }
      if (onlyAvailableToday) params.append("availableToday", "true");
      const res = await apiFetch<{ data: DoctorProfileData[] } | DoctorProfileData[]>(
        `/doctors/directory?${params.toString()}`
      );
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  // Fetch unique specializations list for filter chips
  const { data: specializations = [] } = useQuery<string[]>({
    queryKey: ["doctors", "specializations"],
    queryFn: async () => {
      const res = await apiFetch<{ data: string[] } | string[]>("/doctors/specializations");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.data)) return res.data;
      return [];
    },
  });

  const handleOpenBooking = (doctorId?: string) => {
    setBookingDoctorId(doctorId);
    setIsBookingOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedSpecialization("all");
    setOnlyAvailableToday(false);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Link
              href="/patient/appointments"
              className="p-2 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all shrink-0 shadow-2xs"
              title="Back to Appointments"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">
              Verified Psychologist Directory
            </h1>
          </div>
          <p className="text-sm text-muted-foreground pl-0 sm:pl-1">
            Explore licensed clinical psychologists, behavioral therapists, and mental health specialists.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link href="/patient/appointments">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Appointments
            </Button>
          </Link>
          <Button
            type="button"
            onClick={() => handleOpenBooking()}
            className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-sm"
          >
            <Calendar className="w-4 h-4" /> Schedule Any Consultation
          </Button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="space-y-3.5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search by psychologist name, specialization, clinic, or clinical focus..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-card border-border text-sm"
            />
          </div>

          {/* Toggle "On Duty Today" */}
          <button
            type="button"
            onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
            className={cn(
              "h-10 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0",
              onlyAvailableToday
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                onlyAvailableToday ? "bg-primary-foreground animate-pulse" : "bg-emerald-500"
              )}
            />
            On Duty Today Only
          </button>
        </div>

        {/* Specialization Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setSelectedSpecialization("all")}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0",
              selectedSpecialization === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
          >
            All Psychologists
          </button>
          {Array.isArray(specializations) && specializations.map((spec) => (
            <button
              type="button"
              key={spec}
              onClick={() => setSelectedSpecialization(spec)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap shrink-0",
                selectedSpecialization === spec
                  ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/40"
              )}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loadingDoctors ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl border border-border bg-card shadow-xs space-y-4 animate-pulse min-h-[220px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-muted/60" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted/60 rounded w-1/2" />
                  <div className="h-3 bg-muted/60 rounded w-1/3" />
                </div>
              </div>
              <div className="h-10 bg-muted/40 rounded-xl" />
              <div className="h-8 bg-muted/40 rounded-xl" />
            </div>
          ))}
        </div>
      ) : !Array.isArray(doctors) || doctors.length === 0 ? (
        <div className="p-10 rounded-2xl border border-border bg-card text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">No psychologists found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            We couldn&apos;t find any verified psychologists matching your current search criteria. Try modifying your search or clearing filters.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="text-xs mt-2"
          >
            Reset All Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {Array.isArray(doctors) && doctors.map((doctor) => {
            const initials = doctor.name
              .replace(/^Dr\.\s*/i, "")
              .trim()
              .slice(0, 2)
              .toUpperCase() || "DR";

            const topDegree = doctor.qualifications[0]?.degree;

            return (
              <div
                key={doctor.profileId}
                className="p-5 rounded-2xl border border-border bg-card shadow-xs flex flex-col justify-between gap-4 transition-all duration-150 hover:border-primary/40 hover:shadow-sm"
              >
                {/* Doctor Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
                          {initials}
                        </div>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                            doctor.isAvailableToday ? "bg-emerald-500" : "bg-amber-500"
                          )}
                          title={doctor.isAvailableToday ? "On duty today" : `Off today (${doctor.offDay})`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-base font-bold text-foreground truncate">
                            {doctor.name}
                          </h3>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-primary truncate mt-0.5">
                          {doctor.specialization}
                        </p>
                        {doctor.hospitalAffiliation && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{doctor.hospitalAffiliation}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 shrink-0 text-xs font-bold text-foreground">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{doctor.averageRating}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        ({doctor.reviewCount})
                      </span>
                    </div>
                  </div>

                  {/* Bio Preview */}
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {doctor.bio}
                  </p>

                  {/* Key Highlights Strip */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                    <div className="px-2.5 py-1 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>{doctor.dutyStartTime} – {doctor.dutyEndTime}</span>
                    </div>

                    <div className="px-2.5 py-1 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground font-medium">
                      Off: <span className="text-foreground font-semibold">{doctor.offDay}</span>
                    </div>

                    {topDegree && (
                      <div className="px-2.5 py-1 rounded-xl bg-muted/40 border border-border/50 text-muted-foreground flex items-center gap-1.5 font-medium truncate max-w-[200px]">
                        <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{topDegree}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProfileDoctor(doctor)}
                    className="text-xs text-muted-foreground hover:text-foreground font-medium gap-1"
                  >
                    View Psychologist Profile <ChevronRight className="w-3.5 h-3.5" />
                  </Button>

                  <div className="flex items-center gap-2">
                    <Link href={`/patient/messages?doctorId=${doctor.doctorId}`}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs gap-1.5 shadow-2xs h-8"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Chat
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleOpenBooking(doctor.doctorId)}
                      className="text-xs bg-primary text-primary-foreground font-semibold gap-1.5 shadow-2xs h-8"
                    >
                      <Stethoscope className="w-3.5 h-3.5" /> Book Consultation
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Clinical Profile Dialog Modal */}
      <DoctorProfileDialog
        isOpen={!!selectedProfileDoctor}
        onClose={() => setSelectedProfileDoctor(null)}
        doctor={selectedProfileDoctor}
        onBookAppointment={(doctorId) => handleOpenBooking(doctorId)}
      />

      {/* Real-time Slot Availability Booking Dialog */}
      <DoctorSlotBookingDialog
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setBookingDoctorId(undefined);
        }}
        preSelectedDoctorId={bookingDoctorId}
      />
    </div>
  );
}
