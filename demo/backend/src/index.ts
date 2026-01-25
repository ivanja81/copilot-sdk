/**
 * M365 Knowledge Assistant - Application Entry Point
 *
 * Main entry point for the backend server. Initializes all components
 * and starts the application in either API or CLI mode.
 *
 * @module index
 */

import { runCliMode } from './cli.js';
import { config } from './config/index.js';
import { copilotClient, sessionManager, shutdownCopilotClient } from './core/index.js';
import { initializeTools } from './tools/index.js';
import { createLogger, logger } from './utils/index.js';

const appLogger = createLogger({ module: 'App' });

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  appLogger.info({ signal }, 'Shutdown signal received');

  try {
    // Cleanup sessions
    const stats = sessionManager.getStats();
    appLogger.info({ activeSessions: stats.totalSessions }, 'Cleaning up sessions...');

    // Stop Copilot client
    await shutdownCopilotClient();

    appLogger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    appLogger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

/**
 * Main application entry point
 */
async function main(): Promise<void> {
  appLogger.info(
    {
      nodeEnv: config.server.nodeEnv,
      port: config.server.port,
    },
    '🚀 Starting M365 Knowledge Assistant'
  );

  // Register shutdown handlers
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  try {
    // Initialize tools
    initializeTools();

    // Verify Copilot connection
    appLogger.info('Connecting to Copilot CLI...');
    const status = await copilotClient.getStatus();

    if (!status.connected) {
      appLogger.error('Failed to connect to Copilot CLI. Is it installed and authenticated?');
      process.exit(1);
    }

    appLogger.info(
      {
        authenticated: status.authenticated,
        availableModels: status.models.length,
      },
      '✅ Connected to Copilot CLI'
    );

    // Run in CLI mode for now (API server coming later)
    await runCliMode();
  } catch (error) {
    appLogger.error({ err: error }, 'Failed to start application');
    process.exit(1);
  }
}

// Start the application
main().catch((error) => {
  logger.error({ err: error }, 'Unhandled error in main');
  process.exit(1);
});
