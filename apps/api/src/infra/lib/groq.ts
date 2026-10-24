import Groq from 'groq-sdk';
import { logger } from './logger';

/**
 * Returns all configured Groq API keys in priority order.
 * Checks GROQ_API_KEYS (comma separated) as well as numbered keys (GROQ_API_KEY, GROQ_API_KEY_2, etc.).
 */
export function getGroqApiKeys(): string[] {
  const keys: string[] = [];

  // 1. Check comma-separated list
  const commaSeparated = process.env.GROQ_API_KEYS;
  if (commaSeparated) {
    for (const key of commaSeparated.split(',')) {
      const trimmed = key.trim();
      if (trimmed && !keys.includes(trimmed)) {
        keys.push(trimmed);
      }
    }
  }

  // 2. Check numbered keys: GROQ_API_KEY, GROQ_API_KEY_2 ... GROQ_API_KEY_10
  const envKeyNames = [
    'GROQ_API_KEY',
    'GROQ_API_KEY_2',
    'GROQ_API_KEY_3',
    'GROQ_API_KEY_4',
    'GROQ_API_KEY_5',
    'GROQ_API_KEY_6',
  ];

  for (const name of envKeyNames) {
    const val = process.env[name]?.trim();
    if (val && !keys.includes(val)) {
      keys.push(val);
    }
  }

  if (keys.length === 0) {
    logger.warn('No Groq API keys found in environment variables.');
  }

  return keys;
}

/**
 * Helper to mask key for safe logging (e.g. "gsk_YC...Frl").
 */
function maskApiKey(key: string): string {
  if (key.length <= 10) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}

/**
 * Executes an AI operation with automatic multi-layer API key fallback.
 * If Key 1 fails (e.g. rate limit, quota, invalid, or network error),
 * it seamlessly cascades to Key 2, Key 3, and so on.
 */
export async function executeWithKeyFallback<T>(
  operation: (groq: Groq, keyIndex: number, totalKeys: number) => Promise<T>
): Promise<T> {
  const keys = getGroqApiKeys();

  if (keys.length === 0) {
    throw new Error('No Groq API keys configured.');
  }

  let lastError: unknown = null;

  for (let i = 0; i < keys.length; i++) {
    const apiKey = keys[i];
    const masked = maskApiKey(apiKey);
    const client = new Groq({ apiKey });

    try {
      return await operation(client, i + 1, keys.length);
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { keyLayer: i + 1, totalLayers: keys.length, key: masked, err: message },
        `Groq API key layer ${i + 1}/${keys.length} encountered an error, falling back to next layer.`
      );
    }
  }

  logger.error(
    { totalLayers: keys.length, lastError },
    `All ${keys.length} Groq API key layers failed.`
  );
  throw lastError || new Error('All Groq API key layers failed.');
}

/**
 * Convenience single-client getter (returns client with primary key).
 */
export function getGroqClient(): Groq {
  const keys = getGroqApiKeys();
  const apiKey = keys[0] || '';
  return new Groq({ apiKey });
}
