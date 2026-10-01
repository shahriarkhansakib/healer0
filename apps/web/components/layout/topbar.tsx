"use client";

import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { Menu, Bell } from "lucide-react";
import { AvatarDropdown } from "./avatar-dropdown";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function Topbar({ user }: { user: any }) {
  const { toggle } = useSidebarStore();
  const pathname = usePathname();
  const isDoctor = pathname.startsWith('/doctor');

  return (
    <header className={cn(
      "h-14 border-b bg-card text-card-foreground flex items-center justify-between px-4 shrink-0 transition-colors",
      isDoctor && "bg-white text-slate-800 border-slate-200/80"
    )}>
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          className={cn(
            "p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
            isDoctor && "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
          )}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className={cn(
          "font-medium text-foreground",
          isDoctor && "text-slate-900"
        )}>
          Welcome back, {user?.name}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className={cn(
          "p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors",
          isDoctor && "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
        )}>
          <Bell className="w-5 h-5" />
        </button>
        <AvatarDropdown user={user} />
      </div>
    </header>
  );
}

