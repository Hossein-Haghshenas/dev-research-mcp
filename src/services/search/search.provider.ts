/**
 * Abstract SearchProvider interface.
 *
 * Implements the Chain of Responsibility pattern for search engine abstraction.
 * This allows the system to:
 * 1. Default to DuckDuckGo HTML (zero-config, no API key)
 * 2. Auto-upgrade to Brave/Tavily when API keys are detected in env
 * 3. Swap search backends without touching tool handler code
 *
 * Each provider must:
 * - Report its availability via `isAvailable()`
 * - Never throw from `search()` — return empty arrays on failure
 * - Sanitize all output snippets before returning
 */

import type { SearchReference } from "../../types/index.js";

export interface SearchProvider {
  /** Human-readable provider name for logging and diagnostics */
  readonly name: string;

  /**
   * Checks if this provider is available for use.
   * For API-backed providers, this checks if the required API key is set.
   * For scraping providers, this always returns true.
   */
  isAvailable(): boolean;

  /**
   * Executes a search query and returns sanitized results.
   *
   * Guarantees:
   * - Never throws (catches all errors internally)
   * - Returns empty array on failure
   * - All snippets are HTML-stripped and length-capped
   * - All URLs are resolved to canonical destinations
   *
   * @param query - The search query string
   * @param limit - Maximum number of results to return
   * @returns Array of sanitized search references
   */
  search(query: string, limit: number): Promise<SearchReference[]>;
}
