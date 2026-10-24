"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchReportsAndPermissions, createReport, requestPermission, fetchProjects } from "@/lib/api/researcher";
import { 
  FileText, ShieldCheck, Plus, Download, ExternalLink, Calendar, 
  CheckCircle2, AlertTriangle, X 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearcherReportsPage() {
  const queryClient = useQueryClient();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [permModalOpen, setPermModalOpen] = useState(false);

  // Report Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [summary, setSummary] = useState("");

  // Perm Form State
  const [dataAccessType, setDataAccessType] = useState("De-identified Telemetry");

  const { data: projectsData } = useQuery({
    queryKey: ['researcher', 'projects'],
    queryFn: fetchProjects,
  });
  const projects = projectsData?.data || [];

  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['researcher', 'reports'],
    queryFn: fetchReportsAndPermissions,
  });

  const reports = reportsData?.data?.reports || [];
  const permissions = reportsData?.data?.permissions || [];

  const reportMutation = useMutation({
    mutationFn: createReport,
    onSuccess: () => {
      toast.success("Study report generated and cataloged.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'reports'] });
      setReportModalOpen(false);
      setReportTitle("");
      setSummary("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to generate report.");
    },
  });

  const permMutation = useMutation({
    mutationFn: requestPermission,
    onSuccess: () => {
      toast.success("IRB protocol permission requested.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'reports'] });
      setPermModalOpen(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to request permission.");
    },
  });

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please select a study project.");
      return;
    }
    if (!reportTitle.trim() || !summary.trim()) {
      toast.error("Please fill in report title and summary.");
      return;
    }
    reportMutation.mutate({
      projectId: projId,
      reportTitle: reportTitle.trim(),
      summary: summary.trim(),
    });
  };

  const handlePermSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please select a study project.");
      return;
    }
    permMutation.mutate({
      projectId: projId,
      dataAccessType,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <FileText className="w-5 h-5 text-fuchsia-600" />
            </span>
            Research Reports & IRB Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish interim study milestones, audit protocol permissions, and submit institutional ethics approvals.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setPermModalOpen(true)}
            variant="outline"
            className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50 text-xs cursor-pointer font-medium"
          >
            <ShieldCheck className="w-4 h-4 mr-1.5 text-fuchsia-600" />
            Request IRB Tier
          </Button>
          <Button 
            onClick={() => setReportModalOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white text-xs cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Generate Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Research Reports */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-[#4a044e] uppercase tracking-wider">
            Study Publications & Interim Reports ({reports.length})
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse border border-fuchsia-100" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground border-dashed border-fuchsia-200">
              <FileText className="w-10 h-10 mx-auto text-fuchsia-400 mb-2" />
              <p className="font-semibold text-[#4a044e]">No Study Reports Generated Yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Compile study telemetry and analytics into an official research report.
              </p>
            </Card>
          ) : (
            reports.map((r: any) => (
              <Card key={r.id} className="p-5 border-fuchsia-100 hover:border-fuchsia-300 transition-all space-y-3 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-fuchsia-100/80 pb-2.5">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-[#4a044e]">{r.reportTitle}</h4>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-fuchsia-500" />
                      Generated: {new Date(r.generatedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      const blob = new Blob([`Report: ${r.reportTitle}\nDate: ${r.generatedDate}\nSummary: ${r.summary}`], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${r.reportTitle.toLowerCase().replace(/\s+/g, '-')}.txt`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="text-xs h-7 cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-fuchsia-600" />
                    Download Brief
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {r.summary}
                </p>
              </Card>
            ))
          )}
        </div>

        {/* Right 1 Col: IRB Protocol Permissions */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
            IRB Protocol Permissions
          </h3>

          <div className="space-y-3">
            {permissions.length === 0 ? (
              <Card className="p-6 text-center text-muted-foreground text-xs border-dashed border-fuchsia-200">
                No active IRB protocol submissions recorded.
              </Card>
            ) : (
              permissions.map((p: any) => (
                <Card key={p.id} className="p-4 border-fuchsia-100 space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#4a044e]">{p.dataAccessType}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      p.approvalStatus === 'Approved'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {p.approvalStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-fuchsia-100/70">
                    <span>Double-blind mode enforced</span>
                    <span>{p.approvedDate ? new Date(p.approvedDate).toLocaleDateString() : 'Under Review'}</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Generate Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <FileText className="w-4 h-4 text-fuchsia-600" />
                </span>
                Generate Study Report
              </h2>
              <button onClick={() => setReportModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleReportSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Associated Study Project *</label>
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
                <label className="font-semibold text-foreground">Report Title *</label>
                <Input 
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="e.g. Interim Cohort 1 Analysis & Efficacy Milestone"
                  className="text-xs border-fuchsia-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Executive Summary & Abstract *</label>
                <textarea 
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder="Summarize key trial findings, subject adherence, statistical significance, and next steps..."
                  rows={4}
                  className="w-full rounded-md border border-fuchsia-200 bg-card p-2.5 text-xs"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setReportModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={reportMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {reportMutation.isPending ? "Generating..." : "Generate Report"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Request Permission Modal */}
      {permModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <ShieldCheck className="w-4 h-4 text-fuchsia-600" />
                </span>
                Request IRB Data Tier
              </h2>
              <button onClick={() => setPermModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePermSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Study Project *</label>
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
                <label className="font-semibold text-foreground">Requested Data Access Tier</label>
                <select 
                  value={dataAccessType} 
                  onChange={(e) => setDataAccessType(e.target.value)}
                  className="w-full h-9 rounded-md border border-fuchsia-200 bg-card px-3 text-xs"
                >
                  <option value="De-identified Telemetry">De-identified Telemetry (Tier 1)</option>
                  <option value="Aggregated Demographic Metrics">Aggregated Demographic Metrics (Tier 2)</option>
                  <option value="Clinical Longitudinal Microdata">Clinical Longitudinal Microdata (Tier 3)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setPermModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={permMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {permMutation.isPending ? "Submitting..." : "Submit IRB Request"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
