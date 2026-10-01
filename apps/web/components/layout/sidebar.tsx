"use client";

import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { cn } from "@/lib/utils";
import { 
  Users, Activity, Calendar, FileText, Settings, ShieldAlert, BookOpen, ShieldCheck, HeartPulse,
  LayoutDashboard, MessageSquare, Pill, UserCheck
} from "lucide-react";
import { SidebarNavLink } from "./sidebar-nav-link";

type SystemRole = 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface RoleSidebarConfig {
  mainNav: NavItem[];
  sessionsNav?: NavItem[];
  footerNav: NavItem[];
}

const getSidebarConfig = (role: SystemRole): RoleSidebarConfig => {
  switch (role) {
    case 'doctor':
      return {
        mainNav: [
          { href: '/doctor', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { href: '/doctor/appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
          { href: '/doctor/counseling', label: 'Counseling', icon: <MessageSquare className="w-4 h-4" /> },
          { href: '/doctor/patients', label: 'Patient Records', icon: <Users className="w-4 h-4" /> },
        ],
        sessionsNav: [
          { href: '/doctor/sessions/notes', label: 'Session Notes', icon: <FileText className="w-4 h-4" /> },
          { href: '/doctor/sessions/prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/doctor/profile', label: 'Doctor Profile', icon: <UserCheck className="w-4 h-4" /> },
          { href: '/doctor/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ],
      };
    case 'patient':
      return {
        mainNav: [
          { href: '/patient', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          { href: '/patient/records', label: 'My Records', icon: <FileText className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/patient/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ],
      };
    case 'researcher':
      return {
        mainNav: [
          { href: '/researcher', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          { href: '/researcher/studies', label: 'Studies', icon: <BookOpen className="w-4 h-4" /> },
        ],
        footerNav: [],
      };
    case 'admin':
      return {
        mainNav: [
          { href: '/admin', label: 'Overview', icon: <ShieldCheck className="w-4 h-4" /> },
          { href: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
        ],
        footerNav: [],
      };
    case 'super_admin':
      return {
        mainNav: [
          { href: '/super-admin', label: 'Overview', icon: <ShieldAlert className="w-4 h-4" /> },
          { href: '/super-admin/admins', label: 'Admins', icon: <ShieldCheck className="w-4 h-4" /> },
        ],
        footerNav: [],
      };
    default:
      return { mainNav: [], footerNav: [] };
  }
};

export function Sidebar({ role }: { role: SystemRole }) {
  const { isOpen } = useSidebarStore();
  const config = getSidebarConfig(role);

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-300 select-none shadow-sm",
      isOpen ? "w-64" : "w-16"
    )}>
      {/* Brand Header */}
      <div className="h-14 flex items-center border-b border-sidebar-border px-4 shrink-0 justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 rounded-xl bg-sidebar-primary/10 text-sidebar-primary border border-sidebar-primary/20 shrink-0">
            <HeartPulse className="w-5 h-5 text-sidebar-primary" />
          </div>
          {isOpen && (
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-sidebar-primary to-sidebar-primary/70 bg-clip-text text-transparent truncate">
              Healer
            </span>
          )}
        </div>
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Main Section */}
        <div className="space-y-1">
          {config.mainNav.map((item) => (
            <SidebarNavLink 
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isCollapsed={!isOpen}
            />
          ))}
        </div>

        {/* Sessions Section (Grouped) */}
        {config.sessionsNav && config.sessionsNav.length > 0 && (
          <div className="pt-2 border-t border-sidebar-border/50 space-y-1">
            {isOpen ? (
              <span className="px-3 text-[11px] font-bold text-sidebar-primary/80 uppercase tracking-widest block mb-1">
                Sessions
              </span>
            ) : (
              <div className="my-2 border-t border-sidebar-border/50" />
            )}
            {config.sessionsNav.map((item) => (
              <SidebarNavLink 
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isCollapsed={!isOpen}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Pinned Footer Section */}
      {config.footerNav && config.footerNav.length > 0 && (
        <div className="p-3 border-t border-sidebar-border shrink-0 space-y-1 bg-sidebar-accent/30">
          {config.footerNav.map((item) => (
            <SidebarNavLink 
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              isCollapsed={!isOpen}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
