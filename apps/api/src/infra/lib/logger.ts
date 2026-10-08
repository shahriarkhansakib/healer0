import pino from 'pino';

/**
 * Singleton Pino logger for the Healer API.
 *
 * Configured without thread-worker transports to ensure 100% compatibility
 * with Next.js App Router, Webpack/Turbopack bundling, and serverless runtimes.
 */
export const logger = pino({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
