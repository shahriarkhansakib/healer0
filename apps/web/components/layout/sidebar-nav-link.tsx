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
  const isDoctorRoute = pathname.startsWith('/doctor');

  return (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
        isDoctorRoute
          ? isActive 
            ? "bg-teal-50/90 text-teal-800 font-semibold shadow-xs" 
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
          : isActive
            ? "bg-secondary text-secondary-foreground font-semibold"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        isCollapsed && "justify-center px-2"
      )}
    >
      {/* Active indicator bar */}
      {isActive && (
        <span className={cn(
          "absolute left-0 top-2 bottom-2 w-1 rounded-r-full shadow-xs",
          isDoctorRoute ? "bg-teal-600" : "bg-primary"
        )} />
      )}
      <span className={cn(
        "transition-transform duration-200 group-hover:scale-110 shrink-0",
        isDoctorRoute
          ? isActive ? "text-teal-600" : "text-slate-400 group-hover:text-slate-700"
          : isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {icon}
      </span>
      {!isCollapsed && <span className="truncate tracking-tight">{label}</span>}
    </Link>
  );
}
