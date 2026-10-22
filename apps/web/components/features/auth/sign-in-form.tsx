"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, Info } from "lucide-react";
import Link from "next/link";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await signIn.email({
        email,
        password,
      });

      if (error) {
        toast.error(error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      toast.success("Welcome back!");

      // Determine target destination based on returned user role or /api/auth/me fallback
      let targetUrl = "/patient";
      const userRole = (data as { user?: { role?: string } } | null)?.user?.role;

      if (userRole === "super_admin") {
        targetUrl = "/super-admin";
      } else if (userRole === "admin") {
        targetUrl = "/admin";
      } else if (userRole === "doctor") {
        targetUrl = "/doctor";
      } else if (userRole === "researcher") {
        targetUrl = "/researcher";
      } else {
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          if (res.ok) {
            const meData = await res.json().catch(() => null);
            if (meData?.user?.role === "super_admin") {
              targetUrl = "/super-admin";
            } else if (meData?.user?.role === "admin") {
              targetUrl = "/admin";
            } else if (meData?.user?.role === "doctor" || meData?.profiles?.isDoctor) {
              targetUrl = "/doctor";
            } else if (meData?.user?.role === "researcher" || meData?.profiles?.isResearcher) {
              targetUrl = "/researcher";
            } else {
              targetUrl = "/patient";
            }
          }
        } catch {
          targetUrl = "/patient";
        }
      }

      // Hard document navigation ensures cookies, server components, and client sessions synchronize instantly
      window.location.href = targetUrl;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-background/60 backdrop-blur-sm h-12"
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-[11px] text-primary font-medium hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Password input with show / hide toggle */}
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-background/60 backdrop-blur-sm h-12 pr-11"
            placeholder="Your password"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password requirements reminder */}
        <div className="flex items-start gap-2 rounded-xl bg-muted/50 border border-border/50 px-3 py-2.5 mt-1">
          <Info className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Your Healer password must be{" "}
            <span className="font-semibold text-foreground">8–256 characters</span> and include at
            least one{" "}
            <span className="font-semibold text-foreground">letter</span>,{" "}
            one <span className="font-semibold text-foreground">number</span>, and one{" "}
            <span className="font-semibold text-foreground">symbol</span>{" "}
            (e.g. <span className="font-mono">!@#$%^&amp;*</span>).
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full h-12 rounded-full font-semibold shadow-lg shadow-primary/10 mt-4"
        disabled={loading}
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
      </Button>
    </form>
  );
}
