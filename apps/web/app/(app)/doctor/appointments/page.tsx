"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Calendar, Clock, Video, MessageSquare, MapPin, CheckCircle2, FileText, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Appointment {
  id: string;
  patientId: string;
  appointmentDate: string;
  consultationType: 'Chat' | 'Video' | 'Physical';
  consultationReason: string | null;
  sessionDurationMinutes: number;
  appointmentStatus: 'Scheduled' | 'Completed' | 'Cancelled';
  doctorNotes: string | null;
}

export default function DoctorAppointmentsPage() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<'All' | 'Scheduled' | 'Completed'>('All');
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [doctorNotes, setDoctorNotes] = useState('');

  // Fetch all doctor's appointments
  const { data: appointments, isLoading } = useQuery<Appointment[]>({
    queryKey: ['doctor', 'queue'],
    queryFn: () => apiFetch<Appointment[]>('/appointments/doctor/queue'),
  });

  // Mutation: Complete session & save notes
  const completeMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      apiFetch<Appointment>(`/appointments/${id}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ doctorNotes: notes }),
      }),
    onSuccess: () => {
      toast.success("Consultation marked as completed and clinical notes saved.");
      setCompletingId(null);
      setDoctorNotes('');
      queryClient.invalidateQueries({ queryKey: ['doctor'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to complete appointment.");
    },
  });

  const filteredAppointments = appointments?.filter((a) => {
    if (filter === 'All') return true;
    return a.appointmentStatus === filter;
  });

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingId) return;
    completeMutation.mutate({
      id: completingId,
      notes: doctorNotes.trim(),
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clinical Appointments Queue</h1>
          <p className="text-sm text-muted-foreground">
            Manage scheduled patient consultations, launch sessions, and record clinical diagnosis notes.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2">
          {(['All', 'Scheduled', 'Completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filter === tab
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border hover:bg-muted text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Complete Session Modal / Inline Box */}
      {completingId && (
        <Card className="border-primary/50 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <CardTitle className="text-base font-semibold">Complete Consultation & Add Clinical Notes</CardTitle>
              <CardDescription className="text-xs">Document clinical assessment, treatment plans, or prescriptions.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setCompletingId(null)}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleCompleteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Physician Clinical Notes</label>
                <textarea
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={4}
                  placeholder="Record patient assessment, observations, next steps, or medication adjustments..."
                  className="w-full rounded-md border border-input bg-card p-3 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCompletingId(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={completeMutation.isPending}>
                  {completeMutation.isPending ? 'Saving...' : 'Finalize & Mark Completed'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Appointments List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading consultations queue...</p>
        ) : filteredAppointments && filteredAppointments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAppointments.map((appt) => (
              <Card key={appt.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      {appt.consultationType === 'Video' ? <Video className="w-4 h-4" /> :
                       appt.consultationType === 'Chat' ? <MessageSquare className="w-4 h-4" /> :
                       <MapPin className="w-4 h-4" />}
                      {appt.consultationType} Consultation
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      appt.appointmentStatus === 'Scheduled' ? 'bg-primary/10 text-primary' :
                      appt.appointmentStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-600' :
                      'bg-destructive/10 text-destructive'
                    }`}>
                      {appt.appointmentStatus}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-sm text-foreground">
                      {new Date(appt.appointmentDate).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      Duration: <strong>{appt.sessionDurationMinutes} minutes</strong>
                    </p>
                    {appt.consultationReason && (
                      <p className="text-foreground pt-1">
                        Reason: <span className="text-muted-foreground">{appt.consultationReason}</span>
                      </p>
                    )}
                    {appt.doctorNotes && (
                      <div className="mt-3 p-3 rounded-xl bg-muted/60 text-xs space-y-1">
                        <span className="font-semibold text-primary flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> Doctor's Clinical Notes:
                        </span>
                        <p className="text-foreground leading-relaxed">{appt.doctorNotes}</p>
                      </div>
                    )}
                  </div>
                </div>

                {appt.appointmentStatus === 'Scheduled' && (
                  <div className="pt-2 border-t flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setCompletingId(appt.id);
                        setDoctorNotes('');
                      }}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete Session & Add Notes
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            No consultations found under "{filter}".
          </Card>
        )}
      </div>
    </div>
  );
}
