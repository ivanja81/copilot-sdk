/**
 * Custom Error Classes
 *
 * Defines application-specific error types for consistent error handling
 * across the codebase. All errors include structured metadata for logging.
 *
 * @module utils/errors
 */

/**
 * Base application error with structured metadata
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts error to JSON for API responses
   */
  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
      },
    };
  }
}

/**
 * Error for authentication failures
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Error for authorization failures
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Error for resource not found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} not found: ${identifier}`
      : `${resource} not found`;
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Error for validation failures
 */
export class ValidationError extends AppError {
  public readonly details: unknown;

  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }

  override toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

/**
 * Error for Microsoft Graph API failures
 */
export class GraphApiError extends AppError {
  public readonly endpoint: string;
  public readonly graphErrorCode?: string;

  constructor(
    message: string,
    statusCode: number,
    endpoint: string,
    graphErrorCode?: string
  ) {
    super(message, statusCode, 'GRAPH_API_ERROR');
    this.endpoint = endpoint;
    this.graphErrorCode = graphErrorCode;
  }

  override toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        endpoint: this.endpoint,
        graphErrorCode: this.graphErrorCode,
      },
    };
  }
}

/**
 * Error for Copilot SDK failures
 */
export class CopilotError extends AppError {
  public readonly sessionId?: string;

  constructor(message: string, sessionId?: string) {
    super(message, 500, 'COPILOT_ERROR');
    this.sessionId = sessionId;
  }
}

/**
 * Error for session-related failures
 */
export class SessionError extends AppError {
  public readonly sessionId?: string;

  constructor(message: string, sessionId?: string, statusCode: number = 400) {
    super(message, statusCode, 'SESSION_ERROR');
    this.sessionId = sessionId;
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Wraps unknown errors in AppError for consistent handling
 */
export function wrapError(error: unknown, context?: string): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      context ? `${context}: ${error.message}` : error.message,
      500,
      'INTERNAL_ERROR'
    );
  }

  return new AppError(
    context ? `${context}: Unknown error` : 'Unknown error',
    500,
    'INTERNAL_ERROR'
  );
}
