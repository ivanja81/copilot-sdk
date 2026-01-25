# M365 Knowledge Assistant

An AI-powered knowledge assistant that helps employees find information across Microsoft 365 using the GitHub Copilot SDK.

## Overview

This application demonstrates how to build an enterprise-grade AI assistant using:

- **GitHub Copilot SDK** - For AI agent capabilities, tool orchestration, and session management
- **Microsoft Graph API** - For accessing SharePoint, Teams, OneDrive, and Outlook data
- **Custom Tools** - Type-safe tool definitions that Copilot can invoke
- **Custom Agents** - Specialized AI personas for different use cases

## Features

### Current (MVP)

- ✅ Interactive CLI interface
- ✅ SharePoint document search
- ✅ SharePoint site listing
- ✅ Teams listing and channel browsing
- ✅ Teams message retrieval
- ✅ Session management with streaming responses
- ✅ Custom agents (Knowledge, IT Helpdesk, HR)

### Planned

- [ ] REST API endpoints
- [ ] OneDrive file search
- [ ] Outlook email integration
- [ ] Web UI
- [ ] Teams Bot integration

## Prerequisites

1. **GitHub Copilot CLI** - Must be installed and authenticated
   ```bash
   # Verify installation
   copilot --version
   ```

2. **Node.js 20+** - Required runtime

3. **Azure AD App Registration** - Required for Microsoft Graph access
   - Create an app registration in Azure Portal
   - Grant the following application permissions:
     - `Sites.Read.All` (SharePoint)
     - `Files.Read.All` (OneDrive)
     - `ChannelMessage.Read.All` (Teams)
     - `Mail.Read` (Outlook)
   - Create a client secret

## Setup

1. **Clone and install dependencies:**
   ```bash
   cd demo/backend
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and fill in your Azure AD credentials:
   ```
   AZURE_TENANT_ID=your-tenant-id
   AZURE_CLIENT_ID=your-client-id
   AZURE_CLIENT_SECRET=your-client-secret
   ```

3. **Start the application:**
   ```bash
   npm run dev
   ```

## Usage

### CLI Mode

The application starts in interactive CLI mode. Type your questions naturally:

```
You: Find documents about quarterly reports
Assistant: 🔧 Using: search_sharepoint... ✓
Found 5 document(s) matching "quarterly reports":

📄 **Q4 2025 Report.docx**
   URL: https://contoso.sharepoint.com/...
   Preview: This quarterly report covers...
   Modified by: John Smith
   Last modified: 1/15/2026
```

### Available Commands

| Command | Description |
|---------|-------------|
| `/new` | Start a new conversation |
| `/agents` | List available AI agents |
| `/status` | Show session information |
| `/help` | Show help |
| `/exit` | Exit the application |

### Example Queries

- "Find documents about the new employee handbook"
- "What SharePoint sites are available?"
- "Show me the channels in the Engineering team"
- "Get recent messages from the General channel in Marketing"

## Architecture

```
backend/
├── src/
│   ├── config/          # Configuration management
│   ├── core/            # Copilot SDK integration
│   │   ├── copilot-client.ts   # SDK client wrapper
│   │   ├── session-manager.ts  # Session lifecycle
│   │   ├── tool-registry.ts    # Tool registration
│   │   └── agent-config.ts     # Custom agents
│   ├── services/        # External integrations
│   │   └── graph/       # Microsoft Graph services
│   ├── tools/           # Copilot tool definitions
│   ├── utils/           # Shared utilities
│   ├── cli.ts           # CLI interface
│   └── index.ts         # Entry point
```

## Custom Agents

The application includes three pre-configured agents:

### @m365-knowledge (Default)
General-purpose assistant for finding information across M365.

### @it-helpdesk
Specialized for IT support questions, searches IT documentation.

### @hr-assistant
Answers HR policy questions, finds HR documents and forms.

## Adding Custom Tools

1. Create a new tool file in `src/tools/`:
   ```typescript
   import { defineTool } from '../core/tool-registry.js';

   export const myTool = defineTool<{ param: string }>('my_tool', {
     description: 'What this tool does',
     parameters: {
       type: 'object',
       properties: {
         param: { type: 'string', description: 'Parameter description' }
       },
       required: ['param']
     },
     handler: async (params) => {
       // Implementation
       return {
         textResultForLlm: 'Result for the AI',
         resultType: 'success',
         sessionLog: 'Log message',
         toolTelemetry: {}
       };
     }
   });
   ```

2. Register the tool in `src/tools/index.ts`:
   ```typescript
   import { myTool } from './my-tool.js';

   export function initializeTools(): void {
     registerTool(myTool);
   }
   ```

## Development

### Scripts

```bash
npm run dev          # Start with hot reload
npm run build        # Build for production
npm run start        # Run production build
npm run test         # Run tests
npm run lint         # Lint code
npm run typecheck    # Type check
```

### Project Structure

See [ARCHITECTURE.md](../ARCHITECTURE.md) for detailed architecture documentation.

## Troubleshooting

### "Failed to connect to Copilot CLI"

1. Verify Copilot CLI is installed: `copilot --version`
2. Authenticate the CLI: `copilot auth login`
3. Check if running in server mode elsewhere

### "Graph API request failed"

1. Verify Azure AD credentials in `.env`
2. Check that app has required permissions
3. Ensure admin consent is granted for application permissions

### "No results found"

1. Try broader search terms
2. Verify you have access to the content
3. Check Graph API permissions

## License

MIT
