import Redis from 'ioredis';
import { Redis as UpstashRedis } from '@upstash/redis';

let redisClient: any;

if (process.env.UPSTASH_URL && process.env.UPSTASH_TOKEN) {
  redisClient = new UpstashRedis({
    url: process.env.UPSTASH_URL,
    token: process.env.UPSTASH_TOKEN,
  });
} else {
  redisClient = new Redis(process.env.REDIS_URL as string);
}

export const redis = {
  async get(key: string) {
    return redisClient.get(key);
  },
  async set(key: string, value: string, config?: any) {
    return redisClient.set(key, value, config);
  },
  async del(key: string) {
    return redisClient.del(key);
  },
  async incr(key: string) {
    return redisClient.incr(key);
  },
  async expire(key: string, seconds: number) {
    return redisClient.expire(key, seconds);
  },
  async smembers(key: string) {
    return redisClient.smembers(key);
  },
  async ping() {
    return redisClient.ping();
  },
  pipeline() {
    return redisClient.pipeline();
  },
};
