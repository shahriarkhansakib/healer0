import { createMiddleware } from 'hono/factory';
import type { AuthVariables } from './auth';

/**
 * Role hierarchy — numeric values allow ">=" comparisons so a
 * super_admin satisfies any lower role requirement automatically.
 */
const ROLE_HIERARCHY = {
  user: 1,
  admin: 2,
  super_admin: 3,
} as const;

type SystemRole = keyof typeof ROLE_HIERARCHY;

/**
 * requireRole — must run after requireAuth + requireActiveAccount.
 *
 * Reads `user` from the Hono context (set by requireAuth) and verifies
 * that the user's system role meets the minimum required level.
 * Admins satisfy any role below admin; super_admins satisfy all roles.
 */
export const requireRole = (minimumRole: SystemRole) => {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'Unauthorized', message: 'No active session.' }, 401);
    }

    const userRole = (user.role ?? 'user') as SystemRole;
    const userLevel = ROLE_HIERARCHY[userRole] ?? ROLE_HIERARCHY.user;
    const requiredLevel = ROLE_HIERARCHY[minimumRole];

    if (userLevel < requiredLevel) {
      return c.json(
        {
          error: 'Forbidden',
          message: `This endpoint requires '${minimumRole}' system role or higher.`,
        },
        403,
      );
    }

    await next();
  });
};
