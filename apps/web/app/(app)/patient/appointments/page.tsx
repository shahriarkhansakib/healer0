"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Calendar, Clock, Video, MessageSquare, MapPin, Plus, XCircle, CheckCircle, 
  UserCheck, Star, Pill, FileText, Printer, Search, ShieldCheck, Stethoscope, 
  AlertCircle, ChevronRight 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PendingReviewBanner } from "@/components/features/reviews/pending-review-banner";
import { DoctorReviewDialog, PendingReview } from "@/components/features/reviews/doctor-review-dialog";
import { DoctorSlotBookingDialog } from "@/components/features/appointments/doctor-slot-booking-dialog";

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

  // Prescription Search Filter
  const [rxSearch, setRxSearch] = useState('');

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
  const { data: doctors } = useQuery<DoctorInfo[]>({
    queryKey: ['appointments', 'doctors'],
    queryFn: () => apiFetch<DoctorInfo[]>('/appointments/doctors'),
  });

  // Fetch all user appointments
  const { data: appointmentsData, isLoading: loadingAppts } = useQuery<Appointment[] | { data: Appointment[] }>({
    queryKey: ['appointments', 'my-list'],
    queryFn: () => apiFetch<Appointment[]>('/appointments?role=patient'),
  });

  const appointments: Appointment[] = useMemo(() => {
    if (Array.isArray(appointmentsData)) return appointmentsData;
    if (Array.isArray((appointmentsData as any)?.data)) return (appointmentsData as any).data;
    return [];
  }, [appointmentsData]);

  // Fetch visit summaries (My Doctors & Visit History)
  const { data: summaries, isLoading: loadingSummaries } = useQuery<VisitSummary[]>({
    queryKey: ['appointments', 'summaries'],
    queryFn: () => apiFetch<VisitSummary[]>('/appointments/summaries'),
  });

  // Fetch patient prescriptions
  const { data: prescriptions, isLoading: loadingPrescriptions } = useQuery<PatientPrescription[]>({
    queryKey: ['appointments', 'prescriptions'],
    queryFn: () => apiFetch<PatientPrescription[]>('/appointments/prescriptions'),
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

  const scheduledCount = appointments?.filter((a) => a.appointmentStatus === 'Scheduled').length || 0;
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
            Manage your clinical consultations, schedule visits, and access digital doctor prescriptions.
          </p>
        </div>

        {activeTab === 'appointments' && (
          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            <Link href="/patient/doctors">
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-1.5 shadow-2xs text-xs"
              >
                <UserCheck className="w-4 h-4 text-primary" /> Browse Clinician Directory
              </Button>
            </Link>
            <Button
              onClick={() => {
                setPreselectedDoctorId(undefined);
                setShowBooking(true);
              }}
              className="flex items-center gap-1.5 shadow-xs text-xs"
            >
              <Plus className="w-4 h-4" /> Book Consultation
            </Button>
          </div>
        )}
      </div>

      {/* Two-Part Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-muted/50 border border-border/80 w-fit">
        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'appointments'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Calendar className="w-4 h-4 text-primary" />
          <span>1. Appointments</span>
          {scheduledCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
              {scheduledCount} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('prescriptions')}
          className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === 'prescriptions'
              ? 'bg-background text-foreground shadow-sm border border-border/60'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Pill className="w-4 h-4 text-indigo-500" />
          <span>2. Prescriptions</span>
          {prescriptionsCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {prescriptionsCount} Total
            </span>
          )}
        </button>
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
                {appointments?.length || 0} Total Sessions Recorded
              </span>
            </div>

            {loadingAppts ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Loading appointments...
              </Card>
            ) : appointments && appointments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointments.map((appt) => (
                  <Card key={appt.id} className="p-5 flex flex-col justify-between space-y-3.5 hover:border-primary/40 transition-colors">
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
                        appt.appointmentStatus === 'Scheduled' ? 'bg-primary/10 text-primary border border-primary/20' :
                        appt.appointmentStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                        'bg-destructive/10 text-destructive border border-destructive/20'
                      }`}>
                        {appt.appointmentStatus}
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
                          <span className="text-foreground font-semibold">• Dr. {appt.doctorName}</span>
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
                            <Stethoscope className="w-3.5 h-3.5" /> Doctor's Clinical Notes:
                          </span>
                          <p className="text-foreground leading-relaxed">{appt.doctorNotes}</p>
                        </div>
                      )}
                    </div>

                    {appt.appointmentStatus === 'Scheduled' && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-[11px] text-muted-foreground">
                          Telehealth room opens 10 mins prior
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2.5"
                          onClick={() => cancelMutation.mutate(appt.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Cancel
                        </Button>
                      </div>
                    )}

                    {appt.appointmentStatus === 'Completed' && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          {appt.doctorName ? `Consultation with Dr. ${appt.doctorName}` : 'Session completed'}
                        </span>
                        {appt.isReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            Rated {appt.reviewRating || 5}★
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleOpenReview(appt)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3 flex items-center gap-1.5 shadow-2xs"
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
              <Card className="p-8 text-center text-muted-foreground text-sm space-y-3">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <div>
                  <p className="font-semibold text-foreground">No consultations booked yet</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Schedule your first private appointment with our clinical specialists with real-time slot selection.</p>
                </div>
                <div className="flex items-center justify-center gap-2.5 pt-1 flex-wrap">
                  <Link href="/patient/doctors">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shadow-2xs text-xs"
                    >
                      <UserCheck className="w-4 h-4 text-primary" /> Browse Clinician Directory
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPreselectedDoctorId(undefined);
                      setShowBooking(true);
                    }}
                    className="gap-1.5 shadow-xs text-xs"
                  >
                    <Plus className="w-4 h-4" /> Book Consultation
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* My Doctors & Visit History */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">My Doctors & Care Team</h2>
              <p className="text-xs text-muted-foreground">Clinicians who have conducted sessions or managed your medical care.</p>
            </div>
            {loadingSummaries ? (
              <p className="text-sm text-muted-foreground">Loading care team records...</p>
            ) : summaries && summaries.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {summaries.map((s) => (
                  <Card key={s.id} className="p-4.5 space-y-2 text-xs hover:border-primary/40 transition-colors flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 pb-1 border-b border-border/50">
                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-foreground block">{s.doctorName || 'Doctor'}</span>
                          <span className="text-[10px] text-muted-foreground">Verified Clinician</span>
                        </div>
                      </div>
                      <div className="space-y-1 text-muted-foreground pt-1">
                        <p className="flex justify-between">
                          <span>Total Completed Visits:</span>
                          <strong className="text-foreground font-mono">{s.totalVisits}</strong>
                        </p>
                        <p className="flex justify-between">
                          <span>Consultation Time:</span>
                          <strong className="text-foreground font-mono">{s.totalConsultationMinutes} mins</strong>
                        </p>
                        {s.lastVisitDate && (
                          <p className="flex justify-between text-[11px] pt-1 border-t border-border/40">
                            <span>Latest Session:</span>
                            <span className="text-foreground font-medium">{new Date(s.lastVisitDate).toLocaleDateString()}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border/40 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2.5 gap-1 hover:bg-primary/5 hover:text-primary hover:border-primary/40"
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
            ) : (
              <p className="text-xs text-muted-foreground">
                No doctor consultation summaries recorded yet.
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
                placeholder="Search by medication name, dosage, or doctor..."
                className="pl-9 h-9 text-xs"
              />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                <ShieldCheck className="w-3.5 h-3.5" /> Digitally Signed Prescriptions
              </span>
            </div>
          </div>

          {/* Prescriptions Cards Grid */}
          {loadingPrescriptions ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Loading your prescriptions...
            </Card>
          ) : filteredPrescriptions.length > 0 ? (
            <div className="space-y-5">
              {filteredPrescriptions.map((rx) => (
                <Card key={rx.id} className="overflow-hidden border-border/80 shadow-sm hover:border-indigo-500/40 transition-all">
                  {/* Card Header Banner */}
                  <div className="bg-muted/30 px-5 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-bold text-sm shrink-0 shadow-inner">
                        Rx
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground tracking-tight">{rx.title}</h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                          <span className="font-medium text-foreground">Prescribed by {rx.doctorName}</span>
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
                        className="text-xs h-8 gap-1.5 border-border hover:bg-muted"
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
                              className="p-3.5 rounded-xl bg-card border border-border/70 hover:border-indigo-500/30 transition-all space-y-2"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded-md bg-indigo-500/10 text-indigo-500">
                                    <Pill className="w-4 h-4" />
                                  </div>
                                  <span className="font-bold text-sm text-foreground">{med.medicationName}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                  {med.dosage}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1 border-t border-border/40">
                                <div>
                                  <span className="text-[10px] block text-muted-foreground/80">Schedule:</span>
                                  <span className="font-medium text-foreground">{med.frequency}</span>
                                </div>
                                <div>
                                  <span className="text-[10px] block text-muted-foreground/80">Duration:</span>
                                  <span className="font-medium text-foreground">{med.duration}</span>
                                </div>
                              </div>

                              {med.instructions && (
                                <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg flex items-center gap-1.5">
                                  <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>{med.instructions}</span>
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
                  When your attending doctor issues clinical prescriptions or sleep/anxiety protocols during consultations, they will appear here with full dosage and pharmacy instructions.
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
