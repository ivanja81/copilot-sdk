/**
 * Copilot Client Wrapper
 *
 * Manages the GitHub Copilot SDK client lifecycle. Provides singleton access
 * to the Copilot CLI connection and handles startup/shutdown gracefully.
 *
 * @module core/copilot-client
 */

import { CopilotClient, type CopilotClientOptions } from '@github/copilot-sdk';
import { config } from '../config/index.js';
import { CopilotError, createLogger } from '../utils/index.js';

const logger = createLogger({ module: 'CopilotClientWrapper' });

/**
 * Singleton wrapper for the Copilot SDK client
 */
class CopilotClientWrapper {
  private client: CopilotClient | null = null;
  private isStarting = false;
  private isStarted = false;

  /**
   * Gets or creates the Copilot client instance
   *
   * @returns The initialized Copilot client
   * @throws {CopilotError} If client initialization fails
   */
  async getClient(): Promise<CopilotClient> {
    if (this.client && this.isStarted) {
      return this.client;
    }

    if (this.isStarting) {
      // Wait for ongoing initialization
      await this.waitForStart();
      if (this.client) {
        return this.client;
      }
    }

    return this.initialize();
  }

  /**
   * Initializes the Copilot client with configuration
   */
  private async initialize(): Promise<CopilotClient> {
    this.isStarting = true;

    try {
      logger.info('Initializing Copilot client...');

      const options: CopilotClientOptions = {
        logLevel: config.logging.level === 'trace' ? 'all' : config.logging.level,
        autoStart: true,
        autoRestart: true,
      };

      // Use external server if configured
      if (config.copilot.useExternalServer && config.copilot.cliUrl) {
        logger.info({ cliUrl: config.copilot.cliUrl }, 'Connecting to external CLI server');
        options.cliUrl = config.copilot.cliUrl;
      } else {
        logger.info({ cliPath: config.copilot.cliPath }, 'Starting managed CLI server');
        options.cliPath = config.copilot.cliPath;
      }

      this.client = new CopilotClient(options);
      this.isStarted = true;
      this.isStarting = false;

      logger.info('Copilot client initialized successfully');

      return this.client;
    } catch (error) {
      this.isStarting = false;
      this.isStarted = false;

      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error }, 'Failed to initialize Copilot client');

      throw new CopilotError(`Failed to initialize Copilot client: ${message}`);
    }
  }

  /**
   * Waits for ongoing initialization to complete
   */
  private async waitForStart(timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();

    while (this.isStarting) {
      if (Date.now() - startTime > timeoutMs) {
        throw new CopilotError('Timeout waiting for Copilot client initialization');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Stops the Copilot client and releases resources
   */
  async stop(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      logger.info('Stopping Copilot client...');
      await this.client.stop();
      logger.info('Copilot client stopped successfully');
    } catch (error) {
      logger.error({ err: error }, 'Error stopping Copilot client');
    } finally {
      this.client = null;
      this.isStarted = false;
    }
  }

  /**
   * Checks if the client is currently running
   */
  isRunning(): boolean {
    return this.isStarted && this.client !== null;
  }

  /**
   * Gets available models from the Copilot service
   *
   * @returns List of available model identifiers
   */
  async getAvailableModels(): Promise<string[]> {
    const client = await this.getClient();

    try {
      const models = await client.getModels();
      return models.map((m) => m.id);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch available models');
      throw new CopilotError('Failed to fetch available models');
    }
  }

  /**
   * Gets the status of the Copilot connection
   */
  async getStatus(): Promise<{
    connected: boolean;
    models: string[];
    authenticated: boolean;
  }> {
    try {
      const client = await this.getClient();
      const status = await client.getStatus();
      const models = await this.getAvailableModels();

      return {
        connected: true,
        models,
        authenticated: status.authenticated ?? false,
      };
    } catch {
      return {
        connected: false,
        models: [],
        authenticated: false,
      };
    }
  }
}

/**
 * Singleton instance of the Copilot client wrapper
 */
export const copilotClient = new CopilotClientWrapper();

/**
 * Graceful shutdown handler
 */
export async function shutdownCopilotClient(): Promise<void> {
  await copilotClient.stop();
}
