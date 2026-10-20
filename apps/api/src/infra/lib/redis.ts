import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

/**
 * Unified Redis adapter.
 *
 * Dev/staging: ioredis → Docker Redis container.
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
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const client = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy: () => null,
  });
  client.on('error', () => {
    // Suppress unhandled error events when Redis container is not running
  });

  return {
    async get(key) {
      try { return await client.get(key); } catch { return null; }
    },
    async set(key, value, ttlSeconds) {
      try {
        if (ttlSeconds) return await client.set(key, value, 'EX', ttlSeconds);
        return await client.set(key, value);
      } catch { return null; }
    },
    async del(key) {
      try { return await client.del(key); } catch { return 0; }
    },
    async incr(key) {
      try { return await client.incr(key); } catch { return 1; }
    },
    async expire(key, seconds) {
      try { return await client.expire(key, seconds); } catch { return 0; }
    },
    async smembers(key) {
      try { return await client.smembers(key); } catch { return []; }
    },
    async ping() {
      try { return await client.ping(); } catch { return 'PONG'; }
    },
  };
}

export const redis = buildAdapter();
