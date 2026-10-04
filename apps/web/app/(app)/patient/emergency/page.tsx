"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { AlertTriangle, Phone, ShieldAlert, Plus, Trash2, HeartHandshake, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface TrustedContact {
  id: string;
  contactName: string;
  relationship: string;
  phoneNumber: string;
  email: string | null;
  emergencyAlertPermission: boolean;
}

interface CrisisEvent {
  id: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  detectedIssue: string;
  aiResponse: string;
  emergencyContacted: boolean;
  psychologistConnected: boolean;
  createdAt: string;
}

export default function EmergencyPage() {
  const queryClient = useQueryClient();

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [activeCrisisAlert, setActiveCrisisAlert] = useState<CrisisEvent | null>(null);

  // Fetch trusted contacts
  const { data: contacts, isLoading: loadingContacts } = useQuery<TrustedContact[]>({
    queryKey: ['emergency', 'contacts'],
    queryFn: () => apiFetch<TrustedContact[]>('/emergency/contacts'),
  });

  // Mutation: Trigger emergency / crisis event
  const triggerCrisisMutation = useMutation({
    mutationFn: (riskLevel: 'Low' | 'Medium' | 'High') =>
      apiFetch<CrisisEvent>('/emergency/crisis', {
        method: 'POST',
        body: JSON.stringify({
          riskLevel,
          detectedIssue: 'Patient requested immediate distress support via portal.',
        }),
      }),
    onSuccess: (event) => {
      setActiveCrisisAlert(event);
      toast.error("Emergency assistance protocol initiated.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to trigger crisis protocol.");
    },
  });

  // Mutation: Add trusted contact
  const addContactMutation = useMutation({
    mutationFn: (data: {
      contactName: string;
      relationship: string;
      phoneNumber: string;
      email?: string;
    }) =>
      apiFetch<TrustedContact>('/emergency/contacts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Trusted contact added.");
      setShowAddContact(false);
      setContactName('');
      setPhoneNumber('');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['emergency', 'contacts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to save contact.");
    },
  });

  // Mutation: Delete trusted contact
  const deleteContactMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/emergency/contacts/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success("Contact removed.");
      queryClient.invalidateQueries({ queryKey: ['emergency', 'contacts'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to delete contact.");
    },
  });

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !phoneNumber.trim()) return;
    addContactMutation.mutate({
      contactName: contactName.trim(),
      relationship,
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Critical Banner */}
      <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/30 space-y-3">
        <div className="flex items-center gap-2 text-destructive font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          Immediate Help & Crisis Assistance
        </div>
        <p className="text-xs text-foreground/90 leading-relaxed max-w-3xl">
          If you are experiencing severe distress, panic, thoughts of self-harm, or feel unsafe, 
          please know that support is accessible right now. You do not have to carry this alone.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            variant="destructive"
            onClick={() => triggerCrisisMutation.mutate('High')}
            disabled={triggerCrisisMutation.isPending}
            className="font-bold"
          >
            <ShieldAlert className="w-4 h-4 mr-2" /> I Need Immediate Help
          </Button>
          <Button asChild variant="outline">
            <a href="tel:988" className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-emerald-600" /> Call 988 Suicide & Crisis Lifeline
            </a>
          </Button>
        </div>
      </div>

      {/* Active Crisis Alert Banner */}
      {activeCrisisAlert && (
        <Card className="border-destructive bg-destructive/5 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-destructive text-lg font-bold flex items-center gap-2">
              <HeartHandshake className="w-5 h-5" /> Safety Support Activated
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-foreground leading-relaxed font-medium">
              {activeCrisisAlert.aiResponse}
            </p>
            <div className="flex flex-wrap gap-4 pt-2 text-muted-foreground">
              <span>Trusted Contacts Notified: <strong>{activeCrisisAlert.emergencyContacted ? 'Yes' : 'Pending'}</strong></span>
              <span>Doctor / Psychologist Alert: <strong>{activeCrisisAlert.psychologistConnected ? 'Yes' : 'Pending'}</strong></span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trusted Contacts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your Trusted Emergency Contacts</h2>
            <p className="text-xs text-muted-foreground">
              Designated family members, friends, or caregivers who can be alerted during crisis events.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowAddContact(!showAddContact)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> {showAddContact ? 'Cancel' : 'Add Contact'}
          </Button>
        </div>

        {/* Add Contact Form */}
        {showAddContact && (
          <Card className="border-primary/50 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">New Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddContact} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Full Name</label>
                    <Input
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="E.g., Sarah Smith"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Relationship</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                    >
                      <option value="Family">Family Member</option>
                      <option value="Friend">Close Friend</option>
                      <option value="Caregiver">Caregiver / Nurse</option>
                      <option value="Partner">Partner / Spouse</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Phone Number</label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Email (Optional)</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@example.com"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddContact(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={addContactMutation.isPending}>
                    {addContactMutation.isPending ? 'Saving...' : 'Save Trusted Contact'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Contacts List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loadingContacts ? (
            <p className="text-xs text-muted-foreground col-span-3">Loading contacts...</p>
          ) : contacts && contacts.length > 0 ? (
            contacts.map((c) => (
              <Card key={c.id} className="p-4 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{c.contactName}</h3>
                      <span className="text-[11px] text-primary font-medium">{c.relationship}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Alert Authorized
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-3 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> {c.phoneNumber}
                    </p>
                    {c.email && <p className="truncate">📧 {c.email}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 text-xs h-7 px-2"
                    onClick={() => deleteContactMutation.mutate(c.id)}
                    disabled={deleteContactMutation.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="col-span-3 p-8 text-center text-muted-foreground text-xs">
              No trusted contacts added yet. Add trusted family or friends who can be reached if you need help.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
