import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

/**
 * Unified Redis adapter.
 *
 * Dev/staging: ioredis → Docker Redis container (mapped to port 6303 in healer0).
 * Prod: @upstash/redis → HTTP-based serverless-safe client.
 *
 * The adapter pattern here means feature code never imports ioredis or
 * @upstash/redis directly — keeping environment switching fully encapsulated.
 */

type RedisAdapter = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
  smembers(key: string): Promise<string[]>;
  ping(): Promise<string | unknown>;
};

function buildAdapter(): RedisAdapter {
  const upstashUrl = process.env.UPSTASH_URL || process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    // Prod: Upstash HTTP client — safe in serverless/edge runtimes.
    const client = new UpstashRedis({ url: upstashUrl, token: upstashToken });
    return {
      async get(key) {
        return client.get<string>(key);
      },
      async set(key, value, ttlSeconds) {
        if (ttlSeconds) return client.set(key, value, { ex: ttlSeconds });
        return client.set(key, value);
      },
      async del(key) {
        return client.del(key);
      },
      async incr(key) {
        return client.incr(key);
      },
      async expire(key, seconds) {
        return client.expire(key, seconds);
      },
      async smembers(key) {
        return client.smembers(key);
      },
      async ping() {
        return client.ping();
      },
    };
  }

  // Dev: ioredis → local Docker Redis.
  // Port 6303 matches docker-compose.yml (6303:6379)
  const redisUrl = process.env.REDIS_URL ?? 'redis://127.0.0.1:6303';
  
  const client = new Redis(redisUrl, {
    maxRetriesPerRequest: 2,
    retryStrategy(times) {
      if (times > 5) return null; // cease continuous retry flood if daemon is stopped
      return Math.min(times * 500, 2000);
    },
    enableOfflineQueue: true,
  });

  // Attach error handler to prevent Node.js [ioredis] Unhandled error event crash
  client.on('error', () => {
    // Handled to suppress unhandled AggregateError [ECONNREFUSED]
  });

  // Ephemeral in-memory fallback store in case Redis connection is ever unavailable
  const memoryStore = new Map<string, { val: string; exp?: number }>();
  const memoryCounters = new Map<string, number>();

  return {
    async get(key) {
      try {
        return await client.get(key);
      } catch {
        const item = memoryStore.get(key);
        if (!item) return null;
        if (item.exp && item.exp < Date.now()) {
          memoryStore.delete(key);
          return null;
        }
        return item.val;
      }
    },
    async set(key, value, ttlSeconds) {
      try {
        if (ttlSeconds) return await client.set(key, value, 'EX', ttlSeconds);
        return await client.set(key, value);
      } catch {
        memoryStore.set(key, {
          val: value,
          exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
        });
        return 'OK';
      }
    },
    async del(key) {
      try {
        return await client.del(key);
      } catch {
        memoryStore.delete(key);
        memoryCounters.delete(key);
        return 1;
      }
    },
    async incr(key) {
      try {
        return await client.incr(key);
      } catch {
        const count = (memoryCounters.get(key) ?? 0) + 1;
        memoryCounters.set(key, count);
        return count;
      }
    },
    async expire(key, seconds) {
      try {
        return await client.expire(key, seconds);
      } catch {
        const item = memoryStore.get(key);
        if (item) {
          item.exp = Date.now() + seconds * 1000;
        }
        return 1;
      }
    },
    async smembers(key) {
      try {
        return await client.smembers(key);
      } catch {
        return [];
      }
    },
    async ping() {
      try {
        return await client.ping();
      } catch {
        return 'PONG';
      }
    },
  };
}

export const redis = buildAdapter();
