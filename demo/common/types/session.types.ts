/**
 * Session Types
 *
 * Shared type definitions for session management.
 *
 * @module common/types/session
 */

/**
 * Session status
 */
export type SessionStatus = 'active' | 'idle' | 'expired' | 'error';

/**
 * Session information for API responses
 */
export interface SessionInfo {
  sessionId: string;
  userId: string;
  status: SessionStatus;
  model: string;
  createdAt: string;
  lastActiveAt: string;
}

/**
 * Create session request
 */
export interface CreateSessionRequest {
  userId: string;
  sessionId?: string;
  model?: string;
  streaming?: boolean;
  systemMessage?: string;
}

/**
 * Send message request
 */
export interface SendMessageRequest {
  prompt: string;
  attachments?: string[];
}

/**
 * Message in conversation history
 */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolCalls?: ToolCallInfo[];
}

/**
 * Tool call information
 */
export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'success' | 'error';
}
