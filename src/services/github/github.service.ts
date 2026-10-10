/**
 * Token-aware GitHub REST API client with rate-limit tracking.
 *
 * Retrieves public open-source repository references from GitHub's
 * search API to provide the AI agent with real-world implementation examples.
 *
 * Rate limit handling:
 * - Unauthenticated: 10 requests/minute for search API
 * - Authenticated (GITHUB_TOKEN): 30 requests/minute for search API
 * - Tracks x-ratelimit-remaining header on every response
 * - Pauses queries when remaining < GITHUB_RATE_LIMIT_THRESHOLD
 * - Returns descriptive notice instead of failing
 *
 * @see https://docs.github.com/en/rest/search/search?apiVersion=2022-11-28
 */

import type { GitHubRepository, RateLimitState } from "../../types/index.js";
import {
  GITHUB_SEARCH_TIMEOUT_MS,
  GITHUB_REPO_LIMIT,
  GITHUB_RATE_LIMIT_THRESHOLD,
  MAX_REPO_DESCRIPTION_LENGTH,
} from "../../config/constants.js";
import { MemoryCache } from "../cache/memory-cache.js";
import { logger } from "../../utils/logger.js";

export class GitHubService {
  private readonly token: string | undefined;
  private readonly cache: MemoryCache<string[]>;
  private rateLimitState: RateLimitState = {
    remaining: 999, // Assume available until first response
    resetAt: 0,
  };

  constructor(token: string | undefined, cache: MemoryCache<string[]>) {
    this.token = token;
    this.cache = cache;

    if (token) {
      logger.info("GitHub service initialized with authentication token (elevated rate limits)");
    } else {
      logger.info("GitHub service initialized without token (10 search requests/minute limit)");
    }
  }

  /**
   * Searches GitHub for repositories related to the given topic.
   *
   * @param topic - The technical topic to search for
   * @param language - Optional language filter (e.g., "TypeScript", "Go")
   * @returns Array of formatted Markdown strings for brief inclusion
   */
  async searchRepositories(topic: string, language?: string): Promise<string[]> {
    // Check cache first
    const cacheKey = `github:${topic}:${language || ""}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      logger.debug(`GitHub cache hit for topic: "${topic}"`);
      return cached;
    }

    // Check rate limit before making request
    if (this.isRateLimited()) {
      const resetIn = Math.max(0, this.rateLimitState.resetAt - Math.floor(Date.now() / 1000));
      logger.warn(`GitHub rate limit reached. Resets in ${resetIn}s`);
      return ["⚠️ GitHub reference repository search temporarily paused (rate limit). Resets shortly."];
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GITHUB_SEARCH_TIMEOUT_MS);

    try {
      const languageFilter = language ? `+language:${encodeURIComponent(language)}` : "";
      const requestUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(topic)}${languageFilter}&sort=stars&order=desc&per_page=${GITHUB_REPO_LIMIT}`;

      const headers: Record<string, string> = {
        "User-Agent": "devscout-mcp",
        "Accept": "application/vnd.github.v3+json",
      };

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const response = await fetch(requestUrl, {
        signal: controller.signal,
        headers,
      });

      // Update rate limit state from response headers
      this.updateRateLimitState(response.headers);

      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          logger.warn(`GitHub rate limited (HTTP ${response.status})`);
          return ["⚠️ GitHub reference repository search currently unavailable (rate limit exceeded)."];
        }
        logger.warn(`GitHub returned HTTP ${response.status}`);
        return ["GitHub reference repository search currently unavailable."];
      }

      const payload = (await response.json()) as {
        items?: Array<{
          full_name: string;
          html_url: string;
          stargazers_count: number;
          description: string | null;
        }>;
      };

      if (!payload.items || payload.items.length === 0) {
        const result = ["No direct high-authority open-source repositories located."];
        this.cache.set(cacheKey, result);
        return result;
      }

      const formatted = payload.items.map((repo) => {
        const desc = repo.description
          ? repo.description.slice(0, MAX_REPO_DESCRIPTION_LENGTH)
          : "No description provided.";
        return `- [${repo.full_name}](${repo.html_url}) (⭐ ${repo.stargazers_count}): ${desc}`;
      });

      this.cache.set(cacheKey, formatted);
      logger.debug(`GitHub found ${formatted.length} repositories for "${topic}"`);
      return formatted;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.warn(`GitHub search timed out after ${GITHUB_SEARCH_TIMEOUT_MS}ms for "${topic}"`);
      } else {
        logger.error("GitHub search failed", error);
      }
      return ["GitHub query timed out or reached rate limits."];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Checks if we're currently rate limited based on tracked state.
   */
  private isRateLimited(): boolean {
    const now = Math.floor(Date.now() / 1000);

    // If reset time has passed, assume limits have refreshed
    if (now >= this.rateLimitState.resetAt) {
      return false;
    }

    return this.rateLimitState.remaining < GITHUB_RATE_LIMIT_THRESHOLD;
  }

  /**
   * Updates internal rate limit tracking from GitHub response headers.
   */
  private updateRateLimitState(headers: Headers): void {
    const remaining = headers.get("x-ratelimit-remaining");
    const reset = headers.get("x-ratelimit-reset");

    if (remaining !== null) {
      this.rateLimitState.remaining = parseInt(remaining, 10);
    }

    if (reset !== null) {
      this.rateLimitState.resetAt = parseInt(reset, 10);
    }

    if (this.rateLimitState.remaining < GITHUB_RATE_LIMIT_THRESHOLD) {
      logger.warn(
        `GitHub rate limit low: ${this.rateLimitState.remaining} remaining, resets at ${new Date(this.rateLimitState.resetAt * 1000).toISOString()}`,
      );
    }
  }
}
