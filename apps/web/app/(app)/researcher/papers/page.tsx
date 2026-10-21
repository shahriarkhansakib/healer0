"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Search,
  ExternalLink,
  Calendar,
  Users,
  Award,
  Loader2,
  AlertCircle
} from "lucide-react";
import { fetchResearchPapers, ResearchPaper } from "@/lib/api/research";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function LiteratureLibraryPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: papers, isLoading, isError, error } = useQuery({
    queryKey: ["research", "papers"],
    queryFn: fetchResearchPapers,
  });

  const paperList: ResearchPaper[] = Array.isArray(papers)
    ? papers
    : Array.isArray((papers as any)?.papers)
    ? (papers as any).papers
    : [];

  const filteredPapers = paperList.filter((p) => {
    return (
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.authors && p.authors.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.journalName && p.journalName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.doi && p.doi.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
              Peer-Reviewed References
            </span>
            <span className="text-zinc-400 text-xs">Academic Citation Library</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 mt-2">
            Literature & Reference Library
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            Catalog peer-reviewed literature, systematic reviews, and meta-analyses referenced across your clinical trials.
          </p>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <Input
            placeholder="Search papers, authors, journals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-zinc-400 bg-white border border-zinc-200/80 rounded-xl">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
          Loading publication references from database...
        </div>
      ) : isError ? (
        <div className="p-6 text-center text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
          <AlertCircle className="w-6 h-6 mx-auto mb-2" />
          Failed to load papers: {(error as Error)?.message}
        </div>
      ) : filteredPapers.length === 0 ? (
        <div className="p-12 text-center bg-white border border-zinc-200/80 rounded-xl">
          <BookOpen className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-zinc-900">No Papers Found</h3>
          <p className="text-xs text-zinc-500 mt-1">
            {searchQuery ? "No citations match your search." : "No papers added to the reference library yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPapers.map((paper: ResearchPaper) => (
            <Card
              key={paper.id}
              className="bg-white border-zinc-200/80 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                    {paper.publicationYear || "Published"}
                  </span>
                  {paper.doi && (
                    <span className="text-[10px] font-mono text-zinc-400">
                      DOI: {paper.doi}
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-zinc-900 leading-snug group-hover:text-indigo-600 transition-colors">
                  {paper.title}
                </h3>

                {paper.authors && (
                  <p className="text-xs text-zinc-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span className="truncate">{paper.authors}</span>
                  </p>
                )}

                {paper.journalName && (
                  <p className="text-xs font-medium text-indigo-600 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{paper.journalName}</span>
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs">
                <span className="text-[11px] text-zinc-400">
                  Added {new Date(paper.addedDate).toLocaleDateString()}
                </span>

                {paper.paperUrl && (
                  <a
                    href={paper.paperUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    View Paper <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
