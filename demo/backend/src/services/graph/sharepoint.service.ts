/**
 * SharePoint Service
 *
 * Provides methods for interacting with SharePoint via Microsoft Graph API.
 * Handles site discovery, document search, and list operations.
 *
 * @module services/graph/sharepoint
 */

import { createLogger } from '../../utils/index.js';
import { graphGet, graphPost } from './graph-client.js';

const logger = createLogger({ module: 'SharePointService' });

/**
 * SharePoint site information
 */
export interface SharePointSite {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

/**
 * SharePoint document/file information
 */
export interface SharePointDocument {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: string;
  createdDateTime: string;
  createdBy?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  lastModifiedBy?: {
    user?: {
      displayName: string;
      email?: string;
    };
  };
  parentReference?: {
    path?: string;
    siteId?: string;
  };
  /** Content snippet from search */
  summary?: string;
}

/**
 * Search result from Graph Search API
 */
interface GraphSearchResult {
  value: Array<{
    hitsContainers: Array<{
      hits: Array<{
        hitId: string;
        summary?: string;
        resource: {
          id: string;
          name: string;
          webUrl: string;
          size?: number;
          lastModifiedDateTime?: string;
          createdDateTime?: string;
          createdBy?: {
            user?: { displayName: string; email?: string };
          };
          lastModifiedBy?: {
            user?: { displayName: string; email?: string };
          };
          parentReference?: {
            path?: string;
            siteId?: string;
          };
        };
      }>;
      total: number;
      moreResultsAvailable: boolean;
    }>;
  }>;
}

/**
 * Search options for SharePoint documents
 */
export interface SearchDocumentsOptions {
  /** Search query (supports KQL) */
  query: string;
  /** Maximum results to return */
  limit?: number;
  /** Specific site ID to search within */
  siteId?: string;
  /** File types to filter (e.g., 'docx', 'pdf') */
  fileTypes?: string[];
}

/**
 * Lists accessible SharePoint sites
 *
 * @param searchQuery - Optional search query to filter sites
 * @returns Array of SharePoint sites
 */
export async function listSites(searchQuery?: string): Promise<SharePointSite[]> {
  logger.debug({ searchQuery }, 'Listing SharePoint sites');

  try {
    let endpoint = '/sites';
    const params: Record<string, string> = {
      $select: 'id,name,displayName,webUrl,description',
      $top: '50',
    };

    if (searchQuery) {
      endpoint = `/sites?search=${encodeURIComponent(searchQuery)}`;
    }

    const response = await graphGet<{ value: SharePointSite[] }>(endpoint, params);

    logger.info({ count: response.value.length }, 'Retrieved SharePoint sites');

    return response.value;
  } catch (error) {
    logger.error({ err: error, searchQuery }, 'Failed to list SharePoint sites');
    throw error;
  }
}

/**
 * Gets a specific SharePoint site by ID
 *
 * @param siteId - Site identifier
 * @returns Site information
 */
export async function getSite(siteId: string): Promise<SharePointSite> {
  logger.debug({ siteId }, 'Getting SharePoint site');

  const response = await graphGet<SharePointSite>(`/sites/${siteId}`, {
    $select: 'id,name,displayName,webUrl,description',
  });

  return response;
}

/**
 * Searches SharePoint for documents matching the query
 *
 * Uses Microsoft Graph Search API for content-based search across
 * all accessible SharePoint sites and document libraries.
 *
 * @param options - Search options
 * @returns Array of matching documents with content snippets
 */
export async function searchDocuments(
  options: SearchDocumentsOptions
): Promise<SharePointDocument[]> {
  const { query, limit = 10, siteId, fileTypes } = options;

  logger.debug({ query, limit, siteId, fileTypes }, 'Searching SharePoint documents');

  // Build KQL query
  let kqlQuery = query;

  if (siteId) {
    kqlQuery += ` AND site:${siteId}`;
  }

  if (fileTypes && fileTypes.length > 0) {
    const typeFilter = fileTypes.map((t) => `filetype:${t}`).join(' OR ');
    kqlQuery += ` AND (${typeFilter})`;
  }

  const searchRequest = {
    requests: [
      {
        entityTypes: ['driveItem'],
        query: {
          queryString: kqlQuery,
        },
        from: 0,
        size: limit,
        fields: [
          'id',
          'name',
          'webUrl',
          'size',
          'lastModifiedDateTime',
          'createdDateTime',
          'createdBy',
          'lastModifiedBy',
          'parentReference',
        ],
      },
    ],
  };

  try {
    const response = await graphPost<GraphSearchResult>('/search/query', searchRequest);

    const documents: SharePointDocument[] = [];

    for (const result of response.value) {
      for (const container of result.hitsContainers) {
        for (const hit of container.hits) {
          documents.push({
            id: hit.resource.id,
            name: hit.resource.name,
            webUrl: hit.resource.webUrl,
            size: hit.resource.size ?? 0,
            lastModifiedDateTime: hit.resource.lastModifiedDateTime ?? '',
            createdDateTime: hit.resource.createdDateTime ?? '',
            createdBy: hit.resource.createdBy,
            lastModifiedBy: hit.resource.lastModifiedBy,
            parentReference: hit.resource.parentReference,
            summary: hit.summary,
          });
        }
      }
    }

    logger.info({ query, resultCount: documents.length }, 'SharePoint search completed');

    return documents;
  } catch (error) {
    logger.error({ err: error, query }, 'SharePoint search failed');
    throw error;
  }
}

/**
 * Gets recent documents from a SharePoint site
 *
 * @param siteId - Site identifier
 * @param limit - Maximum results
 * @returns Recent documents
 */
export async function getRecentDocuments(
  siteId: string,
  limit: number = 10
): Promise<SharePointDocument[]> {
  logger.debug({ siteId, limit }, 'Getting recent documents');

  try {
    // Get the default document library
    const drivesResponse = await graphGet<{ value: Array<{ id: string }> }>(
      `/sites/${siteId}/drives`,
      { $select: 'id', $top: '1' }
    );

    if (!drivesResponse.value.length) {
      return [];
    }

    const driveId = drivesResponse.value[0]?.id;
    if (!driveId) {
      return [];
    }

    // Get recent items
    const itemsResponse = await graphGet<{ value: SharePointDocument[] }>(
      `/drives/${driveId}/root/children`,
      {
        $select: 'id,name,webUrl,size,lastModifiedDateTime,createdDateTime,createdBy,lastModifiedBy',
        $top: String(limit),
        $orderby: 'lastModifiedDateTime desc',
      }
    );

    return itemsResponse.value;
  } catch (error) {
    logger.error({ err: error, siteId }, 'Failed to get recent documents');
    throw error;
  }
}
