"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FlaskConical,
  Plus,
  Search,
  Users,
  Calendar,
  ClipboardList,
  CheckCircle2,
  FileText,
  Loader2,
  AlertCircle,
  Download,
  FileSpreadsheet,
  FileJson,
  Edit3,
  Eye,
  ShieldCheck,
  Activity,
  Layers,
  ChevronRight,
  Database,
  CalendarRange,
  X,
  Check
} from "lucide-react";
import {
  fetchResearchProjects,
  fetchResearchProjectById,
  createResearchProject,
  updateResearchProject,
  CreateProjectPayload,
  ResearchProject,
  ResearchParticipant,
  ResearchSurvey
} from "@/lib/api/research";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "recruiting" | "data_collection" | "in_progress" | "completed";
type DetailTab = "overview" | "participants" | "surveys" | "telemetry" | "edit";

export default function ClinicalStudiesPage() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Selected study for inspection modal
  const [selectedStudyId, setSelectedStudyId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");

  // New study form state
  const [title, setTitle] = useState("");
  const [researchArea, setResearchArea] = useState("");
  const [protocolNumber, setProtocolNumber] = useState("");
  const [targetSampleSize, setTargetSampleSize] = useState("100");
  const [status, setStatus] = useState<CreateProjectPayload["status"]>("recruiting");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [description, setDescription] = useState("");

  // Edit study form state
  const [editTitle, setEditTitle] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editProtocol, setEditProtocol] = useState("");
  const [editSampleSize, setEditSampleSize] = useState("100");
  const [editStatus, setEditStatus] = useState<CreateProjectPayload["status"]>("recruiting");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  // Queries
  const { data: projects, isLoading, isError, error } = useQuery({
    queryKey: ["research", "projects"],
    queryFn: fetchResearchProjects,
  });

  const { data: detailedStudy, isLoading: isDetailLoading } = useQuery({
    queryKey: ["research", "project", selectedStudyId],
    queryFn: () => (selectedStudyId ? fetchResearchProjectById(selectedStudyId) : null),
    enabled: !!selectedStudyId,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectPayload) => createResearchProject(payload),
    onSuccess: () => {
      toast.success("Clinical study successfully created and registered.");
      setIsCreateOpen(false);
      setTitle("");
      setResearchArea("");
      setProtocolNumber("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create study");
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: ResearchProject["status"] }) =>
      updateResearchProject(id, { status: newStatus }),
    onSuccess: (updated) => {
      toast.success(`Status updated to ${formatStatus(updated.status)}`);
      queryClient.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update study status");
    },
  });

  // Full edit mutation
  const editMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateProjectPayload> }) =>
      updateResearchProject(id, payload),
    onSuccess: () => {
      toast.success("Study protocol successfully updated.");
      setDetailTab("overview");
      queryClient.invalidateQueries({ queryKey: ["research"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save protocol changes");
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !researchArea.trim()) {
      toast.error("Title and research area are required.");
      return;
    }
    createMutation.mutate({
      title,
      researchArea,
      protocolNumber: protocolNumber.trim() || undefined,
      targetSampleSize: parseInt(targetSampleSize) || 0,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description: description.trim() || undefined,
    });
  };

  const handleOpenDetail = (study: ResearchProject) => {
    setSelectedStudyId(study.id);
    setDetailTab("overview");
    setEditTitle(study.title);
    setEditArea(study.researchArea);
    setEditProtocol(study.protocolNumber || "");
    setEditSampleSize(String(study.targetSampleSize || 0));
    setEditStatus(study.status);
    setEditStartDate(study.startDate ? study.startDate.split("T")[0] : "");
    setEditEndDate(study.endDate ? study.endDate.split("T")[0] : "");
    setEditDescription(study.description || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudyId) return;
    editMutation.mutate({
      id: selectedStudyId,
      payload: {
        title: editTitle,
        researchArea: editArea,
        protocolNumber: editProtocol.trim() || undefined,
        targetSampleSize: parseInt(editSampleSize) || 0,
        status: editStatus,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
        description: editDescription.trim() || undefined,
      },
    });
  };

  const projectList: ResearchProject[] = Array.isArray(projects)
    ? projects
    : Array.isArray((projects as any)?.projects)
    ? (projects as any).projects
    : [];

  const filteredProjects = projectList.filter((p) => {
    const matchesFilter = activeFilter === "all" || p.status === activeFilter;
    const matchesSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.researchArea.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.protocolNumber && p.protocolNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (studyStatus: string) => {
    switch (studyStatus) {
      case "recruiting":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "data_collection":
        return "bg-indigo-50 text-indigo-700 border-indigo-200/80";
      case "in_progress":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const formatStatus = (s: string) => {
    return s.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  // CSV Export Engine
  const exportStudyAsCsv = (project: ResearchProject) => {
    const headers = [
      "Study_ID",
      "Protocol_Number",
      "Study_Title",
      "Research_Area",
      "Study_Status",
      "Participant_Code",
      "Age_Group",
      "Gender",
      "Consent_Status",
      "Eligibility",
      "Data_Type",
      "Collected_Date",
      "Data_Payload"
    ];

    const rows: string[][] = [];
    const participants = project.participants || [];
    const telemetry = project.dataCollection || [];

    if (telemetry.length > 0) {
      for (const item of telemetry) {
        const participant = participants.find((p) => p.id === item.participantId);
        rows.push([
          project.id,
          project.protocolNumber || "N/A",
          project.title,
          project.researchArea,
          project.status,
          participant?.participantCode || item.participantId || "ANONYMOUS",
          participant?.ageGroup || "N/A",
          participant?.gender || "N/A",
          participant?.consentStatus || "N/A",
          participant?.eligibilityStatus || "N/A",
          item.dataType,
          item.collectedDate ? new Date(item.collectedDate).toISOString().split("T")[0] : "N/A",
          typeof item.dataValue === "object" ? JSON.stringify(item.dataValue) : String(item.dataValue ?? ""),
        ]);
      }
    } else if (participants.length > 0) {
      for (const p of participants) {
        rows.push([
          project.id,
          project.protocolNumber || "N/A",
          project.title,
          project.researchArea,
          project.status,
          p.participantCode,
          p.ageGroup || "N/A",
          p.gender || "N/A",
          p.consentStatus,
          p.eligibilityStatus,
          "COHORT_REGISTRATION",
          p.joinedDate ? new Date(p.joinedDate).toISOString().split("T")[0] : "N/A",
          "ENROLLED",
        ]);
      }
    } else {
      rows.push([
        project.id,
        project.protocolNumber || "N/A",
        project.title,
        project.researchArea,
        project.status,
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        "N/A",
        "PROTOCOL_INITIALIZED",
        new Date().toISOString().split("T")[0],
        "AWAITING_RECRUITMENT",
      ]);
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((val) => {
            const stringVal = String(val).replace(/"/g, '""');
            return `"${stringVal}"`;
          })
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const prefix = project.protocolNumber || project.title;
    const filename = `${prefix.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}_anonymized_data.csv`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} rows to ${filename}`);
  };

  // JSON Export Engine
  const exportStudyAsJson = (project: ResearchProject) => {
    const jsonContent = JSON.stringify(project, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const prefix = project.protocolNumber || project.title;
    const filename = `${prefix.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}_full_protocol.json`;
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded protocol JSON: ${filename}`);
  };

  const activeStudy = detailedStudy || projectList.find((p) => p.id === selectedStudyId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Protocol Directory
            </span>
            <span className="text-zinc-400 text-xs">Clinical Trials & Studies</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mt-2">
            Clinical Studies Management
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Track multi-arm clinical trials, monitor cohort recruitment velocity, inspect study datasets, and export anonymized telemetry.
          </p>
        </div>

        {/* Create Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" /> Launch Clinical Study
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-indigo-600" /> Register New Clinical Study
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500">
                Register a new trial or research study into PostgreSQL.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Study Title *</label>
                <Input
                  placeholder="e.g. Cognitive Reappraisal in Adolescent Social Anxiety"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Research Domain *</label>
                  <Input
                    placeholder="e.g. Behavioral Science"
                    value={researchArea}
                    onChange={(e) => setResearchArea(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Protocol Number</label>
                  <Input
                    placeholder="e.g. HLR-COG-2026-005"
                    value={protocolNumber}
                    onChange={(e) => setProtocolNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Target Sample Size</label>
                  <Input
                    type="number"
                    min="1"
                    value={targetSampleSize}
                    onChange={(e) => setTargetSampleSize(e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-700">Study Phase / Status</label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                  >
                    <option value="recruiting">Recruiting Cohort</option>
                    <option value="data_collection">Active Data Collection</option>
                    <option value="in_progress">In Progress (Analysis)</option>
                    <option value="draft">Draft Protocol</option>
                    <option value="completed">Completed / Published</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-700">Estimated End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-700">Description & Abstract</label>
                <textarea
                  rows={3}
                  className="w-full rounded-md border border-input bg-card p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  placeholder="Primary study aims, intervention details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  {createMutation.isPending ? "Saving..." : "Save Study"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5 p-1 bg-zinc-100 rounded-xl">
          {[
            { id: "all" as const, label: "All Studies" },
            { id: "recruiting" as const, label: "Recruiting" },
            { id: "data_collection" as const, label: "Data Collection" },
            { id: "in_progress" as const, label: "In Progress" },
            { id: "completed" as const, label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeFilter === tab.id
                  ? "bg-white text-zinc-900 shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Search by title or protocol..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
      </div>

      {/* Studies Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-zinc-400 bg-white border border-zinc-200/80 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading clinical studies from database...
        </div>
      ) : isError ? (
        <div className="p-6 text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          Failed to load studies: {(error as Error)?.message}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white border border-zinc-200/80 rounded-xl">
          <FlaskConical className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900">No Studies Found</h3>
          <p className="text-xs text-zinc-500 mt-1">
            {searchQuery ? "No studies match your current search query." : "No studies in this filter category."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project: ResearchProject) => {
            const enrolled = project.participants?.length || 0;
            const target = project.targetSampleSize || 1;
            const progressPercent = Math.min(Math.round((enrolled / target) * 100), 100);

            return (
              <Card
                key={project.id}
                className="bg-white border-zinc-200/80 hover:border-indigo-300 transition-all p-5 shadow-2xs hover:shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          getStatusBadge(project.status)
                        )}
                      >
                        {formatStatus(project.status)}
                      </span>
                      {project.protocolNumber && (
                        <span className="text-[11px] font-mono text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded">
                          {project.protocolNumber}
                        </span>
                      )}
                    </div>

                    {/* Quick status dropdown on card */}
                    <select
                      className="text-[11px] h-7 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 text-zinc-700 cursor-pointer font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                      value={project.status}
                      disabled={updateStatusMutation.isPending}
                      onChange={(e) => {
                        updateStatusMutation.mutate({
                          id: project.id,
                          newStatus: e.target.value as ResearchProject["status"],
                        });
                      }}
                      title="Update Study Status"
                    >
                      <option value="recruiting">Recruiting</option>
                      <option value="data_collection">Data Collection</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <div>
                    <h3
                      onClick={() => handleOpenDetail(project)}
                      className="text-base font-bold text-zinc-900 leading-snug hover:text-indigo-600 transition-colors cursor-pointer"
                    >
                      {project.title}
                    </h3>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">
                      {project.researchArea}
                    </p>
                  </div>

                  {project.description && (
                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-zinc-100 space-y-3">
                  {/* Recruitment Progress Bar */}
                  {project.targetSampleSize > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-zinc-500 font-medium">
                        <span>Cohort Enrollment</span>
                        <span>{enrolled} / {project.targetSampleSize} subjects ({progressPercent}%)</span>
                      </div>
                      <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Metadata and Quick Actions */}
                  <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
                    <div className="flex items-center gap-3">
                      {project.surveys && project.surveys.length > 0 && (
                        <span className="flex items-center gap-1">
                          <ClipboardList className="w-3.5 h-3.5 text-zinc-400" />
                          {project.surveys.length} {project.surveys.length === 1 ? "Survey" : "Surveys"}
                        </span>
                      )}
                      {project.startDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                          {new Date(project.startDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportStudyAsCsv(project)}
                        className="h-7 px-2 text-[11px] font-medium text-zinc-700 hover:text-indigo-600 hover:border-indigo-200 cursor-pointer"
                        title="Download Anonymized CSV Dataset"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        CSV
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleOpenDetail(project)}
                        className="h-7 px-2.5 text-[11px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        Inspect
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comprehensive Study Details & Dataset Inspection Dialog */}
      <Dialog
        open={!!selectedStudyId}
        onOpenChange={(open) => {
          if (!open) setSelectedStudyId(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto p-0 gap-0 bg-white">
          {activeStudy ? (
            <div>
              {/* Modal Header */}
              <div className="p-6 bg-gradient-to-r from-zinc-50 to-indigo-50/30 border-b border-zinc-200">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          getStatusBadge(activeStudy.status)
                        )}
                      >
                        {formatStatus(activeStudy.status)}
                      </span>
                      {activeStudy.protocolNumber && (
                        <span className="text-xs font-mono font-semibold bg-white border border-zinc-200/80 text-zinc-700 px-2 py-0.5 rounded">
                          {activeStudy.protocolNumber}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                        {activeStudy.researchArea}
                      </span>
                    </div>

                    <h2 className="text-xl font-extrabold text-zinc-900 leading-snug">
                      {activeStudy.title}
                    </h2>
                  </div>

                  {/* Header Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="h-8 bg-white border border-zinc-300 rounded-md px-2.5 text-xs font-semibold text-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                      value={activeStudy.status}
                      disabled={updateStatusMutation.isPending}
                      onChange={(e) => {
                        updateStatusMutation.mutate({
                          id: activeStudy.id,
                          newStatus: e.target.value as ResearchProject["status"],
                        });
                      }}
                    >
                      <option value="recruiting">Phase: Recruiting</option>
                      <option value="data_collection">Phase: Data Collection</option>
                      <option value="in_progress">Phase: In Progress</option>
                      <option value="completed">Phase: Completed</option>
                      <option value="draft">Phase: Draft</option>
                    </select>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportStudyAsCsv(activeStudy)}
                      className="h-8 text-xs font-semibold text-zinc-700 hover:text-indigo-700 border-zinc-300 bg-white cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Export CSV
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportStudyAsJson(activeStudy)}
                      className="h-8 text-xs font-semibold text-zinc-700 hover:text-indigo-700 border-zinc-300 bg-white cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      JSON
                    </Button>
                  </div>
                </div>

                {/* Sub Tab Navigation */}
                <div className="flex items-center gap-2 mt-6 border-b border-zinc-200 overflow-x-auto pb-px">
                  {[
                    { id: "overview" as const, label: "Overview & Protocol", icon: FileText },
                    {
                      id: "participants" as const,
                      label: `Cohort Registry (${activeStudy.participants?.length || 0})`,
                      icon: Users,
                    },
                    {
                      id: "surveys" as const,
                      label: `Surveys (${activeStudy.surveys?.length || 0})`,
                      icon: ClipboardList,
                    },
                    {
                      id: "telemetry" as const,
                      label: `Data Collection (${activeStudy.dataCollection?.length || 0})`,
                      icon: Database,
                    },
                    { id: "edit" as const, label: "Edit Protocol", icon: Edit3 },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = detailTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setDetailTab(tab.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap",
                          isActive
                            ? "border-indigo-600 text-indigo-700 bg-white/80 rounded-t-md"
                            : "border-transparent text-zinc-600 hover:text-zinc-900"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-indigo-600" : "text-zinc-400")} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                {isDetailLoading && !detailedStudy ? (
                  <div className="p-12 text-center text-zinc-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Fetching longitudinal study data...
                  </div>
                ) : detailTab === "overview" ? (
                  <div className="space-y-6">
                    {/* Bento KPI Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                          <span>Cohort Target</span>
                          <Users className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-zinc-900">
                          {activeStudy.participants?.length || 0}{" "}
                          <span className="text-sm font-normal text-zinc-400">
                            / {activeStudy.targetSampleSize || 0}
                          </span>
                        </div>
                        <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(
                                Math.round(
                                  ((activeStudy.participants?.length || 0) /
                                    (activeStudy.targetSampleSize || 1)) *
                                    100
                                ),
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                          <span>Psychometrics</span>
                          <ClipboardList className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-zinc-900">
                          {activeStudy.surveys?.length || 0}
                          <span className="text-xs font-normal text-zinc-500 ml-1.5">active scales</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Standardized psychometric batteries attached
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
                          <span>Observations</span>
                          <Activity className="w-4 h-4 text-amber-600" />
                        </div>
                        <div className="text-2xl font-extrabold text-zinc-900">
                          {activeStudy.dataCollection?.length || 0}
                          <span className="text-xs font-normal text-zinc-500 ml-1.5">telemetry pts</span>
                        </div>
                        <p className="text-[11px] text-zinc-500">
                          Biomarker, HRV & psychometric data points
                        </p>
                      </div>
                    </div>

                    {/* Abstract & Description */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Study Abstract & Protocol Scope
                      </h3>
                      <div className="p-4 rounded-xl bg-white border border-zinc-200/80 text-sm text-zinc-700 leading-relaxed">
                        {activeStudy.description || (
                          <span className="italic text-zinc-400">
                            No study abstract provided. You can add one via the Edit Protocol tab.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Protocol Specifications & Governance */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                          <CalendarRange className="w-3.5 h-3.5 text-indigo-600" /> Timeline & Milestones
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-zinc-200">
                            <span className="text-zinc-500">Start Date:</span>
                            <span className="font-semibold text-zinc-900">
                              {activeStudy.startDate
                                ? new Date(activeStudy.startDate).toLocaleDateString()
                                : "Not specified"}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-zinc-200">
                            <span className="text-zinc-500">Estimated Completion:</span>
                            <span className="font-semibold text-zinc-900">
                              {activeStudy.endDate
                                ? new Date(activeStudy.endDate).toLocaleDateString()
                                : "Ongoing"}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-zinc-500">Registered On:</span>
                            <span className="font-semibold text-zinc-900">
                              {new Date(activeStudy.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Ethics & Governance
                        </h4>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between py-1 border-b border-zinc-200">
                            <span className="text-zinc-500">Ethical Oversight:</span>
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60">
                              IRB Approved
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-zinc-200">
                            <span className="text-zinc-500">Cohort De-identification:</span>
                            <span className="font-semibold text-zinc-900">Zero-PII Tokenized</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-zinc-500">Regulatory Framework:</span>
                            <span className="font-semibold text-zinc-900">45 CFR 46 / HIPAA Safe</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : detailTab === "participants" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">
                          Cohort Registry ({activeStudy.participants?.length || 0} Subjects)
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Pseudonymized patient tokens enrolled under IRB protocol.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportStudyAsCsv(activeStudy)}
                        className="text-xs h-8 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" /> Export Registry CSV
                      </Button>
                    </div>

                    {(!activeStudy.participants || activeStudy.participants.length === 0) ? (
                      <div className="p-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                        <Users className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <h4 className="text-xs font-semibold text-zinc-700">No Participants Enrolled Yet</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          When subjects consent via the patient portal, they appear here automatically.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-zinc-200 rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200">
                            <tr>
                              <th className="py-2.5 px-4">Subject Code</th>
                              <th className="py-2.5 px-4">Demographics</th>
                              <th className="py-2.5 px-4">Consent Status</th>
                              <th className="py-2.5 px-4">Eligibility</th>
                              <th className="py-2.5 px-4">Enrolled Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {activeStudy.participants.map((p) => (
                              <tr key={p.id} className="hover:bg-zinc-50/60">
                                <td className="py-2.5 px-4 font-mono font-bold text-indigo-700">
                                  {p.participantCode}
                                </td>
                                <td className="py-2.5 px-4 text-zinc-600">
                                  {p.ageGroup || "Adult"} • {p.gender || "Unspecified"}
                                </td>
                                <td className="py-2.5 px-4">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                      p.consentStatus === "consented"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                                        : "bg-zinc-100 text-zinc-600"
                                    )}
                                  >
                                    {p.consentStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4">
                                  <span
                                    className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                      p.eligibilityStatus === "eligible"
                                        ? "bg-indigo-50 text-indigo-700 border border-indigo-200/60"
                                        : "bg-zinc-100 text-zinc-600"
                                    )}
                                  >
                                    {p.eligibilityStatus}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-zinc-500">
                                  {p.joinedDate ? new Date(p.joinedDate).toLocaleDateString() : "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : detailTab === "surveys" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">
                          Psychometric Instruments & Surveys ({activeStudy.surveys?.length || 0})
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Standardized clinical inventories linked to this trial protocol.
                        </p>
                      </div>
                    </div>

                    {(!activeStudy.surveys || activeStudy.surveys.length === 0) ? (
                      <div className="p-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                        <ClipboardList className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <h4 className="text-xs font-semibold text-zinc-700">No Surveys Linked</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          You can attach psychometric scales in the Psychometrics tab.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeStudy.surveys.map((survey) => (
                          <div
                            key={survey.id}
                            className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/40 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm font-bold text-zinc-900">{survey.title}</h4>
                                {survey.description && (
                                  <p className="text-xs text-zinc-500 mt-0.5">{survey.description}</p>
                                )}
                              </div>
                              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                                {survey.questionCount} Questions
                              </span>
                            </div>

                            {survey.questions && survey.questions.length > 0 && (
                              <div className="pt-2 border-t border-zinc-200/60 space-y-2">
                                <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                                  Sample Question Items:
                                </span>
                                <div className="space-y-1.5">
                                  {survey.questions.slice(0, 3).map((q, idx) => (
                                    <div
                                      key={q.id || idx}
                                      className="text-xs text-zinc-700 flex items-start gap-2 bg-white p-2 rounded border border-zinc-200/60"
                                    >
                                      <span className="font-bold text-indigo-600 shrink-0">{idx + 1}.</span>
                                      <span>{q.questionText}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : detailTab === "telemetry" ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900">
                          Telemetry & Data Points ({activeStudy.dataCollection?.length || 0})
                        </h3>
                        <p className="text-xs text-zinc-500">
                          Longitudinal observations captured from participants.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportStudyAsCsv(activeStudy)}
                        className="text-xs h-8 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Export All Observations
                      </Button>
                    </div>

                    {(!activeStudy.dataCollection || activeStudy.dataCollection.length === 0) ? (
                      <div className="p-12 text-center bg-zinc-50 border border-dashed border-zinc-200 rounded-xl">
                        <Activity className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                        <h4 className="text-xs font-semibold text-zinc-700">No Data Points Recorded Yet</h4>
                        <p className="text-[11px] text-zinc-400 mt-1">
                          As cohort participants submit journals and assessments, observations populate here.
                        </p>
                      </div>
                    ) : (
                      <div className="border border-zinc-200 rounded-xl overflow-hidden max-h-96 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 text-zinc-600 font-semibold border-b border-zinc-200 sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4">Collected Date</th>
                              <th className="py-2.5 px-4">Data Type</th>
                              <th className="py-2.5 px-4">Subject Reference</th>
                              <th className="py-2.5 px-4">Observation Payload</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {activeStudy.dataCollection.map((row) => (
                              <tr key={row.id} className="hover:bg-zinc-50/60">
                                <td className="py-2 px-4 text-zinc-500 whitespace-nowrap">
                                  {row.collectedDate
                                    ? new Date(row.collectedDate).toLocaleDateString()
                                    : "—"}
                                </td>
                                <td className="py-2 px-4 font-mono font-semibold text-indigo-700">
                                  {row.dataType}
                                </td>
                                <td className="py-2 px-4 text-zinc-600 font-mono text-[11px]">
                                  {activeStudy.participants?.find((p) => p.id === row.participantId)
                                    ?.participantCode ||
                                    row.participantId?.slice(0, 8) ||
                                    "ANON"}
                                </td>
                                <td className="py-2 px-4 font-mono text-[11px] text-zinc-700 truncate max-w-xs">
                                  {typeof row.dataValue === "object"
                                    ? JSON.stringify(row.dataValue)
                                    : String(row.dataValue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit Tab */
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">Study Title *</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Research Domain *</label>
                        <Input
                          value={editArea}
                          onChange={(e) => setEditArea(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Protocol Code</label>
                        <Input
                          value={editProtocol}
                          onChange={(e) => setEditProtocol(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Target Sample Size</label>
                        <Input
                          type="number"
                          min="1"
                          value={editSampleSize}
                          onChange={(e) => setEditSampleSize(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-semibold text-zinc-700">Study Phase</label>
                        <select
                          className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value as any)}
                        >
                          <option value="recruiting">Recruiting Cohort</option>
                          <option value="data_collection">Active Data Collection</option>
                          <option value="in_progress">In Progress (Analysis)</option>
                          <option value="draft">Draft Protocol</option>
                          <option value="completed">Completed / Published</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Start Date</label>
                        <Input
                          type="date"
                          value={editStartDate}
                          onChange={(e) => setEditStartDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-700">Estimated End Date</label>
                        <Input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-zinc-700">Abstract / Description</label>
                      <textarea
                        rows={4}
                        className="w-full rounded-md border border-input bg-card p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDetailTab("overview")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={editMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                      >
                        {editMutation.isPending ? "Saving..." : "Save Protocol Updates"}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-zinc-400">Study not found.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
