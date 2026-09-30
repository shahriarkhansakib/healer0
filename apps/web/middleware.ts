import { NextRequest, NextResponse } from 'next/server';

const ROLE_HIERARCHY: Record<string, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname === '/' || pathname.match(/\.(.*)$/)) {
    return NextResponse.next();
  }

  // Fetch full session including domain profiles
  const cookieHeader = req.headers.get('cookie') || '';
  const meUrl = new URL('/api/auth/me', req.url);
  const res = await fetch(meUrl.toString(), {
    headers: { cookie: cookieHeader }
  });

  const data = await res.json().catch(() => null);
  const user = data?.user;
  const profiles = data?.profiles;

  // 1. Unauthenticated users cannot access (app) routes
  if (!user && !pathname.startsWith('/sign-in') && !pathname.startsWith('/sign-up') && !pathname.startsWith('/forgot-password') && !pathname.startsWith('/reset-password')) {
    return NextResponse.redirect(new URL('/sign-in', req.url));
  }

  // 2. Authenticated users
  if (user) {
    if (user.status === 'banned' || user.status === 'suspended') {
      if (pathname !== '/blocked') return NextResponse.redirect(new URL('/blocked', req.url));
      return NextResponse.next();
    }

    if (user.requiresPasswordReset && pathname !== '/reset-password') {
      return NextResponse.redirect(new URL('/reset-password', req.url));
    }

    // Redirect away from auth pages to their appropriate dashboard
    if (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up')) {
      if (user.role === 'super_admin') return NextResponse.redirect(new URL('/super-admin', req.url));
      if (user.role === 'admin') return NextResponse.redirect(new URL('/admin', req.url));
      if (profiles?.isDoctor) return NextResponse.redirect(new URL('/doctor', req.url));
      return NextResponse.redirect(new URL('/patient', req.url));
    }

    // --- Domain Protection (Profiles) ---
    if (pathname.startsWith('/patient') && !profiles?.isPatient) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname.startsWith('/doctor') && !profiles?.isDoctor) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname.startsWith('/researcher') && !profiles?.isResearcher) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    // --- System Access Protection (Base Roles) ---
    const userRole = user.role || 'user';
    if (pathname.startsWith('/admin') && ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY.admin) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    if (pathname.startsWith('/super-admin') && ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY.super_admin) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}
