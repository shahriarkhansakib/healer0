import { Context, Next } from 'hono';
import { auth } from '../lib/auth';
import type { Session, User } from '@healer/db';

/**
 * The canonical Hono context variable shape injected by requireAuth.
 * Every downstream middleware and controller reads from these keys.
 */
export type AuthVariables = {
  user: User;
  session: Session;
};

/**
 * requireAuth — validates the Better Auth session from the incoming request headers
 * and injects `user` and `session` into the Hono context for downstream handlers.
 *
 * Must be the first auth-related middleware on any protected route.
 */
export async function requireAuth(
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) {
  const sessionData = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!sessionData?.user || !sessionData?.session) {
    return c.json({ error: 'Unauthorized', message: 'You must be logged in.' }, 401);
  }

  // Cast is safe: Better Auth returns a full user record matching our Drizzle schema.
  c.set('user', sessionData.user as User);
  c.set('session', sessionData.session as Session);

  await next();
}

/**
 * requireActiveAccount — must run after requireAuth.
 * Rejects requests from suspended or banned accounts before they reach business logic.
 */
export async function requireActiveAccount(
  c: Context<{ Variables: AuthVariables }>,
  next: Next,
) {
  const user = c.get('user');

  if (user.status !== 'active') {
    return c.json(
      { error: 'Forbidden', message: 'Your account has been suspended or banned.' },
      403,
    );
  }

  await next();
}
