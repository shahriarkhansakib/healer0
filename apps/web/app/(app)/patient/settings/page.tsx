"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Settings, User, Bell, Shield, Save, CheckCircle, Globe, Smartphone } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AccountProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  } | null;
  profile: {
    id: string;
    fullName: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    occupation: string | null;
    country: string | null;
    language: string | null;
    profileImage: string | null;
  } | null;
}

interface UserPreferences {
  id: string;
  aiMemoryEnabled: boolean;
  moodTrackingEnabled: boolean;
  anonymousMode: boolean;
  notificationEnabled: boolean;
}

export default function PatientSettingsPage() {
  const queryClient = useQueryClient();

  // Tab selection
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

  // Form states for Profile
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('Prefer not to say');
  const [occupation, setOccupation] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('en');

  // Fetch account profile
  const { data: accountData, isLoading: loadingProfile } = useQuery<AccountProfileResponse>({
    queryKey: ['account', 'profile'],
    queryFn: () => apiFetch<AccountProfileResponse>('/account/profile'),
  });

  // Fetch preferences
  const { data: preferences, isLoading: loadingPrefs } = useQuery<UserPreferences>({
    queryKey: ['account', 'preferences'],
    queryFn: () => apiFetch<UserPreferences>('/account/preferences'),
  });

  // Populate profile form when data arrives
  useEffect(() => {
    if (accountData) {
      setFullName(accountData.profile?.fullName || accountData.user?.name || '');
      setPhone(accountData.user?.phone || '');
      setDateOfBirth(accountData.profile?.dateOfBirth ? accountData.profile.dateOfBirth.slice(0, 10) : '');
      setGender(accountData.profile?.gender || 'Prefer not to say');
      setOccupation(accountData.profile?.occupation || '');
      setCountry(accountData.profile?.country || '');
      setLanguage(accountData.profile?.language || 'en');
    }
  }, [accountData]);

  // Mutation: Update Profile
  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      fullName: string;
      phone?: string;
      dateOfBirth?: string;
      gender?: string;
      occupation?: string;
      country?: string;
      language?: string;
    }) =>
      apiFetch('/account/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Profile demographics updated successfully.");
      queryClient.invalidateQueries({ queryKey: ['account', 'profile'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update profile.");
    },
  });

  // Mutation: Update Preferences
  const updatePreferencesMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) =>
      apiFetch('/account/preferences', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      toast.success("Preferences updated.");
      queryClient.invalidateQueries({ queryKey: ['account', 'preferences'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update preferences.");
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender,
      occupation: occupation.trim() || undefined,
      country: country.trim() || undefined,
      language,
    });
  };

  const handleTogglePref = (key: keyof UserPreferences, currentValue: boolean) => {
    updatePreferencesMutation.mutate({ [key]: !currentValue });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Account Settings & Profile</h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal demographics, communication details, and application preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'profile'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <User className="w-4 h-4" /> Personal Information
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'preferences'
              ? 'bg-primary text-primary-foreground shadow-xs'
              : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          <Settings className="w-4 h-4" /> Application Preferences
        </button>
      </div>

      {/* Profile Demographics Form */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Personal & Demographic Details</CardTitle>
            <CardDescription className="text-xs">
              This information is used to tailor your psychological care and clinical recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingProfile ? (
              <p className="text-sm text-muted-foreground">Loading profile details...</p>
            ) : (
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Full Legal Name</label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Email Address</label>
                    <Input
                      value={accountData?.user?.email || ''}
                      disabled
                      className="bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Phone Number</label>
                    <Input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Date of Birth</label>
                    <Input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Occupation / Student Status</label>
                    <Input
                      value={occupation}
                      onChange={(e) => setOccupation(e.target.value)}
                      placeholder="Software Engineer / Student..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Country of Residence</label>
                    <Input
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States, Canada, etc."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Preferred Language</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-card px-3 text-xs"
                    >
                      <option value="en">English (Default)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                      <option value="bn">বাংলা (Bengali)</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-3">
                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    <Save className="w-4 h-4 mr-1.5" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Preferences Form */}
      {activeTab === 'preferences' && (
        <div className="space-y-4">
          {loadingPrefs ? (
            <p className="text-sm text-muted-foreground">Loading preferences...</p>
          ) : preferences ? (
            <div className="space-y-4">
              {[
                {
                  key: 'aiMemoryEnabled' as const,
                  title: 'AI Counseling Long-Term Memory',
                  desc: 'Allow your AI counselor to recall emotional patterns and conversations across multiple sessions.',
                  value: preferences.aiMemoryEnabled,
                },
                {
                  key: 'moodTrackingEnabled' as const,
                  title: 'Daily Mood Tracking Reminders',
                  desc: 'Enable daily prompts and wellness recommendations based on your emotional trends.',
                  value: preferences.moodTrackingEnabled,
                },
                {
                  key: 'anonymousMode' as const,
                  title: 'Default Community Anonymous Mode',
                  desc: 'Automatically mask your real name and use anonymous avatars when posting in peer groups.',
                  value: preferences.anonymousMode,
                },
                {
                  key: 'notificationEnabled' as const,
                  title: 'Push & Email Notifications',
                  desc: 'Receive alerts for scheduled appointments, new peer group replies, and crisis alerts.',
                  value: preferences.notificationEnabled,
                },
              ].map((item) => (
                <Card key={item.key} className="p-5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={item.value ? "default" : "outline"}
                    onClick={() => handleTogglePref(item.key, item.value)}
                    disabled={updatePreferencesMutation.isPending}
                    className="shrink-0"
                  >
                    {item.value ? 'Enabled' : 'Disabled'}
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No preferences available.</p>
          )}
        </div>
      )}
    </div>
  );
}
