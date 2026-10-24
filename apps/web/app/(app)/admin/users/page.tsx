"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAdminUsers, updateUserStatusApi, verifyDoctorLicenseApi } from "@/lib/api/admin";
import { toast } from "sonner";
import Link from "next/link";
import {
  Users,
  Search,
  Filter,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldAlert,
  Loader2,
  Stethoscope,
  HeartPulse,
  Microscope,
  Shield,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AdminUsersDirectoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // License verification modal state
  const [verifyModalDoctor, setVerifyModalDoctor] = useState<{ id: string; name: string } | null>(null);
  const [licenseInput, setLicenseInput] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-users", roleFilter, statusFilter, search],
    queryFn: () =>
      fetchAdminUsers({
        role: roleFilter,
        status: statusFilter,
        search: search.trim() || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: "active" | "suspended" | "banned" }) =>
      updateUserStatusApi(userId, status),
    onSuccess: (_, variables) => {
      toast.success(`User status updated to ${variables.status}`);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update user status");
    },
  });

  const verifyDoctorMutation = useMutation({
    mutationFn: ({ doctorId, licenseNumber }: { doctorId: string; licenseNumber: string }) =>
      verifyDoctorLicenseApi(doctorId, licenseNumber),
    onSuccess: () => {
      toast.success("Doctor credentials verified and license approved!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setVerifyModalDoctor(null);
      setLicenseInput("");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to verify doctor license");
    },
  });

  const usersList = data?.users || [];

  return (
    <div className="space-y-6">
      {/* Header with breadcrumb */}
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              User Management Directory
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Audit patient records, verify clinician licenses, and manage account statuses.
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1.5 rounded-full bg-muted border border-border/50 text-muted-foreground">
            Total Displayed: <span className="text-foreground">{usersList.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name or email address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 bg-background/50 border-border/60 rounded-xl text-sm"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Role:
          </span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Roles</option>
            <option value="patient">Patients</option>
            <option value="doctor">Doctors</option>
            <option value="researcher">Researchers</option>
            <option value="admin">Admins</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-muted-foreground shrink-0">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-background border border-border/60 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>

      {/* Directory Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading user accounts…</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-rose-500 text-sm">
            Failed to load users. Please ensure you have administrator privileges.
          </div>
        ) : usersList.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No matching user accounts found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Domain Profile / Credentials</th>
                  <th className="py-3 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {usersList.map((user: any) => {
                  const isDoctor = user.role === "doctor";
                  const isPendingDoctor =
                    isDoctor &&
                    user.doctorProfile &&
                    (user.doctorProfile.licenseNumber === "PENDING" ||
                      !user.doctorProfile.licenseNumber ||
                      user.doctorProfile.licenseNumber.startsWith("PENDING"));

                  return (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">{user.email}</div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            user.role === "doctor"
                              ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/20"
                              : user.role === "researcher"
                              ? "bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20"
                              : user.role === "admin" || user.role === "super_admin"
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {user.role === "doctor" && <Stethoscope className="w-3 h-3" />}
                          {user.role === "researcher" && <Microscope className="w-3 h-3" />}
                          {user.role === "patient" && <HeartPulse className="w-3 h-3" />}
                          {(user.role === "admin" || user.role === "super_admin") && (
                            <Shield className="w-3 h-3" />
                          )}
                          {user.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            user.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : user.status === "suspended"
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      {/* Domain Profile Info */}
                      <td className="py-3.5 px-4 text-xs">
                        {isDoctor && user.doctorProfile && (
                          <div className="space-y-1">
                            <div className="text-foreground font-medium">
                              {user.doctorProfile.specialization}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-muted-foreground">License:</span>
                              {isPendingDoctor ? (
                                <span className="text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded text-[10px]">
                                  PENDING REVIEW
                                </span>
                              ) : (
                                <span className="font-mono text-emerald-600 font-semibold flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {user.doctorProfile.licenseNumber}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {user.role === "patient" && user.patientProfile && (
                          <div className="text-muted-foreground">
                            Blood: <span className="font-semibold text-foreground">{user.patientProfile.bloodType || "N/A"}</span>
                          </div>
                        )}

                        {user.role === "researcher" && user.researcherProfile && (
                          <div className="text-muted-foreground truncate max-w-[200px]">
                            {user.researcherProfile.institution}
                          </div>
                        )}

                        {(user.role === "admin" || user.role === "super_admin") && (
                          <span className="text-purple-600 font-medium text-[11px]">System Staff</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Doctor verification button */}
                          {isPendingDoctor && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setVerifyModalDoctor({ id: user.doctorProfile.id, name: user.name });
                                setLicenseInput("");
                              }}
                              className="h-8 text-xs bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/30 font-semibold cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5 mr-1" /> Verify
                            </Button>
                          )}

                          {/* Status buttons */}
                          {user.role !== "super_admin" && (
                            <>
                              {user.status === "active" ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updateStatusMutation.mutate({ userId: user.id, status: "suspended" })
                                    }
                                    className="h-8 text-xs text-amber-600 hover:bg-amber-500/10 cursor-pointer"
                                  >
                                    Suspend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updateStatusMutation.mutate({ userId: user.id, status: "banned" })
                                    }
                                    className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    Ban
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updateStatusMutation.mutate({ userId: user.id, status: "active" })
                                  }
                                  className="h-8 text-xs text-emerald-600 hover:bg-emerald-500/10 font-semibold cursor-pointer"
                                >
                                  Activate
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verify Doctor License Modal */}
      <Dialog open={!!verifyModalDoctor} onOpenChange={(open) => !open && setVerifyModalDoctor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="w-5 h-5 text-primary" />
              Verify Clinician License
            </DialogTitle>
            <DialogDescription>
              Validate the professional medical accreditation for{" "}
              <strong className="text-foreground">{verifyModalDoctor?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">
                Verified Medical License Number
              </label>
              <Input
                placeholder="e.g. MD-948201-BD"
                value={licenseInput}
                onChange={(e) => setLicenseInput(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Entering a verified license number changes the clinician&apos;s status from Pending to Verified.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setVerifyModalDoctor(null)} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (verifyModalDoctor && licenseInput.trim()) {
                  verifyDoctorMutation.mutate({
                    doctorId: verifyModalDoctor.id,
                    licenseNumber: licenseInput.trim(),
                  });
                }
              }}
              disabled={!licenseInput.trim() || verifyDoctorMutation.isPending}
              className="cursor-pointer font-semibold"
            >
              {verifyDoctorMutation.isPending ? "Approving…" : "Approve & Verify"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
