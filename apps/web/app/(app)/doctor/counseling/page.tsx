"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCounselingSessions, updateCounselingStatus } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Clock, CheckCircle, AlertCircle, Calendar, User, Search, Filter } from "lucide-react";

export default function CounselingPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data, isLoading } = useQuery({
    queryKey: ["counseling-sessions"],
    queryFn: fetchCounselingSessions,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      updateCounselingStatus(id, status, notes),
    onSuccess: () => {
      toast.success("Counseling session updated");
      queryClient.invalidateQueries({ queryKey: ["counseling-sessions"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update session");
    },
  });

  const sessions = data?.data || [];

  const filteredSessions = sessions.filter((s: any) => {
    const matchesStatus = filterStatus === "all" || s.status === filterStatus;
    const patientName = s.patient?.user?.name?.toLowerCase() || "";
    const sessionType = s.sessionType?.toLowerCase() || "";
    const matchesSearch = patientName.includes(searchTerm.toLowerCase()) || sessionType.includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Counseling Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">
            Monitor and review assigned therapy & counseling consultations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patient or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {["all", "scheduled", "completed", "canceled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors",
              filterStatus === status
                ? "bg-teal-50 text-teal-700 border border-teal-200/80 shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Sessions Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">Loading counseling sessions...</div>
      ) : filteredSessions.length === 0 ? (
        <div className="p-12 text-center bg-white border border-slate-200 rounded-xl">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-medium">No counseling sessions found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing filter criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSessions.map((session: any) => {
            const patientName = session.patient?.user?.name || "Patient";
            const patientEmail = session.patient?.user?.email || "";

            return (
              <div
                key={session.id}
                className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center font-bold text-teal-700">
                      {patientName[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">{patientName}</h3>
                      <p className="text-xs text-slate-500">{patientEmail}</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider",
                      session.status === "scheduled" && "bg-blue-50 text-blue-700 border border-blue-200",
                      session.status === "completed" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      session.status === "canceled" && "bg-rose-50 text-rose-700 border border-rose-200"
                    )}
                  >
                    {session.status}
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">Type:</span> {session.sessionType || "General Counseling"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">Start:</span>{" "}
                    {new Date(session.startTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium">End:</span>{" "}
                    {new Date(session.endTime).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>

                {session.status === "scheduled" && (
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: session.id, status: "completed" })}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      Mark Completed
                    </button>
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: session.id, status: "canceled" })}
                      disabled={updateStatusMutation.isPending}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
