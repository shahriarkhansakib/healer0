"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPrescriptions, createPrescription, fetchAppointments } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Pill, Plus, Calendar, FileText, Printer, Search } from "lucide-react";

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [appointmentId, setAppointmentId] = useState("");
  const [title, setTitle] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [instructions, setInstructions] = useState("");

  const { data: rxData, isLoading } = useQuery({
    queryKey: ["doctor-prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: () => fetchAppointments(),
  });

  const createRxMutation = useMutation({
    mutationFn: (data: any) => createPrescription(data),
    onSuccess: () => {
      toast.success("E-Prescription issued successfully");
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create prescription");
    },
  });

  const resetForm = () => {
    setAppointmentId("");
    setTitle("");
    setMedication("");
    setDosage("");
    setFrequency("");
    setInstructions("");
  };

  const prescriptions = rxData?.data || [];
  const appointments = appointmentsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">E-Prescriptions Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Issue structured digital prescriptions, track dosage schedules, and maintain Rx logs.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Issue New Prescription
        </button>
      </div>

      {/* Prescriptions Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading prescription logs...</div>
      ) : prescriptions.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <Pill className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No prescriptions issued yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Issue New Prescription" to create one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx: any) => {
            const patientName = rx.appointment?.patient?.user?.name || "Patient";
            const body = typeof rx.body === "string" ? JSON.parse(rx.body || "{}") : rx.body || {};

            return (
              <div
                key={rx.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rx.title || "Prescription"}</h3>
                    <p className="text-xs text-slate-500">Patient: <span className="font-semibold text-slate-800">{patientName}</span></p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(rx.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-2 text-xs bg-teal-50/40 p-3.5 rounded-lg border border-teal-100 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Medication:</span>
                    <span className="font-bold text-teal-900">{body.medication || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Dosage:</span>
                    <span className="font-medium text-slate-800">{body.dosage || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Frequency:</span>
                    <span className="font-medium text-slate-800">{body.frequency || "N/A"}</span>
                  </div>
                  {body.instructions && (
                    <div className="pt-2 border-t border-teal-200/60 text-slate-600">
                      <span className="font-semibold text-slate-800 block">Instructions:</span>
                      {body.instructions}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Issue E-Prescription</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
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
                      {app.patient?.user?.name || "Patient"} - {new Date(app.appointmentDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Prescription Title</label>
                <input
                  type="text"
                  placeholder="e.g. Daily Antibiotic & Therapy Rx"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medication</label>
                  <input
                    type="text"
                    placeholder="Amoxicillin"
                    value={medication}
                    onChange={(e) => setMedication(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="500mg"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <input
                    type="text"
                    placeholder="2x daily"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Take after meals for 7 days..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
                  if (!appointmentId || !title.trim() || !medication.trim()) {
                    toast.error("Please fill in appointment, title, and medication");
                    return;
                  }
                  createRxMutation.mutate({
                    appointmentId,
                    title,
                    body: { medication, dosage, frequency, instructions },
                  });
                }}
                disabled={createRxMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
              >
                Issue Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
