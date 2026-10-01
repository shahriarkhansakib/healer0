"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPatientRecords, updatePatientRisk } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { Users, AlertTriangle, Activity, Search, ShieldAlert, FileText, CheckCircle2, ChevronRight } from "lucide-react";

export default function PatientRecordsPage() {
  const queryClient = useQueryClient();
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [activePatient, setActivePatient] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["doctor-patients", selectedRisk],
    queryFn: () => fetchPatientRecords(selectedRisk === "all" ? undefined : selectedRisk),
  });

  const updateRiskMutation = useMutation({
    mutationFn: ({ id, riskLevel, notes }: { id: string; riskLevel: string; notes?: string }) =>
      updatePatientRisk(id, riskLevel, notes),
    onSuccess: () => {
      toast.success("Patient risk status updated");
      queryClient.invalidateQueries({ queryKey: ["doctor-patients"] });
      setActivePatient(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update risk level");
    },
  });

  const patients = data?.data || [];

  const filteredPatients = patients.filter((record: any) => {
    const patientName = record.patient?.user?.name?.toLowerCase() || "";
    const condition = record.condition?.toLowerCase() || "";
    return patientName.includes(searchTerm.toLowerCase()) || condition.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Patient Records Directory</h1>
          <p className="text-slate-500 text-sm mt-1">
            Access complete medical records, condition history, and manage clinical risk levels.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Risk Filter Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {["all", "Low", "Moderate", "High", "Critical"].map((risk) => (
          <button
            key={risk}
            onClick={() => setSelectedRisk(risk)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors",
              selectedRisk === risk
                ? "bg-teal-50 text-teal-700 border border-teal-200/80 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            {risk === "all" ? "All Patients" : `${risk} Risk`}
          </button>
        ))}
      </div>

      {/* Main Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading patient directory...</div>
      ) : filteredPatients.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No patient records found</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-700 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Patient Name</th>
                  <th className="px-5 py-3">Condition</th>
                  <th className="px-5 py-3">Risk Level</th>
                  <th className="px-5 py-3">Sessions</th>
                  <th className="px-5 py-3">Last Record Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((record: any) => {
                  const patientName = record.patient?.user?.name || "Patient";
                  const patientEmail = record.patient?.user?.email || "";

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700">
                            {patientName[0]}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block">{patientName}</span>
                            <span className="text-slate-400 text-[11px]">{patientEmail}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {record.condition || "General Consultation"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1",
                            record.riskLevel === "Low" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            record.riskLevel === "Moderate" && "bg-amber-50 text-amber-700 border border-amber-200",
                            record.riskLevel === "High" && "bg-rose-50 text-rose-700 border border-rose-200",
                            record.riskLevel === "Critical" && "bg-red-100 text-red-800 border border-red-300 font-bold"
                          )}
                        >
                          {(record.riskLevel === "High" || record.riskLevel === "Critical") && (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {record.riskLevel}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-700">
                        {record.previousSessions || 0}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {new Date(record.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setActivePatient(record)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          View Details
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal / Detail Drawer for Patient Record */}
      {activePatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {activePatient.patient?.user?.name || "Patient Record"}
                </h2>
                <p className="text-xs text-slate-500">{activePatient.patient?.user?.email}</p>
              </div>
              <button
                onClick={() => setActivePatient(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900 block mb-1">Primary Condition:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80">
                  {activePatient.condition || "None specified"}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-900 block mb-1">Medical History:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 whitespace-pre-wrap">
                  {activePatient.medicalHistory || "No detailed history recorded."}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-900 block mb-2">Update Clinical Risk Level:</span>
                <div className="flex items-center gap-2">
                  {["Low", "Moderate", "High", "Critical"].map((risk) => (
                    <button
                      key={risk}
                      onClick={() =>
                        updateRiskMutation.mutate({ id: activePatient.id, riskLevel: risk })
                      }
                      disabled={updateRiskMutation.isPending}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                        activePatient.riskLevel === risk
                          ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      {risk}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActivePatient(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
