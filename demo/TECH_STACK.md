# M365 Knowledge Assistant - Technology Stack

## Core Technologies

### Runtime & Language
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20 LTS | Runtime environment |
| TypeScript | 5.x | Type-safe development |

### AI & Agent Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| @github/copilot-sdk | latest | Copilot CLI SDK for agent capabilities |
| Copilot CLI | latest | Agent runtime (external dependency) |

### Backend Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.x | HTTP server and routing |
| express-validator | 7.x | Input validation |
| helmet | 7.x | Security headers |
| cors | 2.x | CORS handling |
| compression | 1.x | Response compression |

### Microsoft 365 Integration
| Technology | Version | Purpose |
|------------|---------|---------|
| @microsoft/microsoft-graph-client | 3.x | Graph API client |
| @azure/msal-node | 2.x | Authentication |
| @azure/identity | 4.x | Azure credential management |

### Data & Validation
| Technology | Version | Purpose |
|------------|---------|---------|
| zod | 3.x | Schema validation and type inference |
| date-fns | 3.x | Date manipulation |

### Logging & Monitoring
| Technology | Version | Purpose |
|------------|---------|---------|
| pino | 9.x | Structured logging |
| pino-pretty | 11.x | Dev-friendly log output |

### Testing
| Technology | Version | Purpose |
|------------|---------|---------|
| vitest | 2.x | Unit and integration testing |
| supertest | 7.x | HTTP assertion testing |
| msw | 2.x | API mocking |

### Development Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| tsx | 4.x | TypeScript execution |
| eslint | 9.x | Code linting |
| prettier | 3.x | Code formatting |
| husky | 9.x | Git hooks |

### Infrastructure
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | 24.x | Containerization |
| docker-compose | 2.x | Local orchestration |

---

## Package Dependencies

### Production Dependencies
```json
{
  "@github/copilot-sdk": "latest",
  "@microsoft/microsoft-graph-client": "^3.0.0",
  "@azure/msal-node": "^2.0.0",
  "@azure/identity": "^4.0.0",
  "express": "^4.18.0",
  "express-validator": "^7.0.0",
  "helmet": "^7.0.0",
  "cors": "^2.8.0",
  "compression": "^1.7.0",
  "zod": "^3.22.0",
  "pino": "^9.0.0",
  "pino-http": "^10.0.0",
  "date-fns": "^3.0.0",
  "dotenv": "^16.0.0",
  "uuid": "^9.0.0"
}
```

### Development Dependencies
```json
{
  "typescript": "^5.3.0",
  "tsx": "^4.7.0",
  "@types/node": "^20.0.0",
  "@types/express": "^4.17.0",
  "@types/cors": "^2.8.0",
  "@types/compression": "^1.7.0",
  "@types/uuid": "^9.0.0",
  "vitest": "^2.0.0",
  "supertest": "^7.0.0",
  "@types/supertest": "^6.0.0",
  "msw": "^2.0.0",
  "eslint": "^9.0.0",
  "prettier": "^3.0.0",
  "pino-pretty": "^11.0.0"
}
```

---

## Environment Requirements

### Required External Services
1. **GitHub Copilot CLI** - Must be installed and authenticated
2. **Microsoft Entra ID App Registration** - For Graph API access
3. **Microsoft 365 Tenant** - Target environment

### Required Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug

# Copilot SDK
COPILOT_CLI_PATH=copilot

# Microsoft Graph
AZURE_TENANT_ID=<your-tenant-id>
AZURE_CLIENT_ID=<your-client-id>
AZURE_CLIENT_SECRET=<your-client-secret>

# Optional: Specific user context
GRAPH_USER_ID=<user-id-for-delegated-access>
```

### Microsoft Graph Permissions Required
```
# Application Permissions (for daemon/service scenarios)
Sites.Read.All          # SharePoint site access
Files.Read.All          # OneDrive file access
ChannelMessage.Read.All # Teams message access
Mail.Read               # Outlook mail access

# Delegated Permissions (for user context scenarios)
Sites.Read.All
Files.Read.All
ChannelMessage.Read.All
Mail.Read
User.Read
```

---

## Architecture Decisions

### ADR-001: GitHub Copilot SDK over Custom LLM Integration
**Decision**: Use GitHub Copilot SDK instead of direct OpenAI/Azure OpenAI integration

**Rationale**:
- Production-tested agent runtime
- Built-in tool orchestration
- Session management included
- MCP server support for GitHub integration
- Consistent with Copilot ecosystem

### ADR-002: Express.js over Fastify/Hono
**Decision**: Use Express.js for HTTP layer

**Rationale**:
- Mature ecosystem
- Extensive middleware support
- Team familiarity
- Sufficient performance for this use case

### ADR-003: Zod for Runtime Validation
**Decision**: Use Zod for schema validation and type inference

**Rationale**:
- Runtime type safety
- TypeScript integration
- Works with Copilot SDK tool parameters
- JSON Schema generation

### ADR-004: Pino for Logging
**Decision**: Use Pino for structured logging

**Rationale**:
- High performance
- Structured JSON output
- Easy integration with observability platforms
- Dev-friendly pretty printing

---

## Version Compatibility Matrix

| Node.js | TypeScript | Copilot SDK | Graph Client |
|---------|------------|-------------|--------------|
| 20.x    | 5.3+       | latest      | 3.x          |
| 22.x    | 5.4+       | latest      | 3.x          |

---

## Security Considerations

1. **Authentication**
   - MSAL for Azure AD/Entra ID authentication
   - JWT tokens for API authentication (future)
   - Token caching with secure storage

2. **Data Protection**
   - TLS 1.3 for all communications
   - No PII in logs
   - Secrets in environment variables only

3. **Input Validation**
   - Zod schemas for all inputs
   - express-validator for HTTP layer
   - Sanitization before Graph queries
