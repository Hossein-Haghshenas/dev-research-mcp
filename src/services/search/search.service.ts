/**
 * Search service orchestrator with fallback pipeline.
 *
 * Implements the Chain of Responsibility pattern:
 * 1. Try the highest-priority available provider (Brave > DDG)
 * 2. If it fails or returns empty, fall through to the next provider
 * 3. Integrate with MemoryCache for query deduplication
 *
 * The orchestrator guarantees:
 * - Never throws to the caller
 * - Returns empty arrays as worst case (never undefined/null)
 * - Caches successful results for 10 minutes
 * - Logs provider selection and fallback events
 */

import type { SearchProvider } from "./search.provider.js";
import type { SearchReference } from "../../types/index.js";
import { MemoryCache } from "../cache/memory-cache.js";
import { logger } from "../../utils/logger.js";

export class SearchService {
  private readonly providers: SearchProvider[];
  private readonly cache: MemoryCache<SearchReference[]>;

  /**
   * @param providers - Ordered list of search providers (highest priority first)
   * @param cache - Shared cache instance for query deduplication
   */
  constructor(providers: SearchProvider[], cache: MemoryCache<SearchReference[]>) {
    this.providers = providers;
    this.cache = cache;

    const available = providers.filter((p) => p.isAvailable());
    logger.info(
      `SearchService initialized with ${available.length}/${providers.length} available providers: ${available.map((p) => p.name).join(", ") || "none"}`,
    );
  }

  /**
   * Executes a search query through the provider chain.
   *
   * @param query - The search query string
   * @param limit - Maximum number of results
   * @returns Array of search references (may be empty, never throws)
   */
  async search(query: string, limit: number): Promise<SearchReference[]> {
    // Check cache first
    const cacheKey = `search:${query}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit for query: "${query}"`);
      return cached;
    }

    // Try each available provider in priority order
    for (const provider of this.providers) {
      if (!provider.isAvailable()) {
        continue;
      }

      try {
        logger.debug(`Trying ${provider.name} for query: "${query}"`);
        const results = await provider.search(query, limit);

        if (results.length > 0) {
          this.cache.set(cacheKey, results);
          logger.debug(`${provider.name} returned ${results.length} results`);
          return results;
        }

        logger.debug(`${provider.name} returned empty results, trying next provider`);
      } catch (error) {
        logger.warn(`${provider.name} failed, falling through`, error);
      }
    }

    // All providers exhausted
    logger.warn(`All search providers returned empty for query: "${query}"`);
    return [];
  }
}
