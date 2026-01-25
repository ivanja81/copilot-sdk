# M365 Knowledge Assistant - Coding Standards

## General Principles

1. **Type Safety First**: Every function must be fully typed. No `any` unless absolutely necessary (document why).
2. **Single Responsibility**: Functions do one thing well. Keep them small (<50 lines).
3. **Explicit over Implicit**: Prefer explicit returns, imports, and error handling.
4. **Document Intent**: Comments explain WHY, not WHAT. Code explains WHAT.
5. **Fail Fast**: Validate inputs early, throw meaningful errors.

---

## Naming Conventions

### Files
```
kebab-case.ts           # All TypeScript files
kebab-case.test.ts      # Test files
kebab-case.types.ts     # Type definition files
SCREAMING_CASE.md       # Documentation files
```

### Code
```typescript
// Variables and functions: camelCase
const userId = 'abc123';
function getUserById(id: string): Promise<User> {}

// Classes and types: PascalCase
class SessionManager {}
interface UserProfile {}
type ToolResult = string | object;

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = '/api/v1';

// Private members: prefix with underscore
private _cache: Map<string, Session>;

// Booleans: prefix with is/has/can/should
const isAuthenticated = true;
const hasPermission = false;
const canEdit = true;
```

### Directories
```
kebab-case/             # All directories
```

---

## TypeScript Standards

### Type Definitions

```typescript
// ✅ DO: Use explicit types
function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ DON'T: Implicit any
function getUser(id) {
  // ...
}

// ✅ DO: Use interfaces for objects
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
}

// ✅ DO: Use type for unions/aliases
type ToolResult = SuccessResult | ErrorResult;
type UserId = string;

// ✅ DO: Use readonly for immutable data
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}
```

### Function Signatures

```typescript
// ✅ DO: Named parameters for complex functions
interface SearchOptions {
  query: string;
  siteId?: string;
  limit?: number;
  includeContent?: boolean;
}

async function searchSharePoint(options: SearchOptions): Promise<SearchResult[]> {
  const { query, siteId, limit = 10, includeContent = false } = options;
  // ...
}

// ❌ DON'T: Many positional parameters
async function searchSharePoint(
  query: string,
  siteId: string,
  limit: number,
  includeContent: boolean
) {}
```

### Error Handling

```typescript
// ✅ DO: Custom error classes
export class GraphApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
}

// ✅ DO: Type-safe error handling
try {
  const result = await graphClient.get('/users');
  return result;
} catch (error) {
  if (error instanceof GraphApiError) {
    logger.error({ err: error, endpoint: error.endpoint }, 'Graph API failed');
    throw error;
  }
  throw new GraphApiError('Unknown error', 500, '/users');
}

// ❌ DON'T: Silent catch or generic errors
try {
  await doSomething();
} catch (e) {
  console.log(e); // Bad: loses type info, uses console
}
```

---

## Code Organization

### File Structure

```typescript
// 1. Imports (external, then internal, then types)
import express from 'express';
import { z } from 'zod';

import { logger } from '../utils/logger.js';
import { GraphClient } from '../services/graph/graph-client.js';

import type { SearchResult } from '../../common/types/m365.types.js';

// 2. Constants
const MAX_RESULTS = 50;
const DEFAULT_TIMEOUT = 5000;

// 3. Types/Interfaces (if not in separate file)
interface ServiceOptions {
  timeout?: number;
}

// 4. Main exports (classes, functions)
export class SharePointService {
  // ...
}

// 5. Helper functions (private to module)
function formatSearchQuery(query: string): string {
  // ...
}
```

### Module Exports

```typescript
// ✅ DO: Named exports
export { SharePointService } from './sharepoint.service.js';
export { TeamsService } from './teams.service.js';

// ✅ DO: Barrel exports in index.ts
// services/graph/index.ts
export * from './graph-client.js';
export * from './sharepoint.service.js';
export * from './teams.service.js';

// ❌ DON'T: Default exports (except for configs)
export default class SharePointService {} // Avoid
```

---

## Documentation Standards

### File Headers

```typescript
/**
 * SharePoint Service
 *
 * Provides methods for interacting with SharePoint via Microsoft Graph API.
 * Handles site discovery, document search, and list operations.
 *
 * @module services/graph/sharepoint
 */
```

### Function Documentation

```typescript
/**
 * Searches SharePoint sites for documents matching the query.
 *
 * Uses Microsoft Graph Search API to find documents across all accessible
 * SharePoint sites. Results include file metadata and content snippets.
 *
 * @param options - Search configuration
 * @param options.query - Search query string (KQL supported)
 * @param options.siteId - Optional site ID to limit search scope
 * @param options.limit - Maximum results to return (default: 10, max: 50)
 *
 * @returns Array of search results with file metadata
 *
 * @throws {GraphApiError} When Graph API request fails
 * @throws {AuthenticationError} When token is invalid or expired
 *
 * @example
 * ```typescript
 * const results = await sharePointService.searchDocuments({
 *   query: 'quarterly report',
 *   limit: 5
 * });
 * ```
 */
async function searchDocuments(options: SearchOptions): Promise<SearchResult[]> {
  // ...
}
```

### Inline Comments

```typescript
// ✅ DO: Explain WHY
// Graph API requires $select to limit response size and improve performance
const response = await client.get('/sites', {
  params: { $select: 'id,name,webUrl' }
});

// ❌ DON'T: Explain WHAT (code is self-documenting)
// Get sites from Graph API
const response = await client.get('/sites');
```

---

## Testing Standards

### Test File Structure

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SharePointService } from './sharepoint.service.js';

describe('SharePointService', () => {
  let service: SharePointService;

  beforeEach(() => {
    service = new SharePointService(mockGraphClient);
  });

  describe('searchDocuments', () => {
    it('should return documents matching query', async () => {
      // Arrange
      const query = 'quarterly report';
      mockGraphClient.search.mockResolvedValue(mockResults);

      // Act
      const results = await service.searchDocuments({ query });

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Q4 Report.docx');
    });

    it('should throw GraphApiError when API fails', async () => {
      // Arrange
      mockGraphClient.search.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.searchDocuments({ query: 'test' }))
        .rejects.toThrow(GraphApiError);
    });
  });
});
```

### Test Naming

```typescript
// Pattern: should [expected behavior] when [condition]
it('should return empty array when no documents match', async () => {});
it('should throw AuthError when token is expired', async () => {});
it('should paginate results when limit exceeds page size', async () => {});
```

---

## Logging Standards

```typescript
import { logger } from '../utils/logger.js';

// ✅ DO: Structured logging with context
logger.info({ userId, sessionId, action: 'search' }, 'User initiated search');

logger.error(
  { err: error, endpoint: '/sites', userId },
  'Graph API request failed'
);

// ❌ DON'T: String concatenation or console
console.log('User ' + userId + ' searched'); // Bad
logger.info(`User ${userId} searched`); // Less good - no structure
```

### Log Levels

| Level | Use Case |
|-------|----------|
| `error` | Errors requiring attention |
| `warn` | Recoverable issues, deprecations |
| `info` | Business events, state changes |
| `debug` | Detailed flow, troubleshooting |
| `trace` | Very verbose, development only |

---

## Security Standards

### Input Validation

```typescript
import { z } from 'zod';

// ✅ DO: Validate all external inputs
const SearchQuerySchema = z.object({
  query: z.string().min(1).max(500),
  siteId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

export function validateSearchQuery(input: unknown) {
  return SearchQuerySchema.parse(input);
}
```

### Secrets Management

```typescript
// ✅ DO: Environment variables
const config = {
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
};

// ❌ DON'T: Hardcoded secrets
const config = {
  clientId: 'abc123', // NEVER DO THIS
  clientSecret: 'secret', // NEVER DO THIS
};
```

### Sensitive Data in Logs

```typescript
// ✅ DO: Redact sensitive data
logger.info({ userId, email: '[REDACTED]' }, 'User authenticated');

// ❌ DON'T: Log sensitive data
logger.info({ userId, email, accessToken }, 'User authenticated');
```

---

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding tests |
| `chore` | Maintenance tasks |

### Examples

```
feat(tools): add SharePoint search tool

Implements search_sharepoint tool that queries Microsoft Graph
Search API. Supports KQL queries and site-scoped searches.

Closes #123
```

```
fix(auth): handle token refresh on 401 response

Previously, expired tokens would cause unhandled errors.
Now the MSAL client automatically refreshes tokens.
```
