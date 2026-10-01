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
  const isRootDashboard = ['/patient', '/doctor', '/researcher', '/admin', '/super-admin'].includes(href);
  const isActive = isRootDashboard ? pathname === href : (pathname === href || pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        isActive 
          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-xs" 
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-sidebar-primary shadow-xs" />
      )}
      <span className={cn(
        "transition-transform duration-200 group-hover:scale-110 shrink-0",
        isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
      )}>
        {icon}
      </span>
      {!isCollapsed && <span className="truncate tracking-tight">{label}</span>}
    </Link>
  );
}
