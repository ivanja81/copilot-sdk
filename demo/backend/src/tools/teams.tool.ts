/**
 * Microsoft Teams Tool
 *
 * Copilot tool for interacting with Microsoft Teams.
 * Provides access to teams, channels, and messages.
 *
 * @module tools/teams
 */

import { defineTool } from '../core/tool-registry.js';
import {
    getChannelMessages,
    getTeamChannels,
    listTeams,
    type Channel,
    type Team,
    type TeamsMessage,
} from '../services/graph/index.js';
import { createLogger } from '../utils/index.js';

const logger = createLogger({ module: 'TeamsTool' });

/**
 * Formats a team for LLM consumption
 */
function formatTeam(team: Team): string {
  return `👥 **${team.displayName}**${team.description ? `\n   ${team.description}` : ''}`;
}

/**
 * Formats a channel for LLM consumption
 */
function formatChannel(channel: Channel): string {
  const privacy = channel.membershipType === 'private' ? '🔒 ' : '';
  return `${privacy}#${channel.displayName}${channel.description ? ` - ${channel.description}` : ''}`;
}

/**
 * Formats a message for LLM consumption
 */
function formatMessage(message: TeamsMessage): string {
  const author = message.from?.user?.displayName ?? 'Unknown';
  const date = new Date(message.createdDateTime).toLocaleString();

  // Strip HTML tags for cleaner output
  let content = message.body.content;
  if (message.body.contentType === 'html') {
    content = content.replace(/<[^>]*>/g, '').trim();
  }

  // Truncate long messages
  if (content.length > 300) {
    content = content.substring(0, 300) + '...';
  }

  return `💬 **${author}** (${date}):\n   ${content}`;
}

/**
 * Parameters for list_teams tool
 */
interface ListTeamsParams {
  /** No parameters needed */
}

/**
 * List Teams tool
 *
 * Lists all accessible Microsoft Teams.
 */
export const listTeamsTool = defineTool<ListTeamsParams>('list_teams', {
  description: `List all Microsoft Teams that are accessible. Use this tool to:
- Discover available teams
- Find a team before getting its channels or messages
- See team descriptions`,

  parameters: {
    type: 'object',
    properties: {},
  },

  handler: async () => {
    logger.info('Listing Teams');

    try {
      const teams = await listTeams();

      if (teams.length === 0) {
        return {
          textResultForLlm: 'No Microsoft Teams found or accessible.',
          resultType: 'success',
          sessionLog: 'Teams: 0 found',
          toolTelemetry: { teamCount: 0 },
        };
      }

      const formattedTeams = teams.map(formatTeam).join('\n\n');
      const resultText = `Found ${teams.length} team(s):\n\n${formattedTeams}`;

      return {
        textResultForLlm: resultText,
        resultType: 'success',
        sessionLog: `Teams: ${teams.length} found`,
        toolTelemetry: { teamCount: teams.length },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: error }, 'Failed to list Teams');

      return {
        textResultForLlm: `Failed to list Teams: ${message}`,
        resultType: 'failure',
        error: message,
        sessionLog: `Teams error: ${message}`,
        toolTelemetry: { error: message },
      };
    }
  },
});

/**
 * Parameters for get_team_channels tool
 */
interface GetTeamChannelsParams {
  /** Team name to get channels for */
  teamName: string;
}

/**
 * Get Team Channels tool
 *
 * Lists channels in a specific team.
 */
export const getTeamChannelsTool = defineTool<GetTeamChannelsParams>(
  'get_team_channels',
  {
    description: `Get the channels in a Microsoft Teams team. Use this tool to:
- See what channels exist in a team
- Find a channel before reading its messages
- Understand team structure`,

    parameters: {
      type: 'object',
      properties: {
        teamName: {
          type: 'string',
          description: 'Name of the team to get channels for',
        },
      },
      required: ['teamName'],
    },

    handler: async (params) => {
      const { teamName } = params;

      logger.info({ teamName }, 'Getting team channels');

      try {
        // Find the team by name
        const teams = await listTeams();
        const team = teams.find(
          (t) => t.displayName.toLowerCase() === teamName.toLowerCase()
        );

        if (!team) {
          return {
            textResultForLlm: `Team "${teamName}" not found. Use list_teams to see available teams.`,
            resultType: 'failure',
            sessionLog: `Team channels: team "${teamName}" not found`,
            toolTelemetry: { teamName, found: false },
          };
        }

        const channels = await getTeamChannels(team.id);

        if (channels.length === 0) {
          return {
            textResultForLlm: `No channels found in team "${teamName}".`,
            resultType: 'success',
            sessionLog: `Team channels: 0 in "${teamName}"`,
            toolTelemetry: { teamName, channelCount: 0 },
          };
        }

        const formattedChannels = channels.map(formatChannel).join('\n');
        const resultText = `Channels in **${team.displayName}**:\n\n${formattedChannels}`;

        return {
          textResultForLlm: resultText,
          resultType: 'success',
          sessionLog: `Team channels: ${channels.length} in "${teamName}"`,
          toolTelemetry: { teamName, channelCount: channels.length },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ err: error, teamName }, 'Failed to get team channels');

        return {
          textResultForLlm: `Failed to get channels: ${message}`,
          resultType: 'failure',
          error: message,
          sessionLog: `Team channels error: ${message}`,
          toolTelemetry: { teamName, error: message },
        };
      }
    },
  }
);

/**
 * Parameters for get_channel_messages tool
 */
interface GetChannelMessagesParams {
  /** Team name */
  teamName: string;
  /** Channel name */
  channelName: string;
  /** Number of messages to retrieve */
  limit?: number;
}

/**
 * Get Channel Messages tool
 *
 * Retrieves recent messages from a Teams channel.
 */
export const getChannelMessagesTool = defineTool<GetChannelMessagesParams>(
  'get_channel_messages',
  {
    description: `Get recent messages from a Microsoft Teams channel. Use this tool to:
- Read recent conversations in a channel
- Find information shared in Teams
- See what the team has been discussing`,

    parameters: {
      type: 'object',
      properties: {
        teamName: {
          type: 'string',
          description: 'Name of the team',
        },
        channelName: {
          type: 'string',
          description: 'Name of the channel (e.g., "General")',
        },
        limit: {
          type: 'number',
          description: 'Number of messages to retrieve (default: 10, max: 50)',
        },
      },
      required: ['teamName', 'channelName'],
    },

    handler: async (params) => {
      const { teamName, channelName, limit = 10 } = params;

      logger.info({ teamName, channelName, limit }, 'Getting channel messages');

      try {
        // Find the team
        const teams = await listTeams();
        const team = teams.find(
          (t) => t.displayName.toLowerCase() === teamName.toLowerCase()
        );

        if (!team) {
          return {
            textResultForLlm: `Team "${teamName}" not found.`,
            resultType: 'failure',
            sessionLog: `Channel messages: team "${teamName}" not found`,
            toolTelemetry: { teamName, channelName, teamFound: false },
          };
        }

        // Find the channel
        const channels = await getTeamChannels(team.id);
        const channel = channels.find(
          (c) => c.displayName.toLowerCase() === channelName.toLowerCase()
        );

        if (!channel) {
          const availableChannels = channels.map((c) => c.displayName).join(', ');
          return {
            textResultForLlm: `Channel "${channelName}" not found in team "${teamName}". Available channels: ${availableChannels}`,
            resultType: 'failure',
            sessionLog: `Channel messages: channel "${channelName}" not found`,
            toolTelemetry: { teamName, channelName, channelFound: false },
          };
        }

        // Get messages
        const messages = await getChannelMessages(
          team.id,
          channel.id,
          Math.min(limit, 50)
        );

        if (messages.length === 0) {
          return {
            textResultForLlm: `No messages found in #${channelName} (${teamName}).`,
            resultType: 'success',
            sessionLog: `Channel messages: 0 in "${channelName}"`,
            toolTelemetry: { teamName, channelName, messageCount: 0 },
          };
        }

        const formattedMessages = messages.map(formatMessage).join('\n\n');
        const resultText = `Recent messages in **${team.displayName}** > #${channel.displayName}:\n\n${formattedMessages}`;

        return {
          textResultForLlm: resultText,
          resultType: 'success',
          sessionLog: `Channel messages: ${messages.length} from "${channelName}"`,
          toolTelemetry: { teamName, channelName, messageCount: messages.length },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ err: error, teamName, channelName }, 'Failed to get messages');

        return {
          textResultForLlm: `Failed to get messages: ${message}`,
          resultType: 'failure',
          error: message,
          sessionLog: `Channel messages error: ${message}`,
          toolTelemetry: { teamName, channelName, error: message },
        };
      }
    },
  }
);
