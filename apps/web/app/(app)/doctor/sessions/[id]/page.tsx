"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAppointmentById } from "@/lib/api/doctor";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, User, Clock, FileText, Pill, Download, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SessionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: session, isLoading } = useQuery({
    queryKey: ["appointment", id],
    queryFn: () => fetchAppointmentById(id),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-100 rounded-xl" />
        <div className="h-48 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p>Session not found.</p>
        <button onClick={() => router.back()} className="text-teal-600 mt-4 hover:underline">
          Go back
        </button>
      </div>
    );
  }

  const d = new Date(session.appointmentDate);
  const formattedDate = d.toLocaleDateString([], { weekday: 'long', month: "long", day: "numeric", year: "numeric" });
  const formattedTime = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const handleDownload = () => {
    // In a real app, this would fetch a PDF from the server or use a library like jsPDF.
    // For now, triggering a browser print dialog is a quick way to save as PDF.
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <button
          onClick={() => router.push("/doctor/sessions")}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Session Details</h1>
          <p className="text-sm text-slate-500">Review clinical notes and prescriptions for this session.</p>
        </div>
      </div>

      {/* Patient & Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-semibold text-slate-800">Patient Details</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500 block mb-1">Name</span>
              <p className="font-medium text-slate-900">{session.patientName}</p>
            </div>
            <div>
              <span className="text-slate-500 block mb-1">Primary Complaint / Reason</span>
              <p className="font-medium text-slate-900">{session.reason || session.consultationReason || "Not specified"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-800">Session Information</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-slate-500 block mb-1">Date & Time</span>
              <p className="font-medium text-slate-900">{formattedDate} at {formattedTime}</p>
            </div>
            <div className="flex gap-8">
              <div>
                <span className="text-slate-500 block mb-1">Type</span>
                <p className="font-medium text-slate-900">{session.consultationType}</p>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">Status</span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border font-medium capitalize",
                    session.status === "scheduled" && "bg-teal-50 text-teal-700 border-teal-200",
                    session.status === "in-progress" && "bg-amber-50 text-amber-700 border-amber-200",
                    session.status === "completed" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                    session.status === "canceled" && "bg-red-50 text-red-700 border-red-200"
                  )}
                >
                  {session.status.replace("-", " ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-5 h-5 text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">Clinical Notes</h2>
        </div>
        
        {session.sessionNotes && session.sessionNotes.length > 0 ? (
          <div className="space-y-6">
            {session.sessionNotes.map((note: any, idx: number) => (
              <div key={note.id} className={cn("space-y-4", idx > 0 && "pt-6 border-t border-slate-100")}>
                {note.diagnosis && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Diagnosis</h3>
                    <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg">{note.diagnosis}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Session Summary</h3>
                  <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg whitespace-pre-wrap">{note.sessionSummary}</p>
                </div>
                {note.treatmentPlan && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1.5">Treatment Plan</h3>
                    <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded-lg whitespace-pre-wrap">{note.treatmentPlan}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No clinical notes recorded for this session.</p>
        )}
      </div>

      {/* Prescriptions */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Pill className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">Prescriptions</h2>
          </div>
        </div>
        
        {session.prescriptions && session.prescriptions.length > 0 ? (
          <div className="space-y-4">
            {session.prescriptions.map((rx: any) => (
              <div key={rx.id} className="border border-slate-100 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">{rx.title}</h3>
                </div>
                <div className="p-4">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-400 uppercase bg-white">
                      <tr>
                        <th className="pb-2 font-medium">Medication</th>
                        <th className="pb-2 font-medium">Dosage</th>
                        <th className="pb-2 font-medium">Frequency</th>
                        <th className="pb-2 font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rx.medications.map((med: any, i: number) => (
                        <tr key={i}>
                          <td className="py-3 font-medium text-slate-800">{med.medicationName}</td>
                          <td className="py-3">{med.dosage}</td>
                          <td className="py-3">{med.frequency}</td>
                          <td className="py-3">{med.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rx.notes && (
                    <div className="mt-4 p-3 bg-amber-50/50 rounded-md text-sm border border-amber-100/50">
                      <span className="font-medium text-amber-800 block mb-1">Doctor's Instructions:</span>
                      <span className="text-amber-700/90">{rx.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">No prescriptions issued for this session.</p>
        )}
      </div>

      {/* Actions */}
      {session.prescriptions && session.prescriptions.length > 0 && (
        <div className="flex justify-end pt-4 print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Prescription (PDF)
          </button>
        </div>
      )}
    </div>
  );
}
