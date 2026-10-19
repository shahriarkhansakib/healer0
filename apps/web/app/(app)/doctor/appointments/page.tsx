"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAppointments, updateAppointmentStatus } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, User, CheckCircle, XCircle, Play } from "lucide-react";

const tabs = ['all', 'scheduled', 'in-progress', 'completed', 'canceled'] as const;

const statusColors: Record<string, string> = {
  'scheduled': 'bg-teal-50 text-teal-700 border-teal-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  'completed': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'canceled': 'bg-red-50 text-red-700 border-red-200',
};

function formatDateTime(date: string | Date) {
  const d = new Date(date);
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AppointmentsPage() {
  const [activeTab, setActiveTab] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['appointments', activeTab],
    queryFn: () => fetchAppointments(activeTab === 'all' ? undefined : activeTab),
  });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['doctor-overview'] });
      toast.success('Appointment status updated.');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const appointments = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <p className="text-slate-500 mt-1">Manage and track your patient consultation schedule.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 text-sm font-medium rounded-md transition-colors capitalize",
              activeTab === tab
                ? "bg-white text-teal-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab === 'all' ? 'All' : tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt: any) => (
            <div key={appt.id} className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="font-semibold text-slate-800">{appt.patientName}</p>
                </div>
                <p className="text-sm text-slate-500">{appt.reason}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(appt.appointmentDate)}
                  </span>
                  <span className="font-medium text-slate-500">{appt.consultationType}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-medium capitalize",
                  statusColors[appt.status] || 'bg-slate-50 text-slate-600'
                )}>
                  {appt.status.replace('-', ' ')}
                </span>

                {/* Action Buttons */}
                {appt.status === 'scheduled' && (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => mutation.mutate({ id: appt.id, status: 'in-progress' })}
                      className="p-1.5 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-600 transition-colors"
                      title="Start"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => mutation.mutate({ id: appt.id, status: 'canceled' })}
                      className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                      title="Cancel"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {appt.status === 'in-progress' && (
                  <button
                    onClick={() => mutation.mutate({ id: appt.id, status: 'completed' })}
                    className="p-1.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                    title="Complete"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
