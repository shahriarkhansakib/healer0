"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDoctorProfile, updateDoctorSettings } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Bell, CheckCircle2, Globe, Shield, Save, FlaskConical, ArrowRight } from "lucide-react";
import { fetchResearcherStatus, toggleResearcherMode } from "@/lib/api/researcher";
import Link from "next/link";

export default function DoctorSettingsPage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: fetchDoctorProfile,
  });

  const { data: researcherData, isLoading: loadingResearcher } = useQuery({
    queryKey: ['researcher', 'status'],
    queryFn: fetchResearcherStatus,
  });

  const isResearcherActive = Boolean(researcherData?.data?.isEnabled);

  const toggleResearcherMutation = useMutation({
    mutationFn: (enable: boolean) => toggleResearcherMode(enable),
    onSuccess: (res) => {
      const active = res.data?.isEnabled;
      toast.success(active ? "Researcher Dashboard activated!" : "Researcher Dashboard deactivated.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update researcher dashboard status.");
    },
  });

  const profile = profileData?.data;
  const settings = profile?.settings || {};

  const [autoAcceptBooking, setAutoAcceptBooking] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    if (settings) {
      setAutoAcceptBooking(!!settings.autoAcceptBooking);
      setNotificationEnabled(settings.notificationEnabled ?? true);
      setLanguage(settings.language || "en");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => updateDoctorSettings(data),
    onSuccess: () => {
      toast.success("Doctor preferences updated successfully");
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update settings");
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading doctor settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Doctor Workstation Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Configure booking acceptance automation, alerts, localized platform options, and researcher access.
        </p>
      </div>

      {/* Researcher Access Card for Clinicians */}
      <div className="bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/40 border border-indigo-200/80 rounded-xl p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 border border-indigo-200 mt-0.5 shadow-2xs">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Researcher Dashboard & Clinical Studies</h3>
                {isResearcherActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase tracking-wider">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                Anyone on Healer can participate in or lead research. Turn on the Researcher Dashboard to create clinical studies, screening protocols, custom questionnaires, and inspect anonymized research data.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
            {isResearcherActive && (
              <Link
                href="/researcher"
                className="px-3 py-1.5 border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium inline-flex items-center gap-1 shadow-2xs transition-colors"
              >
                Open Dashboard
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => toggleResearcherMutation.mutate(!isResearcherActive)}
              disabled={toggleResearcherMutation.isPending || loadingResearcher}
              className={cn(
                "px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer",
                isResearcherActive 
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {isResearcherActive ? "Enabled" : "Enable Researcher"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-6">
        {/* Auto-Accept Switch */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              Auto-Accept Patient Bookings
            </h3>
            <p className="text-xs text-slate-500">
              Automatically confirm appointment requests that fall strictly within your set duty hours.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoAcceptBooking(!autoAcceptBooking)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              autoAcceptBooking ? "bg-teal-600" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-2xs ring-0 transition duration-200 ease-in-out",
                autoAcceptBooking ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Notification Alerts */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              System Notification Alerts
            </h3>
            <p className="text-xs text-slate-500">
              Receive instant alerts for urgent patient risk changes and upcoming consultation starts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationEnabled(!notificationEnabled)}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
              notificationEnabled ? "bg-teal-600" : "bg-slate-200"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-2xs ring-0 transition duration-200 ease-in-out",
                notificationEnabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>

        {/* Language Selection */}
        <div className="space-y-2 py-2">
          <label className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Globe className="w-4 h-4 text-teal-600" />
            System Interface Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full sm:w-64 p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          >
            <option value="en">English (US)</option>
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
            <option value="bn">Bengali (বাংলা)</option>
          </select>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={() =>
              updateSettingsMutation.mutate({
                autoAcceptBooking,
                notificationEnabled,
                language,
              })
            }
            disabled={updateSettingsMutation.isPending}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
