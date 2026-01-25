/**
 * M365 Types
 *
 * Shared type definitions for Microsoft 365 resources.
 *
 * @module common/types/m365
 */

/**
 * SharePoint site information
 */
export interface M365Site {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
  description?: string;
}

/**
 * SharePoint document information
 */
export interface M365Document {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  mimeType?: string;
  lastModified: string;
  modifiedBy?: string;
  location?: string;
  summary?: string;
}

/**
 * Teams team information
 */
export interface M365Team {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
}

/**
 * Teams channel information
 */
export interface M365Channel {
  id: string;
  displayName: string;
  description?: string;
  webUrl?: string;
  isPrivate: boolean;
}

/**
 * Teams message information
 */
export interface M365Message {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  webUrl?: string;
}

/**
 * Search result from any M365 source
 */
export interface M365SearchResult {
  source: 'sharepoint' | 'teams' | 'onedrive' | 'outlook';
  id: string;
  title: string;
  url: string;
  snippet?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}
