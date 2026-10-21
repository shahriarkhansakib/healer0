"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchResearcherStatus, updateResearcherSettings, toggleResearcherMode 
} from "@/lib/api/researcher";
import { 
  Settings, User, Building2, Globe, Shield, Save, Bell, 
  FlaskConical, ArrowRight, UserCheck, HeartPulse 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ResearcherSettingsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: statusData, isLoading } = useQuery({
    queryKey: ['researcher', 'status'],
    queryFn: fetchResearcherStatus,
  });

  const profile = statusData?.data?.profile;
  const settings = statusData?.data?.settings;
  const isEnabled = Boolean(statusData?.data?.isEnabled);

  const [fullName, setFullName] = useState("");
  const [institution, setInstitution] = useState("");
  const [researchField, setResearchField] = useState("");
  const [designation, setDesignation] = useState("Principal Investigator");
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [language, setLanguage] = useState("en");
  const [privacyMode, setPrivacyMode] = useState(true);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || statusData?.data?.user?.name || "");
      setInstitution(profile.institution || "Healer Clinical Research Network");
      setResearchField(profile.researchField || "Behavioral Neurobiology");
      setDesignation(profile.designation || "Principal Investigator");
    }
    if (settings) {
      setNotificationEnabled(settings.notificationEnabled ?? true);
      setLanguage(settings.language || "en");
      setPrivacyMode(settings.privacyMode ?? true);
    }
  }, [profile, settings, statusData]);

  const updateMutation = useMutation({
    mutationFn: updateResearcherSettings,
    onSuccess: () => {
      toast.success("Researcher preferences saved successfully.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update settings.");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (enable: boolean) => toggleResearcherMode(enable),
    onSuccess: (res) => {
      const active = res.data?.isEnabled;
      toast.success(active ? "Researcher mode active." : "Researcher mode disabled.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      if (!active) {
        router.push('/patient/settings');
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to toggle researcher mode.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      fullName: fullName.trim() || undefined,
      institution: institution.trim() || undefined,
      researchField: researchField.trim() || undefined,
      designation: designation.trim() || undefined,
      notificationEnabled,
      language,
      privacyMode,
    });
  };

  if (isLoading) {
    return <div className="p-12 text-center text-sm text-muted-foreground">Loading researcher workstation settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
            <Settings className="w-5 h-5 text-fuchsia-600" />
          </span>
          Researcher Console Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage academic credentials, institutional affiliations, double-blind privacy modes, and console access.
        </p>
      </div>

      {/* Main Switch: Researcher Dashboard Mode */}
      <Card className="p-5 border-fuchsia-200/80 bg-gradient-to-r from-fuchsia-50/80 via-white to-pink-50/40 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-fuchsia-100 text-fuchsia-700 shrink-0 border border-fuchsia-200 mt-0.5">
              <FlaskConical className="w-5 h-5 text-fuchsia-600" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#4a044e]">Researcher Dashboard Status</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isEnabled ? 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200/80' : 'bg-muted text-muted-foreground'
                }`}>
                  {isEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                Turning this off disables researcher console routes and hides research tools until you re-enable them in settings.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant={isEnabled ? "default" : "outline"}
            onClick={() => toggleMutation.mutate(!isEnabled)}
            disabled={toggleMutation.isPending}
            className={isEnabled ? "bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs" : "cursor-pointer text-xs border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"}
          >
            {isEnabled ? "Disable Researcher" : "Enable Researcher"}
          </Button>
        </div>
      </Card>

      {/* Form Card */}
      <Card className="border-border/80">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-base font-semibold">Investigator Profile & Affiliation</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Principal Investigator Name</label>
                <Input 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Jane Smith, MD"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Registered Email</label>
                <Input 
                  value={profile?.email || statusData?.data?.user?.email || ""}
                  disabled
                  className="text-xs bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Organization / University Affiliation</label>
                <Input 
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University School of Medicine"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Primary Research Domain</label>
                <Input 
                  value={researchField}
                  onChange={(e) => setResearchField(e.target.value)}
                  placeholder="e.g. Neuropsychiatry & Cognitive Therapeutics"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Academic Designation</label>
                <select 
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                >
                  <option value="Principal Investigator">Principal Investigator (PI)</option>
                  <option value="Co-Investigator">Co-Investigator</option>
                  <option value="Clinical Fellow">Clinical Fellow</option>
                  <option value="Postdoctoral Researcher">Postdoctoral Researcher</option>
                  <option value="Independent Scientist">Independent Scientist</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Interface Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Spanish (Español)</option>
                  <option value="fr">French (Français)</option>
                  <option value="bn">Bengali (বাংলা)</option>
                </select>
              </div>
            </div>

            {/* Privacy & Notifications Switches */}
            <div className="pt-4 border-t space-y-3">
              <h4 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                Compliance & Protocol Controls
              </h4>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground block">Double-Blind De-Identification</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Automatically mask all patient PII and enforce pseudonymized code references.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={privacyMode ? "default" : "outline"}
                  onClick={() => setPrivacyMode(!privacyMode)}
                  className={privacyMode ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer h-7 text-xs" : "h-7 text-xs cursor-pointer"}
                >
                  {privacyMode ? "Enforced" : "Standard"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="space-y-0.5">
                  <span className="font-semibold text-foreground block">Research Alerts & Ingestion Pings</span>
                  <span className="text-muted-foreground text-[11px] block">
                    Receive immediate notifications when new survey responses or sensor telemetry are submitted.
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={notificationEnabled ? "default" : "outline"}
                  onClick={() => setNotificationEnabled(!notificationEnabled)}
                  className={notificationEnabled ? "bg-fuchsia-600 hover:bg-fuchsia-700 text-white cursor-pointer h-7 text-xs font-semibold" : "h-7 text-xs cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"}
                >
                  {notificationEnabled ? "Enabled" : "Muted"}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-fuchsia-100">
              <div className="flex items-center gap-2">
                <Link href="/patient">
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-[#4a044e] hover:bg-fuchsia-50 cursor-pointer">
                    <HeartPulse className="w-3.5 h-3.5 mr-1 text-fuchsia-600" />
                    Patient View
                  </Button>
                </Link>
                <Link href="/doctor">
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-[#4a044e] hover:bg-fuchsia-50 cursor-pointer">
                    <UserCheck className="w-3.5 h-3.5 mr-1 text-pink-600" />
                    Doctor View
                  </Button>
                </Link>
              </div>

              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer font-semibold shadow-xs"
              >
                <Save className="w-4 h-4 mr-1.5" />
                {updateMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
