/**
 * Environment variable parsing and validation.
 *
 * Reads optional API keys and configuration from process.env.
 * All values are validated at startup and exposed as typed constants.
 */

export interface EnvConfig {
  /** GitHub personal access token for elevated rate limits (60 → 5000 req/hr) */
  githubToken: string | undefined;
  /** Brave Search API key for high-reliability search (free: 2000 queries/month) */
  braveApiKey: string | undefined;
  /** Tavily API key as alternative search provider */
  tavilyApiKey: string | undefined;
}

/**
 * Loads environment configuration from process.env.
 * Supports common aliases (GITHUB_TOKEN / GH_TOKEN).
 */
export function loadEnvConfig(): EnvConfig {
  return {
    githubToken: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined,
    braveApiKey: process.env.BRAVE_API_KEY || undefined,
    tavilyApiKey: process.env.TAVILY_API_KEY || undefined,
  };
}
