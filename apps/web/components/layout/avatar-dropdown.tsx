"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
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
        className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold uppercase hover:opacity-90 transition-opacity cursor-pointer"
        aria-label="User profile menu"
      >
        {user?.name?.[0] || 'U'}
      </button>
      
      {open && (
        <div className="absolute right-0 mt-2 w-52 bg-popover text-popover-foreground rounded-xl shadow-lg border py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-4 py-2.5 border-b">
            <p className="font-semibold text-sm truncate text-foreground">{user?.name || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="py-1">
            <Link 
              href="/patient/settings"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 mr-2.5 text-muted-foreground" />
              Profile
            </Link>
            <button 
              onClick={async () => {
                setOpen(false);
                await signOut();
                window.location.href = "/";
              }}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-left text-destructive transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
