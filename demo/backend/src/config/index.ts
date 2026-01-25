/**
 * Application Configuration
 *
 * Centralizes all configuration from environment variables with validation.
 * All config access should go through this module.
 *
 * @module config
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

/**
 * Environment variable schema with validation
 */
const envSchema = z.object({
  // Server
  PORT: z.string().default('3000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'trace']).default('info'),

  // Copilot SDK
  COPILOT_CLI_PATH: z.string().default('copilot'),
  COPILOT_CLI_URL: z.string().optional(),

  // Microsoft Entra ID (Azure AD)
  AZURE_TENANT_ID: z.string().min(1, 'AZURE_TENANT_ID is required'),
  AZURE_CLIENT_ID: z.string().min(1, 'AZURE_CLIENT_ID is required'),
  AZURE_CLIENT_SECRET: z.string().min(1, 'AZURE_CLIENT_SECRET is required'),

  // Optional user context
  GRAPH_USER_ID: z.string().optional(),

  // Session configuration
  SESSION_PERSISTENCE_DIR: z.string().default('./.sessions'),
  SESSION_MAX_AGE_HOURS: z.string().default('24').transform(Number),
});

/**
 * Validated environment configuration
 */
function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

const env = loadConfig();

/**
 * Application configuration object
 */
export const config = {
  /**
   * Server configuration
   */
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isTest: env.NODE_ENV === 'test',
  },

  /**
   * Logging configuration
   */
  logging: {
    level: env.LOG_LEVEL,
  },

  /**
   * Copilot SDK configuration
   */
  copilot: {
    cliPath: env.COPILOT_CLI_PATH,
    cliUrl: env.COPILOT_CLI_URL,
    /** Whether to connect to external CLI server */
    useExternalServer: Boolean(env.COPILOT_CLI_URL),
  },

  /**
   * Microsoft Graph / Azure AD configuration
   */
  graph: {
    tenantId: env.AZURE_TENANT_ID,
    clientId: env.AZURE_CLIENT_ID,
    clientSecret: env.AZURE_CLIENT_SECRET,
    userId: env.GRAPH_USER_ID,
    /** Microsoft Graph API base URL */
    baseUrl: 'https://graph.microsoft.com/v1.0',
    /** Required Graph API scopes */
    scopes: ['https://graph.microsoft.com/.default'],
  },

  /**
   * Session configuration
   */
  session: {
    persistenceDir: env.SESSION_PERSISTENCE_DIR,
    maxAgeHours: env.SESSION_MAX_AGE_HOURS,
  },
} as const;

export type Config = typeof config;
