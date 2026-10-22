import { SignInForm } from "@/components/features/auth/sign-in-form";
import Link from "next/link";
import { Brain, ArrowLeft } from "lucide-react";

export default function SignInPage() {
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
        {/* Soft Ambient Background Glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Back Button */}
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group px-2.5 py-1.5 rounded-xl hover:bg-muted/60 -ml-2.5"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="mb-7 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              Sign in to your secure Healer space.
            </p>
          </div>

          <SignInForm />
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-7">
        Don't have an account?{" "}
        <Link
          href="/sign-up"
          className="text-primary font-semibold hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
