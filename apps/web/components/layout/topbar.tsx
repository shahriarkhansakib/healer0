"use client";

import { useSidebarStore } from "@/hooks/use-sidebar-store";
import { Menu, Bell } from "lucide-react";
import { AvatarDropdown, AvatarUser } from "./avatar-dropdown";

export interface TopbarProps {
  user?: AvatarUser | null;
}

export function Topbar({ user }: TopbarProps) {
  const { toggle } = useSidebarStore();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggle}
          className="p-2 -ml-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-medium">Welcome back, {user?.name}</span>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors">
          <Bell className="w-5 h-5" />
        </button>
        <AvatarDropdown user={user} />
      </div>
    </header>
  );
}
