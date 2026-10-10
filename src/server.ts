/**
 * MCP Server factory.
 *
 * Instantiates the McpServer, wires all services together with dependency
 * injection, and registers the dev_scout tool.
 *
 * This module is separated from the entry point (index.ts) to enable:
 * 1. Unit testing with InMemoryTransport (no stdio dependency)
 * 2. Clean separation between process lifecycle and server logic
 * 3. Future support for multiple transport types
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadEnvConfig } from "./config/env.js";
import { MemoryCache } from "./services/cache/memory-cache.js";
import { DdgSearchProvider } from "./services/search/ddg.provider.js";
import { BraveSearchProvider } from "./services/search/brave.provider.js";
import { SearchService } from "./services/search/search.service.js";
import { GitHubService } from "./services/github/github.service.js";
import { registerDevScoutTool } from "./tools/dev-scout.tool.js";
import { logger } from "./utils/logger.js";
import type { SearchReference } from "./types/index.js";

/**
 * Creates and configures the DevScout MCP server with all dependencies wired.
 *
 * Dependency injection flow:
 * EnvConfig → Search Providers → SearchService → Tool Handler
 *           → GitHub Token      → GitHubService → Tool Handler
 *           → MemoryCache       → (shared by all services)
 *
 * @returns Fully configured McpServer ready for transport binding
 */
export function createServer(): McpServer {
  const env = loadEnvConfig();

  // Shared caches
  const searchCache = new MemoryCache<SearchReference[]>();
  const githubCache = new MemoryCache<string[]>();

  // Search providers (priority order: API-backed > scraping)
  const braveProvider = new BraveSearchProvider(env.braveApiKey);
  const ddgProvider = new DdgSearchProvider();

  // Build provider chain: highest priority first
  const searchProviders = [braveProvider, ddgProvider];

  const searchService = new SearchService(searchProviders, searchCache);
  const githubService = new GitHubService(env.githubToken, githubCache);

  // Create MCP server
  const server = new McpServer({
    name: "devscout-mcp",
    version: "1.0.0",
  });

  // Register tool with injected dependencies
  registerDevScoutTool(server, searchService, githubService);

  logger.info("DevScout MCP server created and configured");
  return server;
}
