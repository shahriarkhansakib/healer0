"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Calendar, Clock, Video, MessageSquare, MapPin, Plus, XCircle, CheckCircle, UserCheck, Star } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";
import { DoctorReviewDialog, PendingReview } from "@/components/features/reviews/doctor-review-dialog";

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName?: string;
  doctorSpecialization?: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical';
  consultationReason: string | null;
  sessionDurationMinutes: number;
  appointmentStatus: 'Scheduled' | 'Completed' | 'Cancelled';
  doctorNotes: string | null;
  isReviewed?: boolean;
  reviewRating?: number | null;
  reviewComment?: string | null;
}

interface VisitSummary {
  id: string;
  patientId: string;
  patientName: string | null;
  doctorId: string;
  doctorName: string | null;
  totalVisits: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
  totalConsultationMinutes: number;
}

interface DoctorInfo {
  doctorId: string;
  name: string;
  email: string;
  specialization: string | null;
  hospitalAffiliation: string | null;
}

export default function AppointmentsPage() {
  const queryClient = useQueryClient();

  const [showBooking, setShowBooking] = useState(false);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [consultationType, setConsultationType] = useState<'Chat' | 'Video' | 'Physical'>('Video');
  const [consultationReason, setConsultationReason] = useState('');
  const [selectedApptForReview, setSelectedApptForReview] = useState<PendingReview | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const handleOpenReview = (appt: Appointment) => {
    setSelectedApptForReview({
      id: appt.id,
      appointmentId: appt.id,
      doctorId: appt.doctorId,
      doctorName: appt.doctorName || 'Doctor',
      doctorSpecialization: appt.doctorSpecialization || null,
      appointmentDate: appt.appointmentDate,
      consultationType: appt.consultationType,
      sessionDurationMinutes: appt.sessionDurationMinutes,
    });
    setIsReviewOpen(true);
  };

  // Fetch verified doctors list
  const { data: doctors, isLoading: loadingDoctors } = useQuery<DoctorInfo[]>({
    queryKey: ['appointments', 'doctors'],
    queryFn: () => apiFetch<DoctorInfo[]>('/appointments/doctors'),
  });

  // Fetch all user appointments
  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['appointments', 'my-list'],
    queryFn: () => apiFetch<Appointment[]>('/appointments'),
  });

  // Fetch visit summaries (My Doctors & Visit History)
  const { data: summaries, isLoading: loadingSummaries } = useQuery<VisitSummary[]>({
    queryKey: ['appointments', 'summaries'],
    queryFn: () => apiFetch<VisitSummary[]>('/appointments/summaries'),
  });

  // Mutation: Create appointment
  const bookMutation = useMutation({
    mutationFn: (data: {
      doctorId: string;
      appointmentDate: string;
      consultationType: 'Chat' | 'Video' | 'Physical';
      consultationReason?: string;
    }) =>
      apiFetch<Appointment>('/appointments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Consultation booked successfully!");
      setShowBooking(false);
      setDoctorId('');
      setAppointmentDate('');
      setConsultationReason('');
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to book appointment.");
    },
  });

  // Mutation: Cancel appointment
  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Appointment>(`/appointments/${id}/cancel`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      toast.success("Appointment cancelled.");
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to cancel appointment.");
    },
  });

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId.trim() || !appointmentDate) {
      toast.error("Please fill in the required fields.");
      return;
    }

    bookMutation.mutate({
      doctorId: doctorId.trim(),
      appointmentDate: new Date(appointmentDate).toISOString(),
      consultationType,
      consultationReason: consultationReason.trim() || undefined,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Pending Doctor Review Banner */}
      <PendingReviewBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Consultations & Visits</h1>
          <p className="text-sm text-muted-foreground">
            Schedule private appointments with your care team and review clinical session summaries.
          </p>
        </div>
        <Button onClick={() => setShowBooking(!showBooking)} className="flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {showBooking ? 'Close Form' : 'Book Consultation'}
        </Button>
      </div>

      {/* Booking Form */}
      {showBooking && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Schedule a Doctor Consultation</CardTitle>
            <CardDescription className="text-xs">Select your consultation format, date, and doctor.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleBook} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Select Doctor</label>
                  <select
                    value={doctorId}
                    onChange={(e) => setDoctorId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                    required
                  >
                    <option value="">-- Choose a Clinician --</option>
                    {doctors?.map((doc) => (
                      <option key={doc.doctorId} value={doc.doctorId}>
                        {doc.name} ({doc.specialization || 'General'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={appointmentDate}
                    onChange={(e) => setAppointmentDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Consultation Type</label>
                  <select
                    value={consultationType}
                    onChange={(e) => setConsultationType(e.target.value as any)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="Video">Video Call</option>
                    <option value="Chat">Chat Session</option>
                    <option value="Physical">In-Person Clinic</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Reason for Consultation</label>
                <Input
                  value={consultationReason}
                  onChange={(e) => setConsultationReason(e.target.value)}
                  placeholder="E.g., Follow-up session, anxiety evaluation, prescription review..."
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowBooking(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={bookMutation.isPending}>
                  {bookMutation.isPending ? 'Booking...' : 'Confirm Appointment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Scheduled & Past Appointments */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Your Scheduled Sessions</h2>
        {loadingAppts ? (
          <p className="text-sm text-muted-foreground">Loading appointments...</p>
        ) : appointments && appointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((appt) => (
              <Card key={appt.id} className="p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {appt.consultationType === 'Video' ? <Video className="w-4 h-4 text-primary" /> :
                     appt.consultationType === 'Chat' ? <MessageSquare className="w-4 h-4 text-primary" /> :
                     <MapPin className="w-4 h-4 text-primary" />}
                    <span className="font-semibold text-sm">{appt.consultationType} Consultation</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    appt.appointmentStatus === 'Scheduled' ? 'bg-primary/10 text-primary' :
                    appt.appointmentStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                    'bg-destructive/10 text-destructive'
                  }`}>
                    {appt.appointmentStatus}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground flex-wrap">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(appt.appointmentDate).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })} ({appt.sessionDurationMinutes} mins)
                    {appt.doctorName && (
                      <span className="text-foreground font-semibold">• Dr. {appt.doctorName}</span>
                    )}
                  </div>
                  {appt.consultationReason && (
                    <p className="text-foreground mt-1">
                      Reason: <span className="text-muted-foreground">{appt.consultationReason}</span>
                    </p>
                  )}
                  {appt.doctorNotes && (
                    <div className="mt-2 p-2.5 rounded-lg bg-muted text-xs space-y-1">
                      <span className="font-semibold text-primary block">Doctor's Clinical Notes:</span>
                      <p className="text-foreground">{appt.doctorNotes}</p>
                    </div>
                  )}
                </div>

                {appt.appointmentStatus === 'Scheduled' && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 text-xs"
                      onClick={() => cancelMutation.mutate(appt.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel Appointment
                    </Button>
                  </div>
                )}

                {appt.appointmentStatus === 'Completed' && (
                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">
                      {appt.doctorName ? `Dr. ${appt.doctorName}` : 'Session completed'}
                    </span>
                    {appt.isReviewed ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        Rated {appt.reviewRating || 5}★
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleOpenReview(appt)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-8 px-3 flex items-center gap-1.5 shadow-xs"
                      >
                        <Star className="w-3.5 h-3.5 fill-white" /> Rate Consultation
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            No consultations booked. Use the form above to schedule a visit!
          </Card>
        )}
      </div>

      {/* My Doctors & Visit History (Table 21 from PDF) */}
      <div className="space-y-4 pt-4 border-t">
        <h2 className="text-lg font-semibold tracking-tight">My Doctors & Visit History</h2>
        {loadingSummaries ? (
          <p className="text-sm text-muted-foreground">Loading doctor visit history...</p>
        ) : summaries && summaries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((s) => (
              <Card key={s.id} className="p-4 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-primary" />
                  <span className="font-bold text-sm text-foreground">{s.doctorName || 'Doctor'}</span>
                </div>
                <div className="space-y-1 text-muted-foreground">
                  <p>Total Completed Visits: <strong className="text-foreground">{s.totalVisits}</strong></p>
                  <p>Total Consultation Time: <strong className="text-foreground">{s.totalConsultationMinutes} mins</strong></p>
                  {s.firstVisitDate && (
                    <p>First Visit: {new Date(s.firstVisitDate).toLocaleDateString()}</p>
                  )}
                  {s.lastVisitDate && (
                    <p>Latest Visit: {new Date(s.lastVisitDate).toLocaleDateString()}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No doctor consultation summaries recorded yet.
          </p>
        )}
      </div>

      {/* Doctor Review Dialog */}
      <DoctorReviewDialog
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        appointment={selectedApptForReview}
      />
    </div>
  );
}
