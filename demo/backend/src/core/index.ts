/**
 * Core Module Index
 *
 * Exports all core Copilot SDK integration components.
 *
 * @module core
 */

export { copilotClient, shutdownCopilotClient } from './copilot-client.js';

export {
    sessionManager,
    type CreateSessionOptions,
    type SendMessageOptions,
    type SessionEventHandler
} from './session-manager.js';

export {
    clearTools, defineTool, getRegisteredTools,
    getTool, getToolNames,
    getToolStats, registerTool,
    registerTools, unregisterTool
} from './tool-registry.js';

export {
    addCustomAgent, getAgent,
    getAgentNames, getCustomAgents, removeCustomAgent
} from './agent-config.js';

