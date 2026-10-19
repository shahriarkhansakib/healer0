"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { SidebarNavLink } from "./sidebar-nav-link";

export interface SidebarNavFolderChild {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export interface SidebarNavFolderProps {
  label: string;
  icon: React.ReactNode;
  children: SidebarNavFolderChild[];
  isCollapsed?: boolean;
}

export function SidebarNavFolder({
  label,
  icon,
  children,
  isCollapsed,
}: SidebarNavFolderProps) {
  const pathname = usePathname();
  const { setOpen } = useSidebarStore();
  const isDoctorRoute = pathname.startsWith('/doctor');

  const isAnyChildActive = children.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`)
  );

  const [isExpanded, setIsExpanded] = useState<boolean>(() => isAnyChildActive);

  // Auto-expand whenever navigating into a child page
  useEffect(() => {
    if (isAnyChildActive) {
      setIsExpanded(true);
    }
  }, [isAnyChildActive]);

  const handleToggle = () => {
    if (isCollapsed) {
      setOpen(true);
      setIsExpanded(true);
    } else {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={handleToggle}
        title={isCollapsed ? label : undefined}
        className={cn(
          "relative flex items-center justify-between w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer group text-left",
          isDoctorRoute
            ? isAnyChildActive
              ? "text-teal-900 bg-teal-50/70 font-semibold"
              : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            : isAnyChildActive
              ? "text-foreground font-semibold bg-muted/50"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={cn(
              "transition-transform duration-200 group-hover:scale-110 shrink-0",
              isDoctorRoute
                ? isAnyChildActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-700"
                : isAnyChildActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            )}
          >
            {icon}
          </span>
          {!isCollapsed && <span className="truncate tracking-tight">{label}</span>}
        </div>

        {!isCollapsed && (
          <ChevronRight
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-200 shrink-0 text-muted-foreground group-hover:text-foreground",
              isExpanded && "rotate-90 text-foreground"
            )}
          />
        )}

        {/* Indicator dot when sidebar or folder is closed but a child inside is active */}
        {isAnyChildActive && (!isExpanded || isCollapsed) && (
          <span
            className={cn(
              "absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-xs",
              isDoctorRoute ? "bg-teal-600" : "bg-primary"
            )}
          />
        )}
      </button>

      {/* Collapsible Sub-Items Container */}
      {!isCollapsed && (
        <div
          className={cn(
            "grid transition-all duration-200 ease-in-out",
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden space-y-0.5">
            {children.map((child) => (
              <SidebarNavLink
                key={child.href}
                href={child.href}
                icon={child.icon}
                label={child.label}
                isCollapsed={isCollapsed}
                isSubItem
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
