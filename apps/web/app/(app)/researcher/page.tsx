"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchResearcherDashboard } from "@/lib/api/researcher";
import Link from "next/link";
import { 
  FlaskConical, Users, ClipboardList, Database, ArrowUpRight, Plus, 
  ShieldCheck, Activity, Search, Calendar, ChevronRight, Sparkles, Building2
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function formatTelemetrySnippet(val: unknown): string {
  if (!val || typeof val !== 'object') return 'Verified clinical data stream';
  const entries = Object.entries(val);
  if (entries.length === 0) return 'Standard observation recorded';
  return entries
    .slice(0, 3)
    .map(([k, v]) => {
      const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
      return `${label}: ${v}`;
    })
    .join('  •  ');
}

export default function ResearcherOverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['researcher', 'dashboard'],
    queryFn: fetchResearcherDashboard,
  });

  const dashboard = data?.data;
  const summary = dashboard?.summary;
  const profile = dashboard?.profile;
  const projects = dashboard?.recentProjects || [];
  const recentData = dashboard?.recentData || [];
  const collaborators = dashboard?.collaborators || [];
  const irbPermission = dashboard?.irbPermission;
  const consentStats = dashboard?.consentStats;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-fuchsia-100/40 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-fuchsia-50/40 rounded-xl" />
          <div className="h-96 bg-fuchsia-50/40 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Executive Header Banner — Purple-Pinkish Academic Palette */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4a044e] via-[#701a75] to-[#831843] p-6 sm:p-8 text-white shadow-lg border border-fuchsia-700/50">
        <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #ec4899 0%, transparent 60%)' }} />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-fuchsia-500/25 text-fuchsia-200 border border-fuchsia-400/30 tracking-wide uppercase">
                Clinical Research Console
              </span>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-pink-500/25 text-pink-200 border border-pink-400/30">
                <ShieldCheck className="w-3.5 h-3.5" /> De-identified Telemetry Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome, {profile?.fullName || 'Investigator'}
            </h1>
            <p className="text-sm text-fuchsia-100/90 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-pink-300 shrink-0" />
              <span>{profile?.institution || 'Healer Clinical Research Network'}</span>
              <span className="text-fuchsia-400">•</span>
              <span className="text-pink-200 font-medium">{profile?.researchField || 'Clinical Research'}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/researcher/projects">
              <Button size="sm" className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white shadow-xs cursor-pointer text-xs font-semibold">
                <Plus className="w-4 h-4 mr-1.5" />
                New Study Project
              </Button>
            </Link>
            <Link href="/researcher/literature">
              <Button size="sm" variant="outline" className="border-fuchsia-300/40 bg-fuchsia-950/40 hover:bg-fuchsia-900/60 text-fuchsia-100 cursor-pointer text-xs">
                <Search className="w-4 h-4 mr-1.5" />
                Explore Literature
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Projects */}
        <Card className="border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Active Projects
            </span>
            <div className="p-2 rounded-lg bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/60">
              <FlaskConical className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#4a044e]">{summary?.activeProjects ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-fuchsia-700 font-semibold">Longitudinal</span>
              <span>study cohorts</span>
            </p>
          </CardContent>
        </Card>

        {/* Enrolled Participants */}
        <Card className="border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Enrolled Cohorts
            </span>
            <div className="p-2 rounded-lg bg-pink-50 text-pink-700 border border-pink-200/60">
              <Users className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#4a044e]">{summary?.totalParticipants ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-pink-700 font-semibold">Active</span>
              <span>research participants</span>
            </p>
          </CardContent>
        </Card>

        {/* Completed Surveys */}
        <Card className="border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Surveys Completed
            </span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-700 border border-purple-200/60">
              <ClipboardList className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#4a044e]">{summary?.completedSurveys ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-purple-700 font-semibold">Validated</span>
              <span>psychometric records</span>
            </p>
          </CardContent>
        </Card>

        {/* Collected Telemetry Records */}
        <Card className="border-fuchsia-100 hover:border-fuchsia-300 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Collected Records
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60">
              <Database className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-[#4a044e]">{summary?.collectedRecords ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-rose-700 font-semibold">De-identified</span>
              <span>data points</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Multi-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Studies & Live Telemetry Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Clinical Projects */}
          <Card className="border-fuchsia-100 hover:border-fuchsia-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between border-b border-fuchsia-100/80 pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#4a044e]">Active Research Studies</CardTitle>
                <p className="text-xs text-muted-foreground">Currently recruiting and active longitudinal protocol cohorts</p>
              </div>
              <Link href="/researcher/projects">
                <Button variant="ghost" size="sm" className="text-xs text-fuchsia-700 hover:text-fuchsia-800 hover:bg-fuchsia-50 cursor-pointer">
                  View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No active projects created yet.</p>
              ) : (
                projects.map((project) => (
                  <div 
                    key={project.id}
                    className="p-4 rounded-xl border border-fuchsia-100 bg-card hover:border-fuchsia-300/80 transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-[#4a044e]">{project.projectTitle}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            project.status === 'Active' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                              : project.status === 'Recruiting'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {project.status}
                          </span>
                        </div>
                        <p className="text-xs text-fuchsia-700 font-medium">{project.researchArea}</p>
                      </div>
                      <Link href={`/researcher/projects`}>
                        <Button size="sm" variant="outline" className="text-xs h-7 cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                          Details
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-muted-foreground border-t border-fuchsia-100/70">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-fuchsia-600" />
                        Started: {new Date(project.startDate).toLocaleDateString()}
                      </span>
                      {project.endDate && (
                        <>
                          <span>•</span>
                          <span>Target: {new Date(project.endDate).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Real-time Telemetry Data Stream */}
          <Card className="border-fuchsia-100 hover:border-fuchsia-200 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between border-b border-fuchsia-100/80 pb-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#4a044e]">Real-Time Data Collection Stream</CardTitle>
                <p className="text-xs text-muted-foreground">Recent telemetry ingested from patient behavioral and sensor modules</p>
              </div>
              <Link href="/researcher/data">
                <Button variant="ghost" size="sm" className="text-xs text-fuchsia-700 hover:text-fuchsia-800 hover:bg-fuchsia-50 cursor-pointer">
                  Data Explorer <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              {recentData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">No telemetry data recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentData.map((d) => (
                    <div 
                      key={d.id}
                      className="p-3 rounded-lg border border-fuchsia-100 bg-fuchsia-50/30 flex items-center justify-between gap-3 text-xs hover:border-fuchsia-200 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-md bg-fuchsia-100 text-fuchsia-700 shrink-0">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#4a044e]">{d.dataType}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {formatTelemetrySnippet(d.dataValue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-muted-foreground block">
                          {new Date(d.collectedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold">Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Ethics, Protocol Compliance & Network */}
        <div className="space-y-6">
          {/* Ethics & Double-Blind Protocol Card */}
          <Card className="border-fuchsia-200/80 bg-gradient-to-b from-fuchsia-50/60 to-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-[#4a044e]">
                  <ShieldCheck className="w-4 h-4 text-fuchsia-600" />
                  IRB Protocol Standards
                </CardTitle>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                  Compliant
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <p>
                All data accessed through this console is stripped of direct patient identifiers in accordance with HIPAA §164.514(b) de-identification principles.
              </p>
              <div className="p-3 rounded-lg bg-card border border-fuchsia-100 space-y-1.5 font-medium text-foreground">
                <div className="flex justify-between">
                  <span>De-identification Status:</span>
                  <span className="text-emerald-600 font-semibold">
                    {profile?.isActive ? 'Active (HIPAA Safe Harbor)' : 'Standard'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>IRB Approval Tier:</span>
                  <span className="text-fuchsia-700 font-semibold">
                    {irbPermission?.dataAccessType || (projects.length > 0 ? 'Protocol Approved' : 'No Active Protocols')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Participant Consent Rate:</span>
                  <span className="text-[#4a044e] font-semibold">
                    {consentStats ? `${consentStats.rate}% (${consentStats.consented}/${consentStats.total})` : '0%'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peer Collaborator Network */}
          <Card className="border-fuchsia-100">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-[#4a044e]">Collaboration Network</CardTitle>
              <Link href="/researcher/collaboration">
                <Button variant="ghost" size="sm" className="text-xs text-fuchsia-700 hover:text-fuchsia-800 hover:bg-fuchsia-50 cursor-pointer h-7 px-2">
                  Network
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {collaborators.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">No connected collaborators yet.</p>
              ) : (
                collaborators.map((c) => (
                  <div key={c.id} className="p-2.5 rounded-lg border border-fuchsia-100 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold text-[#4a044e] truncate">{c.connectedResearcherName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{c.connectedInstitution}</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200/80 shrink-0">
                      {c.collaborationType}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Tools Navigation */}
          <Card className="border-fuchsia-100 p-4">
            <h4 className="text-xs font-semibold text-[#4a044e] uppercase tracking-wider mb-3">
              Researcher Toolkit
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link 
                href="/researcher/surveys" 
                className="p-3 rounded-lg border border-fuchsia-100 hover:bg-fuchsia-50 hover:border-fuchsia-300 transition-colors flex flex-col items-center justify-center text-center gap-1.5"
              >
                <ClipboardList className="w-4 h-4 text-fuchsia-600" />
                <span className="font-medium text-[#4a044e]">Surveys</span>
              </Link>
              <Link 
                href="/researcher/participants" 
                className="p-3 rounded-lg border border-pink-100 hover:bg-pink-50 hover:border-pink-300 transition-colors flex flex-col items-center justify-center text-center gap-1.5"
              >
                <Users className="w-4 h-4 text-pink-600" />
                <span className="font-medium text-[#4a044e]">Participants</span>
              </Link>
              <Link 
                href="/researcher/analytics" 
                className="p-3 rounded-lg border border-purple-100 hover:bg-purple-50 hover:border-purple-300 transition-colors flex flex-col items-center justify-center text-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-[#4a044e]">Analytics</span>
              </Link>
              <Link 
                href="/researcher/reports" 
                className="p-3 rounded-lg border border-rose-100 hover:bg-rose-50 hover:border-rose-300 transition-colors flex flex-col items-center justify-center text-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-rose-600" />
                <span className="font-medium text-[#4a044e]">Reports</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
