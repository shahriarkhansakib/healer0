import { createMiddleware } from 'hono/factory';

const ROLE_HIERARCHY: Record<string, number> = {
  user: 1,
  admin: 2,
  super_admin: 3,
};

export const requireRole = (minimumRole: keyof typeof ROLE_HIERARCHY) => {
  return createMiddleware(async (c, next) => {
    const sessionData = c.get('sessionData'); // Assuming auth middleware injects this
    if (!sessionData) {
      return c.json({ error: 'Unauthorized', message: 'No active session.' }, 401);
    }
    
    const userRole = sessionData.user.role || 'user';
    
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minimumRole]) {
      return c.json({ error: 'Forbidden', message: `Requires ${minimumRole} system role.` }, 403);
    }
    await next();
  });
};
