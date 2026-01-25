/**
 * CLI Interface
 *
 * Interactive command-line interface for testing the M365 Knowledge Assistant.
 * Provides a REPL-style interface for chatting with Copilot.
 *
 * @module cli
 */

import type { SessionEvent } from '@github/copilot-sdk';
import * as readline from 'node:readline';
import { sessionManager } from './core/index.js';
import { createLogger } from './utils/index.js';

const logger = createLogger({ module: 'CLI' });

/**
 * ANSI color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

/**
 * Prints colored output
 */
function print(text: string, color?: keyof typeof colors): void {
  if (color) {
    process.stdout.write(`${colors[color]}${text}${colors.reset}`);
  } else {
    process.stdout.write(text);
  }
}

/**
 * Prints a line with color
 */
function println(text: string, color?: keyof typeof colors): void {
  print(text + '\n', color);
}

/**
 * Runs the interactive CLI mode
 */
export async function runCliMode(): Promise<void> {
  println('\n╔══════════════════════════════════════════════════════════════╗', 'cyan');
  println('║         M365 Knowledge Assistant - Interactive CLI           ║', 'cyan');
  println('╚══════════════════════════════════════════════════════════════╝', 'cyan');
  println('');
  println('Commands:', 'bright');
  println('  /new       - Start a new conversation', 'dim');
  println('  /agents    - List available agents', 'dim');
  println('  /status    - Show session status', 'dim');
  println('  /help      - Show this help', 'dim');
  println('  /exit      - Exit the application', 'dim');
  println('');
  println('Available M365 tools:', 'bright');
  println('  • search_sharepoint - Search SharePoint documents', 'dim');
  println('  • list_sharepoint_sites - List SharePoint sites', 'dim');
  println('  • list_teams - List Microsoft Teams', 'dim');
  println('  • get_team_channels - Get channels in a team', 'dim');
  println('  • get_channel_messages - Get messages from a channel', 'dim');
  println('');
  println('Type your question or command to get started!\n', 'green');

  // Create initial session
  const userId = 'cli-user';
  let currentSession = await createNewSession(userId);

  // Setup readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = () => {
    rl.question(`${colors.cyan}You: ${colors.reset}`, async (input) => {
      const trimmedInput = input.trim();

      if (!trimmedInput) {
        prompt();
        return;
      }

      // Handle commands
      if (trimmedInput.startsWith('/')) {
        const command = trimmedInput.toLowerCase();

        switch (command) {
          case '/exit':
          case '/quit':
            println('\nGoodbye! 👋', 'cyan');
            rl.close();
            process.exit(0);
            break;

          case '/new':
            await sessionManager.destroySession(currentSession.sessionId);
            currentSession = await createNewSession(userId);
            println('✨ New conversation started\n', 'green');
            break;

          case '/agents':
            println('\nAvailable agents:', 'bright');
            println('  @m365-knowledge - General M365 search assistant', 'dim');
            println('  @it-helpdesk - IT support questions', 'dim');
            println('  @hr-assistant - HR policy questions\n', 'dim');
            break;

          case '/status':
            println(`\nSession: ${currentSession.sessionId}`, 'dim');
            println(`Model: ${currentSession.model}`, 'dim');
            println(`Started: ${currentSession.createdAt.toLocaleString()}\n`, 'dim');
            break;

          case '/help':
            println('\nCommands:', 'bright');
            println('  /new    - Start new conversation', 'dim');
            println('  /agents - List agents', 'dim');
            println('  /status - Session info', 'dim');
            println('  /exit   - Quit\n', 'dim');
            break;

          default:
            println(`Unknown command: ${command}. Type /help for commands.\n`, 'yellow');
        }

        prompt();
        return;
      }

      // Send message to Copilot
      try {
        print('\n');
        print('Assistant: ', 'green');

        // Stream the response
        let isStreaming = false;
        const streamHandler = (event: SessionEvent) => {
          if (event.type === 'assistant.message_delta') {
            if (!isStreaming) {
              isStreaming = true;
            }
            process.stdout.write(event.data.deltaContent ?? '');
          } else if (event.type === 'tool.execution_start') {
            print(`\n  🔧 Using: ${event.data.toolName}...`, 'dim');
          } else if (event.type === 'tool.execution_complete') {
            print(' ✓\n', 'dim');
          }
        };

        sessionManager.onSessionEvent(currentSession.sessionId, streamHandler);

        await sessionManager.sendMessage(currentSession.sessionId, {
          prompt: trimmedInput,
        });

        sessionManager.offSessionEvent(currentSession.sessionId, streamHandler);

        println('\n');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        println(`\n❌ Error: ${message}\n`, 'yellow');
        logger.error({ err: error }, 'Error sending message');
      }

      prompt();
    });
  };

  prompt();
}

/**
 * Creates a new session with appropriate configuration
 */
async function createNewSession(userId: string) {
  const { metadata } = await sessionManager.createSession({
    userId,
    model: 'gpt-4.1',
    streaming: true,
    systemMessageContent: `You are an M365 Knowledge Assistant. You help employees find information across Microsoft 365 services including SharePoint, Teams, OneDrive, and Outlook.

When users ask questions:
1. Use the available tools to search for relevant information
2. Summarize findings clearly and concisely
3. Always provide links to source documents when available
4. If you can't find information, suggest alternative search terms

Be helpful, professional, and proactive in finding relevant information.`,
  });

  return metadata;
}
