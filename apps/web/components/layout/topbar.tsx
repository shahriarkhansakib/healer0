"use client";

import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { Menu, Bell, HeartPulse, FlaskConical } from "lucide-react";
import { AvatarDropdown, AvatarUser } from "./avatar-dropdown";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface TopbarProps {
  user?: AvatarUser | null;
}

export function Topbar({ user }: TopbarProps) {
  const { toggle, toggleMobile } = useSidebarStore();
  const pathname = usePathname();
  const isDoctor = pathname.startsWith('/doctor');
  const isResearcher = pathname.startsWith('/researcher');

  const handleMenuClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      toggleMobile();
    } else {
      toggle();
    }
  };

  const displayName = user?.name ? user.name.split(' ')[0] : 'Member';

  return (
    <header className={cn(
      "h-14 border-b bg-card text-card-foreground flex items-center justify-between px-3 sm:px-4 shrink-0 transition-colors z-20",
      isDoctor && "bg-white text-slate-800 border-slate-200/80",
      isResearcher && "bg-white text-[#4a044e] border-fuchsia-100/80 shadow-2xs"
    )}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button 
          onClick={handleMenuClick}
          className={cn(
            "p-2 -ml-1 sm:-ml-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
            isDoctor && "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
            isResearcher && "hover:bg-fuchsia-50 text-slate-600 hover:text-[#4a044e]"
          )}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile App Brand Indicator */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            <div className={cn(
              "p-1 rounded-lg border",
              isDoctor
                ? "bg-teal-50 text-teal-600 border-teal-200/80"
                : isResearcher
                  ? "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-200/80"
                  : "bg-primary/10 text-primary border-primary/20"
            )}>
              {isResearcher ? <FlaskConical className="w-4 h-4" /> : <HeartPulse className="w-4 h-4" />}
            </div>
            <span className={cn(
              "font-bold text-sm tracking-tight",
              isDoctor ? "text-slate-900" : isResearcher ? "text-[#4a044e]" : "text-foreground"
            )}>
              Healer
            </span>
          </div>

          <span className="hidden md:inline font-medium text-foreground truncate">
            Welcome back, {user?.name}
          </span>
          <span className="md:hidden text-xs text-muted-foreground truncate max-w-[120px]">
            Hi, {displayName}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <button 
          className={cn(
            "p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer",
            isDoctor && "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          )}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
        </button>
        <AvatarDropdown user={user} />
      </div>
    </header>
  );
}
