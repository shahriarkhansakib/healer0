/**
 * Barrel export for all Hono middleware.
 *
 * Import order convention for route files:
 *   1. requireAuth          — validates session, injects user + session into context
 *   2. requireActiveAccount — blocks suspended/banned accounts
 *   3. requireRole(...)     — checks system-level RBAC (admin, super_admin)
 *   4. requireProfile(...)  — checks domain profile existence (patient, doctor, researcher)
 *
 * Example usage in a route file:
 *   import { requireAuth, requireActiveAccount, requireRole, requireProfile } from '../../infra/middleware';
 */
export { requireAuth, requireActiveAccount } from './auth';
export type { AuthVariables } from './auth';
export { requireRole } from './role';
export { requireProfile } from './profile';
export { rateLimit } from './rate-limit';
