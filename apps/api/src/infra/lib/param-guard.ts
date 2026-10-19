import type { Context } from 'hono';

/**
 * requireParam — extracts a named route parameter from the Hono context
 * and throws immediately if it is absent.
 *
 * Hono types route params as `string | undefined` in strict mode.
 * Using this guard converts the type to `string` for downstream service calls
 * and produces a clear error message that is caught by the controller's try/catch.
 */
export function requireParam(c: Context, name: string): string {
  const val = c.req.param(name);
  if (!val) throw new Error(`Missing required route parameter: ${name}`);
  return val;
}
