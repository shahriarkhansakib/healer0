"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  MessageSquare,
  MapPin,
  Check,
  Stethoscope,
  CalendarOff,
  UserCheck,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DoctorInfo {
  doctorId: string;
  profileId: string;
  name: string;
  email: string;
  image: string | null;
  specialization: string | null;
  hospitalAffiliation: string | null;
  dutyStartTime?: string;
  dutyEndTime?: string;
  offDay?: string;
  bio?: string;
}

export interface TimeSlot {
  time: string;
  formattedTime: string;
  isoDateTime: string;
  durationMinutes: number;
  isAvailable: boolean;
  reason?: 'Past time' | 'Already booked' | 'Doctor off duty';
}

export interface DoctorAvailabilityResult {
  doctorId: string;
  profileId: string;
  doctorName: string;
  specialization: string | null;
  hospitalAffiliation: string | null;
  date: string;
  dayOfWeek: string;
  isOffDay: boolean;
  offDayName: string;
  dutyStartTime: string;
  dutyEndTime: string;
  slots: TimeSlot[];
}

interface DoctorSlotBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedDoctorId?: string;
  onSuccess?: () => void;
}

const QUICK_REASONS = [
  "Medication Review",
  "Anxiety & Stress Check-in",
  "Sleep & Insomnia Consultation",
  "Treatment Follow-up",
];

export function DoctorSlotBookingDialog({
  isOpen,
  onClose,
  preSelectedDoctorId,
  onSuccess,
}: DoctorSlotBookingDialogProps) {
  const queryClient = useQueryClient();

  // Fetch verified doctors list
  const { data: doctors, isLoading: loadingDoctors } = useQuery<DoctorInfo[]>({
    queryKey: ['appointments', 'doctors'],
    queryFn: () => apiFetch<DoctorInfo[]>('/appointments/doctors'),
    enabled: isOpen,
  });

  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [consultationType, setConsultationType] = useState<'Video' | 'Chat' | 'Physical'>('Video');
  const [consultationReason, setConsultationReason] = useState<string>('');
  const [showPastSlots, setShowPastSlots] = useState<boolean>(false);

  // Synchronize preSelectedDoctorId or pick first doctor
  useEffect(() => {
    if (preSelectedDoctorId) {
      setSelectedDoctorId(preSelectedDoctorId);
    } else if (doctors && doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].doctorId);
    }
  }, [preSelectedDoctorId, doctors, selectedDoctorId]);

  // Reset selected slot when doctor or date changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDoctorId, selectedDate]);

  // Resolve currently selected doctor object
  const currentDoctor = useMemo(() => {
    return doctors?.find((d) => d.doctorId === selectedDoctorId || d.profileId === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Generate 14-day date range starting from today
  const availableDates = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }).map((_, index) => addDays(today, index));
  }, []);

  const selectedDateStr = useMemo(() => {
    return format(selectedDate, 'yyyy-MM-dd');
  }, [selectedDate]);

  const isToday = useMemo(() => {
    return isSameDay(selectedDate, new Date());
  }, [selectedDate]);

  // Fetch real-time available slots for selected doctor + date
  const { data: availability, isLoading: loadingSlots } = useQuery<DoctorAvailabilityResult>({
    queryKey: ['appointments', 'slots', selectedDoctorId, selectedDateStr],
    queryFn: () =>
      apiFetch<DoctorAvailabilityResult>(
        `/appointments/available-slots?doctorId=${selectedDoctorId}&date=${selectedDateStr}`
      ),
    enabled: isOpen && !!selectedDoctorId && !!selectedDateStr,
  });

  // Filter slots: separate bookable upcoming slots vs passed slots
  const { upcomingMorningSlots, upcomingAfternoonSlots, pastSlotsCount } = useMemo(() => {
    if (!availability?.slots) return { upcomingMorningSlots: [], upcomingAfternoonSlots: [], pastSlotsCount: 0 };
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    let past = 0;

    availability.slots.forEach((s) => {
      if (s.reason === 'Past time') {
        past++;
        if (!showPastSlots) return; // Hide past slots by default to prevent clutter
      }

      const hour = parseInt(s.time.split(':')[0], 10);
      if (hour < 12) {
        morning.push(s);
      } else {
        afternoon.push(s);
      }
    });

    return {
      upcomingMorningSlots: morning,
      upcomingAfternoonSlots: afternoon,
      pastSlotsCount: past,
    };
  }, [availability?.slots, showPastSlots]);

  const totalOpenSlots = useMemo(() => {
    return availability?.slots.filter((s) => s.isAvailable).length || 0;
  }, [availability?.slots]);

  // Mutation: Create appointment with open slot
  const bookMutation = useMutation({
    mutationFn: (payload: {
      doctorId: string;
      appointmentDate: string;
      consultationType: 'Video' | 'Chat' | 'Physical';
      consultationReason?: string;
      sessionDurationMinutes: number;
    }) =>
      apiFetch('/appointments', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success(
        `Consultation booked with ${currentDoctor?.name || 'your psychologist'} on ${format(selectedDate, 'MMM d')} at ${selectedSlot?.formattedTime}.`
      );
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', 'slots'] });
      onSuccess?.();
      onClose();
      // Reset form
      setSelectedSlot(null);
      setConsultationReason('');
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to schedule appointment. Please try another slot.");
      queryClient.invalidateQueries({ queryKey: ['appointments', 'slots'] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoctorId) {
      toast.error("Please select a medical clinician.");
      return;
    }
    if (!selectedSlot) {
      toast.error("Please select an available consultation time slot.");
      return;
    }

    bookMutation.mutate({
      doctorId: selectedDoctorId,
      appointmentDate: selectedSlot.isoDateTime,
      consultationType,
      consultationReason: consultationReason.trim() || undefined,
      sessionDurationMinutes: selectedSlot.durationMinutes || 45,
    });
  };

  const handleSelectTomorrow = () => {
    setSelectedDate(addDays(startOfDay(new Date()), 1));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-5 sm:p-7 space-y-6">
        {/* Header */}
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                Schedule Psychologist Consultation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                Select psychologist, date, and reserve your real-time consultation slot.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 w-full min-w-0">
          {/* 1. Specialist Selector & Active Doctor Profile Card */}
          <div className="space-y-2.5 w-full min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                1. Attending Psychologist
              </label>
              {doctors && doctors.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="h-8 pl-2.5 pr-7 rounded-lg border border-border bg-card text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                  >
                    {doctors.map((d) => (
                      <option key={d.doctorId} value={d.doctorId}>
                        Switch: {d.name} ({d.specialization || 'Clinical Specialist'})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Active Doctor Showcase Card */}
            {loadingDoctors ? (
              <div className="h-20 bg-muted/40 rounded-2xl animate-pulse w-full" />
            ) : currentDoctor ? (
              <div className="p-4 rounded-2xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-base shrink-0 shadow-inner">
                    {currentDoctor.name.replace('Dr. ', '')[0] || 'D'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-sm text-foreground truncate">{currentDoctor.name}</h4>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 shrink-0">
                        <ShieldCheck className="w-3 h-3" /> Verified Clinician
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {currentDoctor.specialization || 'Specialist'} {currentDoctor.hospitalAffiliation ? `• ${currentDoctor.hospitalAffiliation}` : ''}
                    </p>
                  </div>
                </div>

                {/* Duty Hours & Off-Day Badges */}
                <div className="flex items-center gap-2 text-xs shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground text-[11px] flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{currentDoctor.dutyStartTime || '08:00'} – {currentDoctor.dutyEndTime || '17:00'}</span>
                  </div>
                  <div className="px-2.5 py-1 rounded-xl bg-muted/60 border border-border/60 text-muted-foreground text-[11px] font-medium">
                    Off: <span className="text-foreground font-semibold">{currentDoctor.offDay || 'Sunday'}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* 2. Date Selection (14-Day Calendar Chips) */}
          <div className="space-y-2.5 w-full min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                2. Select Date
              </label>
              <span className="text-xs text-foreground font-semibold flex items-center gap-1.5">
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                {format(selectedDate, 'EEEE, MMM d, yyyy')}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin w-full min-w-0">
              {availableDates.map((date) => {
                const isSelected = isSameDay(date, selectedDate);
                const dayName = format(date, 'EEE');
                const dayNumber = format(date, 'd');
                const monthName = format(date, 'MMM');
                const fullDayName = format(date, 'EEEE');
                const isDoctorOff = currentDoctor?.offDay?.toLowerCase().includes(fullDayName.toLowerCase());

                return (
                  <button
                    type="button"
                    key={date.toISOString()}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                      "min-w-[62px] py-2 px-1.5 rounded-2xl border flex flex-col items-center justify-center transition-all duration-150 shrink-0 text-xs",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold ring-2 ring-primary/30"
                        : isDoctorOff
                        ? "bg-muted/20 border-border/40 text-muted-foreground/60 hover:bg-muted/40"
                        : "bg-card border-border text-foreground hover:bg-muted/60"
                    )}
                  >
                    <span className={cn("text-[10px] uppercase font-bold", isSelected ? "text-primary-foreground/90" : "text-muted-foreground")}>
                      {dayName}
                    </span>
                    <span className="text-sm font-bold tracking-tight my-0.5">
                      {dayNumber}
                    </span>
                    <span className={cn("text-[9px]", isSelected ? "text-primary-foreground/80" : "text-muted-foreground/70")}>
                      {isDoctorOff ? (
                        <span className="text-muted-foreground font-semibold">Off</span>
                      ) : (
                        monthName
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Real-Time Slot Availability Grid */}
          <div className="space-y-3 w-full min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                3. Consultation Slots
              </label>
              {availability && !availability.isOffDay && (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
                    <Sparkles className="w-3 h-3" /> {totalOpenSlots} open slots
                  </span>
                  {pastSlotsCount > 0 && isToday && (
                    <button
                      type="button"
                      onClick={() => setShowPastSlots(!showPastSlots)}
                      className="text-[10px] text-muted-foreground underline hover:text-foreground transition-colors ml-1"
                    >
                      {showPastSlots ? 'Hide passed' : `+${pastSlotsCount} earlier`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {loadingSlots ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : availability?.isOffDay ? (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border text-foreground flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CalendarOff className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="text-xs">
                    <p className="font-semibold">{currentDoctor?.name || 'Psychologist'} is off duty on {availability.dayOfWeek}s.</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Please select another date above to view available time slots.
                    </p>
                  </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={handleSelectTomorrow} className="text-xs shrink-0">
                  View Tomorrow
                </Button>
              </div>
            ) : totalOpenSlots === 0 && !showPastSlots ? (
              <div className="p-5 text-center border border-border rounded-2xl bg-card space-y-2">
                <p className="font-semibold text-xs text-foreground">
                  {isToday ? "All consultation slots for today have passed or booked." : "No slots available on this date."}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Select an alternate date from the calendar or view tomorrow's openings.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button type="button" size="sm" variant="outline" onClick={handleSelectTomorrow} className="text-xs">
                    Jump to Tomorrow
                  </Button>
                  {pastSlotsCount > 0 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => setShowPastSlots(true)} className="text-xs text-muted-foreground">
                      Show {pastSlotsCount} Concluded Slots
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4 w-full min-w-0">
                {/* Morning Slots */}
                {upcomingMorningSlots.length > 0 && (
                  <div className="space-y-1.5 w-full min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Morning Sessions (Before 12:00 PM)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
                      {upcomingMorningSlots.map((slot) => {
                        const isSelected = selectedSlot?.time === slot.time;
                        return (
                          <button
                            type="button"
                            key={slot.time}
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-150 min-w-0",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                                : slot.isAvailable
                                ? "bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
                                : "bg-muted/30 border-border/40 text-muted-foreground/50 cursor-not-allowed opacity-60"
                            )}
                          >
                            <span className="truncate">{slot.formattedTime}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-primary-foreground shrink-0 ml-1" />
                            ) : !slot.isAvailable ? (
                              <span className="text-[9px] font-normal text-muted-foreground/70 shrink-0 ml-1">
                                {slot.reason === 'Already booked' ? 'Booked' : 'Passed'}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Afternoon Slots */}
                {upcomingAfternoonSlots.length > 0 && (
                  <div className="space-y-1.5 w-full min-w-0">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Afternoon Sessions (12:00 PM Onwards)
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full min-w-0">
                      {upcomingAfternoonSlots.map((slot) => {
                        const isSelected = selectedSlot?.time === slot.time;
                        return (
                          <button
                            type="button"
                            key={slot.time}
                            disabled={!slot.isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={cn(
                              "h-10 px-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-150 min-w-0",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30"
                                : slot.isAvailable
                                ? "bg-card border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
                                : "bg-muted/30 border-border/40 text-muted-foreground/50 cursor-not-allowed opacity-60"
                            )}
                          >
                            <span className="truncate">{slot.formattedTime}</span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-primary-foreground shrink-0 ml-1" />
                            ) : !slot.isAvailable ? (
                              <span className="text-[9px] font-normal text-muted-foreground/70 shrink-0 ml-1">
                                {slot.reason === 'Already booked' ? 'Booked' : 'Passed'}
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Consultation Mode Selector */}
          <div className="space-y-2 w-full min-w-0">
            <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
              4. Consultation Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full min-w-0">
              {[
                { type: 'Video', label: 'Telehealth Video', icon: Video, desc: 'Encrypted HD Video Session' },
                { type: 'Chat', label: 'Encrypted Chat', icon: MessageSquare, desc: 'Private Text Consultation' },
                { type: 'Physical', label: 'Clinic Visit', icon: MapPin, desc: 'In-person meeting' },
              ].map(({ type, label, icon: Icon, desc }) => {
                const isSelected = consultationType === type;
                return (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setConsultationType(type as any)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all duration-150 w-full min-w-0",
                      isSelected
                        ? "bg-primary/10 border-primary ring-1 ring-primary/40 shadow-2xs"
                        : "bg-card border-border hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={cn("p-1.5 rounded-lg shrink-0", isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-semibold text-xs text-foreground truncate">{label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Clinical Reason & Quick Topic Chips */}
          <div className="space-y-2 w-full min-w-0">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">
                5. Reason for Visit (Optional)
              </label>
              <span className="text-[10px] text-muted-foreground">Click a topic or type custom notes</span>
            </div>

            {/* Quick Topic Chips */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_REASONS.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setConsultationReason(r)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] border transition-colors",
                    consultationReason === r
                      ? "bg-primary text-primary-foreground border-primary font-semibold"
                      : "bg-muted/40 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>

            <Input
              value={consultationReason}
              onChange={(e) => setConsultationReason(e.target.value)}
              placeholder="E.g., Review medication dosage, anxiety check-in, insomnia disturbance..."
              className="text-xs h-9 bg-card border-border"
            />
          </div>

          {/* Live Booking Summary Card */}
          {selectedSlot && currentDoctor && (
            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs w-full min-w-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-foreground block truncate">
                    {currentDoctor.name}
                  </span>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {format(selectedDate, 'EEEE, MMM d')} at {selectedSlot.formattedTime} • {consultationType} ({selectedSlot.durationMinutes} mins)
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wider shrink-0 self-start sm:self-auto shadow-2xs">
                Slot Ready
              </span>
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t w-full">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={bookMutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedSlot || bookMutation.isPending}
              className="gap-1.5 shadow-xs"
            >
              {bookMutation.isPending ? 'Reserving...' : 'Confirm Consultation Booking'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
