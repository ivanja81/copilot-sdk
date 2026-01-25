/**
 * Microsoft Teams Service
 *
 * Provides methods for interacting with Microsoft Teams via Graph API.
 * Handles team/channel listing and message retrieval.
 *
 * @module services/graph/teams
 */

import { createLogger } from '../../utils/index.js';
import { graphGet } from './graph-client.js';

const logger = createLogger({ module: 'TeamsService' });

/**
 * Teams team information
 */
export interface Team {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
}

/**
 * Teams channel information
 */
export interface Channel {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  membershipType?: 'standard' | 'private' | 'shared';
}

/**
 * Teams message information
 */
export interface TeamsMessage {
  id: string;
  createdDateTime: string;
  body: {
    content: string;
    contentType: 'text' | 'html';
  };
  from?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  webUrl?: string;
  channelIdentity?: {
    teamId: string;
    channelId: string;
  };
  /** Preview text for search results */
  summary?: string;
}

/**
 * Search options for Teams messages
 */
export interface SearchMessagesOptions {
  /** Search query */
  query: string;
  /** Maximum results */
  limit?: number;
  /** Specific team ID to search within */
  teamId?: string;
  /** Specific channel ID to search within */
  channelId?: string;
}

/**
 * Lists teams the application has access to
 *
 * @returns Array of teams
 */
export async function listTeams(): Promise<Team[]> {
  logger.debug('Listing Teams');

  try {
    const response = await graphGet<{ value: Team[] }>('/groups', {
      $filter: "resourceProvisioningOptions/Any(x:x eq 'Team')",
      $select: 'id,displayName,description',
      $top: '50',
    });

    logger.info({ count: response.value.length }, 'Retrieved teams');

    return response.value;
  } catch (error) {
    logger.error({ err: error }, 'Failed to list teams');
    throw error;
  }
}

/**
 * Gets channels for a specific team
 *
 * @param teamId - Team identifier
 * @returns Array of channels
 */
export async function getTeamChannels(teamId: string): Promise<Channel[]> {
  logger.debug({ teamId }, 'Getting team channels');

  try {
    const response = await graphGet<{ value: Channel[] }>(
      `/teams/${teamId}/channels`,
      {
        $select: 'id,displayName,description,webUrl,membershipType',
      }
    );

    return response.value;
  } catch (error) {
    logger.error({ err: error, teamId }, 'Failed to get team channels');
    throw error;
  }
}

/**
 * Gets recent messages from a channel
 *
 * @param teamId - Team identifier
 * @param channelId - Channel identifier
 * @param limit - Maximum messages to retrieve
 * @returns Array of messages
 */
export async function getChannelMessages(
  teamId: string,
  channelId: string,
  limit: number = 20
): Promise<TeamsMessage[]> {
  logger.debug({ teamId, channelId, limit }, 'Getting channel messages');

  try {
    const response = await graphGet<{ value: TeamsMessage[] }>(
      `/teams/${teamId}/channels/${channelId}/messages`,
      {
        $top: String(limit),
        $select: 'id,createdDateTime,body,from,webUrl',
      }
    );

    return response.value;
  } catch (error) {
    logger.error({ err: error, teamId, channelId }, 'Failed to get channel messages');
    throw error;
  }
}

/**
 * Searches Teams messages across all accessible teams and channels
 *
 * Uses Microsoft Graph Search API for content-based search.
 *
 * @param options - Search options
 * @returns Array of matching messages
 */
export async function searchMessages(
  options: SearchMessagesOptions
): Promise<TeamsMessage[]> {
  const { query, limit = 10 } = options;

  logger.debug({ query, limit }, 'Searching Teams messages');

  // Note: Teams message search requires specific permissions and may need
  // the beta API endpoint. This is a simplified implementation.

  try {
    // For now, return empty array as Teams search requires additional setup
    // In production, you would use /search/query with entityTypes: ['chatMessage']
    logger.warn('Teams message search not fully implemented - requires beta API');

    return [];
  } catch (error) {
    logger.error({ err: error, query }, 'Teams message search failed');
    throw error;
  }
}

/**
 * Gets a specific team by ID
 *
 * @param teamId - Team identifier
 * @returns Team information
 */
export async function getTeam(teamId: string): Promise<Team> {
  logger.debug({ teamId }, 'Getting team');

  const response = await graphGet<Team>(`/teams/${teamId}`, {
    $select: 'id,displayName,description,webUrl',
  });

  return response;
}
