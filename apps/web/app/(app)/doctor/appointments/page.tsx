"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchAppointments, 
  updateAppointmentStatus, 
  acceptAppointment, 
  declineAppointment, 
  cancelDoctorAppointment 
} from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { 
  Calendar, Clock, User, CheckCircle, XCircle, Play, 
  AlertCircle, Check, X, ShieldAlert, MessageSquare, Video, MapPin, RefreshCw,
  Timer
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  RescheduleAppointmentDialog, 
  RescheduleAppointmentTarget 
} from "@/components/features/appointments/reschedule-appointment-dialog";

const tabs = ['all', 'pending', 'scheduled', 'in-progress', 'completed', 'canceled', 'declined'] as const;

const statusColors: Record<string, string> = {
  'pending': 'bg-amber-50 text-amber-700 border-amber-200',
  'scheduled': 'bg-teal-50 text-teal-700 border-teal-200',
  'in-progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'canceled': 'bg-red-50 text-red-700 border-red-200',
  'declined': 'bg-rose-50 text-rose-700 border-rose-200',
};

function formatDateTime(date: string | Date) {
  const d = new Date(date);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function getSessionTimingInfo(apptDateStr: string, durationMinutes: number = 45, nowMs: number = Date.now()) {
  const apptDate = new Date(apptDateStr);
  const startMs = apptDate.getTime();
  const durationMs = (durationMinutes > 0 ? durationMinutes : 45) * 60 * 1000;
  const endMs = startMs + durationMs;

  const isBefore = nowMs < startMs;
  const isDuring = nowMs >= startMs && nowMs < endMs;
  const isAfter = nowMs >= endMs;

  const msUntilStart = startMs - nowMs;
  const msUntilEnd = endMs - nowMs;

  let countdownText = '';
  if (isBefore) {
    const minsUntilStart = Math.ceil(msUntilStart / 60000);
    if (minsUntilStart < 60) {
      countdownText = `Starts in ${minsUntilStart}m`;
    } else if (minsUntilStart < 1440) {
      const hrs = Math.floor(minsUntilStart / 60);
      const mins = minsUntilStart % 60;
      countdownText = mins > 0 ? `Starts in ${hrs}h ${mins}m` : `Starts in ${hrs}h`;
    } else {
      const days = Math.floor(minsUntilStart / 1440);
      countdownText = `In ${days} day${days > 1 ? 's' : ''}`;
    }
  } else if (isDuring) {
    const minsRemaining = Math.max(1, Math.ceil(msUntilEnd / 60000));
    countdownText = `${minsRemaining}m remaining`;
  }

  return { isBefore, isDuring, isAfter, countdownText, durationMinutes };
}

interface AppointmentItem {
  id: string;
  doctorId?: string;
  patientId: string;
  patientName: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical' | 'In-person';
  reason?: string | null;
  consultationReason?: string | null;
  sessionDurationMinutes?: number;
  status: string;
  appointmentStatus: string;
  rescheduleCount?: number;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  declineReason?: string | null;
  doctorNotes?: string | null;
  startAt?: string | null;
  endAt?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export default function DoctorAppointmentsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const queryClient = useQueryClient();

  // Periodic timer so countdowns and real-time transitions stay fresh
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Dialog states for Decline & Cancel & Reschedule
  const [selectedApptForDecline, setSelectedApptForDecline] = useState<AppointmentItem | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);

  const [selectedApptForCancel, setSelectedApptForCancel] = useState<AppointmentItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelOpen, setIsCancelOpen] = useState(false);

  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<AppointmentItem | null>(null);
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);

  // Fetch appointments filtered by current tab with live refetchInterval
  const { data, isLoading } = useQuery<{ data: AppointmentItem[] }>({
    queryKey: ['appointments', activeTab],
    queryFn: () => fetchAppointments(activeTab === 'all' ? undefined : activeTab),
    refetchInterval: 15000,
  });

  // Fetch all appointments once for pending count badge
  const { data: allData } = useQuery<{ data: AppointmentItem[] }>({
    queryKey: ['appointments', 'all-count'],
    queryFn: () => fetchAppointments(undefined),
    refetchInterval: 15000,
  });

  const pendingCount = (allData?.data || []).filter(
    (a) => a.status === 'pending' || a.appointmentStatus === 'Pending'
  ).length;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['appointments'] });
    queryClient.invalidateQueries({ queryKey: ['doctor-overview'] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      invalidateAll();
      toast.success('Appointment status updated.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => acceptAppointment(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Consultation request accepted.');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to accept consultation request.'),
  });

  const declineMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => declineAppointment(id, reason),
    onSuccess: () => {
      invalidateAll();
      toast.success('Consultation request declined.');
      setIsDeclineOpen(false);
      setSelectedApptForDecline(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to decline request.'),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelDoctorAppointment(id, reason),
    onSuccess: () => {
      invalidateAll();
      toast.success('Appointment cancelled.');
      setIsCancelOpen(false);
      setSelectedApptForCancel(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to cancel appointment.'),
  });

  const handleOpenDecline = (appt: AppointmentItem) => {
    setSelectedApptForDecline(appt);
    setDeclineReason('');
    setIsDeclineOpen(true);
  };

  const handleOpenCancel = (appt: AppointmentItem) => {
    setSelectedApptForCancel(appt);
    setCancelReason('');
    setIsCancelOpen(true);
  };

  const appointments = useMemo(() => {
    const raw = Array.isArray(data) ? data : (data as any)?.data || [];
    return [...raw].sort((a: any, b: any) => {
      // 1. New schedule priority: In-Progress (1) -> Scheduled (2) -> Pending (3) -> Completed (4) -> Canceled (5) -> Declined (6)
      const getPriority = (status?: string, apptStatus?: string) => {
        const s = (status || '').toLowerCase();
        const as = (apptStatus || '').toLowerCase();
        if (s === 'in-progress' || as === 'inprogress') return 1;
        if (s === 'scheduled' || as === 'scheduled') return 2;
        if (s === 'pending' || as === 'pending') return 3;
        if (s === 'completed' || as === 'completed') return 4;
        if (s === 'canceled' || as === 'cancelled') return 5;
        if (s === 'declined' || as === 'declined') return 6;
        return 7;
      };

      const pA = getPriority(a.status, a.appointmentStatus);
      const pB = getPriority(b.status, b.appointmentStatus);
      if (pA !== pB) return pA - pB;

      // 2. Newest schedule first, then new to older (newest createdAt first)
      const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (createdA !== createdB) return createdB - createdA;

      const dateA = a.appointmentDate ? new Date(a.appointmentDate).getTime() : 0;
      const dateB = b.appointmentDate ? new Date(b.appointmentDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Appointments & Clinical Queue</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Manage your incoming consultation requests, live sessions, and scheduled patient calendar.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-100 p-1.5 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-none flex-nowrap sm:flex-wrap">
        {tabs.map((tab) => {
          const isPendingTab = tab === 'pending';
          const isSelected = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all capitalize flex items-center gap-1.5 shrink-0 cursor-pointer",
                isSelected
                  ? "bg-white text-teal-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <span>{tab === 'all' ? 'All' : tab.replace('-', ' ')}</span>
              {isPendingTab && pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white border border-slate-200/80 rounded-xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="font-semibold text-slate-700 text-sm">No appointments in this view</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === 'pending'
              ? 'You have no pending consultation requests awaiting approval.'
              : 'There are no appointments matching this status filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => {
            const isPending = appt.status === 'pending' || appt.appointmentStatus === 'Pending';
            const isScheduled = appt.status === 'scheduled' || appt.appointmentStatus === 'Scheduled';
            const isInProgress = appt.status === 'in-progress' || appt.appointmentStatus === 'InProgress';
            const isCanceled = appt.status === 'canceled' || appt.appointmentStatus === 'Cancelled';
            const isDeclined = appt.status === 'declined' || appt.appointmentStatus === 'Declined';
            const isCompleted = appt.status === 'completed' || appt.appointmentStatus === 'Completed';

            const timing = getSessionTimingInfo(appt.appointmentDate, appt.sessionDurationMinutes, now);
            const patientInitial = (appt.patientName || 'P').trim()[0]?.toUpperCase() || 'P';

            return (
              <div
                key={appt.id}
                className={cn(
                  "bg-white border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all shadow-2xs relative overflow-hidden",
                  isInProgress
                    ? "border-emerald-300 bg-emerald-50/15 ring-1 ring-emerald-500/15"
                    : isPending
                    ? "border-amber-200 bg-amber-50/20"
                    : isCompleted
                    ? "border-slate-200 bg-white"
                    : "border-slate-200/90 hover:border-slate-300 bg-white"
                )}
              >
                {/* Left accent indicator for prominent active / pending sessions */}
                {isInProgress && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600 rounded-l-xl" />
                )}
                {isPending && (
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 rounded-l-xl" />
                )}

                {/* Left Column: Avatar & Patient Context */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border select-none",
                      isInProgress
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs"
                        : isPending
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    {patientInitial}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Header Row: Patient Name & Status Badges */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                        {appt.patientName || 'Anonymous Patient'}
                      </h3>

                      {isInProgress && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300/80 shadow-2xs">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                          </span>
                          Live Session Active • {timing.countdownText || 'In Progress'}
                        </span>
                      )}

                      {isScheduled && (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border border-teal-200 bg-teal-50 text-teal-700 font-semibold capitalize">
                          Scheduled
                        </span>
                      )}

                      {isScheduled && timing.isBefore && timing.countdownText && (
                        <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 border border-teal-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Timer className="w-3 h-3 text-teal-600 animate-pulse" /> {timing.countdownText}
                        </span>
                      )}

                      {isPending && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 font-semibold">
                          Pending Approval
                        </span>
                      )}

                      {isCompleted && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Completed
                        </span>
                      )}

                      {isCanceled && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 font-semibold">
                          Cancelled
                        </span>
                      )}

                      {isDeclined && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full border border-rose-200 bg-rose-50 text-rose-700 font-semibold">
                          Declined
                        </span>
                      )}

                      {appt.rescheduleCount && appt.rescheduleCount > 0 ? (
                        <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5" /> Rescheduled {appt.rescheduleCount}x
                        </span>
                      ) : null}
                    </div>

                    {/* Reason */}
                    {appt.consultationReason || appt.reason ? (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        <strong className="text-slate-700">Reason:</strong> {appt.consultationReason || appt.reason}
                      </p>
                    ) : null}

                    {/* Metadata chips */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap pt-0.5">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateTime(appt.appointmentDate)}
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold text-slate-800 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md">
                        {appt.consultationType === 'Video' ? <Video className="w-3.5 h-3.5 text-teal-600" /> :
                         appt.consultationType === 'Chat' ? <MessageSquare className="w-3.5 h-3.5 text-teal-600" /> :
                         <MapPin className="w-3.5 h-3.5 text-teal-600" />}
                        {appt.consultationType} ({appt.sessionDurationMinutes || 45} mins)
                      </span>
                    </div>

                    {/* Prior cancellation/decline notes */}
                    {isCanceled && (
                      <div className="p-2.5 rounded-lg bg-red-50/60 border border-red-200/60 text-xs text-red-700 space-y-0.5 mt-1.5">
                        <span className="font-semibold">
                          Cancelled by {appt.cancelledBy === 'doctor' ? 'you (Psychologist)' : 'Patient'}
                        </span>
                        {appt.cancellationReason && (
                          <p className="text-[11px] text-red-600">Reason: {appt.cancellationReason}</p>
                        )}
                      </div>
                    )}

                    {isDeclined && (
                      <div className="p-2.5 rounded-lg bg-rose-50/60 border border-rose-200/60 text-xs text-rose-700 space-y-0.5 mt-1.5">
                        <span className="font-semibold">Request Declined</span>
                        {appt.declineReason && (
                          <p className="text-[11px] text-rose-600">Note: {appt.declineReason}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column: High-Contrast Actions & Helper Text */}
                <div className="shrink-0 flex flex-col sm:items-end justify-center gap-1.5">
                  {/* Pending Actions */}
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(appt.id)}
                        disabled={acceptMutation.isPending}
                        className="h-8.5 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDecline(appt)}
                        disabled={declineMutation.isPending}
                        className="h-8.5 px-3 text-xs text-rose-600 border-rose-200 hover:bg-rose-50 font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Decline
                      </Button>
                    </div>
                  )}

                  {/* Scheduled Actions */}
                  {isScheduled && (
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApptForReschedule(appt);
                            setIsRescheduleOpen(true);
                          }}
                          className="h-8.5 px-3 text-xs text-teal-700 border-teal-200 hover:bg-teal-50 font-medium flex items-center gap-1.5 cursor-pointer"
                          title="Reschedule to another duty slot"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Reschedule
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: appt.id, status: 'in-progress' })}
                          disabled={statusMutation.isPending}
                          className="h-8.5 px-3.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          title="Start session now (or let it auto-start at scheduled time)"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" /> Start
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCancel(appt)}
                          disabled={cancelMutation.isPending}
                          className="h-8.5 px-2.5 text-xs text-red-500 border-red-200 hover:bg-red-50 cursor-pointer"
                          title="Cancel Appointment"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium text-right">
                        * Auto-starts at scheduled time unless rescheduled
                      </p>
                    </div>
                  )}

                  {/* In-Progress Actions */}
                  {isInProgress && (
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => statusMutation.mutate({ id: appt.id, status: 'completed' })}
                        disabled={statusMutation.isPending}
                        className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
                        title="Complete session early (or let it auto-conclude)"
                      >
                        <CheckCircle className="w-4 h-4 text-white" /> Complete Session
                      </Button>
                      <p className="text-[11px] text-slate-500 font-medium text-right flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Auto-completes when session window expires
                      </p>
                    </div>
                  )}

                  {/* Completed Info */}
                  {isCompleted && (
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                        {appt.sessionDurationMinutes || 45} mins session completed
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Doctor Decline Dialog */}
      <Dialog open={isDeclineOpen} onOpenChange={setIsDeclineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Decline Consultation Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Are you sure you want to decline {selectedApptForDecline?.patientName}'s appointment request? The time slot will be released.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Declining (Sent to Patient)
              </label>
              <Input
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Schedule fully booked, emergency hospital duty, out of office..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeclineOpen(false)}
              className="text-xs"
            >
              Back
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!selectedApptForDecline) return;
                declineMutation.mutate({
                  id: selectedApptForDecline.id,
                  reason: declineReason.trim() || undefined,
                });
              }}
              disabled={declineMutation.isPending}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {declineMutation.isPending ? "Declining..." : "Confirm Decline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cancel confirmed appointment for {selectedApptForCancel?.patientName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Cancellation Reason (Optional)
              </label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Clinic operational conflict, clinician illness..."
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCancelOpen(false)}
              className="text-xs"
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                if (!selectedApptForCancel) return;
                cancelMutation.mutate({
                  id: selectedApptForCancel.id,
                  reason: cancelReason.trim() || undefined,
                });
              }}
              disabled={cancelMutation.isPending}
              className="text-xs"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Doctor Reschedule Dialog */}
      <RescheduleAppointmentDialog
        isOpen={isRescheduleOpen}
        onClose={() => {
          setIsRescheduleOpen(false);
          setSelectedApptForReschedule(null);
        }}
        appointment={
          selectedApptForReschedule
            ? {
                id: selectedApptForReschedule.id,
                doctorId: selectedApptForReschedule.doctorId || '',
                doctorName: 'You (Psychologist)',
                patientName: selectedApptForReschedule.patientName,
                appointmentDate: selectedApptForReschedule.appointmentDate,
                consultationType: (selectedApptForReschedule.consultationType as any) || 'Video',
                rescheduleCount: selectedApptForReschedule.rescheduleCount || 0,
                sessionDurationMinutes: selectedApptForReschedule.sessionDurationMinutes || 45,
              }
            : null
        }
        onSuccess={() => {
          invalidateAll();
          toast.success("Appointment rescheduled successfully.");
          setIsRescheduleOpen(false);
          setSelectedApptForReschedule(null);
        }}
      />
    </div>
  );
}
