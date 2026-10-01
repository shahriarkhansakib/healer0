"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDoctorProfile, updateDoctorSettings } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Settings, Bell, CheckCircle2, Globe, Shield, Save } from "lucide-react";

export default function DoctorSettingsPage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: fetchDoctorProfile,
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
          Configure booking acceptance automation, alerts, and localized platform options.
        </p>
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
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
