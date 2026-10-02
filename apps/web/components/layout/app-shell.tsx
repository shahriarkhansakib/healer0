"use client";

import { useSession } from "@/lib/auth-client";
import { usePathname } from "next/navigation";
import { Sidebar, SystemRole } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const getRoleFromPath = (path: string): SystemRole | null => {
    if (path.startsWith('/doctor')) return 'doctor';
    if (path.startsWith('/researcher')) return 'researcher';
    if (path.startsWith('/admin')) return 'admin';
    if (path.startsWith('/super-admin')) return 'super_admin';
    if (path.startsWith('/patient')) return 'patient';
    return null;
  };

  const rawRole = (session.user as any)?.role;
  const mappedRole: SystemRole =
    getRoleFromPath(pathname) ||
    (rawRole === 'user' ? 'patient' : rawRole) ||
    'patient';

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <Sidebar role={mappedRole} />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar user={session.user} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
