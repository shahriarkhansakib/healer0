"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDataCollection, addDataPoint, fetchProjects } from "@/lib/api/researcher";
import { 
  Database, Download, Plus, Filter, Activity, X, 
  Calendar, CheckCircle2, ShieldCheck, Sparkles, HeartPulse, Moon, Smile, FileText 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function formatTelemetryKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\bBpm\b/i, '(BPM)')
    .replace(/\bMs\b/i, '(ms)')
    .replace(/\bMicroS\b/i, '(µS)')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function formatTelemetryValue(val: unknown): string {
  if (typeof val === 'boolean') {
    return val ? 'Confirmed / Yes' : 'No';
  }
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  if (typeof val === 'object' && val !== null) {
    return Object.entries(val).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  return String(val ?? '—');
}

function getCategoryIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes('sleep')) return <Moon className="w-4 h-4 text-fuchsia-600" />;
  if (lower.includes('mood')) return <Smile className="w-4 h-4 text-pink-600" />;
  if (lower.includes('biometric')) return <HeartPulse className="w-4 h-4 text-rose-600" />;
  return <Activity className="w-4 h-4 text-purple-600" />;
}

export default function ResearcherDataPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState("All");

  // Structured Intake Form State
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [dataType, setDataType] = useState("Mood Telemetry");
  const [primaryMetricLabel, setPrimaryMetricLabel] = useState("Stress Index");
  const [primaryMetricValue, setPrimaryMetricValue] = useState("3 / 10");
  const [secondaryMetricLabel, setSecondaryMetricLabel] = useState("Anxiety Rating");
  const [secondaryMetricValue, setSecondaryMetricValue] = useState("Normal / Mild");
  const [clinicalNotes, setClinicalNotes] = useState("Protocol compliance verified by telemetry monitor.");

  const { data: projectsData } = useQuery({
    queryKey: ['researcher', 'projects'],
    queryFn: fetchProjects,
  });
  const projects = projectsData?.data || [];

  const { data: recordsData, isLoading } = useQuery({
    queryKey: ['researcher', 'data'],
    queryFn: fetchDataCollection,
  });
  const records = recordsData?.data || [];

  const addMutation = useMutation({
    mutationFn: addDataPoint,
    onSuccess: () => {
      toast.success("Clinical telemetry record ingested.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'data'] });
      queryClient.invalidateQueries({ queryKey: ['researcher', 'dashboard'] });
      setModalOpen(false);
      // Reset custom inputs
      setPrimaryMetricLabel("");
      setPrimaryMetricValue("");
      setSecondaryMetricLabel("");
      setSecondaryMetricValue("");
      setClinicalNotes("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to record data point.");
    },
  });

  const filteredRecords = records.filter((r: any) => {
    if (typeFilter === 'All') return true;
    return r.dataType.toLowerCase().includes(typeFilter.toLowerCase());
  });

  const handleExportJSON = () => {
    if (records.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healer-clinical-telemetry-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dataset exported to JSON successfully.");
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error("No data available to export.");
      return;
    }
    const headers = "ID,DataType,CollectedDate,Payload\n";
    const rows = records.map((r: any) => 
      `"${r.id}","${r.dataType}","${r.collectedDate}","${JSON.stringify(r.dataValue).replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `healer-clinical-telemetry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dataset exported to CSV successfully.");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const projId = selectedProjectId || (projects[0]?.id);
    if (!projId) {
      toast.error("Please select a study project.");
      return;
    }

    if (!primaryMetricLabel.trim() || !primaryMetricValue.trim()) {
      toast.error("Please provide at least one metric name and value.");
      return;
    }

    const payload: Record<string, unknown> = {};
    payload[primaryMetricLabel.trim()] = primaryMetricValue.trim();
    if (secondaryMetricLabel.trim() && secondaryMetricValue.trim()) {
      payload[secondaryMetricLabel.trim()] = secondaryMetricValue.trim();
    }
    if (clinicalNotes.trim()) {
      payload["clinicalNotes"] = clinicalNotes.trim();
    }

    addMutation.mutate({
      projectId: projId,
      dataType,
      dataValue: payload,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <Database className="w-5 h-5 text-fuchsia-600" />
            </span>
            Research Data Collection Repository
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Anonymized multi-modal telemetry stream from patient journals, sleep monitors, and wearable devices.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportJSON}
            variant="outline"
            className="text-xs cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
          >
            <Download className="w-4 h-4 mr-1.5 text-fuchsia-600" />
            Export JSON
          </Button>
          <Button 
            onClick={handleExportCSV}
            variant="outline"
            className="text-xs cursor-pointer border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
          >
            <Download className="w-4 h-4 mr-1.5 text-fuchsia-600" />
            Export CSV
          </Button>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Record Data Point
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['All', 'Sleep', 'Mood', 'Biometric', 'Assessment'].map((f) => (
          <button
            key={f}
            onClick={() => setTypeFilter(f)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-all ${
              typeFilter === f 
                ? 'bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-xs' 
                : 'bg-card border border-fuchsia-100/80 text-muted-foreground hover:bg-fuchsia-50/60 hover:text-[#4a044e]'
            }`}
          >
            {f === 'All' ? 'All Telemetry' : `${f} Telemetry`}
          </button>
        ))}
      </div>

      {/* Data Records Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-xl bg-muted/40 animate-pulse border border-fuchsia-100/50" />
          ))}
        </div>
      ) : filteredRecords.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed border-fuchsia-200">
          <Database className="w-10 h-10 mx-auto text-fuchsia-400 mb-2" />
          <p className="font-semibold text-[#4a044e]">No Research Telemetry Ingested</p>
          <p className="text-xs text-muted-foreground mt-1">
            Data collected from mobile, sensor, and clinical activities will populate here in real time.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((r: any) => {
            const metrics = (typeof r.dataValue === 'object' && r.dataValue !== null) 
              ? Object.entries(r.dataValue) 
              : [];

            return (
              <Card 
                key={r.id} 
                className="border-fuchsia-100 hover:border-fuchsia-300 transition-all flex flex-col justify-between shadow-xs hover:shadow-md bg-card"
              >
                <CardHeader className="pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 uppercase tracking-wider flex items-center gap-1.5 border border-fuchsia-200/80">
                      {getCategoryIcon(r.dataType)}
                      {r.dataType}
                    </span>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Calendar className="w-3 h-3 text-fuchsia-500" />
                      {new Date(r.collectedDate).toLocaleDateString()}
                    </span>
                  </div>
                  <CardTitle className="text-sm font-semibold text-[#4a044e] pt-2 flex items-center justify-between">
                    <span>Clinical Stream #{r.id.slice(0, 8)}</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {/* Clean Structured Metric Grid */}
                  <div className="grid grid-cols-2 gap-2 min-h-[90px]">
                    {metrics.length === 0 ? (
                      <div className="col-span-2 p-3 rounded-lg bg-fuchsia-50/50 text-xs text-muted-foreground text-center">
                        Standard clinical observation recorded
                      </div>
                    ) : (
                      metrics.map(([key, value]) => {
                        const isNotes = key.toLowerCase().includes('note');
                        if (isNotes) {
                          return (
                            <div 
                              key={key} 
                              className="col-span-2 p-2.5 rounded-lg bg-fuchsia-50/70 border border-fuchsia-100"
                            >
                              <span className="text-[10px] uppercase font-bold text-fuchsia-700 tracking-wider block">
                                Clinical Notes
                              </span>
                              <p className="text-xs text-[#4a044e] mt-0.5 leading-relaxed">
                                {formatTelemetryValue(value)}
                              </p>
                            </div>
                          );
                        }
                        return (
                          <div 
                            key={key} 
                            className="p-2.5 rounded-lg bg-fuchsia-50/50 hover:bg-fuchsia-50 border border-fuchsia-100/80 transition-colors"
                          >
                            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block truncate">
                              {formatTelemetryKey(key)}
                            </span>
                            <span className="text-xs font-bold text-[#4a044e] mt-0.5 block truncate">
                              {formatTelemetryValue(value)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-emerald-600 font-semibold pt-2 border-t border-fuchsia-100/80">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> De-identified Telemetry
                    </span>
                    <span className="text-fuchsia-700/80 font-medium">
                      Protocol Verified
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Record Ingestion Modal — Structured Telemetry Input */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <Database className="w-4 h-4 text-fuchsia-600" />
                </span>
                Ingest Research Telemetry Record
              </h2>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-muted-foreground hover:text-[#4a044e] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Associated Study Project *</label>
                <select 
                  value={selectedProjectId} 
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full h-9 rounded-md border border-fuchsia-200 bg-card px-3 text-xs focus:ring-2 focus:ring-fuchsia-500"
                >
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.projectTitle}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Telemetry Category</label>
                <select 
                  value={dataType} 
                  onChange={(e) => setDataType(e.target.value)}
                  className="w-full h-9 rounded-md border border-fuchsia-200 bg-card px-3 text-xs focus:ring-2 focus:ring-fuchsia-500"
                >
                  <option value="Mood Telemetry">Mood Telemetry</option>
                  <option value="Sleep Telemetry">Sleep Telemetry</option>
                  <option value="Biometric Sensor">Biometric Sensor</option>
                  <option value="Clinical Assessment">Clinical Assessment</option>
                </select>
              </div>

              <div className="p-3 bg-fuchsia-50/50 rounded-xl border border-fuchsia-100 space-y-3">
                <p className="text-[11px] font-semibold text-fuchsia-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-600" /> Clinical Metric Parameters
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Primary Metric Name *</label>
                    <Input 
                      value={primaryMetricLabel}
                      onChange={(e) => setPrimaryMetricLabel(e.target.value)}
                      placeholder="e.g. Heart Rate"
                      className="h-8 text-xs bg-white border-fuchsia-200"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Value *</label>
                    <Input 
                      value={primaryMetricValue}
                      onChange={(e) => setPrimaryMetricValue(e.target.value)}
                      placeholder="e.g. 72 bpm"
                      className="h-8 text-xs bg-white border-fuchsia-200"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Secondary Metric Name</label>
                    <Input 
                      value={secondaryMetricLabel}
                      onChange={(e) => setSecondaryMetricLabel(e.target.value)}
                      placeholder="e.g. HRV (SDNN)"
                      className="h-8 text-xs bg-white border-fuchsia-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground">Value</label>
                    <Input 
                      value={secondaryMetricValue}
                      onChange={(e) => setSecondaryMetricValue(e.target.value)}
                      placeholder="e.g. 54 ms"
                      className="h-8 text-xs bg-white border-fuchsia-200"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">Clinical Observations / Notes</label>
                  <Input 
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="e.g. Normal sinus rhythm, active compliance"
                    className="h-8 text-xs bg-white border-fuchsia-200"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setModalOpen(false)}
                  className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={addMutation.isPending} 
                  className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs"
                >
                  {addMutation.isPending ? "Ingesting..." : "Ingest Record"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
