"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSessionNotes, createSessionNote, fetchAppointments } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Calendar, User, Search, CheckCircle2 } from "lucide-react";

export default function SessionNotesPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [sessionSummary, setSessionSummary] = useState("");

  const { data: notesData, isLoading: isLoadingNotes } = useQuery({
    queryKey: ["session-notes"],
    queryFn: fetchSessionNotes,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: () => fetchAppointments(),
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: { appointmentId: string; sessionSummary: string }) => createSessionNote(data),
    onSuccess: () => {
      toast.success("Clinical session note created");
      queryClient.invalidateQueries({ queryKey: ["session-notes"] });
      setShowAddModal(false);
      setAppointmentId("");
      setSessionSummary("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create session note");
    },
  });

  const notes = notesData?.data || [];
  const appointments = appointmentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Clinical Session Notes</h1>
          <p className="text-slate-500 text-sm mt-1">
            Log diagnostic impressions, post-consultation observations, and patient progress notes.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Session Note
        </button>
      </div>

      {/* Notes List */}
      {isLoadingNotes ? (
        <div className="p-12 text-center text-slate-400">Loading session notes...</div>
      ) : notes.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No session notes recorded yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Session Note" to create one</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note: any) => {
            const patientName = note.appointment?.patient?.user?.name || "Patient";

            return (
              <div
                key={note.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-3 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700 text-xs">
                      {patientName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{patientName}</h3>
                      <p className="text-[11px] text-slate-400">
                        Appointment ID: {note.appointmentId.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    {new Date(note.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </div>

                <div className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50/60 p-3.5 rounded-lg border border-slate-200/60">
                  {note.sessionSummary}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">New Clinical Session Note</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient Appointment
                </label>
                <select
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- Choose appointment --</option>
                  {appointments.map((app: any) => (
                    <option key={app.id} value={app.id}>
                      {app.patient?.user?.name || "Patient"} - {new Date(app.appointmentDate).toLocaleDateString()} ({app.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Impressions & Session Summary
                </label>
                <textarea
                  rows={5}
                  placeholder="Enter detailed observations, diagnostic conclusions, and plan..."
                  value={sessionSummary}
                  onChange={(e) => setSessionSummary(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!appointmentId || !sessionSummary.trim()) {
                    toast.error("Please select an appointment and write a summary");
                    return;
                  }
                  createNoteMutation.mutate({ appointmentId, sessionSummary });
                }}
                disabled={createNoteMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                Save Clinical Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
