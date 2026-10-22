"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Calendar, Clock, Video, MessageSquare, MapPin, Plus, XCircle, CheckCircle, 
  UserCheck, Star, Pill, FileText, Printer, Search, ShieldCheck, Stethoscope, 
  AlertCircle, ChevronRight, RefreshCw
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";
import { DoctorReviewDialog, PendingReview } from "@/components/features/reviews/doctor-review-dialog";
import { DoctorSlotBookingDialog } from "@/components/features/appointments/doctor-slot-booking-dialog";
import { RescheduleAppointmentDialog } from "@/components/features/appointments/reschedule-appointment-dialog";
import { cn } from "@/lib/utils";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  patientName?: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical';
  consultationReason: string | null;
  sessionDurationMinutes: number;
  status?: string;
  appointmentStatus: 'Pending' | 'Scheduled' | 'InProgress' | 'Completed' | 'Cancelled' | 'Declined';
  doctorNotes: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  rescheduleCount?: number;
  declineReason?: string | null;
  isReviewed?: boolean;
  reviewRating?: number | null;
  reviewComment?: string | null;
}

interface DoctorSummary {
  id: string;
  doctorId: string;
  doctorName: string;
  totalVisits: number;
  totalConsultationMinutes: number;
  lastVisitDate: string | null;
}

interface DoctorInfo {
  id: string;
  userId: string;
  name: string;
  specialization: string | null;
  hospitalAffiliation: string | null;
}

interface MedicationItem {
  medicationName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PatientPrescription {
  id: string;
  appointmentId: string | null;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string | null;
  doctorHospital: string | null;
  doctorImage: string | null;
  patientId: string;
  patientName: string;
  title: string;
  medications: MedicationItem[];
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AppointmentsAndPrescriptionsPage() {
  const queryClient = useQueryClient();

  // Tab State: 1. Appointments | 2. Prescriptions
  const [activeTab, setActiveTab] = useState<'appointments' | 'prescriptions'>('appointments');

  // Booking & Review states
  const [showBooking, setShowBooking] = useState(false);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>(undefined);
  const [selectedApptForReview, setSelectedApptForReview] = useState<PendingReview | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  // Periodic timer so countdowns and real-time transitions stay fresh
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Prescription Search Filter
  const [rxSearch, setRxSearch] = useState('');

  const handleOpenReview = (appt: Appointment) => {
    setSelectedApptForReview({
      id: appt.id,
      appointmentId: appt.id,
      doctorId: appt.doctorId,
      doctorName: appt.doctorName || 'Doctor',
      doctorSpecialization: null,
      consultationType: appt.consultationType,
      appointmentDate: appt.appointmentDate,
      sessionDurationMinutes: appt.sessionDurationMinutes,
    });
    setIsReviewOpen(true);
  };

  // Fetch verified doctors list
  const { data: doctors } = useQuery<DoctorInfo[]>({
    queryKey: ['appointments', 'doctors'],
    queryFn: () => apiFetch<DoctorInfo[]>('/appointments/doctors'),
  });

  // Fetch all user appointments with live auto-refresh
  const { data: appointmentsData, isLoading: loadingAppts } = useQuery<Appointment[] | { data: Appointment[] }>({
    queryKey: ['appointments', 'my-list'],
    queryFn: () => apiFetch<Appointment[]>('/appointments?role=patient'),
    refetchInterval: 15000,
  });

  const appointments: Appointment[] = useMemo(() => {
    if (!appointmentsData) return [];
    if (Array.isArray(appointmentsData)) return appointmentsData;
    return (appointmentsData as any).data || [];
  }, [appointmentsData]);

  // Derive completed appointments (for visit counts & duration totals)
  const completedAppointments = useMemo(() => {
    return appointments.filter((a) => {
      const s = (a.status || '').toLowerCase();
      const as = (a.appointmentStatus || '').toLowerCase();
      return s === 'completed' || as === 'completed';
    });
  }, [appointments]);

  // Derive finished & cancelled appointments (completed, canceled, declined), sorted new to older
  const finishedAndCancelledAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const s = (a.status || '').toLowerCase();
        const as = (a.appointmentStatus || '').toLowerCase();
        const isCompleted = s === 'completed' || as === 'completed';
        const isCanceled = s === 'canceled' || as === 'cancelled';
        const isDeclined = s === 'declined' || as === 'declined';
        return isCompleted || isCanceled || isDeclined;
      })
      .sort((a, b) => {
        const createdA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const createdB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        if (createdA !== createdB) return createdB - createdA;
        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [appointments]);

  // Derive upcoming scheduled sessions (strictly only pending, scheduled, in-progress), sorted new to older
  const scheduledAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const s = (a.status || '').toLowerCase();
        const as = (a.appointmentStatus || '').toLowerCase();
        const isCompleted = s === 'completed' || as === 'completed';
        const isCanceled = s === 'canceled' || as === 'cancelled';
        const isDeclined = s === 'declined' || as === 'declined';
        return !isCompleted && !isCanceled && !isDeclined;
      })
      .sort((a, b) => {
        const getPriority = (status?: string, apptStatus?: string) => {
          const s = (status || '').toLowerCase();
          const as = (apptStatus || '').toLowerCase();
          if (s === 'in-progress' || as === 'inprogress') return 1;
          if (s === 'scheduled' || as === 'scheduled') return 2;
          return 3;
        };
        const pA = getPriority(a.status, a.appointmentStatus);
        const pB = getPriority(b.status, b.appointmentStatus);
        if (pA !== pB) return pA - pB;

        const createdA = (a as any).createdAt ? new Date((a as any).createdAt).getTime() : 0;
        const createdB = (b as any).createdAt ? new Date((b as any).createdAt).getTime() : 0;
        if (createdA !== createdB) return createdB - createdA;

        const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
        const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
        return dateB - dateA;
      });
  }, [appointments]);

  // Fetch summary by doctor
  const { data: summaries, isLoading: loadingSummaries } = useQuery<DoctorSummary[]>({
    queryKey: ['appointments', 'doctor-summaries'],
    queryFn: async () => {
      try {
        const res = await apiFetch<any>('/appointments/summaries');
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
  });

  const careTeamSummaries = useMemo(() => {
    const list: DoctorSummary[] = summaries && Array.isArray(summaries) ? [...summaries] : [];
    const existingDocIds = new Set(list.map((s) => s.doctorId));

    for (const appt of finishedAndCancelledAppointments) {
      if (!existingDocIds.has(appt.doctorId)) {
        const completedForDoc = completedAppointments.filter((a) => a.doctorId === appt.doctorId);
        list.push({
          id: `summary-${appt.doctorId}`,
          doctorId: appt.doctorId,
          doctorName: appt.doctorName || 'Doctor',
          totalVisits: completedForDoc.length,
          totalConsultationMinutes: completedForDoc
            .reduce((sum, a) => sum + (a.sessionDurationMinutes || 45), 0),
          lastVisitDate: appt.appointmentDate,
        });
        existingDocIds.add(appt.doctorId);
      }
    }

    return list;
  }, [summaries, finishedAndCancelledAppointments, completedAppointments]);

  // Fetch user prescriptions
  const { data: prescriptions, isLoading: loadingPrescriptions } = useQuery<PatientPrescription[]>({
    queryKey: ['appointments', 'prescriptions'],
    queryFn: () => apiFetch<PatientPrescription[]>('/appointments/prescriptions'),
  });

  // Fetch messages conversations for unread count & quick doctor thread linkage
  const { data: conversations } = useQuery<any[]>({
    queryKey: ['messages', 'conversations'],
    queryFn: async () => {
      try {
        const res = await apiFetch<any>('/messages/conversations');
        return Array.isArray(res) ? res : res?.data || [];
      } catch {
        return [];
      }
    },
    staleTime: 10000,
  });

  const totalUnreadMessages = conversations?.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0) || 0;
  const attendingDoctorId = appointments?.find((a) => a.doctorId)?.doctorId;

  // Reschedule state
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<Appointment | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Cancellation modal state
  const [selectedApptForCancel, setSelectedApptForCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  const handleOpenReschedule = (appt: Appointment) => {
    setSelectedApptForReschedule(appt);
    setIsRescheduleOpen(true);
  };

  const handleOpenCancel = (appt: Appointment) => {
    setSelectedApptForCancel(appt);
    setCancelReason('');
    setIsCancelDialogOpen(true);
  };

  // Mutation: Cancel appointment with optional reason
  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      apiFetch<Appointment>(`/appointments/${id}/cancel`, {
        method: 'PATCH',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: () => {
      toast.success('Appointment cancelled successfully.');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsCancelDialogOpen(false);
      setSelectedApptForCancel(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to cancel appointment.');
    },
  });

  const handleConfirmCancel = () => {
    if (!selectedApptForCancel) return;
    cancelMutation.mutate({
      id: selectedApptForCancel.id,
      reason: cancelReason.trim() || undefined,
    });
  };

  const handlePrintPrescription = (rxTitle: string) => {
    toast.info(`Preparing print document for ${rxTitle}...`);
    window.print();
  };

  // Filtered prescriptions list
  const filteredPrescriptions = (prescriptions || []).filter((rx) => {
    if (!rxSearch.trim()) return true;
    const query = rxSearch.toLowerCase();
    const titleMatch = rx.title.toLowerCase().includes(query);
    const doctorMatch = rx.doctorName.toLowerCase().includes(query);
    const medMatch = rx.medications?.some((m) =>
      m.medicationName.toLowerCase().includes(query)
    );
    return titleMatch || doctorMatch || medMatch;
  });

  const scheduledCount = scheduledAppointments.length;
  const prescriptionsCount = prescriptions?.length || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Pending Doctor Review Banner */}
      <PendingReviewBanner />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Appointments & Prescriptions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your clinical consultations, schedule visits, and access digital clinical prescriptions.
          </p>
        </div>

        {activeTab === 'appointments' && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <Link href="/patient/doctors">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-1.5 shadow-2xs text-xs cursor-pointer hover:bg-muted hover:text-foreground transition-colors"
              >
                <UserCheck className="w-4 h-4 text-primary" /> Browse Psychologist Directory
              </Button>
            </Link>
            <Button
              onClick={() => {
                setPreselectedDoctorId(undefined);
                setShowBooking(true);
              }}
              className="flex items-center gap-1.5 shadow-xs text-xs cursor-pointer bg-teal-600 hover:bg-teal-700 text-white transition-colors"
            >
              <Plus className="w-4 h-4" /> Book Consultation
            </Button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/80 w-full sm:w-fit overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial shrink-0 ${
            activeTab === 'appointments'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>Appointments</span>
          {scheduledCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {scheduledCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer flex-1 sm:flex-initial shrink-0 ${
            activeTab === 'prescriptions'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Pill className="w-4 h-4 text-indigo-500" />
          <span>Prescriptions</span>
          {prescriptionsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {prescriptionsCount} Total
            </span>
          )}
        </button>

        <Link
          href={attendingDoctorId ? `/patient/messages?doctorId=${attendingDoctorId}` : '/patient/messages'}
          className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer group"
          title="Direct confidential chat with your psychologist or attending clinician"
        >
          <MessageSquare className="w-4 h-4 text-teal-500 group-hover:scale-110 transition-transform" />
          <span>Chat with Psychologist</span>
          {totalUnreadMessages > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 animate-pulse">
              {totalUnreadMessages} New
            </span>
          )}
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* PART 1: APPOINTMENTS SECTION                                             */}
      {/* ========================================================================= */}
      {activeTab === 'appointments' && (
        <div className="space-y-8 animate-in fade-in-50 duration-200">
          {/* Scheduled & Past Sessions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Your Scheduled Sessions</h2>
              <span className="text-xs text-muted-foreground font-mono">
                {scheduledAppointments.length} Upcoming {scheduledAppointments.length === 1 ? 'Session' : 'Sessions'} Scheduled
              </span>
            </div>

            {loadingAppts ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Loading appointments...
              </Card>
            ) : scheduledAppointments && scheduledAppointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {scheduledAppointments.map((appt) => {
                  const isPending = appt.appointmentStatus === 'Pending' || appt.status === 'pending';
                  const isScheduled = appt.appointmentStatus === 'Scheduled' || appt.status === 'scheduled';
                  const isInProgress = appt.appointmentStatus === 'InProgress' || appt.status === 'in-progress';

                  return (
                    <Card
                      key={appt.id}
                      className={cn(
                        "p-5 flex flex-col justify-between space-y-3.5 transition-all duration-200 relative overflow-hidden bg-card rounded-2xl shadow-2xs",
                        isInProgress
                          ? "border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/20 hover:border-emerald-500/70 hover:shadow-xs"
                          : isPending
                          ? "border-amber-500/30 hover:border-amber-500/50 hover:shadow-xs"
                          : "border-border hover:border-teal-500/40 hover:shadow-xs"
                      )}
                    >
                      {/* Left accent strip for prominent session awareness */}
                      {isInProgress && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 rounded-l-2xl" />
                      )}
                      {isPending && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-l-2xl" />
                      )}
                      {isScheduled && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500/70 rounded-l-2xl" />
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            {appt.consultationType === 'Video' ? <Video className="w-4 h-4" /> :
                             appt.consultationType === 'Chat' ? <MessageSquare className="w-4 h-4" /> :
                             <MapPin className="w-4 h-4" />}
                          </div>
                          <span className="font-semibold text-sm">{appt.consultationType} Consultation</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isPending
                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                            : isInProgress
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5'
                            : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20'
                        }`}>
                          {isPending
                            ? 'Pending Approval'
                            : isInProgress
                            ? (
                              <>
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                Active Session
                              </>
                            )
                            : 'Scheduled'}
                        </span>
                      </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          {new Date(appt.appointmentDate).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                        <span className="text-muted-foreground font-mono">({appt.sessionDurationMinutes} mins)</span>
                        {appt.doctorName && (
                          <span className="text-foreground font-semibold">• {appt.doctorName}</span>
                        )}
                      </div>

                      {appt.consultationReason && (
                        <p className="text-foreground mt-1.5">
                          Reason: <span className="text-muted-foreground">{appt.consultationReason}</span>
                        </p>
                      )}

                      {appt.doctorNotes && (
                        <div className="mt-2.5 p-3 rounded-xl bg-muted/60 border border-border/60 text-xs space-y-1">
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Stethoscope className="w-3.5 h-3.5" /> Psychologist&apos;s Clinical Notes:
                          </span>
                          <p className="text-foreground leading-relaxed">{appt.doctorNotes}</p>
                        </div>
                      )}
                    </div>

                    {/* Status === 'Pending' */}
                    {isPending && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                          Awaiting clinician confirmation
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 hover:border-red-500/40 text-xs h-7 px-2.5 cursor-pointer transition-colors"
                          onClick={() => handleOpenCancel(appt)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Request
                        </Button>
                      </div>
                    )}

                    {/* Status === 'Scheduled' */}
                    {isScheduled && (() => {
                      const apptTime = new Date(appt.appointmentDate).getTime();
                      const isWithinCutoff = (apptTime - now) < 2 * 60 * 60 * 1000;
                      const isMaxRescheduled = (appt.rescheduleCount ?? 0) >= 2;
                      const msUntilStart = apptTime - now;
                      const minsUntilStart = Math.ceil(msUntilStart / 60000);

                      let countdownLabel = '';
                      if (minsUntilStart > 0 && minsUntilStart < 60) {
                        countdownLabel = `Starts in ${minsUntilStart}m`;
                      } else if (minsUntilStart >= 60 && minsUntilStart < 1440) {
                        const hrs = Math.floor(minsUntilStart / 60);
                        const m = minsUntilStart % 60;
                        countdownLabel = m > 0 ? `Starts in ${hrs}h ${m}m` : `Starts in ${hrs}h`;
                      }

                      return (
                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                              {countdownLabel ? (
                                <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full text-[10px]">
                                  {countdownLabel}
                                </span>
                              ) : null}
                              {appt.rescheduleCount && appt.rescheduleCount > 0 ? (
                                <span className="text-teal-600 dark:text-teal-400 font-medium">
                                  Rescheduled ({appt.rescheduleCount}/2)
                                </span>
                              ) : (
                                <span>Starts automatically at {new Date(appt.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60 hover:bg-teal-500/10 hover:text-teal-700 dark:hover:text-teal-300 hover:border-teal-500/40 text-xs h-7 px-2.5 cursor-pointer transition-colors disabled:cursor-not-allowed"
                                onClick={() => handleOpenReschedule(appt)}
                                disabled={isWithinCutoff || isMaxRescheduled}
                                title={
                                  isWithinCutoff
                                    ? "Cannot reschedule within 2 hours of consultation"
                                    : isMaxRescheduled
                                    ? "Maximum 2 reschedules reached"
                                    : "Reschedule to another time slot"
                                }
                              >
                                <RefreshCw className="w-3 h-3 mr-1" /> Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50 hover:bg-red-500/10 hover:text-red-700 dark:hover:text-red-300 hover:border-red-500/40 text-xs h-7 px-2.5 cursor-pointer transition-colors disabled:cursor-not-allowed"
                                onClick={() => handleOpenCancel(appt)}
                                disabled={cancelMutation.isPending || isWithinCutoff}
                                title={
                                  isWithinCutoff
                                    ? "Cannot cancel within 2 hours of consultation"
                                    : "Cancel this appointment"
                                }
                              >
                                <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                              </Button>
                            </div>
                          </div>
                          {isWithinCutoff ? (
                            <p className="text-[10px] text-amber-600 dark:text-amber-400">
                              * Policy: modifications locked within 2 hours of consultation.
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground italic">
                              * Session will auto-start at scheduled time unless rescheduled.
                            </p>
                          )}
                        </div>
                      );
                    })()}

                    {/* Status === 'InProgress' */}
                    {isInProgress && (() => {
                      const startMs = new Date(appt.appointmentDate).getTime();
                      const durationMs = (appt.sessionDurationMinutes || 45) * 60 * 1000;
                      const endMs = startMs + durationMs;
                      const minsRemaining = Math.max(1, Math.ceil((endMs - now) / 60000));
                      const endTimeStr = new Date(endMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                      return (
                        <div className="pt-3 border-t border-border/60 space-y-2">
                          <div className="p-3.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                {appt.consultationType === 'Video' ? <Video className="w-4 h-4 animate-pulse" /> :
                                 appt.consultationType === 'Chat' ? <MessageSquare className="w-4 h-4 animate-pulse" /> :
                                 <Stethoscope className="w-4 h-4 animate-pulse" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-foreground truncate">
                                  Session with {appt.doctorName || 'Psychologist'}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  Live session concludes at {endTimeStr}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5 bg-emerald-500/15 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30 px-2.5 py-1 rounded-lg text-xs font-bold self-start sm:self-auto shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              <span>~{minsRemaining}m left</span>
                            </div>
                          </div>
                          <p className="text-[10px] text-muted-foreground italic px-0.5">
                            * Telehealth session is currently active and will automatically complete when the session ends.
                          </p>
                        </div>
                      );
                    })()}
                  </Card>
                );
              })}
              </div>
            ) : (
              <Card className="p-8 text-center text-muted-foreground text-sm space-y-3 rounded-2xl border border-border/80">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <div>
                  <p className="font-semibold text-foreground">No upcoming scheduled sessions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Your scheduled consultations and appointments will appear here. Finished and cancelled sessions are documented under Finished Session Records below.
                  </p>
                </div>
              </Card>
            )}
          </div>

          {/* My Doctors & Care Team */}
          <div className="space-y-6 pt-6 border-t border-border">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">My Psychologists & Care Team</h2>
              <p className="text-xs text-muted-foreground">
                Psychologists and clinicians who have conducted sessions or managed your mental health care.
              </p>
            </div>

            {loadingSummaries && careTeamSummaries.length === 0 && finishedAndCancelledAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading care team records...</p>
            ) : careTeamSummaries.length > 0 || finishedAndCancelledAppointments.length > 0 ? (
              <div className="space-y-6">
                {careTeamSummaries.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {careTeamSummaries.map((s) => (
                      <Card key={s.id} className="p-4.5 space-y-3 text-xs border border-border hover:border-teal-500/40 hover:shadow-xs transition-all duration-200 flex flex-col justify-between rounded-2xl bg-card">
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                                <UserCheck className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-sm text-foreground block">
                                  {s.doctorName || 'Psychologist'}
                                </span>
                                <span className="text-[10px] text-muted-foreground">Attending Clinician</span>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Care Team
                            </span>
                          </div>

                          <div className="space-y-1.5 text-muted-foreground pt-0.5">
                            <p className="flex justify-between items-center">
                              <span>Completed Visits:</span>
                              <strong className="text-foreground font-mono">{s.totalVisits}</strong>
                            </p>
                            <p className="flex justify-between items-center">
                              <span>Consultation Time:</span>
                              <strong className="text-foreground font-mono">{s.totalConsultationMinutes} mins</strong>
                            </p>
                            {s.lastVisitDate && (
                              <p className="flex justify-between items-center text-[11px] pt-1.5 border-t border-border/40">
                                <span>Latest Session:</span>
                                <span className="text-foreground font-medium">{new Date(s.lastVisitDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2.5 border-t border-border/40 flex items-center justify-between gap-2">
                          <Link href={`/patient/messages?doctorId=${s.doctorId}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 px-2.5 gap-1.5 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60 hover:bg-teal-500/10 cursor-pointer"
                            >
                              <MessageSquare className="w-3.5 h-3.5" /> Chat
                            </Button>
                          </Link>

                          <Button
                            size="sm"
                            className="text-xs h-7 px-3 gap-1 bg-teal-600 hover:bg-teal-700 text-white cursor-pointer shadow-2xs"
                            onClick={() => {
                              setPreselectedDoctorId(s.doctorId);
                              setShowBooking(true);
                            }}
                          >
                            <Calendar className="w-3.5 h-3.5" /> Book Follow-up
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Finished & Cancelled Sessions Records & Clinical History List */}
                {finishedAndCancelledAppointments.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" /> Finished Session Records ({finishedAndCancelledAppointments.length})
                      </h3>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        Archived in Care History
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {finishedAndCancelledAppointments.map((appt) => {
                        const isCompleted = (appt.status || '').toLowerCase() === 'completed' || (appt.appointmentStatus || '').toLowerCase() === 'completed';
                        const isCanceled = (appt.status || '').toLowerCase() === 'canceled' || (appt.appointmentStatus || '').toLowerCase() === 'cancelled';
                        const isDeclined = (appt.status || '').toLowerCase() === 'declined' || (appt.appointmentStatus || '').toLowerCase() === 'declined';

                        return (
                          <Card
                            key={appt.id}
                            className={cn(
                              "p-5 flex flex-col justify-between space-y-3.5 border-border hover:shadow-xs transition-all duration-200 relative overflow-hidden bg-card rounded-2xl shadow-2xs",
                              isCompleted ? "hover:border-emerald-500/30" : "hover:border-rose-500/30"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "p-1.5 rounded-lg",
                                  isCompleted ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                )}>
                                  {appt.consultationType === 'Video' ? <Video className="w-4 h-4" /> :
                                   appt.consultationType === 'Chat' ? <MessageSquare className="w-4 h-4" /> :
                                   <MapPin className="w-4 h-4" />}
                                </div>
                                <span className="font-semibold text-sm">{appt.consultationType} Consultation</span>
                              </div>
                              {isCompleted ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Completed
                                </span>
                              ) : isCanceled ? (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Cancelled
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Declined
                                </span>
                              )}
                            </div>

                            <div className="space-y-1.5 text-xs">
                              <p className="flex items-center gap-1.5 text-muted-foreground font-mono">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>{new Date(appt.appointmentDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                                <span>•</span>
                                <span className="text-foreground font-semibold font-sans">
                                  {appt.doctorName || 'Psychologist'}
                                </span>
                              </p>

                              {appt.consultationReason && (
                                <p className="text-foreground text-xs pt-0.5 line-clamp-2">
                                  Reason: <span className="text-muted-foreground">{appt.consultationReason}</span>
                                </p>
                              )}

                              {isCompleted && appt.doctorNotes && (
                                <div className="p-2.5 rounded-xl bg-muted/60 border border-border/50 text-xs mt-1.5">
                                  <span className="font-semibold text-foreground flex items-center gap-1 text-[11px] mb-0.5">
                                    <FileText className="w-3 h-3 text-primary" /> Psychologist Clinical Note:
                                  </span>
                                  <p className="text-muted-foreground text-[11px]">{appt.doctorNotes}</p>
                                </div>
                              )}

                              {isCanceled && (
                                <div className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-xs mt-1.5 space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-semibold text-destructive">
                                    <span className="flex items-center gap-1">
                                      <XCircle className="w-3.5 h-3.5" />
                                      {appt.cancelledBy === 'doctor' ? 'Cancelled by Psychologist' : 'Cancelled by Patient'}
                                    </span>
                                    {appt.rescheduleCount && appt.rescheduleCount > 0 ? (
                                      <span className="font-normal text-muted-foreground">Prior reschedules: {appt.rescheduleCount}</span>
                                    ) : null}
                                  </div>
                                  {appt.cancellationReason && (
                                    <p className="text-muted-foreground text-[11px]">
                                      <span className="text-foreground font-medium">Reason: </span>
                                      {appt.cancellationReason}
                                    </p>
                                  )}
                                </div>
                              )}

                              {isDeclined && (
                                <div className="p-2.5 rounded-xl bg-destructive/5 border border-destructive/20 text-xs mt-1.5 space-y-1">
                                  <span className="text-destructive font-semibold text-[11px] flex items-center gap-1">
                                    <XCircle className="w-3.5 h-3.5" /> Request Declined by Psychologist
                                  </span>
                                  {appt.declineReason && (
                                    <p className="text-muted-foreground text-[11px]">
                                      <span className="text-foreground font-medium">Psychologist Note: </span>
                                      {appt.declineReason}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-border/50">
                              <span className="text-xs text-muted-foreground">
                                {isCompleted
                                  ? (appt.doctorName ? `Session with ${appt.doctorName.replace('Dr. ', '')}` : 'Session completed')
                                  : isCanceled
                                  ? (appt.cancelledBy === 'doctor' ? 'Cancelled by Psychologist' : 'Cancelled by Patient')
                                  : 'Declined by Psychologist'}
                              </span>

                              {isCompleted ? (
                                appt.isReviewed ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                    Rated {appt.reviewRating || 5}★
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleOpenReview(appt)}
                                    className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                                  >
                                    <Star className="w-3.5 h-3.5 fill-white" /> Rate Consultation
                                  </Button>
                                )
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs h-7 px-3 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800/60 hover:bg-teal-500/10 cursor-pointer"
                                  onClick={() => {
                                    setPreselectedDoctorId(appt.doctorId);
                                    setShowBooking(true);
                                  }}
                                >
                                  <RefreshCw className="w-3 h-3 mr-1" /> Rebook
                                </Button>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No psychologist consultation summaries recorded yet. When you finish a session with a psychologist, their profile and visit history will be documented here.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PART 2: PRESCRIPTIONS SECTION                                            */}
      {/* ========================================================================= */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Prescriptions Filter & Search Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/70 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={rxSearch}
                onChange={(e) => setRxSearch(e.target.value)}
                placeholder="Search by medication name, dosage, or psychologist..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed Prescriptions
              </span>
            </div>
          </div>

          {loadingPrescriptions ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Loading your prescriptions...
            </Card>
          ) : filteredPrescriptions.length > 0 ? (
            <div className="space-y-5">
              {filteredPrescriptions.map((rx) => (
                <Card key={rx.id} className="overflow-hidden border border-border/80 shadow-xs hover:border-indigo-500/40 hover:shadow-sm transition-all duration-200 rounded-2xl bg-card">
                  {/* Card Header Banner */}
                  <div className="bg-muted/30 px-5 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                        Rx
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground tracking-tight">{rx.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="font-medium text-foreground">Issued by {rx.doctorName}</span>
                          {rx.doctorSpecialization && <span>• {rx.doctorSpecialization}</span>}
                          {rx.doctorHospital && <span>({rx.doctorHospital})</span>}
                          <span>• {new Date(rx.createdAt).toLocaleDateString([], { dateStyle: 'medium' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePrintPrescription(rx.title)}
                        className="text-xs h-8 gap-1.5 border-border hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                        Print / Download Rx
                      </Button>
                    </div>
                  </div>

                  {/* Medications List */}
                  <CardContent className="p-5 space-y-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block mb-3">
                        Prescribed Medications & Regimen
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {rx.medications && rx.medications.length > 0 ? (
                          rx.medications.map((med, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-indigo-500/30 hover:shadow-2xs transition-all duration-200 space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                                    <Pill className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm text-foreground">{med.medicationName}</span>
                                </div>
                                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/80">
                                  {med.dosage}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                                <p className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground/80" />
                                  <span>{med.frequency}</span>
                                </p>
                                <p className="flex items-center gap-1 justify-end font-medium text-foreground">
                                  <span>Duration: {med.duration}</span>
                                </p>
                              </div>

                              {med.instructions && (
                                <div className="p-2 rounded-lg bg-muted/40 text-[11px] text-muted-foreground border border-border/40">
                                  <span className="font-medium text-foreground">Psychologist Note: </span>
                                  {med.instructions}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No specific medications listed.</p>
                        )}
                      </div>
                    </div>

                    {/* Clinical Notes */}
                    {rx.notes && (
                      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-indigo-500" /> Clinical Instructions & Precautions:
                        </span>
                        <p className="text-muted-foreground leading-relaxed pl-5">{rx.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center space-y-3 border-border/80">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
                <Pill className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="font-bold text-base text-foreground">No Active Prescriptions</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When your attending psychologist issues clinical recommendations or sleep/anxiety protocols during consultations, they will appear here with full dosage and regimen instructions.
                </p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Doctor Review Dialog */}
      <DoctorReviewDialog
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        appointment={selectedApptForReview}
      />

      {/* Reschedule Consultation Dialog */}
      <RescheduleAppointmentDialog
        isOpen={isRescheduleOpen}
        onClose={() => {
          setIsRescheduleOpen(false);
          setSelectedApptForReschedule(null);
        }}
        appointment={selectedApptForReschedule}
      />

      {/* Cancellation Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Cancel Consultation</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to cancel your appointment with {selectedApptForCancel?.doctorName || 'your psychologist'}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              <strong>2-Hour Cancellation Policy:</strong> Cancellations must be made at least 2 hours prior to scheduled consultation start time.
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Reason for Cancellation (Optional)
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Schedule conflict, feeling better, duplicate booking..."
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelDialogOpen(false)}
              className="text-xs cursor-pointer hover:bg-muted"
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
              className="text-xs cursor-pointer"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Slot Availability Booking Dialog */}
      <DoctorSlotBookingDialog
        isOpen={showBooking}
        onClose={() => {
          setShowBooking(false);
          setPreselectedDoctorId(undefined);
        }}
        preSelectedDoctorId={preselectedDoctorId}
      />
    </div>
  );
}
