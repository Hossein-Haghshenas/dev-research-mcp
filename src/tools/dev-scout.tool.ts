/**
 * dev_scout tool registration and orchestration logic.
 *
 * This module registers the single consolidated `dev_scout` tool on the
 * MCP server instance. It orchestrates parallel data retrieval from:
 * 1. Web search (authoritative documentation patterns)
 * 2. Web search (pitfalls, breaking changes, known issues)
 * 3. GitHub repository search
 *
 * All three queries run concurrently via Promise.all for minimum latency.
 * The results are merged with a deterministic engineering checklist and
 * assembled into a structured Markdown brief.
 *
 * Error handling:
 * - Individual service failures are caught and degraded gracefully
 * - The tool NEVER returns isError:true for network failures
 * - Partial results are always returned with appropriate warnings
 * - Only schema validation errors produce isError:true
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SearchService } from "../services/search/search.service.js";
import type { GitHubService } from "../services/github/github.service.js";
import { buildEngineeringChecklist } from "../services/checklist.js";
import { buildBrief } from "../formatters/brief.formatter.js";
import { QUICK_SEARCH_LIMIT, DEEP_SEARCH_LIMIT } from "../config/constants.js";
import { logger } from "../utils/logger.js";

/**
 * Registers the dev_scout tool on the given MCP server.
 *
 * @param server - The McpServer instance to register the tool on
 * @param searchService - The search service orchestrator
 * @param githubService - The GitHub repository search service
 */
export function registerDevScoutTool(
  server: McpServer,
  searchService: SearchService,
  githubService: GitHubService,
): void {
  server.tool(
    "dev_scout",
    "Performs targeted technical research for AI coding agents. Returns a structured brief with documentation patterns, known pitfalls, open-source implementations, and engineering evaluation guidelines. Optimized for minimal token usage (<450 tokens).",
    {
      topic: z
        .string()
        .describe("The technical change, architectural decision, library, or bug being investigated"),
      language_or_stack: z
        .string()
        .optional()
        .describe("Target language, framework, or runtime (e.g., 'Node.js', 'PostgreSQL', 'Go')"),
      search_depth: z
        .enum(["quick", "deep"])
        .optional()
        .default("quick")
        .describe("Investigation depth: 'quick' (2 sources) or 'deep' (4 sources)"),
    },
    async ({ topic, language_or_stack, search_depth }) => {
      logger.info(`dev_scout invoked: topic="${topic}", stack="${language_or_stack || "none"}", depth="${search_depth}"`);

      try {
        const stackDescriptor = language_or_stack ? `${language_or_stack} ` : "";
        const primaryQuery = `${stackDescriptor}${topic} documentation best practices architecture`;
        const counterQuery = `${stackDescriptor}${topic} performance issues pitfalls breaking changes`;

        const resultLimit = search_depth === "deep" ? DEEP_SEARCH_LIMIT : QUICK_SEARCH_LIMIT;

        // Execute all three queries concurrently
        const [authoritativeSources, pitfallSources, repositorySources] = await Promise.all([
          searchService.search(primaryQuery, resultLimit),
          searchService.search(counterQuery, resultLimit),
          githubService.searchRepositories(topic, language_or_stack),
        ]);

        const checklist = buildEngineeringChecklist(topic, language_or_stack);

        const brief = buildBrief({
          topic,
          stack: language_or_stack,
          checklist,
          authoritativeSources,
          pitfallSources,
          repositorySources,
        });

        logger.info(`dev_scout completed: ${brief.length} chars, ~${Math.ceil(brief.length / 3.5)} tokens`);

        return {
          content: [
            {
              type: "text" as const,
              text: brief,
            },
          ],
        };
      } catch (error) {
        logger.error("dev_scout unhandled error", error);

        // Even on total failure, return the engineering checklist
        const checklist = buildEngineeringChecklist(topic, language_or_stack);
        const fallbackBrief = buildBrief({
          topic,
          stack: language_or_stack,
          checklist,
          authoritativeSources: [],
          pitfallSources: [],
          repositorySources: ["⚠️ External sources temporarily unavailable due to a server error."],
        });

        return {
          content: [
            {
              type: "text" as const,
              text: fallbackBrief,
            },
          ],
        };
      }
    },
  );

  logger.info("Registered tool: dev_scout");
}
