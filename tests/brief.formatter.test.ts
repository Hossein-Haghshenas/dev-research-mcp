import { describe, it, expect } from "vitest";
import { buildBrief, estimateTokens } from "../src/formatters/brief.formatter.js";
import { buildEngineeringChecklist } from "../src/services/checklist.js";

describe("Brief Formatter & Checklist", () => {
  it("builds a structured brief containing all 4 sections and agent guidance", () => {
    const checklist = buildEngineeringChecklist("connection pooling", "Node.js");
    const brief = buildBrief({
      topic: "connection pooling",
      stack: "Node.js",
      checklist,
      authoritativeSources: [
        {
          title: "Node.js PG Pool",
          url: "https://node-postgres.com/features/pooling",
          snippet: "Official pg pool connection management guidance.",
          source: "DuckDuckGo",
        },
      ],
      pitfallSources: [
        {
          title: "Leaked connections",
          url: "https://github.com/brianc/node-postgres/issues/123",
          snippet: "Ensure client.release() is called in finally block.",
          source: "DuckDuckGo",
        },
      ],
      repositorySources: [
        "- **brianc/node-postgres** (⭐ 14k) — PostgreSQL client for node.js",
      ],
    });

    expect(brief).toContain("## DevScout Brief: connection pooling");
    expect(brief).toContain("**Stack Context:** Node.js");
    expect(brief).toContain("### 1. Engineering Considerations");
    expect(brief).toContain("### 2. High-Authority Patterns & Evidence");
    expect(brief).toContain("### 3. Established Repositories & Implementations");
    expect(brief).toContain("### 4. Critical Pitfalls & Contradicting Evidence");
    expect(brief).toContain("Guidance for Agent:");
  });

  it("enforces token budget and preserves agent guidance", () => {
    const longSnippets = Array.from({ length: 20 }, (_, i) => ({
      title: `Source ${i}`,
      url: `https://example.com/source/${i}`,
      snippet: `This is an exceptionally long snippet text description designed to test budget trimming in the formatter ${i}. `.repeat(
        3,
      ),
      source: "DuckDuckGo",
    }));

    const brief = buildBrief({
      topic: "stress test",
      checklist: ["Test vector 1", "Test vector 2"],
      authoritativeSources: longSnippets,
      pitfallSources: longSnippets,
      repositorySources: ["- **repo/test** (⭐ 100) — test description"],
    });

    expect(brief.length).toBeLessThanOrEqual(1600);
    expect(brief).toContain("Guidance for Agent:");
  });

  it("estimates token count conservatively", () => {
    const tokens = estimateTokens("Hello world 12345");
    expect(tokens).toBeGreaterThan(0);
  });
});
