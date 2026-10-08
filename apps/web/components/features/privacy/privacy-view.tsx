"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Cpu, Database, Microscope, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface PrivacyConsent {
  id: string;
  userId: string;
  consentType: 'AI Memory' | 'Research Participation' | 'Data Sharing';
  accepted: boolean;
  acceptedDate: string | null;
  revokedDate: string | null;
}

const CONSENT_DESCRIPTIONS = {
  'AI Memory': {
    title: 'AI Counseling Long-Term Memory',
    desc: 'Allows the AI counselor to recall emotional patterns and topics from earlier sessions to deliver continuous, personalized support.',
    icon: Cpu,
  },
  'Research Participation': {
    title: 'Anonymized Clinical Research',
    desc: 'Permits certified clinical researchers to include de-identified emotional health trends in clinical studies.',
    icon: Microscope,
  },
  'Data Sharing': {
    title: 'Care Team Data Sharing',
    desc: 'Permits your licensed doctors and therapists within Healer clinics to access your visit summaries and mood logs.',
    icon: Database,
  },
};

export function PrivacyView() {
  const queryClient = useQueryClient();

  // Fetch all current consents
  const { data: consents, isLoading } = useQuery<PrivacyConsent[]>({
    queryKey: ['privacy', 'consents'],
    queryFn: () => apiFetch<PrivacyConsent[]>('/privacy/consents'),
  });

  // Mutation: Upsert / Toggle consent
  const toggleMutation = useMutation({
    mutationFn: ({ consentType, accepted }: { consentType: string; accepted: boolean }) =>
      apiFetch<PrivacyConsent>('/privacy/consents', {
        method: 'PUT',
        body: JSON.stringify({ consentType, accepted }),
      }),
    onSuccess: (updated) => {
      toast.success(
        updated.accepted
          ? `Consent granted for ${updated.consentType}.`
          : `Consent revoked for ${updated.consentType}.`
      );
      queryClient.invalidateQueries({ queryKey: ['privacy', 'consents'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update consent settings.");
    },
  });

  // Mutation: Provision defaults if none exist
  const provisionMutation = useMutation({
    mutationFn: () => apiFetch('/privacy/consents/provision', { method: 'POST' }),
    onSuccess: () => {
      toast.success("Default privacy preferences generated.");
      queryClient.invalidateQueries({ queryKey: ['privacy', 'consents'] });
    },
  });

  const consentTypes: Array<'AI Memory' | 'Research Participation' | 'Data Sharing'> = [
    'AI Memory',
    'Research Participation',
    'Data Sharing',
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Privacy & Consent Controls</h2>
        <p className="text-sm text-muted-foreground">
          You retain complete ownership over your health data. Modify permissions or revoke access at any time.
        </p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading privacy preferences...</p>
        ) : (
          consentTypes.map((type) => {
            const current = consents?.find((c) => c.consentType === type);
            const isAccepted = current?.accepted ?? false;
            const meta = CONSENT_DESCRIPTIONS[type];
            const Icon = meta.icon;

            return (
              <Card key={type} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{meta.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isAccepted
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {isAccepted ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                        {meta.desc}
                      </p>
                      {current?.acceptedDate && (
                        <p className="text-[11px] text-muted-foreground pt-1">
                          {isAccepted
                            ? `Granted on: ${new Date(current.acceptedDate).toLocaleDateString()}`
                            : current.revokedDate
                              ? `Revoked on: ${new Date(current.revokedDate).toLocaleDateString()}`
                              : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center">
                    <Button
                      variant={isAccepted ? "outline" : "default"}
                      size="sm"
                      onClick={() => toggleMutation.mutate({ consentType: type, accepted: !isAccepted })}
                      disabled={toggleMutation.isPending}
                    >
                      {isAccepted ? (
                        <>
                          <XCircle className="w-4 h-4 mr-1.5 text-muted-foreground" /> Revoke Consent
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" /> Grant Consent
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {(!consents || consents.length === 0) && !isLoading && (
        <div className="text-center p-6 border rounded-xl bg-card">
          <p className="text-xs text-muted-foreground mb-3">
            Initial consent records not yet provisioned for this account.
          </p>
          <Button size="sm" onClick={() => provisionMutation.mutate()} disabled={provisionMutation.isPending}>
            Generate Default Privacy Settings
          </Button>
        </div>
      )}
    </div>
  );
}
