"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSuperAdminAdmins, createAdminApi, revokeAdminApi } from "@/lib/api/admin";
import { toast } from "sonner";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  ArrowLeft,
  Loader2,
  Trash2,
  KeyRound,
  Mail,
  User,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SuperAdminAdminsManagementPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("12345678");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["super-admin-admins"],
    queryFn: fetchSuperAdminAdmins,
  });

  const createAdminMutation = useMutation({
    mutationFn: (newAdmin: { name: string; email: string; password?: string }) =>
      createAdminApi(newAdmin),
    onSuccess: (res) => {
      toast.success(`Administrator ${res.admin?.name || "account"} created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      setCreateModalOpen(false);
      setName("");
      setEmail("");
      setPassword("12345678");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to provision administrator");
    },
  });

  const revokeAdminMutation = useMutation({
    mutationFn: (adminId: string) => revokeAdminApi(adminId),
    onSuccess: () => {
      toast.success("Administrator privileges revoked.");
      queryClient.invalidateQueries({ queryKey: ["super-admin-admins"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to revoke administrator");
    },
  });

  const adminsList = data?.admins || [];

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Please enter both a name and a valid email address.");
      return;
    }
    createAdminMutation.mutate({
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || "12345678",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/super-admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Super Admin Overview
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Administrator Governance
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Provision, audit, and revoke system administrator privileges (AGENTS.md Level 4).
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="rounded-full shadow-sm font-semibold h-10 px-5 gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Provision New Administrator
          </Button>
        </div>
      </div>

      {/* Administrators Table */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <p className="text-xs">Loading administrators…</p>
          </div>
        ) : isError ? (
          <div className="py-16 text-center text-rose-500 text-sm">
            Failed to load administrators. Ensure you are signed in as Super Admin.
          </div>
        ) : adminsList.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            No administrators found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 border-b border-border/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Authority Level</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Date Provisioned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {adminsList.map((admin: any) => {
                  const isSuperAdmin = admin.role === "super_admin";

                  return (
                    <tr key={admin.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          {admin.name}
                          {isSuperAdmin && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                              ROOT
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">{admin.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                            isSuperAdmin
                              ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                              : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                          }`}
                        >
                          {isSuperAdmin ? (
                            <ShieldAlert className="w-3.5 h-3.5" />
                          ) : (
                            <ShieldCheck className="w-3.5 h-3.5" />
                          )}
                          {isSuperAdmin ? "Super Admin (Level 5)" : "System Admin (Level 4)"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            admin.status === "active"
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(admin.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {isSuperAdmin ? (
                          <span className="text-[11px] text-muted-foreground italic">Protected Root</span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm(`Revoke administrative access from ${admin.name}?`)) {
                                revokeAdminMutation.mutate(admin.id);
                              }
                            }}
                            disabled={revokeAdminMutation.isPending}
                            className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 cursor-pointer gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision New Admin Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Provision New Administrator
            </DialogTitle>
            <DialogDescription>
              Create a new System Administrator account. Per AGENTS.md directives, admins can only be created by Super Admins.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="admin-name" className="text-xs font-semibold text-muted-foreground">
                Administrator Full Name
              </Label>
              <Input
                id="admin-name"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold text-muted-foreground">
                Official Staff Email
              </Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="e.g. staff.admin@healer.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-pass" className="text-xs font-semibold text-muted-foreground">
                Initial Password
              </Label>
              <Input
                id="admin-pass"
                type="text"
                placeholder="12345678"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 text-sm font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Default: <span className="font-mono text-foreground font-semibold">12345678</span>. The administrator can change this upon login.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateModalOpen(false)}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createAdminMutation.isPending}
                className="cursor-pointer font-semibold shadow-sm"
              >
                {createAdminMutation.isPending ? "Provisioning…" : "Provision Administrator"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
