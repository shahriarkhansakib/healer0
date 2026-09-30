"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { HeartPulse, Stethoscope, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

export function SignUpFlow() {
  const [isDoctor, setIsDoctor] = useState(false);
  
  // Base fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Doctor-specific fields
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [hospitalAffiliation, setHospitalAffiliation] = useState("");

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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

      toast.success(isDoctor ? "Doctor account created!" : "Welcome to Healer!");
      
      // Redirect to the appropriate dashboard
      router.push(isDoctor ? "/doctor" : "/patient");
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
            I'm a Doctor
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-primary inline" />
          Patient & Researcher workspaces are included by default.
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

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password"
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="bg-background/60 backdrop-blur-sm h-11"
          placeholder="••••••••"
          required 
          minLength={8}
        />
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
              Doctor Credentials
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialization" className="text-xs">Specialization</Label>
              <Input 
                id="specialization"
                type="text" 
                value={specialization} 
                onChange={(e) => setSpecialization(e.target.value)} 
                className="bg-background/60 backdrop-blur-sm h-10 text-sm"
                placeholder="e.g. Clinical Psychiatry, Psychotherapy"
                required={isDoctor}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="licenseNumber" className="text-xs">Medical License Number</Label>
              <Input 
                id="licenseNumber"
                type="text" 
                value={licenseNumber} 
                onChange={(e) => setLicenseNumber(e.target.value)} 
                className="bg-background/60 backdrop-blur-sm h-10 text-sm"
                placeholder="e.g. MD-9284719"
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
        disabled={loading}
        className="w-full rounded-full h-12 font-semibold shadow-lg shadow-primary/10 mt-3"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isDoctor ? (
          "Create Doctor Account"
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
