/**
 * DuckDuckGo HTML search provider.
 *
 * Zero-config fallback search engine that scrapes the lightweight HTML-only
 * endpoint at `html.duckduckgo.com`. This endpoint returns server-rendered
 * HTML without JavaScript, making it suitable for fetch-based extraction.
 *
 * ⚠️ RISK: DuckDuckGo has no official search API and actively blocks automated
 * traffic. This provider may fail silently under rate limiting or anti-bot
 * detection. The SearchService orchestrator handles fallback to other providers.
 *
 * Mitigations:
 * - Randomized User-Agent from a pool of modern browser strings
 * - Aggressive timeout (4.5s) to prevent hung connections
 * - Graceful empty-array return on any failure
 * - URL redirect resolution (uddg parameter extraction)
 */

import type { SearchProvider } from "./search.provider.js";
import type { SearchReference } from "../../types/index.js";
import { WEB_SEARCH_TIMEOUT_MS, USER_AGENT_POOL, MAX_SNIPPET_LENGTH } from "../../config/constants.js";
import { sanitizeSnippet, resolveRedirectUrl } from "../../utils/sanitizer.js";
import { logger } from "../../utils/logger.js";

export class DdgSearchProvider implements SearchProvider {
  readonly name = "DuckDuckGo HTML";

  /**
   * DDG HTML scraping is always available (no API key required).
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Scrapes DuckDuckGo's HTML search endpoint for results.
   *
   * Extraction uses RegExp matching against the server-rendered HTML structure.
   * This is inherently fragile — any DDG frontend changes may break parsing.
   * The SearchService should have fallback providers configured.
   */
  async search(query: string, limit: number): Promise<SearchReference[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

    try {
      const targetUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const userAgent = USER_AGENT_POOL[Math.floor(Math.random() * USER_AGENT_POOL.length)];

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.5",
        },
      });

      if (!response.ok) {
        logger.warn(`DDG returned HTTP ${response.status} for query: "${query}"`);
        return [];
      }

      const htmlContent = await response.text();
      return this.parseResults(htmlContent, limit);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn(`DDG search timed out after ${WEB_SEARCH_TIMEOUT_MS}ms for query: "${query}"`);
      } else {
        logger.error("DDG search failed", error);
      }
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parses DDG HTML response to extract result URLs and snippets.
   *
   * The RegExp targets the `result__url` and `result__snippet` CSS classes
   * in DDG's HTML search page structure.
   */
  private parseResults(htmlContent: string, limit: number): SearchReference[] {
    const references: SearchReference[] = [];

    // Match DDG result blocks: URL anchor followed by snippet anchor
    const resultMatcher =
      /<a class="result__url" href="([^"]+)">[\s\S]*?<a class="result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;

    while ((match = resultMatcher.exec(htmlContent)) !== null && references.length < limit) {
      const rawUrl = match[1];
      const rawSnippet = match[2];

      if (!rawUrl || !rawSnippet) continue;

      const resolvedUrl = resolveRedirectUrl(rawUrl);
      const sanitizedSnippet = sanitizeSnippet(rawSnippet, MAX_SNIPPET_LENGTH);

      if (resolvedUrl && sanitizedSnippet) {
        references.push({
          title: "Technical Reference",
          url: resolvedUrl,
          snippet: sanitizedSnippet,
          source: this.name,
        });
      }
    }

    logger.debug(`DDG parsed ${references.length} results for limit=${limit}`);
    return references;
  }
}
