"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchProjects, createProject, updateProject, deleteProject } from "@/lib/api/researcher";
import { 
  FlaskConical, Plus, Search, Calendar, Tag, Trash2, Edit3, X, CheckCircle2, 
  Clock, ArrowRight
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Link from "next/link";

export default function ResearcherProjectsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [researchArea, setResearchArea] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("Active");

  const { data, isLoading } = useQuery({
    queryKey: ['researcher', 'projects'],
    queryFn: fetchProjects,
  });

  const projects = data?.data || [];

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast.success("Research project created successfully.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
      setModalOpen(false);
      setTitle("");
      setResearchArea("");
      setDescription("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create research project.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      toast.success("Project removed.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'projects'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete project.");
    },
  });

  const filteredProjects = projects.filter((p: any) => {
    const matchesSearch = 
      p.projectTitle.toLowerCase().includes(search.toLowerCase()) ||
      p.researchArea.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !researchArea.trim() || !description.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createMutation.mutate({
      projectTitle: title.trim(),
      researchArea: researchArea.trim(),
      description: description.trim(),
      startDate,
      endDate: endDate || undefined,
      status,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <FlaskConical className="w-5 h-5 text-fuchsia-600" />
            </span>
            Research Projects & Clinical Studies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Design, protocolize, and oversee longitudinal clinical investigations and observational trials.
          </p>
        </div>
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer self-start sm:self-auto font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Create New Study
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input 
            placeholder="Search projects by title, area, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card text-xs border-fuchsia-200 focus:border-fuchsia-400"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['All', 'Active', 'Recruiting', 'Completed', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
                statusFilter === st 
                  ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-xs' 
                  : 'bg-card border border-fuchsia-100/80 text-muted-foreground hover:bg-fuchsia-50/60 hover:text-[#4a044e]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Projects List Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          <FlaskConical className="w-10 h-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="font-semibold text-base text-foreground">No Research Studies Found</p>
          <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or create a new study project.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((p: any) => (
            <Card key={p.id} className="border-fuchsia-100 hover:border-fuchsia-300 transition-all flex flex-col justify-between shadow-2xs hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        p.status === 'Active' 
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                          : p.status === 'Recruiting'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {p.status}
                      </span>
                      <span className="text-xs font-semibold text-fuchsia-700">
                        {p.researchArea}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-[#4a044e] leading-snug">
                      {p.projectTitle}
                    </CardTitle>
                  </div>
                  <button 
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this study project?")) {
                        deleteMutation.mutate(p.id);
                      }
                    }}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors cursor-pointer"
                    title="Delete study"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {p.description}
                </p>

                <div className="pt-3 border-t border-fuchsia-100/70 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-fuchsia-500" />
                    <span>
                      {new Date(p.startDate).toLocaleDateString()} — {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Ongoing'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/researcher/participants?projectId=${p.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-fuchsia-700 hover:text-fuchsia-800 hover:bg-fuchsia-50 px-2 cursor-pointer">
                        Cohort <ArrowRight className="w-3 h-3 ml-0.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-lg w-full border border-fuchsia-200 shadow-2xl p-6 space-y-5 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-lg font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <FlaskConical className="w-4 h-4 text-fuchsia-600" />
                </span>
                Create Research Project
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-muted-foreground hover:text-[#4a044e] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Study Project Title *</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Longitudinal Efficacy of Guided Meditation on Cortisol Levels"
                  required
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Research Area *</label>
                  <Input 
                    value={researchArea} 
                    onChange={(e) => setResearchArea(e.target.value)} 
                    placeholder="e.g. Cognitive Neurobiology"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Study Status</label>
                  <select 
                    value={status} 
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                  >
                    <option value="Active">Active</option>
                    <option value="Recruiting">Recruiting</option>
                    <option value="Completed">Completed</option>
                    <option value="Draft">Draft Protocol</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Start Date</label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Target Completion Date</label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold">Study Protocol Description *</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={4}
                  placeholder="Outline study objectives, target cohort sample size, hypotheses, and telemetry collection frequency..."
                  required
                  className="w-full rounded-md border border-fuchsia-200 bg-card p-2 text-xs focus:ring-1 focus:ring-fuchsia-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer text-xs border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
                >
                  {createMutation.isPending ? "Creating..." : "Launch Project"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
