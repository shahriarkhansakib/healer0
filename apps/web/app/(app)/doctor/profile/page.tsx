"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchDoctorProfile, updateDoctorProfile, addDoctorQualification, fetchDoctorReviews } from "@/lib/api/doctor";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { User, Clock, Award, Star, Save, Plus, Calendar, ShieldCheck } from "lucide-react";

export default function DoctorProfilePage() {
  const queryClient = useQueryClient();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: fetchDoctorProfile,
  });

  const { data: reviewsData } = useQuery({
    queryKey: ["doctor-reviews"],
    queryFn: fetchDoctorReviews,
  });

  const profile = profileData?.data;
  const reviews = reviewsData?.data || [];

  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [dutyStartTime, setDutyStartTime] = useState("08:00");
  const [dutyEndTime, setDutyEndTime] = useState("17:00");
  const [offDay, setOffDay] = useState("Sunday");

  const [degree, setDegree] = useState("");
  const [institution, setInstitution] = useState("");
  const [year, setYear] = useState(2020);

  useEffect(() => {
    if (profile) {
      setSpecialization(profile.specialization || "");
      setBio(profile.bio || "");
      setDutyStartTime(profile.dutyStartTime || "08:00");
      setDutyEndTime(profile.dutyEndTime || "17:00");
      setOffDay(profile.offDay || "Sunday");
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => updateDoctorProfile(data),
    onSuccess: () => {
      toast.success("Doctor profile updated successfully");
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  const addQualMutation = useMutation({
    mutationFn: (data: any) => addDoctorQualification(data),
    onSuccess: () => {
      toast.success("Qualification added");
      queryClient.invalidateQueries({ queryKey: ["doctor-profile"] });
      setDegree("");
      setInstitution("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to add qualification");
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading doctor profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Doctor Profile & Duty Schedule</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage clinical credentials, specialization details, duty hours, and review feedback.
          </p>
        </div>
        <Link
          href="/patient"
          className="px-4 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <User className="w-4 h-4 text-teal-600" />
          Switch to Patient Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile & Duty Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Credentials Card */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg border border-teal-200">
                {profile?.user?.name?.[0] || "D"}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{profile?.user?.name || "Dr. Practitioner"}</h2>
                <p className="text-xs text-slate-500">{profile?.user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 rounded text-[11px] font-semibold">
                    {profile?.isVerified ? "Verified Practitioner" : "Pending Verification"}
                  </span>
                  <span className="text-xs text-slate-600 font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {profile?.rating ? Number(profile.rating).toFixed(1) : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specialization</label>
                <input
                  type="text"
                  placeholder="e.g. Clinical Psychiatry / Cardiology"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Professional Bio</label>
                <textarea
                  rows={4}
                  placeholder="Describe your medical background, treatment philosophies..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  Duty Schedule Configuration
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Duty Start Time</label>
                    <input
                      type="time"
                      value={dutyStartTime}
                      onChange={(e) => setDutyStartTime(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Duty End Time</label>
                    <input
                      type="time"
                      value={dutyEndTime}
                      onChange={(e) => setDutyEndTime(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Weekly Off Day</label>
                    <select
                      value={offDay}
                      onChange={(e) => setOffDay(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() =>
                    updateProfileMutation.mutate({
                      specialization,
                      bio,
                      dutyStartTime,
                      dutyEndTime,
                      offDay,
                    })
                  }
                  disabled={updateProfileMutation.isPending}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Profile & Duty Hours
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Qualifications & Reviews */}
        <div className="space-y-6">
          {/* Qualifications */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-4 h-4 text-teal-600" />
              Qualifications & Degrees
            </h3>

            {profile?.qualifications?.length > 0 ? (
              <div className="space-y-2">
                {profile.qualifications.map((q: any) => (
                  <div key={q.id} className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs">
                    <span className="font-bold text-slate-900 block">{q.degree}</span>
                    <span className="text-slate-500">{q.institution} ({q.year})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No qualifications recorded yet.</p>
            )}

            <div className="pt-3 border-t border-slate-100 space-y-2">
              <input
                type="text"
                placeholder="Degree (e.g. MBBS, MD)"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="text"
                placeholder="Institution / University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Year"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-24 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <button
                  onClick={() => {
                    if (!degree || !institution) {
                      toast.error("Enter degree and institution");
                      return;
                    }
                    addQualMutation.mutate({ degree, institution, year });
                  }}
                  disabled={addQualMutation.isPending}
                  className="flex-1 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Patient Reviews Feed */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-2xs space-y-4">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              Recent Patient Feedback
            </h3>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400">No reviews submitted yet.</p>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {reviews.map((rev: any) => (
                  <div key={rev.id} className="p-3 bg-slate-50/60 border border-slate-200/60 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800">{rev.patient?.user?.name || "Patient"}</span>
                      <span className="flex items-center text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                        {rev.rating}
                      </span>
                    </div>
                    {rev.comment && <p className="text-xs text-slate-600 italic">"{rev.comment}"</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
