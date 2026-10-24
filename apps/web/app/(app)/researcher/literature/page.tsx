"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchLiterature, searchLiterature, addResearchPaper } from "@/lib/api/researcher";
import { 
  BookOpen, Search, Plus, ExternalLink, History, Calendar, 
  FileText, Bookmark, X, ArrowUpRight 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearcherLiteraturePage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);

  // Add Paper Form State
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState(2024);
  const [url, setUrl] = useState("");

  const { data: litData, isLoading } = useQuery({
    queryKey: ['researcher', 'literature'],
    queryFn: fetchLiterature,
  });

  const papers = litData?.data?.papers || [];
  const history = litData?.data?.history || [];

  const searchMutation = useMutation({
    mutationFn: (kw: string) => searchLiterature(kw),
    onSuccess: () => {
      toast.success("Literature search recorded in research history.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'literature'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to query literature index.");
    },
  });

  const addPaperMutation = useMutation({
    mutationFn: addResearchPaper,
    onSuccess: () => {
      toast.success("Publication citation added to library.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'literature'] });
      setAddModalOpen(false);
      setTitle("");
      setAuthors("");
      setJournal("");
      setUrl("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to add research paper.");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    searchMutation.mutate(keyword.trim());
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !authors.trim() || !journal.trim()) {
      toast.error("Please fill in title, authors, and journal.");
      return;
    }
    addPaperMutation.mutate({
      title: title.trim(),
      authors: authors.trim(),
      journalName: journal.trim(),
      publicationYear: Number(year),
      paperUrl: url.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <BookOpen className="w-5 h-5 text-fuchsia-600" />
            </span>
            Medical Literature & Academic Repository
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Search peer-reviewed psychiatric publications, meta-analyses, and manage bibliography citations.
          </p>
        </div>
        <Button 
          onClick={() => setAddModalOpen(true)}
          className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Research Paper
        </Button>
      </div>

      {/* Academic Search Engine Form */}
      <Card className="p-5 border-fuchsia-700/50 bg-gradient-to-r from-[#4a044e] via-[#701a75] to-[#831843] text-white shadow-lg">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-fuchsia-300" />
              <Input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search PubMed, CrossRef & ClinicalTrials index (e.g. CBT insomnia efficacy)..."
                className="pl-9 bg-fuchsia-950/50 border-fuchsia-400/40 text-white text-xs placeholder:text-fuchsia-200/60"
              />
            </div>
            <Button 
              type="submit" 
              disabled={searchMutation.isPending}
              className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white shrink-0 cursor-pointer text-xs font-semibold shadow-xs"
            >
              <Search className="w-4 h-4 mr-1.5" />
              {searchMutation.isPending ? "Searching..." : "Search Literature"}
            </Button>
          </div>

          {/* Recent Search Queries Tag Cloud */}
          {history.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-fuchsia-100">
              <span className="flex items-center gap-1 text-[11px] text-fuchsia-200">
                <History className="w-3 h-3 text-pink-300" /> Recent Searches:
              </span>
              {history.slice(0, 4).map((h: any) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => {
                    setKeyword(h.searchKeyword);
                    searchMutation.mutate(h.searchKeyword);
                  }}
                  className="px-2.5 py-0.5 rounded-full bg-fuchsia-950/40 hover:bg-fuchsia-900/60 text-[11px] text-fuchsia-200 border border-fuchsia-400/30 cursor-pointer transition-colors"
                >
                  {h.searchKeyword} ({h.resultCount})
                </button>
              ))}
            </div>
          )}
        </form>
      </Card>

      {/* Academic Papers Library */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#4a044e] uppercase tracking-wider">
          Saved Publications & Bibliographies ({papers.length})
        </h3>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse border border-fuchsia-100" />
            ))}
          </div>
        ) : papers.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed border-fuchsia-200">
            <BookOpen className="w-10 h-10 mx-auto text-fuchsia-400 mb-2" />
            <p className="font-semibold text-[#4a044e]">No Research Papers Added Yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add publication citations or search the literature index to populate your library.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {papers.map((paper: any) => (
              <Card key={paper.id} className="p-5 border-fuchsia-100 hover:border-fuchsia-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200/80">
                      {paper.publicationYear}
                    </span>
                    <span className="text-xs font-semibold text-fuchsia-700 truncate">
                      {paper.journalName}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#4a044e] leading-snug">
                    {paper.title}
                  </h4>
                  <p className="text-xs text-muted-foreground italic">
                    Authors: {paper.authors}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {paper.paperUrl ? (
                    <a 
                      href={paper.paperUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-fuchsia-200 hover:bg-fuchsia-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 text-[#4a044e] transition-colors cursor-pointer"
                    >
                      <span>Read Paper</span>
                      <ExternalLink className="w-3.5 h-3.5 text-fuchsia-600" />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">Indexed in Library</span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Paper Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <Bookmark className="w-4 h-4 text-fuchsia-600" />
                </span>
                Add Publication Citation
              </h2>
              <button onClick={() => setAddModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Publication Title *</label>
                <Input 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Cognitive Behavioral Therapy for Adult Anxiety..."
                  className="text-xs border-fuchsia-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Author(s) *</label>
                <Input 
                  value={authors}
                  onChange={(e) => setAuthors(e.target.value)}
                  placeholder="e.g. Smith J., Doe A., Mahmud A."
                  className="text-xs border-fuchsia-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Journal Name *</label>
                  <Input 
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    placeholder="e.g. The Lancet Psychiatry"
                    className="text-xs border-fuchsia-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Publication Year</label>
                  <Input 
                    type="number"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="text-xs border-fuchsia-200"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">DOI or Paper URL</label>
                <Input 
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://doi.org/10.1016/..."
                  className="text-xs border-fuchsia-200"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setAddModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={addPaperMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {addPaperMutation.isPending ? "Adding..." : "Save Citation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
