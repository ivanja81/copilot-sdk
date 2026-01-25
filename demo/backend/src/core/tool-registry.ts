/**
 * Tool Registry
 *
 * Central registry for all Copilot tools. Manages tool registration,
 * provides type-safe tool definitions, and exports tools for session creation.
 *
 * @module core/tool-registry
 */

import { defineTool, type Tool } from '@github/copilot-sdk';
import { createLogger } from '../utils/index.js';

const logger = createLogger({ module: 'ToolRegistry' });

/**
 * Registered tools collection
 */
const registeredTools: Tool<unknown>[] = [];

/**
 * Registers a tool with the registry
 *
 * @param tool - Tool to register
 *
 * @example
 * ```typescript
 * registerTool(searchSharePointTool);
 * ```
 */
export function registerTool<T>(tool: Tool<T>): void {
  // Check for duplicate names
  const existing = registeredTools.find((t) => t.name === tool.name);
  if (existing) {
    logger.warn({ toolName: tool.name }, 'Tool already registered, replacing');
    const index = registeredTools.indexOf(existing);
    registeredTools.splice(index, 1);
  }

  registeredTools.push(tool as Tool<unknown>);
  logger.info({ toolName: tool.name }, 'Tool registered');
}

/**
 * Registers multiple tools at once
 *
 * @param tools - Array of tools to register
 */
export function registerTools(tools: Tool<unknown>[]): void {
  for (const tool of tools) {
    registerTool(tool);
  }
}

/**
 * Gets all registered tools
 *
 * @returns Array of all registered tools
 */
export function getRegisteredTools(): Tool<unknown>[] {
  return [...registeredTools];
}

/**
 * Gets a specific tool by name
 *
 * @param name - Tool name
 * @returns Tool if found, undefined otherwise
 */
export function getTool(name: string): Tool<unknown> | undefined {
  return registeredTools.find((t) => t.name === name);
}

/**
 * Removes a tool from the registry
 *
 * @param name - Tool name to remove
 * @returns true if removed, false if not found
 */
export function unregisterTool(name: string): boolean {
  const index = registeredTools.findIndex((t) => t.name === name);
  if (index !== -1) {
    registeredTools.splice(index, 1);
    logger.info({ toolName: name }, 'Tool unregistered');
    return true;
  }
  return false;
}

/**
 * Clears all registered tools
 */
export function clearTools(): void {
  registeredTools.length = 0;
  logger.info('All tools cleared');
}

/**
 * Gets list of registered tool names
 */
export function getToolNames(): string[] {
  return registeredTools.map((t) => t.name);
}

/**
 * Helper to create a type-safe tool definition
 * Re-exported from SDK for convenience
 */
export { defineTool };

/**
 * Tool statistics
 */
export function getToolStats(): {
  totalTools: number;
  toolNames: string[];
} {
  return {
    totalTools: registeredTools.length,
    toolNames: getToolNames(),
  };
}
