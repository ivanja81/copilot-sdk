/**
 * Microsoft Graph Client
 *
 * Provides authenticated access to Microsoft Graph API. Handles token
 * acquisition via MSAL and wraps the Graph client for type-safe operations.
 *
 * @module services/graph/graph-client
 */

import {
    ConfidentialClientApplication,
    type AuthenticationResult,
} from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { config } from '../../config/index.js';
import { AuthenticationError, createLogger, GraphApiError } from '../../utils/index.js';

const logger = createLogger({ module: 'GraphClient' });

/**
 * MSAL configuration for client credentials flow
 */
const msalConfig = {
  auth: {
    clientId: config.graph.clientId,
    clientSecret: config.graph.clientSecret,
    authority: `https://login.microsoftonline.com/${config.graph.tenantId}`,
  },
};

/**
 * MSAL client application instance
 */
let msalClient: ConfidentialClientApplication | null = null;

/**
 * Cached access token
 */
let cachedToken: {
  token: string;
  expiresAt: number;
} | null = null;

/**
 * Gets or creates the MSAL client
 */
function getMsalClient(): ConfidentialClientApplication {
  if (!msalClient) {
    msalClient = new ConfidentialClientApplication(msalConfig);
  }
  return msalClient;
}

/**
 * Acquires an access token for Microsoft Graph
 *
 * Uses client credentials flow (application permissions).
 * Caches the token and refreshes when expired.
 *
 * @returns Access token string
 * @throws {AuthenticationError} If token acquisition fails
 */
async function acquireToken(): Promise<string> {
  // Check if cached token is still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token;
  }

  logger.debug('Acquiring new Graph API token');

  try {
    const client = getMsalClient();
    const result: AuthenticationResult | null = await client.acquireTokenByClientCredential({
      scopes: config.graph.scopes,
    });

    if (!result || !result.accessToken) {
      throw new AuthenticationError('Failed to acquire Graph API token');
    }

    // Cache the token
    cachedToken = {
      token: result.accessToken,
      expiresAt: result.expiresOn?.getTime() ?? Date.now() + 3600 * 1000,
    };

    logger.debug('Graph API token acquired successfully');

    return result.accessToken;
  } catch (error) {
    logger.error({ err: error }, 'Failed to acquire Graph API token');

    if (error instanceof AuthenticationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new AuthenticationError(`Graph authentication failed: ${message}`);
  }
}

/**
 * Creates an authenticated Microsoft Graph client
 *
 * @returns Configured Graph client instance
 */
export async function getGraphClient(): Promise<Client> {
  const token = await acquireToken();

  return Client.init({
    authProvider: (callback) => {
      callback(null, token);
    },
  });
}

/**
 * Executes a Graph API GET request
 *
 * @param endpoint - API endpoint (e.g., '/sites')
 * @param queryParams - Optional query parameters
 * @returns API response data
 *
 * @throws {GraphApiError} If the request fails
 */
export async function graphGet<T>(
  endpoint: string,
  queryParams?: Record<string, string | number | boolean>
): Promise<T> {
  const client = await getGraphClient();

  try {
    let request = client.api(endpoint);

    if (queryParams) {
      for (const [key, value] of Object.entries(queryParams)) {
        request = request.query({ [key]: value });
      }
    }

    const response = await request.get();
    return response as T;
  } catch (error: unknown) {
    const graphError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = graphError.statusCode ?? 500;
    const code = graphError.code;
    const message = graphError.message ?? 'Graph API request failed';

    logger.error(
      { err: error, endpoint, statusCode, code },
      'Graph API GET request failed'
    );

    throw new GraphApiError(message, statusCode, endpoint, code);
  }
}

/**
 * Executes a Graph API POST request
 *
 * @param endpoint - API endpoint
 * @param body - Request body
 * @returns API response data
 *
 * @throws {GraphApiError} If the request fails
 */
export async function graphPost<T>(
  endpoint: string,
  body: unknown
): Promise<T> {
  const client = await getGraphClient();

  try {
    const response = await client.api(endpoint).post(body);
    return response as T;
  } catch (error: unknown) {
    const graphError = error as { statusCode?: number; code?: string; message?: string };
    const statusCode = graphError.statusCode ?? 500;
    const code = graphError.code;
    const message = graphError.message ?? 'Graph API request failed';

    logger.error(
      { err: error, endpoint, statusCode, code },
      'Graph API POST request failed'
    );

    throw new GraphApiError(message, statusCode, endpoint, code);
  }
}

/**
 * Tests the Graph API connection
 *
 * @returns true if connection is successful
 */
export async function testConnection(): Promise<boolean> {
  try {
    await graphGet('/organization');
    return true;
  } catch {
    return false;
  }
}

/**
 * Clears the cached token (for testing or forced refresh)
 */
export function clearTokenCache(): void {
  cachedToken = null;
  logger.debug('Token cache cleared');
}
