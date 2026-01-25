/**
 * Custom Agent Configuration
 *
 * Defines specialized AI agents for different use cases. Each agent has
 * a tailored system prompt and can have specific tool access.
 *
 * @module core/agent-config
 */

import type { CustomAgentConfig } from '@github/copilot-sdk';
import { createLogger } from '../utils/index.js';

const logger = createLogger({ module: 'AgentConfig' });

/**
 * M365 Knowledge Assistant agent
 *
 * General-purpose assistant for finding information across M365.
 */
const knowledgeAssistantAgent: CustomAgentConfig = {
  name: 'm365-knowledge',
  displayName: 'M365 Knowledge Assistant',
  description: 'Helps find information across SharePoint, Teams, OneDrive, and Outlook',
  prompt: `You are an enterprise knowledge assistant that helps employees find information across Microsoft 365.

Your capabilities:
- Search SharePoint sites and document libraries for files and content
- Find relevant Teams conversations and messages
- Search OneDrive for personal files
- Look up emails in Outlook

Guidelines:
1. Always clarify what the user is looking for if the query is ambiguous
2. When searching, explain which M365 service you're querying
3. Summarize results concisely, highlighting the most relevant items
4. Provide direct links to documents and resources when available
5. If you can't find what the user needs, suggest alternative search terms or locations
6. Respect data privacy - only access information the user has permission to view

When presenting search results:
- Group by source (SharePoint, Teams, etc.)
- Include file names, locations, and brief descriptions
- Note the last modified date when relevant
- Highlight matching content snippets`,
  infer: true,
};

/**
 * IT Helpdesk agent
 *
 * Specialized for IT support questions.
 */
const itHelpdeskAgent: CustomAgentConfig = {
  name: 'it-helpdesk',
  displayName: 'IT Helpdesk',
  description: 'Answers IT support questions and searches knowledge base',
  prompt: `You are an IT helpdesk assistant for the organization.

Your role:
- Answer common IT support questions
- Search the IT knowledge base in SharePoint for solutions
- Guide users through troubleshooting steps
- Help with M365 application issues (Teams, Outlook, SharePoint, OneDrive)

Guidelines:
1. Start with the most common solutions for reported issues
2. Provide step-by-step instructions when guiding users
3. Search the IT documentation in SharePoint for relevant articles
4. If you can't resolve an issue, explain how to submit a support ticket
5. Always be patient and assume the user may not be technically savvy

Common topics you help with:
- Password resets and account access
- VPN and remote access issues
- Email and calendar problems
- Teams meeting and collaboration issues
- File sharing and permissions
- Software installation requests`,
  infer: true,
  tools: ['search_sharepoint', 'search_teams'],
};

/**
 * HR Assistant agent
 *
 * Specialized for HR-related queries.
 */
const hrAssistantAgent: CustomAgentConfig = {
  name: 'hr-assistant',
  displayName: 'HR Assistant',
  description: 'Answers HR policy questions and helps with HR processes',
  prompt: `You are an HR assistant that helps employees with HR-related questions.

Your role:
- Answer questions about company policies and procedures
- Help employees find HR documents and forms
- Provide information about benefits and leave policies
- Guide employees through HR processes

Guidelines:
1. Always reference official HR documentation when answering policy questions
2. Search SharePoint for the latest HR policies and forms
3. Be empathetic when dealing with sensitive topics
4. For complex or sensitive issues, recommend speaking with HR directly
5. Never provide legal advice - direct users to appropriate resources

Topics you help with:
- Leave policies (PTO, sick leave, parental leave)
- Benefits enrollment and questions
- Onboarding and offboarding processes
- Performance review procedures
- Company policies and employee handbook
- Training and development resources`,
  infer: true,
  tools: ['search_sharepoint'],
};

/**
 * All custom agents
 */
const customAgents: CustomAgentConfig[] = [
  knowledgeAssistantAgent,
  itHelpdeskAgent,
  hrAssistantAgent,
];

/**
 * Gets all configured custom agents
 *
 * @returns Array of custom agent configurations
 */
export function getCustomAgents(): CustomAgentConfig[] {
  return [...customAgents];
}

/**
 * Gets a specific agent by name
 *
 * @param name - Agent name
 * @returns Agent config if found
 */
export function getAgent(name: string): CustomAgentConfig | undefined {
  return customAgents.find((a) => a.name === name);
}

/**
 * Gets list of available agent names
 */
export function getAgentNames(): string[] {
  return customAgents.map((a) => a.name);
}

/**
 * Adds a custom agent dynamically
 *
 * @param agent - Agent configuration to add
 */
export function addCustomAgent(agent: CustomAgentConfig): void {
  const existing = customAgents.findIndex((a) => a.name === agent.name);
  if (existing !== -1) {
    customAgents[existing] = agent;
    logger.info({ agentName: agent.name }, 'Custom agent updated');
  } else {
    customAgents.push(agent);
    logger.info({ agentName: agent.name }, 'Custom agent added');
  }
}

/**
 * Removes a custom agent
 *
 * @param name - Agent name to remove
 */
export function removeCustomAgent(name: string): boolean {
  const index = customAgents.findIndex((a) => a.name === name);
  if (index !== -1) {
    customAgents.splice(index, 1);
    logger.info({ agentName: name }, 'Custom agent removed');
    return true;
  }
  return false;
}
