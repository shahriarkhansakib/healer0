"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAppointments } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Clock, User, ChevronRight, Calendar } from "lucide-react";
import Link from "next/link";

interface AppointmentSession {
  id: string;
  patientName: string;
  appointmentDate: string | Date;
  consultationType?: string;
  reason?: string;
  consultationReason?: string;
  status: string;
}

export default function SessionsPage() {
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["appointments", "all"],
    queryFn: () => fetchAppointments("all"),
  });

  const appointments: AppointmentSession[] = data?.data || [];

  const filteredSessions = appointments.filter((appt) => {
    if (activeTab === "all") return true;

    const recordDate = new Date(appt.appointmentDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (activeTab === "today") return recordDate >= startOfToday && recordDate <= endOfToday;
    if (activeTab === "past") return recordDate < startOfToday;
    if (activeTab === "future") return recordDate > endOfToday;

    return true;
  });

  function formatDateTime(date: string | Date) {
    const d = new Date(date);
    return `${d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Clinical Sessions</h1>
        <p className="text-slate-500 mt-1">Manage all your past, present, and future consultation sessions.</p>
      </div>

      {/* Time Filter Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {["all", "today", "past", "future"].map((tab) => (
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
            {tab}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>No sessions found for this timeframe.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              href={`/doctor/sessions/${session.id}`}
              className="bg-white border border-slate-200/80 rounded-xl p-5 flex items-center justify-between gap-4 hover:border-teal-300 hover:shadow-sm transition-all group block"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <p className="font-semibold text-slate-800">{session.patientName}</p>
                </div>
                <p className="text-sm text-slate-500">{session.reason || session.consultationReason}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDateTime(session.appointmentDate)}
                  </span>
                  <span className="font-medium text-slate-500">{session.consultationType}</span>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
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
                <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
