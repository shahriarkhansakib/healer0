"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSurveys, createSurvey, deleteSurvey, fetchProjects } from "@/lib/api/researcher";
import { 
  ClipboardList, Plus, Trash2, ExternalLink, Copy, Check, 
  ChevronDown, ChevronUp, Sparkles, X, Globe, Eye
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearcherSurveysPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [activeEmbedId, setActiveEmbedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formUrl, setFormUrl] = useState("");

  const { data: projectsData } = useQuery({
    queryKey: ['researcher', 'projects'],
    queryFn: fetchProjects,
  });
  const projects = projectsData?.data || [];

  const { data: surveysData, isLoading } = useQuery({
    queryKey: ['researcher', 'surveys'],
    queryFn: () => fetchSurveys(),
  });
  const surveys = surveysData?.data || [];

  const createMutation = useMutation({
    mutationFn: createSurvey,
    onSuccess: () => {
      toast.success("Google Form survey instrument integrated successfully.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'surveys'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
      setModalOpen(false);
      setTitle("");
      setDescription("");
      setFormUrl("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to integrate Google Form.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSurvey,
    onSuccess: () => {
      toast.success("Survey instrument removed.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'surveys'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete survey.");
    },
  });

  const handleCopyLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("Participant survey link copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please create or select a study project first.");
      return;
    }
    if (!title.trim()) {
      toast.error("Survey title is required.");
      return;
    }
    if (!formUrl.trim()) {
      toast.error("Please provide a Google Form link or embed snippet.");
      return;
    }

    createMutation.mutate({
      projectId: projId,
      title: title.trim(),
      description: description.trim() || undefined,
      formUrl: formUrl.trim(),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <ClipboardList className="w-5 h-5 text-fuchsia-600" />
            </span>
            Clinical Surveys & Question Instruments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Integrate standardized Google Forms for clinical trials, psychometric questionnaires, and cohort follow-ups.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick shortcut to author in Google Forms */}
          <a 
            href="https://forms.new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex"
          >
            <Button 
              variant="outline" 
              className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50/80 text-xs cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-fuchsia-600" />
              Create in Google Forms
            </Button>
          </a>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Connect Google Form
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-xl border border-fuchsia-200/80 bg-fuchsia-50/50 text-xs text-[#4a044e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-fuchsia-100 text-fuchsia-700 shrink-0 border border-fuchsia-200/60">
            <Globe className="w-4 h-4 text-fuchsia-600" />
          </div>
          <div>
            <span className="font-semibold text-fuchsia-950">Google Forms Powered:</span> Connect your public or institutional Google Forms to distribute directly to study cohorts or embed inline for instant protocol testing.
          </div>
        </div>
        <span className="text-[11px] font-semibold text-fuchsia-700 shrink-0">
          Auto-Responsive Iframe Embeds
        </span>
      </div>

      {/* Survey Instruments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 rounded-xl bg-muted/40 animate-pulse border border-fuchsia-100" />
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed border-fuchsia-200">
          <ClipboardList className="w-10 h-10 mx-auto text-fuchsia-400 mb-2" />
          <p className="font-semibold text-[#4a044e] text-base">No Survey Instruments Connected</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Click &quot;Connect Google Form&quot; to link your first Google Form questionnaire for participant data collection.
          </p>
          <Button 
            onClick={() => setModalOpen(true)}
            className="mt-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white text-xs cursor-pointer font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Connect Google Form
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {surveys.map((s: any) => {
            const isEmbedded = activeEmbedId === s.id;
            const targetUrl = s.embedUrl || s.formUrl;
            const project = projects.find((p: any) => p.id === s.projectId);

            return (
              <Card key={s.id} className="border-fuchsia-100 overflow-hidden shadow-xs hover:border-fuchsia-300 transition-all">
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200/80 uppercase tracking-wider">
                        Google Form
                      </span>
                      {project && (
                        <span className="text-[11px] font-medium text-muted-foreground bg-fuchsia-50/60 px-2 py-0.5 rounded-md truncate max-w-xs">
                          {project.projectTitle}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-[#4a044e]">{s.title}</h3>
                    {s.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground font-mono truncate max-w-lg">
                      Link: {s.formUrl || 'Direct Google Form Embed'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Copy Link Button */}
                    {s.formUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopyLink(s.formUrl, s.id)}
                        className="text-xs h-8 cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                        title="Copy participant link"
                      >
                        {copiedId === s.id ? (
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 mr-1" />
                        )}
                        {copiedId === s.id ? "Copied" : "Copy Link"}
                      </Button>
                    )}

                    {/* External Link Button */}
                    {s.formUrl && (
                      <a 
                        href={s.formUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                          title="Open Google Form in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          Open
                        </Button>
                      </a>
                    )}

                    {/* Inline Embed Toggle Button */}
                    <Button 
                      size="sm" 
                      onClick={() => setActiveEmbedId(isEmbedded ? null : s.id)}
                      className="text-xs h-8 cursor-pointer bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      {isEmbedded ? "Hide Form" : "Fill / Preview"}
                      {isEmbedded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                    </Button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (confirm(`Remove survey "${s.title}"?`)) {
                          deleteMutation.mutate(s.id);
                        }
                      }}
                      className="p-2 text-muted-foreground hover:text-destructive rounded-md hover:bg-muted transition-colors cursor-pointer"
                      title="Delete survey"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Interactive Embedded Google Form */}
                {isEmbedded && (
                  <div className="p-4 sm:p-6 bg-slate-50/70 border-t border-border/80 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border/60">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-fuchsia-600" />
                        <span className="font-semibold text-[#4a044e]">Interactive Google Form Preview & Participant Portal</span>
                      </div>
                      <span className="text-[11px]">Real-time submissions sync directly to your Google Sheets</span>
                    </div>

                    {targetUrl ? (
                      <div className="relative w-full rounded-xl overflow-hidden border border-fuchsia-200/80 bg-white shadow-sm min-h-[650px]">
                        <iframe
                          src={targetUrl}
                          className="w-full h-[650px] border-0"
                          title={s.title}
                          loading="lazy"
                        >
                          Loading Google Form...
                        </iframe>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-muted-foreground bg-card rounded-xl border border-fuchsia-100">
                        No Google Form URL attached to this instrument.
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Google Form Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-lg w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <ClipboardList className="w-4 h-4 text-fuchsia-600" />
                </span>
                Connect Google Form Instrument
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-muted-foreground hover:text-[#4a044e] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Associated Study Project *</label>
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

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Survey Title *</label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Cognitive Behavioral Therapy Efficacy Scale"
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Clinical Protocol Description</label>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Briefly describe the questionnaire purpose, completion window, or patient instructions..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-card p-2 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-foreground">Google Form Link or Embed Snippet *</label>
                  <a 
                    href="https://forms.new" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[11px] text-fuchsia-700 hover:underline flex items-center gap-1 font-semibold"
                  >
                    Open forms.new <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <Input 
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="Paste Google Form share link or <iframe src='...'> embed code"
                  className="text-xs font-mono border-fuchsia-200"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Accepts standard share links (<code>https://docs.google.com/forms/d/e/.../viewform</code>) or HTML embed snippets.
                </p>
              </div>

              {formUrl.trim() && (
                <div className="p-3 rounded-lg bg-fuchsia-50/70 border border-fuchsia-200/80 text-[11px] text-[#4a044e] flex items-center gap-2">
                  <Check className="w-4 h-4 text-fuchsia-600 shrink-0" />
                  <span>Google Form link detected. An interactive embed and share link will be provisioned.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setModalOpen(false)}
                  className="cursor-pointer text-xs border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={createMutation.isPending} 
                  className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
                >
                  {createMutation.isPending ? "Connecting..." : "Connect Instrument"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
