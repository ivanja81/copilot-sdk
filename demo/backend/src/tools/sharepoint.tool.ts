/**
 * SharePoint Search Tool
 *
 * Copilot tool for searching SharePoint documents and sites.
 * Wraps the SharePoint service for use by the AI agent.
 *
 * @module tools/sharepoint
 */

import { defineTool } from '../core/tool-registry.js';
import {
    listSites,
    searchDocuments,
    type SharePointDocument,
    type SharePointSite,
} from '../services/graph/index.js';
import { createLogger } from '../utils/index.js';

const logger = createLogger({ module: 'SharePointTool' });

/**
 * Parameters for the search_sharepoint tool
 */
interface SearchSharePointParams {
  /** Search query (supports natural language) */
  query: string;
  /** Maximum results to return */
  limit?: number;
  /** Specific site name to search within */
  siteName?: string;
  /** File types to filter (e.g., 'docx', 'pdf', 'xlsx') */
  fileTypes?: string[];
}

/**
 * Formats a document for LLM consumption
 */
function formatDocument(doc: SharePointDocument): string {
  const parts = [
    `📄 **${doc.name}**`,
    `   URL: ${doc.webUrl}`,
  ];

  if (doc.summary) {
    parts.push(`   Preview: ${doc.summary}`);
  }

  if (doc.lastModifiedBy?.user?.displayName) {
    parts.push(`   Modified by: ${doc.lastModifiedBy.user.displayName}`);
  }

  if (doc.lastModifiedDateTime) {
    const date = new Date(doc.lastModifiedDateTime).toLocaleDateString();
    parts.push(`   Last modified: ${date}`);
  }

  return parts.join('\n');
}

/**
 * Formats a site for LLM consumption
 */
function formatSite(site: SharePointSite): string {
  return `📁 **${site.displayName}** (${site.name})\n   URL: ${site.webUrl}${site.description ? `\n   ${site.description}` : ''}`;
}

/**
 * SharePoint document search tool
 *
 * Allows Copilot to search for documents across SharePoint sites.
 */
export const searchSharePointTool = defineTool<SearchSharePointParams>(
  'search_sharepoint',
  {
    description: `Search SharePoint for documents and files. Use this tool to find:
- Documents by content or title
- Files in specific SharePoint sites
- Documents by file type (docx, pdf, xlsx, pptx, etc.)

Returns document names, URLs, content previews, and metadata.`,

    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query - can be keywords, phrases, or natural language',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 10, max: 25)',
        },
        siteName: {
          type: 'string',
          description: 'Optional: Name of specific SharePoint site to search within',
        },
        fileTypes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional: Filter by file types (e.g., ["docx", "pdf"])',
        },
      },
      required: ['query'],
    },

    handler: async (params) => {
      const { query, limit = 10, siteName, fileTypes } = params;

      logger.info({ query, limit, siteName, fileTypes }, 'Executing SharePoint search');

      try {
        // If site name provided, find the site first
        let siteId: string | undefined;

        if (siteName) {
          const sites = await listSites(siteName);
          if (sites.length > 0 && sites[0]) {
            siteId = sites[0].id;
          } else {
            return {
              textResultForLlm: `No SharePoint site found matching "${siteName}". Try searching without a site filter or check the site name.`,
              resultType: 'failure',
              sessionLog: `SharePoint search: site "${siteName}" not found`,
              toolTelemetry: { query, siteName, siteFound: false },
            };
          }
        }

        // Perform the search
        const documents = await searchDocuments({
          query,
          limit: Math.min(limit, 25),
          siteId,
          fileTypes,
        });

        if (documents.length === 0) {
          return {
            textResultForLlm: `No documents found matching "${query}"${siteName ? ` in site "${siteName}"` : ''}${fileTypes?.length ? ` with file types: ${fileTypes.join(', ')}` : ''}.\n\nSuggestions:\n- Try different keywords\n- Remove file type filters\n- Search across all sites`,
            resultType: 'success',
            sessionLog: `SharePoint search: 0 results for "${query}"`,
            toolTelemetry: { query, resultCount: 0 },
          };
        }

        const formattedResults = documents.map(formatDocument).join('\n\n');
        const resultText = `Found ${documents.length} document(s) matching "${query}":\n\n${formattedResults}`;

        return {
          textResultForLlm: resultText,
          resultType: 'success',
          sessionLog: `SharePoint search: ${documents.length} results for "${query}"`,
          toolTelemetry: { query, resultCount: documents.length },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ err: error, query }, 'SharePoint search failed');

        return {
          textResultForLlm: `SharePoint search failed: ${message}`,
          resultType: 'failure',
          error: message,
          sessionLog: `SharePoint search error: ${message}`,
          toolTelemetry: { query, error: message },
        };
      }
    },
  }
);

/**
 * Parameters for list_sharepoint_sites tool
 */
interface ListSitesParams {
  /** Optional search query to filter sites */
  searchQuery?: string;
}

/**
 * SharePoint site listing tool
 *
 * Allows Copilot to list available SharePoint sites.
 */
export const listSharePointSitesTool = defineTool<ListSitesParams>(
  'list_sharepoint_sites',
  {
    description: `List available SharePoint sites. Use this tool to:
- Discover what SharePoint sites are available
- Find a site by name before searching within it
- Get site URLs for direct access`,

    parameters: {
      type: 'object',
      properties: {
        searchQuery: {
          type: 'string',
          description: 'Optional: Filter sites by name',
        },
      },
    },

    handler: async (params) => {
      const { searchQuery } = params;

      logger.info({ searchQuery }, 'Listing SharePoint sites');

      try {
        const sites = await listSites(searchQuery);

        if (sites.length === 0) {
          return {
            textResultForLlm: searchQuery
              ? `No SharePoint sites found matching "${searchQuery}".`
              : 'No SharePoint sites found or accessible.',
            resultType: 'success',
            sessionLog: 'SharePoint sites: 0 found',
            toolTelemetry: { searchQuery, siteCount: 0 },
          };
        }

        const formattedSites = sites.map(formatSite).join('\n\n');
        const resultText = `Found ${sites.length} SharePoint site(s):\n\n${formattedSites}`;

        return {
          textResultForLlm: resultText,
          resultType: 'success',
          sessionLog: `SharePoint sites: ${sites.length} found`,
          toolTelemetry: { searchQuery, siteCount: sites.length },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.error({ err: error }, 'Failed to list SharePoint sites');

        return {
          textResultForLlm: `Failed to list SharePoint sites: ${message}`,
          resultType: 'failure',
          error: message,
          sessionLog: `SharePoint sites error: ${message}`,
          toolTelemetry: { error: message },
        };
      }
    },
  }
);
