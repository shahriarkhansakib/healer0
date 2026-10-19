"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { LogOut, User, Stethoscope, HeartPulse, ArrowLeftRight, AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuthProfiles } from "@/hooks/use-auth-profiles";

export interface AvatarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

export interface AvatarDropdownProps {
  user?: AvatarUser | null;
}

export function AvatarDropdown({ user }: AvatarDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const { data: authData } = useAuthProfiles(!!user);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const profiles = authData?.profiles;
  // Eligible for two identities if the user holds both doctor and patient domain access
  const isEligibleForTwoIdentities = Boolean(
    profiles?.isDoctor && (profiles?.isPatient || user?.role === 'user' || user?.role === 'patient')
  );

  const isDoctorView = pathname.startsWith('/doctor');

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
        <div className="absolute right-0 mt-2 w-64 bg-popover text-popover-foreground rounded-xl shadow-lg border py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-4 py-2.5 border-b">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-sm truncate text-foreground">
                {user?.name || 'User'}
              </p>
              {isEligibleForTwoIdentities && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
                  {isDoctorView ? 'Doctor' : 'Patient'}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{user?.email}</p>
          </div>
          
          <div className="py-1">
            <Link 
              href={isDoctorView ? "/doctor/profile" : "/patient/settings?tab=profile"}
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              <User className="w-4 h-4 mr-2.5 text-muted-foreground" />
              Profile & Settings
            </Link>

            <Link 
              href="/patient/settings?tab=crisis"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors cursor-pointer group"
            >
              <AlertTriangle className="w-4 h-4 mr-2.5 text-amber-500 group-hover:scale-110 transition-transform" />
              Crisis Support
            </Link>

            <Link 
              href="/patient/settings?tab=privacy"
              onClick={() => setOpen(false)}
              className="flex w-full items-center px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors cursor-pointer group"
            >
              <ShieldCheck className="w-4 h-4 mr-2.5 text-muted-foreground group-hover:text-primary transition-colors" />
              Privacy & Consent
            </Link>

            {isEligibleForTwoIdentities && (
              <Link 
                href={isDoctorView ? "/patient" : "/doctor"}
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-muted text-foreground transition-colors cursor-pointer group"
              >
                <div className="flex items-center min-w-0">
                  {isDoctorView ? (
                    <HeartPulse className="w-4 h-4 mr-2.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                  ) : (
                    <Stethoscope className="w-4 h-4 mr-2.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                  )}
                  <span className="truncate font-medium">
                    {isDoctorView ? "Switch to Patient Dashboard" : "Switch to Doctor Dashboard"}
                  </span>
                </div>
                <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors ml-2 shrink-0" />
              </Link>
            )}

            <div className="border-t my-1" />

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
