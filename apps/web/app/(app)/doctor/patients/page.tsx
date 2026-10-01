"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Users, UserCheck, Calendar, Clock, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export default function DoctorPatientsPage() {
  const { data: patients, isLoading } = useQuery<VisitSummary[]>({
    queryKey: ['doctor', 'patients'],
    queryFn: () => apiFetch<VisitSummary[]>('/appointments/doctor/patients'),
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Patients & Number of Sessions</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated clinical relationship records, completed consultation counts, and visit timelines.
        </p>
      </div>

      {/* Patients Table Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Treated Patients Directory</CardTitle>
          <CardDescription className="text-xs">
            Automatically aggregated from completed consultations and clinical sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground p-6">Loading patient records...</p>
          ) : patients && patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-6">Patient Name</th>
                    <th className="py-3 px-6">Total Sessions</th>
                    <th className="py-3 px-6">Total Time</th>
                    <th className="py-3 px-6">First Consultation</th>
                    <th className="py-3 px-6">Latest Consultation</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 font-semibold text-foreground flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {(p.patientName || 'P')[0]?.toUpperCase()}
                        </div>
                        {p.patientName || `Patient (${p.patientId.slice(0, 8)})`}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                          {p.totalVisits} {p.totalVisits === 1 ? 'visit' : 'visits'}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-foreground">
                        {p.totalConsultationMinutes} mins
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {p.firstVisitDate
                          ? new Date(p.firstVisitDate).toLocaleDateString([], { dateStyle: 'medium' })
                          : '-'}
                      </td>
                      <td className="py-4 px-6 text-muted-foreground">
                        {p.lastVisitDate
                          ? new Date(p.lastVisitDate).toLocaleDateString([], { dateStyle: 'medium' })
                          : '-'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
                          <Link href="/doctor/appointments">
                            Sessions <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p>No treated patient histories recorded yet.</p>
              <p className="text-xs mt-1">
                Completed appointments will automatically generate relationship summaries here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
