"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ArrowRight, Brain, Heart, Shield, Users } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";

const words = ["Peace", "Clarity", "Support", "Healing", "Connection"];

export default function LandingPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Mesh Gradient Simulation */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/30 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="absolute top-0 w-full z-50 px-6 lg:px-12 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          <span className="text-xl font-bold tracking-tight">Healer</span>
        </div>
        <nav className="flex items-center gap-4">
          <Link href="/sign-in" className="text-sm font-medium hover:text-primary transition-colors">
            Log In
          </Link>
          <Link href="/sign-up">
            <Button className="rounded-full shadow-lg shadow-primary/20 h-10 px-6 font-semibold">
              Get Started
            </Button>
          </Link>
        </nav>
      </header>

      <main className="relative z-10 pt-32 lg:pt-48 pb-24 px-6 lg:px-12 flex flex-col items-center text-center">
        {/* Hero Section */}
        <div className="max-w-4xl flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Now open for clinical research groups
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-foreground leading-[1.1] mb-8">
            Find your path to <br className="hidden md:block" />
            <span className="relative inline-block w-[200px] md:w-[320px] text-primary text-left">
              <motion.span
                key={index}
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute left-0"
              >
                {words[index]}
              </motion.span>
              &nbsp;
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 leading-relaxed">
            A unified, secure, and profoundly human platform connecting patients, therapists, and clinical researchers in a safe digital space.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/sign-up" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto rounded-full shadow-xl shadow-primary/20 h-14 px-8 text-lg font-semibold gap-2">
                Join the platform <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/about" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-full bg-background/80 backdrop-blur-md h-14 px-8 text-lg font-medium border-border/50">
                Explore features
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 max-w-6xl w-full text-left">
          <div className="p-8 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm transition-all hover:shadow-md">
            <Heart className="w-10 h-10 text-primary mb-6" />
            <h3 className="text-2xl font-bold tracking-tight mb-3">For Patients</h3>
            <p className="text-muted-foreground leading-relaxed">
              Securely access your records, book therapy sessions, and join anonymized support groups from a single, calming interface.
            </p>
          </div>
          <div className="p-8 rounded-[2rem] bg-card/60 backdrop-blur-xl border border-border/50 shadow-sm transition-all hover:shadow-md">
            <Shield className="w-10 h-10 text-primary mb-6" />
            <h3 className="text-2xl font-bold tracking-tight mb-3">For Practitioners</h3>
            <p className="text-muted-foreground leading-relaxed">
              Manage your private practice with end-to-end encryption. Seamlessly transition between global care and your private clinic workspace.
            </p>
          </div>
          <div className="p-8 rounded-[2rem] bg-primary text-primary-foreground shadow-xl shadow-primary/10 transition-all hover:-translate-y-1">
            <Users className="w-10 h-10 mb-6 opacity-90" />
            <h3 className="text-2xl font-bold tracking-tight mb-3">For Researchers</h3>
            <p className="opacity-90 leading-relaxed">
              Build isolated research groups, recruit anonymous participants, and conduct clinical studies with absolute privacy and compliance.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
