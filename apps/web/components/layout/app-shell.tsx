"use client";

import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Determine active domain role context from current path (e.g. /doctor -> 'doctor')
  let activeRole: 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin' = 'patient';
  if (pathname.startsWith('/doctor')) {
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar role={activeRole} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
