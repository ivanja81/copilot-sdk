# M365 Knowledge Assistant - Architecture

## Overview

An AI-powered knowledge assistant that helps employees find information across Microsoft 365 services (SharePoint, Teams, OneDrive, Outlook) using the GitHub Copilot SDK.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                       │
│  │  Teams Bot   │  │   Web UI     │  │   CLI Tool   │                       │
│  │  (Future)    │  │  (React)     │  │  (Current)   │                       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                       │
│         │                 │                 │                                │
│         └─────────────────┼─────────────────┘                                │
│                           ▼                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                              API LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Express.js REST API                              │    │
│  │  /api/chat      - Send messages, stream responses                    │    │
│  │  /api/sessions  - Manage conversation sessions                       │    │
│  │  /api/health    - Health checks and monitoring                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                           │                                                  │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                      CORE LAYER                                              │
├───────────────────────────┼─────────────────────────────────────────────────┤
│                           ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Copilot SDK Client                                 │    │
│  │  • Session Management                                                │    │
│  │  • Tool Registration                                                 │    │
│  │  • Event Streaming                                                   │    │
│  │  • Custom Agents                                                     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                           │                                                  │
│         ┌─────────────────┼─────────────────┐                               │
│         ▼                 ▼                 ▼                               │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐                          │
│  │  M365      │   │  GitHub    │   │  Custom    │                          │
│  │  Tools     │   │  MCP       │   │  Skills    │                          │
│  └────────────┘   └────────────┘   └────────────┘                          │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                         INTEGRATION LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│  │ SharePoint │   │   Teams    │   │  OneDrive  │   │  Outlook   │         │
│  │  Service   │   │  Service   │   │  Service   │   │  Service   │         │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘         │
│        │                │                │                │                  │
│        └────────────────┴────────────────┴────────────────┘                  │
│                                  │                                           │
│                                  ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    Microsoft Graph Client                            │    │
│  │  • Authentication (MSAL)                                             │    │
│  │  • Token Management                                                  │    │
│  │  • API Abstraction                                                   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
demo/
├── ARCHITECTURE.md          # This file
├── TECH_STACK.md           # Technology decisions
├── PROJECT.md              # Current tasks and roadmap
├── STANDARDS.md            # Coding standards
│
├── backend/
│   ├── src/
│   │   ├── api/                    # Express routes and controllers
│   │   │   ├── routes/
│   │   │   │   ├── chat.routes.ts
│   │   │   │   ├── session.routes.ts
│   │   │   │   └── health.routes.ts
│   │   │   ├── controllers/
│   │   │   │   ├── chat.controller.ts
│   │   │   │   ├── session.controller.ts
│   │   │   │   └── health.controller.ts
│   │   │   └── middleware/
│   │   │       ├── auth.middleware.ts
│   │   │       ├── error.middleware.ts
│   │   │       └── validation.middleware.ts
│   │   │
│   │   ├── core/                   # Copilot SDK integration
│   │   │   ├── copilot-client.ts   # SDK client wrapper
│   │   │   ├── session-manager.ts  # Session lifecycle
│   │   │   ├── tool-registry.ts    # Tool registration
│   │   │   └── agent-config.ts     # Custom agent definitions
│   │   │
│   │   ├── tools/                  # Custom Copilot tools
│   │   │   ├── index.ts            # Tool exports
│   │   │   ├── sharepoint.tool.ts
│   │   │   ├── teams.tool.ts
│   │   │   ├── onedrive.tool.ts
│   │   │   └── outlook.tool.ts
│   │   │
│   │   ├── services/               # Business logic & integrations
│   │   │   ├── graph/
│   │   │   │   ├── graph-client.ts
│   │   │   │   ├── sharepoint.service.ts
│   │   │   │   ├── teams.service.ts
│   │   │   │   ├── onedrive.service.ts
│   │   │   │   └── outlook.service.ts
│   │   │   └── auth/
│   │   │       ├── msal-client.ts
│   │   │       └── token-cache.ts
│   │   │
│   │   ├── config/                 # Configuration
│   │   │   ├── index.ts
│   │   │   ├── copilot.config.ts
│   │   │   └── graph.config.ts
│   │   │
│   │   ├── utils/                  # Shared utilities
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   └── validators.ts
│   │   │
│   │   └── index.ts                # Application entry point
│   │
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── common/                         # Shared types and constants
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── session.types.ts
│   │   ├── tool.types.ts
│   │   └── m365.types.ts
│   └── constants/
│       └── index.ts
│
├── skills/                         # Copilot SDK skills
│   └── enterprise-knowledge/
│       └── SKILL.md
│
├── scripts/                        # Build and deployment scripts
│   ├── setup.sh
│   └── deploy.sh
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── .env.example
├── docker-compose.yml
└── README.md
```

## Data Flow

### 1. User Query Flow
```
User Input → API Layer → Core Layer → Tool Execution → Graph API → Response
```

### 2. Session Management
```
Create Session → Register Tools → Configure Agent → Process Messages → Persist State
```

### 3. Tool Invocation
```
Copilot Decision → Tool Registry → Service Layer → Graph Client → External API
```

## Key Components

### 1. Copilot Client Wrapper (`/backend/src/core/copilot-client.ts`)
- Manages SDK lifecycle (start/stop)
- Handles connection to Copilot CLI
- Provides singleton access

### 2. Session Manager (`/backend/src/core/session-manager.ts`)
- Creates and resumes sessions
- Manages session persistence
- Handles multi-user scenarios

### 3. Tool Registry (`/backend/src/core/tool-registry.ts`)
- Registers M365 tools with Copilot
- Manages tool handlers
- Provides type-safe tool definitions

### 4. M365 Services (`/backend/src/services/graph/`)
- Abstracts Microsoft Graph API
- Handles authentication via MSAL
- Provides typed responses

## Security Boundaries

1. **Authentication**: MSAL for M365, JWT for API
2. **Authorization**: Graph permissions, role-based access
3. **Data Flow**: All M365 data through Graph API only
4. **Secrets**: Environment variables, never hardcoded

## Extension Points

1. Add new tools in `/backend/src/tools/`
2. Add new services in `/backend/src/services/`
3. Add new skills in `/skills/`
4. Add new agents in `/backend/src/core/agent-config.ts`
