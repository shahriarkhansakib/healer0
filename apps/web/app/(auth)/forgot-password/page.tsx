"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import {
  Brain,
  ArrowLeft,
  Mail,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
  Loader2,
  Send,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await authClient.forgetPassword({
        email: email.trim(),
        redirectTo: "/reset-password",
      });

      if (error) {
        toast.error(error.message || "Unable to send reset link.");
      } else {
        setSubmittedEmail(email.trim());
        toast.success("Password reset instructions sent.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedEmail(null);
  };

  return (
    <div className="w-full max-w-md">
      {/* Brand Logo Header */}
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
        {/* Soft Ambient Background Glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Back to Sign In Link Button */}
          <div className="mb-6">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group px-2.5 py-1.5 rounded-xl hover:bg-muted/60 -ml-2.5"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Sign In</span>
            </Link>
          </div>

          {!submittedEmail ? (
            <>
              {/* Card Header */}
              <div className="text-center mb-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-2xs">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                  Reset Password
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  Enter your email address to receive secure instructions to reset your account password.
                </p>
              </div>

              {/* Reset Request Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Account Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-background/70 backdrop-blur-sm h-12 pl-10 pr-4 text-sm rounded-xl border-border/80 focus:border-primary/60"
                      placeholder="name@example.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                {/* Security Reassurance Banner */}
                <div className="flex items-start gap-2.5 rounded-2xl bg-muted/40 border border-border/60 p-3 text-[11px] text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span className="leading-relaxed">
                    Recovery links are single-use, cryptographically verified, and expire safely after 1 hour.
                  </span>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-full font-semibold shadow-lg shadow-primary/15 hover:shadow-primary/25 transition-all text-sm mt-2 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Recovery Link...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Reset Link</span>
                    </>
                  )}
                </Button>
              </form>
            </>
          ) : (
            /* Confirmation Success State */
            <div className="text-center py-2 space-y-5 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Check Your Inbox
                </h2>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  We've dispatched password reset instructions to:
                </p>
                <p className="text-sm font-semibold font-mono text-primary bg-primary/10 border border-primary/20 py-1.5 px-3 rounded-xl inline-block mt-1">
                  {submittedEmail}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground text-left space-y-1">
                <p className="font-semibold text-foreground">Haven't received the link?</p>
                <p className="leading-relaxed">
                  Check your spam/junk folder. In local development, inspect Mailpit at{" "}
                  <code className="text-primary font-mono text-[10px]">localhost:8025</code>.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleResetForm}
                  variant="outline"
                  className="w-full h-11 rounded-full text-xs font-semibold flex items-center justify-center gap-2 border-border/80"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try a different email</span>
                </Button>

                <Button asChild className="w-full h-11 rounded-full text-xs font-semibold">
                  <Link href="/sign-in">Return to Sign In</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Persistent Sign-In Redirect Footer */}
      <p className="text-center text-xs text-muted-foreground mt-7">
        Remember your password?{" "}
        <Link
          href="/sign-in"
          className="text-primary font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
