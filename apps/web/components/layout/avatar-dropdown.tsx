"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "@/lib/auth-client";
import { LogOut, User } from "lucide-react";

export function AvatarDropdown({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold uppercase"
      >
        {user?.name?.[0] || 'U'}
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-popover text-popover-foreground rounded-md shadow-md border py-1 z-50">
          <div className="px-4 py-2 border-b">
            <p className="font-medium text-sm truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <button className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-left">
              <User className="w-4 h-4 mr-2" />
              Profile
            </button>
            <button 
              onClick={async () => {
                await signOut();
                window.location.href = "/";
              }}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-left text-destructive cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
