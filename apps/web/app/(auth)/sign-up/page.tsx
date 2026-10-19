import { SignUpFlow } from "@/components/features/auth/sign-up-flow";
import Link from "next/link";
import { Brain } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="w-full max-w-md">
      <div className="flex justify-center mb-8">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Brain className="w-8 h-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight">Healer</span>
        </Link>
      </div>

      <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl p-8 sm:p-10 relative overflow-hidden">
        <div className="mb-8 text-center relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Create Account</h1>
          <p className="text-muted-foreground text-sm">Join the Healer platform.</p>
        </div>
        
        <div className="relative z-10">
          <SignUpFlow />
        </div>
      </div>
      
      <p className="text-center text-sm text-muted-foreground mt-8">
        Already have an account? <Link href="/sign-in" className="text-primary font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
