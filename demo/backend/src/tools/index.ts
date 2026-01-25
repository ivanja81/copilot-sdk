/**
 * Tools Index
 *
 * Registers all Copilot tools and exports them for use.
 *
 * @module tools
 */

import { registerTool } from '../core/tool-registry.js';
import { createLogger } from '../utils/index.js';

// Import tools
import {
    listSharePointSitesTool,
    searchSharePointTool,
} from './sharepoint.tool.js';

import {
    getChannelMessagesTool,
    getTeamChannelsTool,
    listTeamsTool,
} from './teams.tool.js';

const logger = createLogger({ module: 'ToolsInit' });

/**
 * Initializes and registers all M365 tools
 *
 * Call this function during application startup to make
 * all tools available to Copilot sessions.
 */
export function initializeTools(): void {
  logger.info('Initializing M365 tools...');

  // Register SharePoint tools
  registerTool(searchSharePointTool);
  registerTool(listSharePointSitesTool);

  // Register Teams tools
  registerTool(listTeamsTool);
  registerTool(getTeamChannelsTool);
  registerTool(getChannelMessagesTool);

  logger.info('M365 tools initialized');
}

// Export individual tools for direct use if needed
export {
    listSharePointSitesTool, searchSharePointTool
} from './sharepoint.tool.js';

export {
    getChannelMessagesTool, getTeamChannelsTool, listTeamsTool
} from './teams.tool.js';

