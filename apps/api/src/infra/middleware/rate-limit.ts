import { Context, Next } from 'hono';
import { redis } from '../lib/redis';

export const rateLimit = (limit: number, windowSec: number) => {
  return async (c: Context, next: Next) => {
    try {
      const ip = c.req.header('x-forwarded-for') || 'unknown';
      const key = `healer:ratelimit:${ip}`;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSec);
      }

      if (current > limit) {
        return c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded.' }, 429);
      }
    } catch {
      // Fail-open: if Redis is unavailable or unconfigured, allow the request to proceed
    }

    await next();
  };
};
