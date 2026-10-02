"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  isCollapsed?: boolean;
}

export function SidebarNavLink({ href, icon, label, isCollapsed }: SidebarNavLinkProps) {
  const pathname = usePathname();
  const isBaseDashboard = ['/patient', '/doctor', '/researcher', '/admin', '/super-admin'].includes(href);
  const isActive = isBaseDashboard ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={isCollapsed ? label : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive 
          ? "bg-secondary text-secondary-foreground" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      {icon}
      {!isCollapsed && <span>{label}</span>}
    </Link>
  );
}
