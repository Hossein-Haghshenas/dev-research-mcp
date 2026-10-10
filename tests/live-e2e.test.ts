import { describe, it, expect } from "vitest";
import { DdgSearchProvider } from "../src/services/search/ddg.provider.js";
import { SearchService } from "../src/services/search/search.service.js";
import { GitHubService } from "../src/services/github/github.service.js";
import { MemoryCache } from "../src/services/cache/memory-cache.js";
import { buildEngineeringChecklist } from "../src/services/checklist.js";
import { buildBrief, estimateTokens } from "../src/formatters/brief.formatter.js";
import { MAX_BRIEF_CHARACTERS } from "../src/config/constants.js";

describe("Live Operational MCP Integration Test", () => {
  it(
    "performs live search and repo discovery without throwing",
    async () => {
      const topic = "connection pooling";
      const stack = "Node.js PostgreSQL";

      const searchCache = new MemoryCache();
      const githubCache = new MemoryCache();
      const searchService = new SearchService([new DdgSearchProvider()], searchCache);
      const githubService = new GitHubService(undefined, githubCache);

      const primaryQuery = `${stack} ${topic} documentation best practices architecture`;
      const counterQuery = `${stack} ${topic} performance issues pitfalls breaking changes`;

      const startTime = Date.now();

      // Parallel execution
      const [authoritativeSources, pitfallSources, repositorySources] = await Promise.all([
        searchService.search(primaryQuery, 2),
        searchService.search(counterQuery, 2),
        githubService.searchRepositories(topic, "Node.js"),
      ]);

      const duration = Date.now() - startTime;
      console.error(`\n[Live Network Test] Duration: ${duration}ms`);
      console.error(`[Authoritative Sources count]: ${authoritativeSources.length}`);
      console.error(`[Pitfall Sources count]: ${pitfallSources.length}`);
      console.error(`[GitHub Repos count]: ${repositorySources.length}`);

      const checklist = buildEngineeringChecklist(topic, stack);

      const brief = buildBrief({
        topic,
        stack,
        checklist,
        authoritativeSources,
        pitfallSources,
        repositorySources,
      });

      console.error(`\n=================== ACTUAL GENERATED BRIEF ===================\n`);
      console.error(brief);
      console.error(`\n=============================================================\n`);

      const tokens = estimateTokens(brief);
      console.error(`Brief stats: Length = ${brief.length} chars | Estimated tokens = ${tokens}`);

      // Assertions
      expect(brief).toContain(`## DevScout Brief: ${topic}`);
      expect(brief).toContain(`**Stack Context:** ${stack}`);
      expect(brief).toContain(`### 1. Engineering Considerations`);
      expect(brief).toContain(`### 2. High-Authority Patterns & Evidence`);
      expect(brief).toContain(`### 3. Established Repositories & Implementations`);
      expect(brief).toContain(`### 4. Critical Pitfalls & Contradicting Evidence`);
      expect(brief).toContain(`Guidance for Agent:`);

      // Token budget assertion
      expect(brief.length).toBeLessThanOrEqual(MAX_BRIEF_CHARACTERS);
      expect(tokens).toBeLessThanOrEqual(Math.ceil(MAX_BRIEF_CHARACTERS / 3.5));
    },
    20000, // 20s timeout for live external network requests
  );
});
