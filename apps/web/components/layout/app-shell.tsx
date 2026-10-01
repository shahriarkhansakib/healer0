"use client";

import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const isDoctor = pathname.startsWith('/doctor');

  // Determine active domain role context from current path (e.g. /doctor -> 'doctor')
  let activeRole: 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin' = 'patient';
  if (isDoctor) {
    activeRole = 'doctor';
  } else if (pathname.startsWith('/researcher')) {
    activeRole = 'researcher';
  } else if (pathname.startsWith('/admin')) {
    activeRole = 'admin';
  } else if (pathname.startsWith('/super-admin')) {
    activeRole = 'super_admin';
  } else if (pathname.startsWith('/patient')) {
    activeRole = 'patient';
  } else if (session.user.role === 'admin') {
    activeRole = 'admin';
  } else if (session.user.role === 'super_admin') {
    activeRole = 'super_admin';
  }

  return (
    <div className={cn(
      "flex h-screen bg-background text-foreground overflow-hidden",
      isDoctor && "doctor-theme bg-slate-50 text-slate-900"
    )}>
      <Sidebar role={activeRole} />
      <div className={cn(
        "flex flex-col flex-1 min-w-0 bg-background text-foreground",
        isDoctor && "bg-slate-50 text-slate-900"
      )}>
        <Topbar user={session.user} />
        <main className={cn(
          "flex-1 overflow-auto p-6 bg-background text-foreground",
          isDoctor && "bg-slate-50 text-slate-900"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

