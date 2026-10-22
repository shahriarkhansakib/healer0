"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Smile, 
  HeartPulse, 
  Calendar, 
  Menu, 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  FlaskConical, 
  BarChart3, 
  ShieldCheck, 
  ShieldAlert 
} from "lucide-react";
import { SystemRole } from "./sidebar";

interface MobileBottomNavProps {
  role: SystemRole;
}

interface BottomTab {
  href?: string;
  label: string;
  icon: React.ReactNode;
  isAction?: boolean;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { toggleMobile } = useSidebarStore();

  const isDoctor = role === 'doctor' || pathname.startsWith('/doctor');
  const isResearcher = role === 'researcher' || pathname.startsWith('/researcher');

  const getTabs = (): BottomTab[] => {
    switch (role) {
      case 'doctor':
        return [
          { href: '/doctor', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
          { href: '/doctor/appointments', label: 'Appointments', icon: <Calendar className="w-5 h-5" /> },
          { href: '/doctor/messages', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
          { href: '/doctor/patients', label: 'Patients', icon: <Users className="w-5 h-5" /> },
          { label: 'Menu', icon: <Menu className="w-5 h-5" />, isAction: true },
        ];
      case 'researcher':
        return [
          { href: '/researcher', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
          { href: '/researcher/projects', label: 'Studies', icon: <FlaskConical className="w-5 h-5" /> },
          { href: '/researcher/participants', label: 'Participants', icon: <Users className="w-5 h-5" /> },
          { href: '/researcher/analytics', label: 'Insights', icon: <BarChart3 className="w-5 h-5" /> },
          { label: 'Menu', icon: <Menu className="w-5 h-5" />, isAction: true },
        ];
      case 'admin':
        return [
          { href: '/admin', label: 'Overview', icon: <ShieldCheck className="w-5 h-5" /> },
          { href: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
          { label: 'Menu', icon: <Menu className="w-5 h-5" />, isAction: true },
        ];
      case 'super_admin':
        return [
          { href: '/super-admin', label: 'Overview', icon: <ShieldAlert className="w-5 h-5" /> },
          { href: '/super-admin/admins', label: 'Admins', icon: <ShieldCheck className="w-5 h-5" /> },
          { label: 'Menu', icon: <Menu className="w-5 h-5" />, isAction: true },
        ];
      case 'patient':
      default:
        return [
          { href: '/patient', label: 'Overview', icon: <Activity className="w-5 h-5" /> },
          { href: '/patient/mood', label: 'Self Care', icon: <Smile className="w-5 h-5" /> },
          { href: '/patient/therapy', label: 'Therapy', icon: <HeartPulse className="w-5 h-5" /> },
          { href: '/patient/appointments', label: 'Visits', icon: <Calendar className="w-5 h-5" /> },
          { label: 'Menu', icon: <Menu className="w-5 h-5" />, isAction: true },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className={cn(
        "fixed bottom-0 inset-x-0 z-30 md:hidden border-t backdrop-blur-lg select-none",
        isDoctor
          ? "bg-white/95 border-slate-200/90 text-slate-700 shadow-[0_-4px_16px_rgba(15,23,42,0.06)]"
          : isResearcher
            ? "bg-white/95 border-fuchsia-100 text-[#4a044e] shadow-[0_-4px_16px_rgba(74,4,78,0.06)]"
            : "bg-card/95 border-border text-card-foreground shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      )}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-15 px-2 max-w-lg mx-auto">
        {tabs.map((tab, idx) => {
          if (tab.isAction) {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={toggleMobile}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer",
                  isDoctor
                    ? "text-slate-500 hover:text-slate-900 active:scale-95"
                    : isResearcher
                      ? "text-fuchsia-800/70 hover:text-[#4a044e] active:scale-95"
                      : "text-muted-foreground hover:text-foreground active:scale-95"
                )}
                aria-label="Open full navigation menu"
              >
                <div className="p-1 rounded-lg">
                  {tab.icon}
                </div>
                <span className="text-[10px] font-semibold tracking-tight leading-none mt-0.5">
                  {tab.label}
                </span>
              </button>
            );
          }

          const isBaseDashboard = ['/patient', '/doctor', '/researcher', '/admin', '/super-admin'].includes(tab.href!);
          const isActive = isBaseDashboard 
            ? pathname === tab.href 
            : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

          return (
            <Link
              key={tab.href}
              href={tab.href!}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all cursor-pointer relative",
                isDoctor
                  ? isActive
                    ? "text-teal-700 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                  : isResearcher
                    ? isActive
                      ? "text-fuchsia-700 font-bold"
                      : "text-[#4a044e]/70 hover:text-[#4a044e]"
                    : isActive
                      ? "text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground"
              )}
            >
              {/* Active top pill indicator */}
              {isActive && (
                <span 
                  className={cn(
                    "absolute -top-1 w-6 h-1 rounded-full",
                    isDoctor ? "bg-teal-600" : isResearcher ? "bg-fuchsia-600" : "bg-primary"
                  )} 
                />
              )}
              <div className={cn(
                "p-1 rounded-lg transition-transform",
                isActive && "scale-110",
                isDoctor && isActive && "text-teal-600",
                isResearcher && isActive && "text-fuchsia-600",
                !isDoctor && !isResearcher && isActive && "text-primary"
              )}>
                {tab.icon}
              </div>
              <span className="text-[10px] font-semibold tracking-tight leading-none mt-0.5 truncate max-w-full">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
