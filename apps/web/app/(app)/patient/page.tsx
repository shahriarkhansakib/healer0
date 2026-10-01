"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { 
  Smile, Bot, Sparkles, ClipboardList, BookMarked, Calendar, 
  Users, AlertTriangle, ArrowRight, CheckCircle2, HeartPulse, Clock
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MoodSummary {
  totalEntries: number;
  averageStress: number;
  averageAnxiety: number;
  averageSleep: number;
  records?: Array<{
    id: string;
    moodType: string;
    stressLevel: number;
    anxietyLevel: number;
    sleepQuality: number;
    wellnessGoal: string | null;
    wellnessActivity: string | null;
    recordedDate: string;
  }>;
}

interface Appointment {
  id: string;
  appointmentDate: string;
  consultationType: string;
  appointmentStatus: string;
  consultationReason: string | null;
}

export default function PatientOverviewPage() {
  const { data: moodSummary, isLoading: loadingMood } = useQuery<MoodSummary>({
    queryKey: ['patient', 'mood-summary'],
    queryFn: () => apiFetch<MoodSummary>('/mood-tracking/summary'),
  });

  const { data: appointments, isLoading: loadingAppts } = useQuery<Appointment[]>({
    queryKey: ['patient', 'appointments'],
    queryFn: () => apiFetch<Appointment[]>('/appointments'),
  });

  const latestMood = moodSummary?.records?.[0];
  const upcomingAppointment = appointments?.find(
    (a) => a.appointmentStatus === 'Scheduled' && new Date(a.appointmentDate) >= new Date()
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary p-8 border">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold">
            <HeartPulse className="w-3.5 h-3.5" />
            Holistic Health Sanctuary
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Welcome to Your Healing Space
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Monitor your daily emotions, access guided therapies, connect with licensed professionals, 
            or reflect in your private AI-assisted journal.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="sm">
              <Link href="/patient/mood" className="flex items-center gap-2">
                <Smile className="w-4 h-4" /> Log Today's Mood
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/patient/counseling" className="flex items-center gap-2">
                <Bot className="w-4 h-4" /> Start AI Counseling
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Mood & Wellness Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Weekly Wellness</CardTitle>
              <CardDescription>7-Day Average Scores</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Smile className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingMood ? (
              <p className="text-sm text-muted-foreground">Loading wellness trends...</p>
            ) : moodSummary && moodSummary.totalEntries > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Stress:</span>
                  <span className="font-semibold">{moodSummary.averageStress} / 10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Anxiety:</span>
                  <span className="font-semibold">{moodSummary.averageAnxiety} / 10</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avg. Sleep Quality:</span>
                  <span className="font-semibold">{moodSummary.averageSleep} / 10</span>
                </div>
                {latestMood?.wellnessGoal && (
                  <div className="mt-3 p-2.5 rounded-lg bg-muted text-xs text-foreground font-medium">
                    🎯 Goal: {latestMood.wellnessGoal}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <p>No mood logs this week.</p>
                <Link href="/patient/mood" className="text-primary hover:underline text-xs mt-1 block">
                  Check in today
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Next Appointment Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Next Consultation</CardTitle>
              <CardDescription>Clinical Sessions</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingAppts ? (
              <p className="text-sm text-muted-foreground">Checking appointments...</p>
            ) : upcomingAppointment ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Clock className="w-4 h-4 text-primary" />
                  {new Date(upcomingAppointment.appointmentDate).toLocaleString([], {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </div>
                <div className="text-xs text-muted-foreground">
                  Type: <span className="font-medium text-foreground">{upcomingAppointment.consultationType}</span>
                </div>
                {upcomingAppointment.consultationReason && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    Reason: {upcomingAppointment.consultationReason}
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full mt-2">
                  <Link href="/patient/appointments">View Details</Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">
                <p>No upcoming visits scheduled.</p>
                <Link href="/patient/appointments" className="text-primary hover:underline text-xs mt-1 block">
                  Schedule appointment
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Safety & Emergency Card */}
        <Card className="border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold text-destructive">Crisis Support</CardTitle>
              <CardDescription>24/7 Immediate Help</CardDescription>
            </div>
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              If you or someone you know is in distress or experiencing thoughts of self-harm, 
              reach out immediately.
            </p>
            <Button asChild variant="destructive" size="sm" className="w-full">
              <Link href="/patient/emergency">Emergency Resources & Contacts</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Navigation Modules Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Health & Care Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: "AI Counseling",
              desc: "Confidential sessions with emotion detection & immediate feedback.",
              href: "/patient/counseling",
              icon: Bot,
              color: "text-blue-500",
            },
            {
              title: "Daily Mood Tracking",
              desc: "Record emotions, stress levels, and get deterministic wellness rules.",
              href: "/patient/mood",
              icon: Smile,
              color: "text-amber-500",
            },
            {
              title: "Therapy & Relaxation",
              desc: "CBT programs, guided breathing, mindfulness, and sleep hygiene.",
              href: "/patient/therapy",
              icon: Sparkles,
              color: "text-purple-500",
            },
            {
              title: "Clinical Assessments",
              desc: "Standardized screening tools for anxiety, depression, and stress.",
              href: "/patient/assessments",
              icon: ClipboardList,
              color: "text-emerald-500",
            },
            {
              title: "Reflective Journal",
              desc: "Private journaling with AI sentiment recognition & instant summaries.",
              href: "/patient/journal",
              icon: BookMarked,
              color: "text-rose-500",
            },
            {
              title: "Anonymous Community",
              desc: "Moderated peer support groups and discussions on mental health.",
              href: "/patient/community",
              icon: Users,
              color: "text-teal-500",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group p-5 rounded-xl border bg-card hover:bg-muted/50 transition-all hover:shadow-sm flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-secondary text-primary">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-base group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.desc}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
