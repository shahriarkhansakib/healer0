"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { format, addDays, isSameDay } from "date-fns";
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
  CalendarOff,
  AlertCircle,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export interface RescheduleAppointmentTarget {
  id: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  doctorSpecialization?: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical';
  rescheduleCount?: number;
  sessionDurationMinutes?: number;
}

interface RescheduleAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: RescheduleAppointmentTarget | null;
  onSuccess?: () => void;
}

function formatTimeDisplay(timeStr: string) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return timeStr;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function calculateEndTime(timeStr: string, durationMinutes: number) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const d = new Date();
  d.setHours(h, m + durationMinutes, 0, 0);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function buildIsoDateTime(date: Date, timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const target = new Date(date);
  target.setHours(h, m, 0, 0);
  return target.toISOString();
}

export function RescheduleAppointmentDialog({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}: RescheduleAppointmentDialogProps) {
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date>(() => addDays(new Date(), 1));
  const [timeMode, setTimeMode] = useState<'preset' | 'custom'>('preset');
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customTime, setCustomTime] = useState<string>('10:00');
  const [consultationType, setConsultationType] = useState<'Chat' | 'Video' | 'Physical'>('Video');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');

  useEffect(() => {
    if (appointment) {
      setConsultationType(appointment.consultationType || 'Video');
      setSelectedSlot(null);
      setRescheduleReason('');
      setSelectedDate(addDays(new Date(), 1));
      setTimeMode('preset');
      setCustomTime('10:00');
    }
  }, [appointment, isOpen]);

  const dateDays = useMemo(() => {
    const list: Date[] = [];
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      list.push(addDays(today, i));
    }
    return list;
  }, []);

  const formattedDateParam = format(selectedDate, 'yyyy-MM-dd');
  const duration = appointment?.sessionDurationMinutes || 45;

  const { data: availability, isLoading: isLoadingSlots } = useQuery<DoctorAvailabilityResult>({
    queryKey: ['doctor-available-slots', appointment?.doctorId, formattedDateParam],
    queryFn: () =>
      apiFetch<DoctorAvailabilityResult>(
        `/appointments/available-slots?doctorId=${appointment?.doctorId}&date=${formattedDateParam}`
      ),
    enabled: isOpen && !!appointment?.doctorId && !!formattedDateParam,
  });

  // Validate custom time against doctor duty hours and past dates
  const customTimeValidation = useMemo(() => {
    if (timeMode !== 'custom' || !customTime) return { valid: true };

    const targetIso = buildIsoDateTime(selectedDate, customTime);
    const targetDate = new Date(targetIso);

    if (targetDate.getTime() <= Date.now()) {
      return {
        valid: false,
        message: "Selected time is in the past. Please choose a future time.",
      };
    }

    if (availability?.isOffDay) {
      return {
        valid: false,
        message: `Psychologist is off duty on ${availability.offDayName}. Please pick another date.`,
      };
    }

    if (availability) {
      const [startH, startM] = (availability.dutyStartTime || '08:00').split(':').map(Number);
      const [endH, endM] = (availability.dutyEndTime || '17:00').split(':').map(Number);
      const [h, m] = customTime.split(':').map(Number);
      const totalStart = h * 60 + m;
      const totalEnd = totalStart + duration;

      if (totalStart < startH * 60 + startM || totalEnd > endH * 60 + endM) {
        return {
          valid: false,
          message: `Time must fall within psychologist duty hours (${availability.dutyStartTime} - ${availability.dutyEndTime}).`,
        };
      }
    }

    return { valid: true };
  }, [timeMode, customTime, selectedDate, availability, duration]);

  const rescheduleMutation = useMutation({
    mutationFn: (payload: { newDate: string; consultationType: 'Chat' | 'Video' | 'Physical'; reason?: string }) =>
      apiFetch(`/appointments/${appointment?.id}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Appointment successfully rescheduled!");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      onSuccess?.();
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reschedule appointment.");
    },
  });

  const handleConfirmReschedule = () => {
    let targetIso: string;

    if (timeMode === 'preset') {
      if (!selectedSlot) {
        toast.error("Please select a time slot.");
        return;
      }
      targetIso = selectedSlot.isoDateTime;
    } else {
      if (!customTime) {
        toast.error("Please set a custom time.");
        return;
      }
      if (!customTimeValidation.valid) {
        toast.error(customTimeValidation.message || "Please choose a valid time.");
        return;
      }
      targetIso = buildIsoDateTime(selectedDate, customTime);
    }

    rescheduleMutation.mutate({
      newDate: targetIso,
      consultationType,
      reason: rescheduleReason.trim() || undefined,
    });
  };

  if (!appointment) return null;

  const currentCount = appointment.rescheduleCount ?? 0;
  const remainingReschedules = Math.max(0, 2 - currentCount);

  // Context-aware subtitle
  const isDoctorView = appointment.doctorName?.includes('You') || (!appointment.doctorName && appointment.patientName);
  const subtitle = isDoctorView
    ? `Reschedule consultation with patient ${appointment.patientName || 'Patient'}.`
    : `Select a new verified date and time slot with ${appointment.doctorName || 'your psychologist'}.`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onOpenAutoFocus={(e) => {
          // Prevent Radix autofocus from jumping to jump-to-date input and causing scroll shift
          e.preventDefault();
        }}
        className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-6 sm:p-7 bg-background text-foreground border border-border shadow-2xl rounded-2xl"
      >
        <DialogHeader className="space-y-1 text-left pb-3 border-b border-border/60 min-w-0 w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                Reschedule Consultation
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                {subtitle}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Reschedule Limit Notice */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-900 dark:text-amber-200 min-w-0 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">
              Policy: Appointments can be rescheduled up to <strong>2 times</strong>.
            </span>
          </div>
          <span className="font-bold text-[11px] bg-amber-500/20 text-amber-900 dark:text-amber-200 px-2.5 py-0.5 rounded-full shrink-0">
            {remainingReschedules} remaining
          </span>
        </div>

        {/* Current Scheduled Info */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 w-full">
          <div className="space-y-0.5 min-w-0">
            <span className="text-muted-foreground font-medium text-[11px]">Current Appointment:</span>
            <p className="font-semibold text-foreground flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
              {new Date(appointment.appointmentDate).toLocaleString([], {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-muted-foreground bg-muted/80 border border-border/80 px-2.5 py-1 rounded-md">
              {duration} mins duration
            </span>
            <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
              {appointment.consultationType}
            </span>
          </div>
        </div>

        {/* Step 1: Select Date */}
        <div className="space-y-2.5 min-w-0 w-full max-w-full">
          <div className="flex items-center justify-between min-w-0 w-full">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
              <CalendarIcon className="w-3.5 h-3.5 text-primary" />
              1. Select New Date
            </label>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] text-muted-foreground hidden sm:inline">Jump to date:</span>
              <input
                type="date"
                min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
                value={formattedDateParam}
                onChange={(e) => {
                  if (e.target.value) {
                    const picked = new Date(e.target.value + 'T00:00:00');
                    setSelectedDate(picked);
                    setSelectedSlot(null);
                  }
                }}
                className="text-xs bg-background border border-border rounded-lg px-2.5 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin min-w-0 w-full max-w-full">
            {dateDays.map((d) => {
              const isSelected = isSameDay(d, selectedDate);
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d);
                    setSelectedSlot(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center min-w-[72px] py-2.5 px-2 rounded-xl border text-xs transition-all shrink-0 cursor-pointer",
                    isSelected
                      ? "bg-teal-600 text-white border-teal-600 font-bold shadow-xs ring-2 ring-teal-500/20"
                      : "bg-card border-border text-foreground hover:border-teal-500/60 hover:bg-teal-500/5"
                  )}
                >
                  <span className="text-[10px] font-medium opacity-80 uppercase">
                    {format(d, 'EEE')}
                  </span>
                  <span className="text-base font-extrabold">{format(d, 'd')}</span>
                  <span className="text-[9px] opacity-70">{format(d, 'MMM')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Time Settings (Preset Slots vs Custom Time) */}
        <div className="space-y-3 pt-1 min-w-0 w-full max-w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-border/50 min-w-0 w-full">
            <div className="flex items-center gap-2 min-w-0">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 shrink-0">
                <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                2. Time Settings for {format(selectedDate, 'MMM d, yyyy')}
              </label>
              {availability && (
                <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">
                  (Duty: {availability.dutyStartTime} – {availability.dutyEndTime})
                </span>
              )}
            </div>

            {/* Time Mode Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-muted/80 border border-border shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setTimeMode('preset')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  timeMode === 'preset'
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Clock className="w-3 h-3" />
                Preset Slots
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('custom')}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                  timeMode === 'custom'
                    ? "bg-background text-foreground shadow-2xs font-bold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <SlidersHorizontal className="w-3 h-3" />
                Custom Time
              </button>
            </div>
          </div>

          {/* Mode A: Preset Duty Slots */}
          {timeMode === 'preset' ? (
            <div className="min-w-0 w-full">
              {isLoadingSlots ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-10 rounded-xl bg-muted/60 animate-pulse" />
                  ))}
                </div>
              ) : availability?.isOffDay ? (
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-border text-center space-y-1.5 text-xs text-muted-foreground">
                  <CalendarOff className="w-7 h-7 mx-auto text-muted-foreground/60" />
                  <p className="font-bold text-foreground">Psychologist Off Duty</p>
                  <p>The psychologist is not seeing patients on this day ({availability.offDayName}). Please select another date.</p>
                </div>
              ) : (availability?.slots.length || 0) === 0 ? (
                <div className="p-6 rounded-xl bg-muted/30 border border-dashed border-border text-center text-xs text-muted-foreground">
                  No slots configured for this date. Switch to "Custom Time" above to set a specific time.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-thin min-w-0 w-full">
                  {availability?.slots.map((slot) => {
                    const isSelected = selectedSlot?.time === slot.time;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.isAvailable}
                        onClick={() => setSelectedSlot(slot)}
                        className={cn(
                          "py-2.5 px-3 rounded-xl border text-xs font-medium transition-all text-center flex flex-col items-center justify-center relative cursor-pointer min-w-0",
                          isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-xs font-bold ring-2 ring-teal-500/20"
                            : slot.isAvailable
                            ? "bg-card border-border text-foreground hover:border-teal-500/60 hover:bg-teal-500/10"
                            : "bg-muted/30 border-border/40 text-muted-foreground/40 cursor-not-allowed opacity-50"
                        )}
                      >
                        <span className="font-semibold">{slot.formattedTime}</span>
                        {!slot.isAvailable && slot.reason && (
                          <span className="text-[9px] mt-0.5 opacity-80 truncate w-full">{slot.reason}</span>
                        )}
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 absolute top-1 right-1 text-white" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Mode B: Custom Time Setting */
            <div className="space-y-3.5 p-4 rounded-xl border border-border bg-muted/20 min-w-0 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0 w-full">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    Exact Custom Start Time
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Set any customized meeting start time. Consultation will run for {duration} mins.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="h-10 px-3 py-1.5 rounded-xl border border-border bg-background text-foreground font-bold text-sm tracking-wider shadow-2xs focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick shortcut chips */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-border/40 min-w-0 w-full">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mr-1 shrink-0">
                  Quick Select:
                </span>
                {['09:00', '10:30', '11:45', '14:00', '15:15', '16:30'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCustomTime(preset)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                      customTime === preset
                        ? "bg-teal-600 text-white border-teal-600 font-bold shadow-2xs"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    )}
                  >
                    {formatTimeDisplay(preset)}
                  </button>
                ))}
              </div>

              {/* Live Feedback & Calculation */}
              {customTime && (
                <div
                  className={cn(
                    "p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0 w-full",
                    customTimeValidation.valid
                      ? "bg-teal-500/10 border-teal-500/30 text-teal-900 dark:text-teal-200"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {customTimeValidation.valid ? (
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    )}
                    <span className="font-semibold truncate">
                      {customTimeValidation.valid
                        ? `Custom Schedule: ${format(selectedDate, 'MMM d, yyyy')} at ${formatTimeDisplay(customTime)} (ends at ${calculateEndTime(customTime, duration)})`
                        : customTimeValidation.message}
                    </span>
                  </div>
                  <span className="text-[11px] opacity-80 shrink-0">
                    {duration} mins duration
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 3: Consultation Type */}
        <div className="space-y-2.5 pt-1 min-w-0 w-full">
          <label className="text-xs font-bold text-foreground">
            3. Consultation Format
          </label>
          <div className="grid grid-cols-3 gap-2 min-w-0 w-full">
            {[
              { type: 'Video' as const, label: 'Video Call', icon: Video },
              { type: 'Physical' as const, label: 'In-Person', icon: MapPin },
              { type: 'Chat' as const, label: 'Secure Chat', icon: MessageSquare },
            ].map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setConsultationType(type)}
                className={cn(
                  "p-3 rounded-xl border text-xs flex items-center justify-center gap-2 transition-all font-semibold cursor-pointer min-w-0",
                  consultationType === type
                    ? "bg-teal-600 text-white border-teal-600 shadow-2xs font-bold"
                    : "bg-card border-border text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Optional Reschedule Note */}
        <div className="space-y-1.5 pt-1 min-w-0 w-full">
          <label className="text-xs font-bold text-foreground">
            4. Reason for Rescheduling (Optional)
          </label>
          <Input
            value={rescheduleReason}
            onChange={(e) => setRescheduleReason(e.target.value)}
            placeholder="e.g. Schedule conflict, feeling unwell, clinic room change..."
            className="text-xs bg-background text-foreground border-border w-full"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border/60 min-w-0 w-full">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmReschedule}
            disabled={
              (timeMode === 'preset' && !selectedSlot) ||
              (timeMode === 'custom' && (!customTime || !customTimeValidation.valid)) ||
              rescheduleMutation.isPending
            }
            className="text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-xs"
          >
            {rescheduleMutation.isPending ? "Confirming..." : "Confirm New Schedule"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
