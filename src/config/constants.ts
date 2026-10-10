/**
 * Application-wide constants and tunable thresholds.
 *
 * All timeouts, limits, and token budgets are centralized here
 * to avoid magic numbers scattered throughout the codebase.
 */

// ─── Network Timeouts ──────────────────────────────────────────
/** Timeout for web search requests (DuckDuckGo, Brave, etc.) in milliseconds */
export const WEB_SEARCH_TIMEOUT_MS = 4500;

/** Timeout for GitHub API requests in milliseconds */
export const GITHUB_SEARCH_TIMEOUT_MS = 3500;

// ─── Search Result Limits ───────────────────────────────────────
/** Number of search results per query in "quick" mode */
export const QUICK_SEARCH_LIMIT = 2;

/** Number of search results per query in "deep" mode */
export const DEEP_SEARCH_LIMIT = 4;

/** Maximum number of GitHub repositories to retrieve */
export const GITHUB_REPO_LIMIT = 2;

// ─── Token Budget ───────────────────────────────────────────────
/** Maximum characters per individual search snippet */
export const MAX_SNIPPET_LENGTH = 250;

/** Maximum characters for a GitHub repository description */
export const MAX_REPO_DESCRIPTION_LENGTH = 150;

/** Maximum total characters for the assembled brief (~450 tokens at 3.5 chars/token) */
export const MAX_BRIEF_CHARACTERS = 1600;

/** Approximate characters-per-token ratio for English text */
export const CHARS_PER_TOKEN = 3.5;

// ─── Cache Settings ─────────────────────────────────────────────
/** Maximum entries in the in-memory LRU cache */
export const CACHE_MAX_ENTRIES = 100;

/** Cache entry TTL in milliseconds (10 minutes) */
export const CACHE_TTL_MS = 10 * 60 * 1000;

// ─── GitHub Rate Limit ──────────────────────────────────────────
/** Minimum remaining requests before pausing GitHub queries */
export const GITHUB_RATE_LIMIT_THRESHOLD = 3;

// ─── User Agents ────────────────────────────────────────────────
/** Pool of modern browser User-Agent strings for web search requests */
export const USER_AGENT_POOL: readonly string[] = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:126.0) Gecko/20100101 Firefox/126.0",
] as const;
