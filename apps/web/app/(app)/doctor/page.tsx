"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Users, Calendar, Clock, Activity, CheckCircle2, ArrowRight, Stethoscope, Video } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  patientId: string;
  appointmentDate: string;
  consultationType: string;
  consultationReason: string | null;
  sessionDurationMinutes: number;
  appointmentStatus: string;
  doctorNotes: string | null;
}

interface VisitSummary {
  id: string;
  patientId: string;
  patientName: string | null;
  totalVisits: number;
  totalConsultationMinutes: number;
  firstVisitDate: string | null;
  lastVisitDate: string | null;
}

export default function DoctorDashboard() {
  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['doctor', 'queue'],
    queryFn: () => apiFetch<Appointment[]>('/appointments/doctor/queue'),
  });

  const { data: patients, isLoading: loadingPatients } = useQuery<VisitSummary[]>({
    queryKey: ['doctor', 'patients'],
    queryFn: () => apiFetch<VisitSummary[]>('/appointments/doctor/patients'),
  });

  const scheduledAppointments = appointments?.filter((a) => a.appointmentStatus === 'Scheduled') || [];
  const completedAppointments = appointments?.filter((a) => a.appointmentStatus === 'Completed') || [];
  const totalConsultationMinutes = patients?.reduce((sum, p) => sum + p.totalConsultationMinutes, 0) || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-8 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary border space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
          <Stethoscope className="w-3.5 h-3.5" />
          Physician Clinical Workspace
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Clinician Dashboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
          Manage your patient queue, complete telehealth and in-person consultations, and record clinical diagnostic notes.
        </p>
        <div className="flex gap-3 pt-2">
          <Button asChild size="sm">
            <Link href="/doctor/appointments">
              <Calendar className="w-4 h-4 mr-2" /> View Appointment Queue
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/doctor/patients">
              <Users className="w-4 h-4 mr-2" /> My Patients Directory
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5">
          <span className="text-xs text-muted-foreground font-medium">Active Patients</span>
          <p className="text-2xl font-bold mt-1 text-primary">{loadingPatients ? '...' : patients?.length || 0}</p>
        </Card>
        <Card className="p-5">
          <span className="text-xs text-muted-foreground font-medium">Pending Consultations</span>
          <p className="text-2xl font-bold mt-1 text-amber-600">{loadingAppts ? '...' : scheduledAppointments.length}</p>
        </Card>
        <Card className="p-5">
          <span className="text-xs text-muted-foreground font-medium">Completed Sessions</span>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{loadingAppts ? '...' : completedAppointments.length}</p>
        </Card>
        <Card className="p-5">
          <span className="text-xs text-muted-foreground font-medium">Total Clinical Minutes</span>
          <p className="text-2xl font-bold mt-1">{loadingPatients ? '...' : totalConsultationMinutes}</p>
        </Card>
      </div>

      {/* Upcoming Scheduled Consultations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Upcoming Consultations Queue</h2>
            <p className="text-xs text-muted-foreground">Sessions awaiting clinical consultation.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/doctor/appointments">View All <ArrowRight className="w-4 h-4 ml-1" /></Link>
          </Button>
        </div>

        {loadingAppts ? (
          <p className="text-sm text-muted-foreground">Loading queue...</p>
        ) : scheduledAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {scheduledAppointments.slice(0, 6).map((appt) => (
              <Card key={appt.id} className="p-5 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                    {appt.consultationType}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {appt.sessionDurationMinutes} mins
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <p className="font-semibold text-sm text-foreground">
                    {new Date(appt.appointmentDate).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  {appt.consultationReason && (
                    <p className="text-muted-foreground line-clamp-2">
                      Reason: {appt.consultationReason}
                    </p>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full mt-2">
                  <Link href="/doctor/appointments">Open Consultation</Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-muted-foreground text-sm">
            No upcoming consultations pending in your queue.
          </Card>
        )}
      </div>
    </div>
  );
}
