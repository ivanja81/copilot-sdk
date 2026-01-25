/**
 * Logger Utility
 *
 * Provides structured logging using Pino. All application logging should
 * use this module for consistent output format and log levels.
 *
 * @module utils/logger
 */

import pino from 'pino';
import { config } from '../config/index.js';

/**
 * Logger instance configured for the application
 */
export const logger = pino({
  level: config.logging.level,
  transport: config.server.isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.server.nodeEnv,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
});

/**
 * Creates a child logger with additional context
 *
 * @param context - Additional context to include in all log messages
 * @returns Child logger instance
 *
 * @example
 * ```typescript
 * const serviceLogger = createLogger({ service: 'SharePointService' });
 * serviceLogger.info({ siteId }, 'Fetching site');
 * ```
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export type Logger = typeof logger;
