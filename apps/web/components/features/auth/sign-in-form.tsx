"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      } else {
        toast.success("Welcome back!");
        try {
          const res = await fetch("/api/auth/me", { credentials: "include" });
          const meData = await res.json().catch(() => null);
          if (meData?.user?.role === "super_admin") {
            router.push("/super-admin");
          } else if (meData?.user?.role === "admin") {
            router.push("/admin");
          } else if (meData?.profiles?.isDoctor) {
            router.push("/doctor");
          } else {
            router.push("/patient");
          }
        } catch {
          router.push("/patient");
        }
      }
    } catch (err: any) {
      toast.error("Something went wrong.");
    } finally {
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
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password"
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          className="bg-background/60 backdrop-blur-sm h-12"
          placeholder="••••••••"
          required 
        />
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
