"use client";

import { useState, useMemo } from "react";
import { signIn, signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { HeartPulse, Stethoscope, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

/** Password must be 8–256 characters with at least one letter, one digit, and one symbol. */
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,256}$/;

interface PasswordRule {
  label: string;
  test: (p: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters",           test: (p) => p.length >= 8 },
  { label: "Maximum 256 characters",          test: (p) => p.length <= 256 && p.length > 0 },
  { label: "Contains a letter (A–Z / a–z)",   test: (p) => /[A-Za-z]/.test(p) },
  { label: "Contains a number (0–9)",         test: (p) => /\d/.test(p) },
  { label: "Contains a symbol (!@#$… etc.)",  test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(p) },
];

export function SignUpFlow() {
  const [isDoctor, setIsDoctor] = useState(false);

  // Base fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  // Doctor-specific fields
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/patient`,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Google sign-up failed.";
      toast.error(message);
      setGoogleLoading(false);
    }
  };
  const router = useRouter();

  /** Live rule status — re-evaluated on every keystroke */
  const ruleResults = useMemo(
    () => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })),
    [password],
  );

  const isPasswordValid = PASSWORD_REGEX.test(password);

  /** Strength score 0–5 based on how many rules are met */
  const strengthScore = ruleResults.filter((r) => r.passed).length;
  const strengthLabel =
    strengthScore <= 1 ? "Weak" :
    strengthScore <= 3 ? "Fair" :
    strengthScore <= 4 ? "Good" : "Strong";
  const strengthBarColor =
    strengthScore <= 1 ? "bg-rose-500" :
    strengthScore <= 3 ? "bg-amber-500" :
    strengthScore <= 4 ? "bg-teal-500"  : "bg-emerald-500";

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      toast.error("Password does not meet the requirements. Please check the checklist below the field.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp.email({
        email,
        password,
        name,
      });

      if (error) {
        toast.error(error.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Provision all necessary profiles
      // Every user receives a Patient & Researcher identity by default;
      // Doctor profile is provisioned if the doctor option was enabled.
      const res = await fetch("/api/auth/setup-profiles", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: (data as any)?.user?.id,
          isDoctor,
          specialization: isDoctor ? specialization : undefined,
          licenseNumber: isDoctor ? licenseNumber : undefined,
          hospitalAffiliation: isDoctor ? hospitalAffiliation : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Profile setup error:", errorData);
      }

      toast.success(isDoctor ? "Psychologist account created!" : "Welcome to Healer!");

      // Redirect to the appropriate dashboard
      window.location.href = isDoctor ? "/doctor" : "/patient";
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong during registration.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* Role / Identity Selector */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Account Type</Label>
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-2xl border border-border/50">
          <button
            type="button"
            onClick={() => setIsDoctor(false)}
            className={cn(
              "py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
              !isDoctor
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <HeartPulse className="w-4 h-4 text-primary" />
            Patient
          </button>
          <button
            type="button"
            onClick={() => setIsDoctor(true)}
            className={cn(
              "py-2.5 px-3 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer",
              isDoctor
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Stethoscope className="w-4 h-4" />
            I&apos;m a Psychologist
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Patient &amp; Researcher workspaces are included by default.
        </p>
      </div>

      {/* Primary Account Fields */}
      <div className="space-y-1.5">
        <Label htmlFor="name">Full Name</Label>
        <Input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background/60 backdrop-blur-sm h-11"
          placeholder={isDoctor ? "Dr. Sarah Jenkins" : "Sarah Jenkins"}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-background/60 backdrop-blur-sm h-11"
          placeholder="name@example.com"
          required
        />
      </div>

      {/* Password field with show/hide toggle and live strength checker */}
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
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
            className="bg-background/60 backdrop-blur-sm h-11 pr-11"
            placeholder="Min. 8 chars · letter · number · symbol"
            required
            maxLength={256}
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

        {/* Strength bar — only visible once the user starts typing */}
        {passwordTouched && password.length > 0 && (
          <div className="space-y-2 pt-1">
            {/* Segmented bar */}
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
                  strengthScore <= 4 ? "text-teal-500"  : "text-emerald-500"
                )}
              >
                {strengthLabel}
              </span>
            </p>

            {/* Rule checklist */}
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

      {/* Doctor-Specific Details (Smooth Animated Expansion) */}
      <AnimatePresence>
        {isDoctor && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden space-y-3 pt-2 border-t border-border/40"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Stethoscope className="w-3.5 h-3.5" />
              Psychologist Credentials
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialization" className="text-xs">Specialization</Label>
              <Input
                id="specialization"
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="bg-background/60 backdrop-blur-sm h-10 text-sm"
                placeholder="e.g. Clinical Psychology, Psychotherapy"
                required={isDoctor}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber" className="text-xs">Psychology License Number</Label>
              <Input
                id="licenseNumber"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="bg-background/60 backdrop-blur-sm h-10 text-sm"
                placeholder="e.g. PSY-9284719"
                required={isDoctor}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hospitalAffiliation" className="text-xs">Hospital / Clinic Affiliation (Optional)</Label>
              <Input
                id="hospitalAffiliation"
                type="text"
                value={hospitalAffiliation}
                onChange={(e) => setHospitalAffiliation(e.target.value)}
                className="bg-background/60 backdrop-blur-sm h-10 text-sm"
                placeholder="e.g. Hope Valley Wellness Clinic"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="submit"
        disabled={loading || googleLoading}
        className="w-full rounded-full h-12 font-semibold shadow-lg shadow-primary/10 mt-3"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isDoctor ? (
          "Create Psychologist Account"
        ) : (
          "Create Account"
        )}
      </Button>

      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-full font-semibold bg-background/50 border-border/60 hover:bg-muted/50 cursor-pointer"
        onClick={handleGoogleSignUp}
        disabled={loading || googleLoading}
      >
        {googleLoading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
        )}
        Continue with Google
      </Button>
    </form>
  );
}
