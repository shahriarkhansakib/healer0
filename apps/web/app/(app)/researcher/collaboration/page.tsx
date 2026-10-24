"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCollaboration, inviteCollaborator, sendCollaborationMessage } from "@/lib/api/researcher";
import { 
  Share2, UserPlus, Send, MessageSquare, Building2, CheckCircle2, 
  X, ShieldCheck, Clock, Users 
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function ResearcherCollaborationPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [selectedCollabId, setSelectedCollabId] = useState<string>("");

  // Form State
  const [collabName, setCollabName] = useState("");
  const [institution, setInstitution] = useState("");
  const [collabType, setCollabType] = useState("Co-Investigator");

  const { data: collabData, isLoading } = useQuery({
    queryKey: ['researcher', 'collaboration'],
    queryFn: fetchCollaboration,
  });

  const network = collabData?.data?.network || [];
  const messages = collabData?.data?.messages || [];

  const inviteMutation = useMutation({
    mutationFn: inviteCollaborator,
    onSuccess: () => {
      toast.success("Collaborator connected to your network.");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'collaboration'] });
      setModalOpen(false);
      setCollabName("");
      setInstitution("");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to invite collaborator.");
    },
  });

  const messageMutation = useMutation({
    mutationFn: sendCollaborationMessage,
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: ['researcher', 'collaboration'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to post message.");
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!collabName.trim() || !institution.trim()) {
      toast.error("Please provide both name and institution.");
      return;
    }
    inviteMutation.mutate({
      connectedResearcherName: collabName.trim(),
      connectedInstitution: institution.trim(),
      collaborationType: collabType,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const targetCollabId = selectedCollabId || (network[0]?.id);
    if (!targetCollabId) {
      toast.error("Connect with a collaborator first.");
      return;
    }
    messageMutation.mutate({
      collaborationId: targetCollabId,
      message: chatMessage.trim(),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#4a044e] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200">
              <Share2 className="w-5 h-5 text-fuchsia-600" />
            </span>
            Inter-Institutional Collaboration Network
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Connect with laboratory partners, co-investigators, and exchange secure research communications.
          </p>
        </div>
        <Button 
          onClick={() => setModalOpen(true)}
          className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white cursor-pointer text-xs font-semibold shadow-xs"
        >
          <UserPlus className="w-4 h-4 mr-1.5" />
          Invite Collaborator
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Network Directory */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-[#4a044e] uppercase tracking-wider">
            Connected Peers ({network.length})
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse border border-fuchsia-100" />
              ))}
            </div>
          ) : network.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground border-dashed border-fuchsia-200">
              <Users className="w-8 h-8 mx-auto text-fuchsia-400 mb-2" />
              <p className="font-semibold text-[#4a044e] text-xs">No Collaborators Yet</p>
            </Card>
          ) : (
            network.map((c: any) => {
              const isSelected = selectedCollabId === c.id || (!selectedCollabId && network[0]?.id === c.id);
              return (
                <Card 
                  key={c.id} 
                  onClick={() => setSelectedCollabId(c.id)}
                  className={`p-4 cursor-pointer transition-all border ${
                    isSelected ? 'border-fuchsia-400 bg-fuchsia-50/70 shadow-xs' : 'border-fuchsia-100 hover:border-fuchsia-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <h4 className="font-bold text-sm text-[#4a044e] truncate">{c.connectedResearcherName}</h4>
                      <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-fuchsia-600 shrink-0" />
                        {c.connectedInstitution}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200/80 shrink-0">
                      {c.collaborationType}
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Secure Collaboration Discussion Thread */}
        <div className="lg:col-span-2">
          <Card className="border-fuchsia-100 flex flex-col h-[520px] shadow-2xs">
            <CardHeader className="py-3 px-5 border-b border-fuchsia-100/80 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-fuchsia-600" />
                <CardTitle className="text-sm font-semibold text-[#4a044e]">
                  Study Protocol & Collaboration Channel
                </CardTitle>
              </div>
              <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> End-to-End Encrypted
              </span>
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-6">
                  <MessageSquare className="w-8 h-8 text-fuchsia-300 mb-2" />
                  <p className="font-semibold text-xs text-[#4a044e]">No Messages in Thread</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Post questions, hypothesis revisions, or study milestone updates.
                  </p>
                </div>
              ) : (
                messages.map((m: any) => (
                  <div key={m.id} className="p-3 rounded-xl bg-fuchsia-50/40 border border-fuchsia-100/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-fuchsia-700">{m.senderName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.sentTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[#4a044e] leading-relaxed">{m.message}</p>
                  </div>
                ))
              )}
            </CardContent>

            <form onSubmit={handleSendMessage} className="p-3 border-t border-fuchsia-100 bg-card flex items-center gap-2">
              <Input 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Write a message to your co-investigators..."
                className="text-xs bg-fuchsia-50/30 border-fuchsia-200"
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={messageMutation.isPending || !chatMessage.trim()}
                className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white shrink-0 cursor-pointer text-xs font-semibold shadow-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                Send
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* Invite Collaborator Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-popover text-popover-foreground rounded-2xl max-w-md w-full border border-fuchsia-200 shadow-2xl p-6 space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-fuchsia-100 pb-3">
              <h2 className="text-base font-bold text-[#4a044e] flex items-center gap-2">
                <span className="p-1 rounded-lg bg-fuchsia-100 text-fuchsia-700">
                  <UserPlus className="w-4 h-4 text-fuchsia-600" />
                </span>
                Connect Peer Collaborator
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-muted-foreground hover:text-[#4a044e] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Collaborator Name *</label>
                <Input 
                  value={collabName}
                  onChange={(e) => setCollabName(e.target.value)}
                  placeholder="e.g. Dr. Jennifer Vance, MD, Ph.D."
                  className="text-xs border-fuchsia-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Institution / University *</label>
                <Input 
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Harvard Medical School Neurobiology Division"
                  className="text-xs border-fuchsia-200"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Collaboration Scope</label>
                <select 
                  value={collabType}
                  onChange={(e) => setCollabType(e.target.value)}
                  className="w-full h-9 rounded-md border border-fuchsia-200 bg-card px-3 text-xs"
                >
                  <option value="Co-Investigator">Co-Investigator</option>
                  <option value="Peer Reviewer">Peer Reviewer</option>
                  <option value="Clinical Trial Partner">Clinical Trial Partner</option>
                  <option value="Data Exchange">Data Exchange Protocol</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-fuchsia-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="border-fuchsia-200 text-[#4a044e] hover:bg-fuchsia-50">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={inviteMutation.isPending} className="bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-semibold shadow-xs">
                  {inviteMutation.isPending ? "Connecting..." : "Add Collaborator"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
