/**
 * Shared type definitions for the DevScout MCP server.
 */

/**
 * A single search result extracted from a web search engine or API.
 */
export interface SearchReference {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

/**
 * Aggregated search results from the retrieval pipeline.
 */
export interface SearchResult {
  authoritative: SearchReference[];
  pitfalls: SearchReference[];
}

/**
 * Configuration passed to the brief formatter.
 */
export interface BriefConfig {
  topic: string;
  stack?: string;
  searchDepth: "quick" | "deep";
}

/**
 * GitHub repository metadata extracted from the REST API.
 */
export interface GitHubRepository {
  fullName: string;
  htmlUrl: string;
  stars: number;
  description: string;
}

/**
 * Rate limit tracking state for external APIs.
 */
export interface RateLimitState {
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
}
