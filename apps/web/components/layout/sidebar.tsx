"use client";

import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Users, Activity, Calendar, FileText, Settings, ShieldAlert, BookOpen, ShieldCheck, HeartPulse,
  LayoutDashboard, MessageSquare, Pill, UserCheck, User,
  Bot, Smile, Sparkles, ClipboardList, BookMarked, FolderHeart,
  FlaskConical, Database, BarChart3, Share2, Stethoscope, X
} from "lucide-react";
import { SidebarNavLink } from "./sidebar-nav-link";
import { SidebarNavFolder, SidebarNavFolderChild } from "./sidebar-nav-folder";

export type SystemRole = 'patient' | 'doctor' | 'researcher' | 'admin' | 'super_admin' | 'user';

export interface NavItem {
  href?: string;
  label: string;
  icon: React.ReactNode;
  children?: SidebarNavFolderChild[];
}

export interface RoleSidebarConfig {
  mainNav: NavItem[];
  sessionsNav?: NavItem[];
  footerNav: NavItem[];
}

export const getSidebarConfig = (role?: SystemRole | string): RoleSidebarConfig => {
  switch (role) {
    case 'doctor':
      return {
        mainNav: [
          { href: '/doctor', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { href: '/doctor/appointments', label: 'Appointments', icon: <Calendar className="w-4 h-4" /> },
          { href: '/doctor/messages', label: 'Patient Chat', icon: <MessageSquare className="w-4 h-4" /> },
          { href: '/doctor/counseling', label: 'Counseling', icon: <Bot className="w-4 h-4" /> },
          { href: '/doctor/patients', label: 'Patient Records', icon: <Users className="w-4 h-4" /> },
        ],
        sessionsNav: [
          { href: '/doctor/sessions/notes', label: 'Session Notes', icon: <FileText className="w-4 h-4" /> },
          { href: '/doctor/sessions/prescriptions', label: 'Prescriptions', icon: <Pill className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/doctor/profile', label: 'Psychologist Profile', icon: <UserCheck className="w-4 h-4" /> },
          { href: '/doctor/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
        ],
      };
    case 'patient':
    case 'user':
      return {
        mainNav: [
          { href: '/patient', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          {
            label: 'Self Care',
            icon: <FolderHeart className="w-4 h-4" />,
            children: [
              { href: '/patient/counseling', label: 'AI Counseling', icon: <Bot className="w-4 h-4" /> },
              { href: '/patient/mood', label: 'Daily Mood Tracking', icon: <Smile className="w-4 h-4" /> },
              { href: '/patient/journal', label: 'Reflective Journal', icon: <BookMarked className="w-4 h-4" /> },
            ],
          },
          {
            label: 'Therapy & Assessments',
            icon: <ClipboardList className="w-4 h-4" />,
            children: [
              { href: '/patient/therapy', label: 'Therapy & Relaxation', icon: <HeartPulse className="w-4 h-4" /> },
              { href: '/patient/assessments', label: 'Clinical Assessments', icon: <FileText className="w-4 h-4" /> },
            ],
          },
          { href: '/patient/appointments', label: 'Appointments & Prescriptions', icon: <Calendar className="w-4 h-4" /> },
          { href: '/patient/community', label: 'Anonymous Community', icon: <Users className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/patient/settings', label: 'Account Settings', icon: <Settings className="w-4 h-4" /> },
        ],
      };
    case 'researcher':
      return {
        mainNav: [
          { href: '/researcher', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
          { href: '/researcher/projects', label: 'Projects & Studies', icon: <FlaskConical className="w-4 h-4" /> },
          { href: '/researcher/participants', label: 'Participants & Screening', icon: <Users className="w-4 h-4" /> },
          { href: '/researcher/surveys', label: 'Surveys & Instruments', icon: <ClipboardList className="w-4 h-4" /> },
          { href: '/researcher/data', label: 'Data Collection', icon: <Database className="w-4 h-4" /> },
          { href: '/researcher/analytics', label: 'Analytics & Insights', icon: <BarChart3 className="w-4 h-4" /> },
          { href: '/researcher/literature', label: 'Literature & Papers', icon: <BookOpen className="w-4 h-4" /> },
          { href: '/researcher/collaboration', label: 'Collaboration Network', icon: <Share2 className="w-4 h-4" /> },
          { href: '/researcher/reports', label: 'Reports & Compliance', icon: <FileText className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/researcher/settings', label: 'Researcher Settings', icon: <Settings className="w-4 h-4" /> },
        ],
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
      return {
        mainNav: [
          { href: '/patient', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
          {
            label: 'Self Care',
            icon: <FolderHeart className="w-4 h-4" />,
            children: [
              { href: '/patient/counseling', label: 'AI Counseling', icon: <Bot className="w-4 h-4" /> },
              { href: '/patient/mood', label: 'Daily Mood Tracking', icon: <Smile className="w-4 h-4" /> },
              { href: '/patient/journal', label: 'Reflective Journal', icon: <BookMarked className="w-4 h-4" /> },
            ],
          },
          {
            label: 'Therapy & Assessments',
            icon: <ClipboardList className="w-4 h-4" />,
            children: [
              { href: '/patient/therapy', label: 'Therapy & Relaxation', icon: <HeartPulse className="w-4 h-4" /> },
              { href: '/patient/assessments', label: 'Clinical Assessments', icon: <FileText className="w-4 h-4" /> },
            ],
          },
          {
            label: 'Clinical Care',
            icon: <Stethoscope className="w-4 h-4" />,
            children: [
              { href: '/patient/doctors', label: 'Psychologist Directory', icon: <UserCheck className="w-4 h-4" /> },
              { href: '/patient/messages', label: 'Direct Psychologist Chat', icon: <MessageSquare className="w-4 h-4" /> },
              { href: '/patient/appointments', label: 'Appointments & Prescriptions', icon: <Calendar className="w-4 h-4" /> },
            ],
          },
          { href: '/patient/community', label: 'Anonymous Community', icon: <Users className="w-4 h-4" /> },
        ],
        footerNav: [
          { href: '/patient/settings', label: 'Account Settings', icon: <Settings className="w-4 h-4" /> },
        ],
      };
  }
};

export const getSidebarNav = (role?: SystemRole | string): NavItem[] => {
  const config = getSidebarConfig(role);
  const flatNav: NavItem[] = [];
  for (const item of config.mainNav) {
    if (item.children) {
      flatNav.push(...item.children);
    } else {
      flatNav.push(item);
    }
  }
  return [...flatNav, ...(config.sessionsNav || []), ...config.footerNav];
};

export function Sidebar({ role }: { role?: SystemRole | string }) {
  const { isOpen, isMobileOpen, setMobileOpen } = useSidebarStore();
  const pathname = usePathname();

  const getResolvedRole = (): SystemRole => {
    if (pathname.startsWith('/doctor')) return 'doctor';
    if (pathname.startsWith('/researcher')) return 'researcher';
    if (pathname.startsWith('/admin')) return 'admin';
    if (pathname.startsWith('/super-admin')) return 'super_admin';
    if (pathname.startsWith('/patient')) return 'patient';
    if (role === 'user' || !role) return 'patient';
    return (role as SystemRole) || 'patient';
  };

  const resolvedRole = getResolvedRole();
  const config = getSidebarConfig(resolvedRole);
  const isDoctor = resolvedRole === 'doctor' || pathname.startsWith('/doctor');
  const isResearcher = resolvedRole === 'researcher' || pathname.startsWith('/researcher');

  // Shared navigation items renderer
  const renderNavContent = (isCollapsed: boolean) => (
    <>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Main Section */}
        <div className="space-y-1">
          {config.mainNav.map((item) => {
            if (item.children && item.children.length > 0) {
              return (
                <SidebarNavFolder
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  children={item.children}
                  isCollapsed={isCollapsed}
                />
              );
            }
            return (
              <SidebarNavLink 
                key={item.href!}
                href={item.href!}
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
              />
            );
          })}
        </div>

        {/* Sessions Section (Grouped) */}
        {config.sessionsNav && config.sessionsNav.length > 0 && (
          <div className={cn(
            "pt-2 space-y-1 border-t",
            isDoctor ? "border-slate-200/60" : "border-border/40"
          )}>
            {!isCollapsed ? (
              <span className={cn(
                "px-3 text-[11px] font-bold uppercase tracking-wider block mb-1",
                isDoctor ? "text-teal-700/90" : "text-muted-foreground/70"
              )}>
                Sessions
              </span>
            ) : (
              <div className={cn("my-2 border-t", isDoctor ? "border-slate-200/60" : "border-border/40")} />
            )}
            {config.sessionsNav.map((item) => (
              <SidebarNavLink 
                key={item.href!}
                href={item.href!}
                icon={item.icon}
                label={item.label}
                isCollapsed={isCollapsed}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Pinned Footer Section */}
      {config.footerNav && config.footerNav.length > 0 && (
        <div className={cn(
          "p-3 border-t shrink-0 space-y-1",
          isDoctor ? "bg-slate-50/80 border-slate-200/80" : "bg-muted/20 border-border"
        )}>
          {config.footerNav.map((item) => (
            <SidebarNavLink 
              key={item.href!}
              href={item.href!}
              icon={item.icon}
              label={item.label}
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col transition-all duration-300 select-none shrink-0",
        isDoctor 
          ? "bg-white text-slate-800 border-r border-slate-200/80 shadow-xs" 
          : isResearcher
            ? "bg-white text-[#4a044e] border-r border-fuchsia-100 shadow-xs"
            : "bg-card text-card-foreground border-r border-border",
        isOpen ? "w-64" : "w-16"
      )}>
        {/* Brand Header */}
        <div className={cn(
          "h-14 flex items-center px-4 shrink-0 justify-between border-b",
          isDoctor ? "border-slate-200/80" : isResearcher ? "border-fuchsia-100" : "border-border"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={cn(
              "p-1.5 rounded-xl shrink-0 border",
              isDoctor 
                ? "bg-teal-50 text-teal-600 border-teal-200/70 shadow-2xs" 
                : isResearcher
                  ? "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/80 shadow-2xs"
                  : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isResearcher ? <FlaskConical className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
            </div>
            {isOpen && (
              <div className="flex items-center gap-2 overflow-hidden">
                <span className={cn(
                  "font-bold text-lg tracking-tight truncate",
                  isDoctor ? "text-slate-900" : isResearcher ? "text-[#4a044e]" : "text-foreground"
                )}>
                  Healer
                </span>
                {isResearcher && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 tracking-wider uppercase border border-fuchsia-200/80">
                    Research
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {renderNavContent(!isOpen)}
      </aside>

      {/* 2. Mobile Drawer Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile Slide-Over Drawer */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col w-72 max-w-[85vw] shadow-2xl transition-transform duration-300 ease-in-out md:hidden select-none",
        isDoctor 
          ? "bg-white text-slate-800 border-r border-slate-200" 
          : isResearcher
            ? "bg-white text-[#4a044e] border-r border-fuchsia-100"
            : "bg-card text-card-foreground border-r border-border",
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Mobile Header with Brand & Close Button */}
        <div className={cn(
          "h-14 flex items-center px-4 shrink-0 justify-between border-b",
          isDoctor ? "border-slate-200/80" : isResearcher ? "border-fuchsia-100" : "border-border"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className={cn(
              "p-1.5 rounded-xl shrink-0 border",
              isDoctor 
                ? "bg-teal-50 text-teal-600 border-teal-200/70 shadow-2xs" 
                : isResearcher
                  ? "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/80 shadow-2xs"
                  : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isResearcher ? <FlaskConical className="w-5 h-5" /> : <HeartPulse className="w-5 h-5" />}
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              <span className={cn(
                "font-bold text-lg tracking-tight truncate",
                isDoctor ? "text-slate-900" : isResearcher ? "text-[#4a044e]" : "text-foreground"
              )}>
                Healer
              </span>
              {isResearcher && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-fuchsia-50 text-fuchsia-700 tracking-wider uppercase border border-fuchsia-200/80">
                  Research
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
              isDoctor && "hover:bg-slate-100 text-slate-500 hover:text-slate-900",
              isResearcher && "hover:bg-fuchsia-50 text-fuchsia-600 hover:text-[#4a044e]"
            )}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {renderNavContent(false)}
      </aside>
    </>
  );
}
