/**
 * Session Manager
 *
 * Manages Copilot conversation sessions including creation, retrieval,
 * persistence, and cleanup. Handles multi-user session isolation.
 *
 * @module core/session-manager
 */

import type { CopilotSession, SessionConfig, SessionEvent } from '@github/copilot-sdk';
import { config } from '../config/index.js';
import { createLogger, NotFoundError, SessionError } from '../utils/index.js';
import { getCustomAgents } from './agent-config.js';
import { copilotClient } from './copilot-client.js';
import { getRegisteredTools } from './tool-registry.js';

const logger = createLogger({ module: 'SessionManager' });

/**
 * Session metadata for tracking
 */
interface SessionMetadata {
  sessionId: string;
  userId: string;
  createdAt: Date;
  lastActiveAt: Date;
  model: string;
}

/**
 * Options for creating a new session
 */
export interface CreateSessionOptions {
  /** User identifier for session ownership */
  userId: string;
  /** Optional custom session ID (auto-generated if not provided) */
  sessionId?: string;
  /** Model to use (defaults to gpt-4.1) */
  model?: string;
  /** Whether to enable streaming */
  streaming?: boolean;
  /** Custom system message content to append */
  systemMessageContent?: string;
}

/**
 * Options for sending a message
 */
export interface SendMessageOptions {
  /** The message prompt */
  prompt: string;
  /** Optional attachments (file paths, URLs) */
  attachments?: string[];
}

/**
 * Event handler type
 */
export type SessionEventHandler = (event: SessionEvent) => void;

/**
 * Manages Copilot conversation sessions
 */
class SessionManager {
  /** Active sessions indexed by session ID */
  private sessions: Map<string, CopilotSession> = new Map();
  /** Session metadata indexed by session ID */
  private metadata: Map<string, SessionMetadata> = new Map();
  /** Event handlers indexed by session ID */
  private eventHandlers: Map<string, Set<SessionEventHandler>> = new Map();

  /**
   * Creates a new conversation session
   *
   * @param options - Session creation options
   * @returns Created session with metadata
   *
   * @throws {SessionError} If session creation fails
   *
   * @example
   * ```typescript
   * const { session, metadata } = await sessionManager.createSession({
   *   userId: 'user-123',
   *   model: 'gpt-4.1',
   *   streaming: true
   * });
   * ```
   */
  async createSession(options: CreateSessionOptions): Promise<{
    session: CopilotSession;
    metadata: SessionMetadata;
  }> {
    const {
      userId,
      sessionId,
      model = 'gpt-4.1',
      streaming = true,
      systemMessageContent,
    } = options;

    logger.info({ userId, model, streaming }, 'Creating new session');

    try {
      const client = await copilotClient.getClient();

      // Build session configuration
      const sessionConfig: SessionConfig = {
        sessionId,
        model,
        streaming,
        tools: getRegisteredTools(),
        customAgents: getCustomAgents(),
      };

      // Add custom system message if provided
      if (systemMessageContent) {
        sessionConfig.systemMessage = {
          mode: 'append',
          content: systemMessageContent,
        };
      }

      // Create the session
      const session = await client.createSession(sessionConfig);

      // Track metadata
      const meta: SessionMetadata = {
        sessionId: session.sessionId,
        userId,
        createdAt: new Date(),
        lastActiveAt: new Date(),
        model,
      };

      this.sessions.set(session.sessionId, session);
      this.metadata.set(session.sessionId, meta);
      this.eventHandlers.set(session.sessionId, new Set());

      // Setup internal event listener for logging
      session.on((event: SessionEvent) => {
        this.handleSessionEvent(session.sessionId, event);
      });

      logger.info(
        { sessionId: session.sessionId, userId },
        'Session created successfully'
      );

      return { session, metadata: meta };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, userId }, 'Failed to create session');
      throw new SessionError(`Failed to create session: ${message}`);
    }
  }

  /**
   * Retrieves an existing session by ID
   *
   * @param sessionId - Session identifier
   * @returns Session and metadata
   *
   * @throws {NotFoundError} If session doesn't exist
   */
  getSession(sessionId: string): {
    session: CopilotSession;
    metadata: SessionMetadata;
  } {
    const session = this.sessions.get(sessionId);
    const metadata = this.metadata.get(sessionId);

    if (!session || !metadata) {
      throw new NotFoundError('Session', sessionId);
    }

    // Update last active timestamp
    metadata.lastActiveAt = new Date();

    return { session, metadata };
  }

  /**
   * Resumes a persisted session
   *
   * @param sessionId - Session ID to resume
   * @param userId - User ID for ownership verification
   * @returns Resumed session with metadata
   *
   * @throws {SessionError} If session cannot be resumed
   */
  async resumeSession(
    sessionId: string,
    userId: string
  ): Promise<{
    session: CopilotSession;
    metadata: SessionMetadata;
  }> {
    // Check if already active
    if (this.sessions.has(sessionId)) {
      const { metadata } = this.getSession(sessionId);

      // Verify ownership
      if (metadata.userId !== userId) {
        throw new SessionError('Session belongs to different user', sessionId, 403);
      }

      return this.getSession(sessionId);
    }

    logger.info({ sessionId, userId }, 'Resuming persisted session');

    try {
      const client = await copilotClient.getClient();

      // Resume with current tools and agents
      const session = await client.resumeSession(sessionId, {
        tools: getRegisteredTools(),
        customAgents: getCustomAgents(),
      });

      // Recreate metadata (we don't have original creation time)
      const meta: SessionMetadata = {
        sessionId: session.sessionId,
        userId,
        createdAt: new Date(), // Best approximation
        lastActiveAt: new Date(),
        model: 'unknown', // Not available on resume
      };

      this.sessions.set(session.sessionId, session);
      this.metadata.set(session.sessionId, meta);
      this.eventHandlers.set(session.sessionId, new Set());

      // Setup event listener
      session.on((event: SessionEvent) => {
        this.handleSessionEvent(session.sessionId, event);
      });

      logger.info({ sessionId }, 'Session resumed successfully');

      return { session, metadata: meta };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, sessionId }, 'Failed to resume session');
      throw new SessionError(`Failed to resume session: ${message}`, sessionId);
    }
  }

  /**
   * Sends a message to a session and waits for completion
   *
   * @param sessionId - Target session ID
   * @param options - Message options
   * @returns Final assistant response
   */
  async sendMessage(
    sessionId: string,
    options: SendMessageOptions
  ): Promise<SessionEvent | null> {
    const { session, metadata } = this.getSession(sessionId);

    logger.debug(
      { sessionId, promptLength: options.prompt.length },
      'Sending message'
    );

    metadata.lastActiveAt = new Date();

    try {
      const response = await session.sendAndWait({
        prompt: options.prompt,
        attachments: options.attachments,
      });

      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error, sessionId }, 'Failed to send message');
      throw new SessionError(`Failed to send message: ${message}`, sessionId);
    }
  }

  /**
   * Registers an event handler for a session
   *
   * @param sessionId - Session to listen to
   * @param handler - Event handler function
   */
  onSessionEvent(sessionId: string, handler: SessionEventHandler): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      handlers.add(handler);
    }
  }

  /**
   * Removes an event handler from a session
   *
   * @param sessionId - Session ID
   * @param handler - Handler to remove
   */
  offSessionEvent(sessionId: string, handler: SessionEventHandler): void {
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Destroys a session and cleans up resources
   *
   * @param sessionId - Session to destroy
   */
  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (session) {
      try {
        await session.destroy();
        logger.info({ sessionId }, 'Session destroyed');
      } catch (error) {
        logger.error({ err: error, sessionId }, 'Error destroying session');
      }
    }

    this.sessions.delete(sessionId);
    this.metadata.delete(sessionId);
    this.eventHandlers.delete(sessionId);
  }

  /**
   * Gets all active sessions for a user
   *
   * @param userId - User identifier
   * @returns Array of session metadata
   */
  getUserSessions(userId: string): SessionMetadata[] {
    const userSessions: SessionMetadata[] = [];

    for (const metadata of this.metadata.values()) {
      if (metadata.userId === userId) {
        userSessions.push(metadata);
      }
    }

    return userSessions;
  }

  /**
   * Cleans up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const maxAge = config.session.maxAgeHours * 60 * 60 * 1000;
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, metadata] of this.metadata.entries()) {
      const age = now - metadata.lastActiveAt.getTime();

      if (age > maxAge) {
        await this.destroySession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.info({ cleanedCount }, 'Cleaned up expired sessions');
    }

    return cleanedCount;
  }

  /**
   * Internal event handler for logging and forwarding
   */
  private handleSessionEvent(sessionId: string, event: SessionEvent): void {
    // Log significant events
    switch (event.type) {
      case 'assistant.message':
        logger.debug({ sessionId, type: event.type }, 'Assistant message received');
        break;
      case 'tool.execution_start':
        logger.debug(
          { sessionId, toolName: event.data.toolName },
          'Tool execution started'
        );
        break;
      case 'tool.execution_complete':
        logger.debug({ sessionId }, 'Tool execution completed');
        break;
      case 'session.error':
        logger.error({ sessionId, error: event.data }, 'Session error');
        break;
    }

    // Forward to registered handlers
    const handlers = this.eventHandlers.get(sessionId);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(event);
        } catch (error) {
          logger.error({ err: error, sessionId }, 'Event handler error');
        }
      }
    }
  }

  /**
   * Gets statistics about active sessions
   */
  getStats(): {
    totalSessions: number;
    sessionsByUser: Record<string, number>;
  } {
    const sessionsByUser: Record<string, number> = {};

    for (const metadata of this.metadata.values()) {
      sessionsByUser[metadata.userId] = (sessionsByUser[metadata.userId] ?? 0) + 1;
    }

    return {
      totalSessions: this.sessions.size,
      sessionsByUser,
    };
  }
}

/**
 * Singleton session manager instance
 */
export const sessionManager = new SessionManager();
