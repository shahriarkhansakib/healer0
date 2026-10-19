import { SignInForm } from "@/components/features/auth/sign-in-form";
import Link from "next/link";
import { Brain } from "lucide-react";

export default function SignInPage() {
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
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Sign in to your secure Healer space.</p>
        </div>
        
        <div className="relative z-10">
          <SignInForm />
        </div>
      </div>
      
      <p className="text-center text-sm text-muted-foreground mt-8">
        Don't have an account? <Link href="/sign-up" className="text-primary font-medium hover:underline">Sign up</Link>
      </p>
    </div>
  );
}
