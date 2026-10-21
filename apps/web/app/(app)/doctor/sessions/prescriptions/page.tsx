"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPrescriptions, createPrescription, fetchAppointments, fetchPatientRecords, fetchCounselingSessions } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Pill, Plus, Calendar, FileText, User, Clock, AlertCircle, Radio } from "lucide-react";

export default function PrescriptionsPage() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTargetKey, setSelectedTargetKey] = useState("");
  const [title, setTitle] = useState("");
  const [medication, setMedication] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("");
  const [duration, setDuration] = useState("30 days");
  const [instructions, setInstructions] = useState("");

  const { data: rxData, isLoading } = useQuery({
    queryKey: ["doctor-prescriptions"],
    queryFn: fetchPrescriptions,
  });

  const { data: appointmentsData } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: () => fetchAppointments(),
  });

  const { data: counselingData } = useQuery({
    queryKey: ["doctor-counseling-sessions"],
    queryFn: () => fetchCounselingSessions(),
  });

  const { data: patientsData } = useQuery({
    queryKey: ["doctor-patients"],
    queryFn: () => fetchPatientRecords(),
  });

  const createRxMutation = useMutation({
    mutationFn: (data: any) => createPrescription(data),
    onSuccess: () => {
      toast.success("E-Prescription issued successfully!");
      queryClient.invalidateQueries({ queryKey: ["doctor-prescriptions"] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create prescription");
    },
  });

  const resetForm = () => {
    setSelectedTargetKey("");
    setTitle("");
    setMedication("");
    setDosage("");
    setFrequency("");
    setDuration("30 days");
    setInstructions("");
  };

  const prescriptions = rxData?.data || (Array.isArray(rxData) ? rxData : []);
  const appointments = appointmentsData?.data || (Array.isArray(appointmentsData) ? appointmentsData : []);
  const counselingSessions = counselingData?.data || (Array.isArray(counselingData) ? counselingData : []);
  const patientRecords = patientsData?.data || (Array.isArray(patientsData) ? patientsData : []);

  const inProgressAppointments = appointments.filter(
    (a: any) => (a.status?.toLowerCase() === 'in-progress' || a.appointmentStatus?.toLowerCase() === 'inprogress')
  );
  const otherAppointments = appointments.filter(
    (a: any) => !(a.status?.toLowerCase() === 'in-progress' || a.appointmentStatus?.toLowerCase() === 'inprogress')
  );
  const activeCounseling = counselingSessions.filter(
    (c: any) => (c.status?.toLowerCase() === 'active' || c.status?.toLowerCase() === 'in-progress')
  );
  const otherCounseling = counselingSessions.filter(
    (c: any) => !(c.status?.toLowerCase() === 'active' || c.status?.toLowerCase() === 'in-progress')
  );

  // Unique patients who have booked an appointment or counseling session with this doctor
  const bookedPatients = (() => {
    const map = new Map<string, { patientId: string; name: string; subtitle: string; targetKey: string }>();

    // 1. From appointments booked with this doctor
    for (const a of appointments) {
      const pId = a.patientId;
      const pName = a.patientName || a.patient?.user?.name || "Patient";
      if (pId && !map.has(pId)) {
        const appDate = a.appointmentDate ? new Date(a.appointmentDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
        map.set(pId, {
          patientId: pId,
          name: pName,
          subtitle: `Booked Consultation (${a.consultationType || "Appointment"}${appDate ? ` • ${appDate}` : ""})`,
          targetKey: `appt:${a.id}:${pId}:${pName}`,
        });
      }
    }

    // 2. From counseling sessions booked with this doctor
    for (const c of counselingSessions) {
      const pId = c.patientId || c.userId;
      const pName = c.patientName || "Counseling Patient";
      if (pId && !map.has(pId)) {
        map.set(pId, {
          patientId: pId,
          name: pName,
          subtitle: `Booked Counseling (${c.sessionType || "Session"})`,
          targetKey: `counseling:${c.id}:${pId}:${pName}`,
        });
      }
    }

    // 3. From patient records specifically for this doctor
    for (const pr of patientRecords) {
      const pId = pr.patientId;
      const pName = pr.patientName || pr.patient?.user?.name || "Patient";
      if (pId && !map.has(pId)) {
        map.set(pId, {
          patientId: pId,
          name: pName,
          subtitle: pr.condition || "Booked Patient",
          targetKey: `patient:${pr.id}:${pId}:${pName}`,
        });
      }
    }

    return Array.from(map.values());
  })();

  const handleOpenAddModal = () => {
    queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
    queryClient.invalidateQueries({ queryKey: ["doctor-counseling-sessions"] });

    // If an active session is running, pre-select it for instantaneous prescribing
    if (!selectedTargetKey) {
      if (inProgressAppointments.length > 0) {
        const activeApp = inProgressAppointments[0];
        const pName = activeApp.patientName || activeApp.patient?.user?.name || "Patient";
        setSelectedTargetKey(`appt:${activeApp.id}:${activeApp.patientId}:${pName}`);
      } else if (activeCounseling.length > 0) {
        const activeC = activeCounseling[0];
        const pName = activeC.patientName || "Patient";
        setSelectedTargetKey(`counseling:${activeC.id}:${activeC.patientId || activeC.userId || ''}:${pName}`);
      } else if (bookedPatients.length === 1) {
        setSelectedTargetKey(bookedPatients[0].targetKey);
      }
    }
    setShowAddModal(true);
  };

  const handleIssuePrescription = () => {
    if (!selectedTargetKey) {
      toast.error("Please select a patient or appointment");
      return;
    }
    if (!title.trim() || !medication.trim()) {
      toast.error("Please provide prescription title and medication name");
      return;
    }

    const [type, id, pId, pName] = selectedTargetKey.split(":");

    createRxMutation.mutate({
      appointmentId: type === "appt" ? id : undefined,
      patientId: pId || undefined,
      patientName: pName || undefined,
      title: title.trim(),
      medications: [
        {
          medicationName: medication.trim(),
          dosage: dosage.trim() || "As directed",
          frequency: frequency.trim() || "Daily",
          duration: duration.trim() || "30 days",
          instructions: instructions.trim() || undefined,
        },
      ],
      notes: instructions.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">E-Prescriptions Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            Issue structured digital prescriptions, track dosage schedules, and manage clinical regimens that sync directly to the patient's dashboard.
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
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
          <p className="text-xs text-slate-400 mt-1">Click "Issue New Prescription" to prescribe a regimen for a patient</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((rx: any) => {
            const patientDisplayName = rx.patientName || rx.appointment?.patient?.user?.name || "Patient";
            
            // Normalize medications list (support both jsonb array and legacy body object)
            let medsList: any[] = [];
            if (Array.isArray(rx.medications) && rx.medications.length > 0) {
              medsList = rx.medications;
            } else if (rx.body) {
              const body = typeof rx.body === "string" ? JSON.parse(rx.body || "{}") : rx.body;
              medsList = [{
                medicationName: body.medication || "Prescribed Medication",
                dosage: body.dosage || "Standard dose",
                frequency: body.frequency || "Daily",
                duration: body.duration || "30 days",
                instructions: body.instructions || "",
              }];
            }

            return (
              <div
                key={rx.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{rx.title || "Prescription Protocol"}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient: <span className="font-semibold text-slate-800">{patientDisplayName}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {new Date(rx.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                      Active Rx
                    </span>
                  </div>
                </div>

                {medsList.length > 0 ? (
                  <div className="space-y-2.5">
                    {medsList.map((m: any, idx: number) => (
                      <div key={idx} className="text-xs bg-teal-50/40 p-3.5 rounded-lg border border-teal-100/80 text-slate-700 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-teal-950 text-sm flex items-center gap-1.5">
                            <Pill className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            {m.medicationName}
                          </span>
                          <span className="font-mono font-semibold px-2 py-0.5 bg-teal-600/10 text-teal-800 rounded text-[11px]">
                            {m.dosage}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-[11px] pt-1">
                          <span>Frequency: <strong className="text-slate-700">{m.frequency}</strong></span>
                          {m.duration && <span>Duration: <strong className="text-slate-700">{m.duration}</strong></span>}
                        </div>
                        {m.instructions && (
                          <div className="pt-1.5 border-t border-teal-200/50 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-700">Instructions: </span>
                            {m.instructions}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 p-3 bg-slate-50 rounded-lg">
                    Standard regimen issued.
                  </div>
                )}

                {rx.notes && (
                  <div className="text-xs bg-slate-50/80 p-3 rounded-lg border border-slate-200/60 text-slate-600 space-y-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      Clinical Precautions & Review:
                    </span>
                    <p className="text-slate-600 text-[11px] leading-relaxed">{rx.notes}</p>
                  </div>
                )}
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
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-teal-50 text-teal-600 rounded-lg">
                  <Pill className="w-4 h-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900">Issue E-Prescription</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Patient / Appointment Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Patient (Booked Patients)
                </label>
                <select
                  value={selectedTargetKey}
                  onChange={(e) => setSelectedTargetKey(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">
                    {bookedPatients.length > 0
                      ? "-- Choose a patient who booked with you --"
                      : "-- No patients have booked with you yet --"}
                  </option>
                  
                  {inProgressAppointments.length > 0 && (
                    <optgroup label="🔴 Live / In-Progress Consultation (Now)">
                      {inProgressAppointments.map((app: any) => {
                        const pName = app.patientName || app.patient?.user?.name || "Patient";
                        return (
                          <option key={app.id} value={`appt:${app.id}:${app.patientId}:${pName}`}>
                            ⭐ {pName} • In-Progress ({app.consultationType || "Consultation"})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}

                  {activeCounseling.length > 0 && (
                    <optgroup label="🔴 Live Counseling Sessions (Now)">
                      {activeCounseling.map((cs: any) => {
                        const pName = cs.patientName || "Counseling Patient";
                        return (
                          <option key={cs.id} value={`counseling:${cs.id}:${cs.patientId || cs.userId || ''}:${pName}`}>
                            ⭐ {pName} • Active ({cs.sessionType || "Counseling"})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}

                  {bookedPatients.length > 0 && (
                    <optgroup label="Patients Who Booked with You">
                      {bookedPatients.map((p) => (
                        <option key={p.patientId} value={p.targetKey}>
                          {p.name} • {p.subtitle}
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {otherAppointments.length > 0 && (
                    <optgroup label="Specific Booked Consultations">
                      {otherAppointments.map((app: any) => {
                        const pName = app.patientName || app.patient?.user?.name || "Patient";
                        const appDate = app.appointmentDate ? new Date(app.appointmentDate).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
                        return (
                          <option key={app.id} value={`appt:${app.id}:${app.patientId}:${pName}`}>
                            {pName} • {appDate} ({app.consultationType || app.status || "Consultation"})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}

                  {otherCounseling.length > 0 && (
                    <optgroup label="Specific Booked Counseling Sessions">
                      {otherCounseling.map((cs: any) => {
                        const pName = cs.patientName || "Counseling Patient";
                        const cDate = cs.startTime ? new Date(cs.startTime).toLocaleDateString([], { month: "short", day: "numeric" }) : "";
                        return (
                          <option key={cs.id} value={`counseling:${cs.id}:${cs.patientId || cs.userId || ''}:${pName}`}>
                            {pName} • {cDate} ({cs.sessionType || "Counseling"} - {cs.status})
                          </option>
                        );
                      })}
                    </optgroup>
                  )}
                </select>
                {bookedPatients.length === 0 && (
                  <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    No patients have booked with your psychologist account yet. Only patients who book a consultation or appointment with you will appear here.
                  </p>
                )}
              </div>

              {/* Title */}
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

              {/* Medication, Dosage, Frequency, Duration */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    placeholder="7 days"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Special Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions & Precautions</label>
                <textarea
                  rows={3}
                  placeholder="Take after meals for 7 days. Avoid alcohol and maintain hydration..."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleIssuePrescription}
                disabled={createRxMutation.isPending}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                {createRxMutation.isPending ? "Issuing..." : "Issue Prescription"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
