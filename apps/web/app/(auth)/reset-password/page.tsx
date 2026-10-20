"use client";

import { useState, useMemo } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Brain,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  X,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Matches the same rules enforced on sign-up. */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,256}$/;

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "Maximum 256 characters", test: (p: string) => p.length <= 256 && p.length > 0 },
  { label: "Contains a letter (A–Z / a–z)", test: (p: string) => /[A-Za-z]/.test(p) },
  { label: "Contains a number (0–9)", test: (p: string) => /\d/.test(p) },
  { label: "Contains a symbol (!@#$… etc.)", test: (p: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );

  const isPasswordValid = PASSWORD_REGEX.test(password);

  const strengthScore = ruleResults.filter((r) => r.passed).length;
  const strengthLabel =
    strengthScore <= 1 ? "Weak" :
    strengthScore <= 3 ? "Fair" :
    strengthScore <= 4 ? "Good" : "Strong";
  const strengthBarColor =
    strengthScore <= 1 ? "bg-rose-500" :
    strengthScore <= 3 ? "bg-amber-500" :
    strengthScore <= 4 ? "bg-teal-500" : "bg-emerald-500";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Password does not meet the requirements. Please check the checklist.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await authClient.resetPassword({
        newPassword: password,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset successfully. You can now sign in.");
        router.push("/sign-in");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Header */}
      <div className="flex justify-center mb-6">
        <Link
          href="/"
          className="flex items-center gap-2 hover:opacity-85 transition-opacity"
        >
          <Brain className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-foreground">
            Healer
          </span>
        </Link>
      </div>

      {/* Main Glassmorphic Card */}
      <div className="bg-card/70 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl p-7 sm:p-9 relative overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Back to Sign In Link */}
          <div className="mb-6">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group px-2.5 py-1.5 rounded-xl hover:bg-muted/60 -ml-2.5"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          <div className="text-center mb-6 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Set New Password
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
              Create a secure password meeting clinical compliance standards.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (!passwordTouched) setPasswordTouched(true);
                  }}
                  onBlur={() => setPasswordTouched(true)}
                  className="bg-background/70 backdrop-blur-sm h-12 pr-11 text-sm rounded-xl border-border/80"
                  placeholder="Min. 8 chars · letter · number · symbol"
                  required
                  maxLength={256}
                  autoFocus
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

              {/* Strength bar + rule checklist */}
              {passwordTouched && password.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all duration-300",
                          i < strengthScore ? strengthBarColor : "bg-muted",
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] font-semibold text-muted-foreground">
                    Password strength:{" "}
                    <span
                      className={cn(
                        strengthScore <= 1 ? "text-rose-500" :
                        strengthScore <= 3 ? "text-amber-500" :
                        strengthScore <= 4 ? "text-teal-500" : "text-emerald-500",
                      )}
                    >
                      {strengthLabel}
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {ruleResults.map((rule) => (
                      <li key={rule.label} className="flex items-center gap-2 text-[11px]">
                        {rule.passed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className={rule.passed ? "text-foreground" : "text-muted-foreground"}>
                          {rule.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full font-semibold shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all text-sm mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Resetting Password...
                </>
              ) : (
                "Update & Sign In"
              )}
            </Button>
          </form>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-7">
        Remember your password?{" "}
        <Link href="/sign-in" className="text-primary font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
