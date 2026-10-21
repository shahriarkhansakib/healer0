"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  fetchParticipants, addParticipant, fetchScreeningRecords, 
  fetchMatchingRequests, createMatchingRequest, fetchProjects 
} from "@/lib/api/researcher";
import { 
  Users, UserPlus, Filter, ShieldCheck, Sparkles, CheckCircle2, 
  AlertCircle, X, Search, Check, Layers
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearcherParticipantsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'cohort' | 'screening' | 'matching'>('cohort');

  // Modals
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);

  // Enroll form state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [ageGroup, setAgeGroup] = useState("25-34");
  const [gender, setGender] = useState("Female");
  const [eligibility, setEligibility] = useState("Eligible");
  const [consent, setConsent] = useState("Consented");
  const [screeningCriteria, setScreeningCriteria] = useState("");

  // Matching form state
  const [matchingTargetGroup, setMatchingTargetGroup] = useState("");
  const [matchingCriteria, setMatchingCriteria] = useState("");

  const { data: projectsData } = useQuery({
    queryKey: ['researcher', 'projects'],
    queryFn: fetchProjects,
  });
  const projects = projectsData?.data || [];

  const { data: participantsData, isLoading: loadingParticipants } = useQuery({
    queryKey: ['researcher', 'participants'],
    queryFn: () => fetchParticipants(),
  });
  const participants = participantsData?.data || [];

  const { data: screeningData, isLoading: loadingScreening } = useQuery({
    queryKey: ['researcher', 'screening'],
    queryFn: () => fetchScreeningRecords(),
  });
  const screeningRecords = screeningData?.data || [];

  const { data: matchingData, isLoading: loadingMatching } = useQuery({
    queryKey: ['researcher', 'matching'],
    queryFn: fetchMatchingRequests,
  });
  const matchingRequests = matchingData?.data?.requests || [];
  const matchedList = matchingData?.data?.matched || [];

  const enrollMutation = useMutation({
    mutationFn: addParticipant,
    onSuccess: () => {
      toast.success("Subject enrolled and screening record created.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'participants'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'screening'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
      setEnrollModalOpen(false);
      setScreeningCriteria("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to enroll participant.");
    },
  });

  const matchingMutation = useMutation({
    mutationFn: createMatchingRequest,
    onSuccess: () => {
      toast.success("AI Participant Matching completed!");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'matching'] });
      setMatchModalOpen(false);
      setMatchingTargetGroup("");
      setMatchingCriteria("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to execute matching request.");
    },
  });

  const handleEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please create or select a study project first.");
      return;
    }
    enrollMutation.mutate({
      projectId: projId,
      ageGroup,
      gender,
      eligibilityStatus: eligibility,
      consentStatus: consent,
      screeningCriteria: screeningCriteria.trim() || undefined,
    });
  };

  const handleMatchingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please select a study project.");
      return;
    }
    matchingMutation.mutate({
      projectId: projId,
      targetGroup: matchingTargetGroup.trim() || "Adults aged 18-45",
      criteria: { notes: matchingCriteria.trim() || "Baseline clinical alignment" },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <Users className="w-5 h-5 text-fuchsia-600" />
            </span>
            Participants & Cohort Screening
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anonymized subject directory, clinical screening audits, and AI-assisted cohort matching.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setMatchModalOpen(true)}
            variant="outline"
            className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50 cursor-pointer text-xs"
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-fuchsia-600" />
            AI Cohort Matching
          </Button>
          <Button 
            onClick={() => setEnrollModalOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Enroll Subject
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-fuchsia-100 gap-2">
        <button
          onClick={() => setActiveTab('cohort')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'cohort'
              ? 'border-fuchsia-600 text-[#4a044e]'
              : 'border-transparent text-muted-foreground hover:text-[#4a044e]'
          }`}
        >
          Enrolled Cohort ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab('screening')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'screening'
              ? 'border-fuchsia-600 text-[#4a044e]'
              : 'border-transparent text-muted-foreground hover:text-[#4a044e]'
          }`}
        >
          Clinical Screening Audits ({screeningRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('matching')}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'matching'
              ? 'border-fuchsia-600 text-[#4a044e]'
              : 'border-transparent text-muted-foreground hover:text-[#4a044e]'
          }`}
        >
          AI Match Requests ({matchingRequests.length})
        </button>
      </div>

      {/* Tab 1: Cohort Table */}
      {activeTab === 'cohort' && (
        <Card className="border-border/80">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">De-Identified Participant Directory</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingParticipants ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading participants...</div>
            ) : participants.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-semibold text-foreground">No participants enrolled</p>
                <p className="text-xs text-muted-foreground mt-1">Enroll your first participant using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Subject ID</th>
                      <th className="py-3 px-4 font-semibold">Age Bracket</th>
                      <th className="py-3 px-4 font-semibold">Gender</th>
                      <th className="py-3 px-4 font-semibold">Eligibility</th>
                      <th className="py-3 px-4 font-semibold">Consent Status</th>
                      <th className="py-3 px-4 font-semibold">Enrolled Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {participants.map((p: any) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          {p.participantCode}
                        </td>
                        <td className="py-3.5 px-4 text-foreground">{p.ageGroup}</td>
                        <td className="py-3.5 px-4 text-muted-foreground">{p.gender}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            p.eligibilityStatus === 'Eligible'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {p.eligibilityStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200/80 uppercase tracking-wider">
                            {p.consentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(p.joinedDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Screening Audits */}
      {activeTab === 'screening' && (
        <Card className="border-border/80">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Screening Criteria Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingScreening ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading screening records...</div>
            ) : screeningRecords.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <ShieldCheck className="w-8 h-8 mx-auto text-muted-foreground/60 mb-2" />
                <p className="font-semibold text-foreground">No screening records recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider border-b">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Evaluation Criteria</th>
                      <th className="py-3 px-4 font-semibold">Audit Result</th>
                      <th className="py-3 px-4 font-semibold">Screened Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {screeningRecords.map((s: any) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 text-foreground font-medium max-w-md">
                          {s.criteria}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            s.result === 'Passed'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {s.result}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(s.screenedDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Matching Requests */}
      {activeTab === 'matching' && (
        <div className="space-y-6">
          <Card className="border-border/80">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold">AI Participant Matching Results</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {matchedList.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Sparkles className="w-8 h-8 mx-auto text-fuchsia-400 mb-2" />
                  <p className="font-semibold text-foreground">No AI matches computed yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "AI Cohort Matching" above to find candidates aligned with study criteria.
                  </p>
                </div>
              ) : (
                matchedList.map((m: any) => (
                  <div key={m.id} className="p-4 rounded-xl border border-fuchsia-100 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200/80 px-2 py-0.5 rounded-md font-mono text-xs">
                          Score: {m.matchScore}
                        </span>
                        <span className="font-semibold text-[#4a044e]">Candidate Alignment</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{m.reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" className="h-7 text-xs cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                        View Criteria
                      </Button>
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-semibold">
                        Approve Candidate
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enroll Modal */}
      {enrollModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <UserPlus className="w-4 h-4 text-fuchsia-600" />
                </span>
                Enroll Clinical Subject
              </h2>
              <button onClick={() => setEnrollModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Assign to Study Project *</label>
                <select 
                  value={selectedProjectId} 
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                >
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.projectTitle}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Age Group</label>
                  <select 
                    value={ageGroup} 
                    onChange={(e) => setAgeGroup(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="18-24">18-24</option>
                    <option value="25-34">25-34</option>
                    <option value="35-49">35-49</option>
                    <option value="50-64">50-64</option>
                    <option value="65+">65+</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Gender</label>
                  <select 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold">Eligibility</label>
                  <select 
                    value={eligibility} 
                    onChange={(e) => setEligibility(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="Eligible">Eligible</option>
                    <option value="Pending">Pending</option>
                    <option value="Ineligible">Ineligible</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold">Consent Status</label>
                  <select 
                    value={consent} 
                    onChange={(e) => setConsent(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="Consented">Consented</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Screening Criteria Notes</label>
                <textarea 
                  value={screeningCriteria}
                  onChange={(e) => setScreeningCriteria(e.target.value)}
                  placeholder="Record criteria met: e.g. GAD-7 baseline score > 10, no history of substance abuse..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-card p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEnrollModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={enrollMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {enrollMutation.isPending ? "Enrolling..." : "Enroll Subject"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matching Modal */}
      {matchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <Sparkles className="w-4 h-4 text-fuchsia-600" />
                </span>
                Run AI Participant Matching
              </h2>
              <button onClick={() => setMatchModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleMatchingSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold">Study Project *</label>
                <select 
                  value={selectedProjectId} 
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-fuchsia-200 bg-card px-3 text-xs"
                >
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.projectTitle}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Target Demographic Cohort</label>
                <Input 
                  value={matchingTargetGroup}
                  onChange={(e) => setMatchingTargetGroup(e.target.value)}
                  placeholder="e.g. Young adults with chronic sleep disturbances"
                  className="text-xs border-fuchsia-200"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold">Matching Constraints & Biomarkers</label>
                <textarea 
                  value={matchingCriteria}
                  onChange={(e) => setMatchingCriteria(e.target.value)}
                  placeholder="Specify symptom thresholds, therapy compliance, or wearable telemetry patterns..."
                  rows={3}
                  className="w-full rounded-md border border-fuchsia-200 bg-card p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setMatchModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={matchingMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {matchingMutation.isPending ? "Computing..." : "Run AI Matching"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
