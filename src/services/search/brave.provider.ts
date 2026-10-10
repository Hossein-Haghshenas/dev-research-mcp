/**
 * Brave Search API provider.
 *
 * High-reliability search provider using Brave's official Search API.
 * Activated automatically when BRAVE_API_KEY is detected in the environment.
 *
 * Brave Search free plan: 2,000 queries/month — sufficient for moderate
 * development usage. Paid plans offer higher limits for teams.
 *
 * @see https://brave.com/search/api/
 */

import type { SearchProvider } from "./search.provider.js";
import type { SearchReference } from "../../types/index.js";
import { WEB_SEARCH_TIMEOUT_MS, MAX_SNIPPET_LENGTH } from "../../config/constants.js";
import { sanitizeSnippet } from "../../utils/sanitizer.js";
import { logger } from "../../utils/logger.js";

export class BraveSearchProvider implements SearchProvider {
  readonly name = "Brave Search API";
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  /**
   * Brave provider is available only when an API key is configured.
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Queries the Brave Search API for web results.
   *
   * Returns structured results with title, URL, and snippet.
   * Never throws — returns empty array on failure.
   */
  async search(query: string, limit: number): Promise<SearchReference[]> {
    if (!this.apiKey) {
      return [];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({
        q: query,
        count: String(limit),
        text_decorations: "false",
        search_lang: "en",
      });

      const response = await fetch(
        `https://api.search.brave.com/res/v1/web/search?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": this.apiKey,
          },
        },
      );

      if (!response.ok) {
        logger.warn(`Brave Search returned HTTP ${response.status} for query: "${query}"`);
        return [];
      }

      const payload = (await response.json()) as {
        web?: {
          results?: Array<{
            title?: string;
            url?: string;
            description?: string;
          }>;
        };
      };

      const results = payload.web?.results;
      if (!results || results.length === 0) {
        return [];
      }

      return results
        .filter((r): r is { title: string; url: string; description: string } =>
          !!r.title && !!r.url && !!r.description)
        .slice(0, limit)
        .map((r) => ({
          title: r.title,
          url: r.url,
          snippet: sanitizeSnippet(r.description, MAX_SNIPPET_LENGTH),
          source: this.name,
        }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn(`Brave Search timed out after ${WEB_SEARCH_TIMEOUT_MS}ms`);
      } else {
        logger.error("Brave Search failed", error);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
