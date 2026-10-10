/**
 * Engineering evaluation checklist generator.
 *
 * Produces a set of deterministic evaluation vectors that guide the AI agent
 * to consider architectural trade-offs before making file modifications.
 * These questions are always included in the brief, even when external
 * search sources are unavailable.
 */

/**
 * Generates standard engineering evaluation questions for the given topic.
 *
 * @param topic - The technical subject under investigation
 * @param stack - Optional language/framework context
 * @returns Array of evaluation question strings
 */
export function buildEngineeringChecklist(topic: string, stack?: string): string[] {
  const subject = stack ? `${stack} (${topic})` : topic;

  return [
    `Architectural Boundaries: Does adopting patterns for ${subject} leak domain logic or violate established boundaries?`,
    `Failure Modes & Resilience: How does this implementation degrade during upstream timeouts, high concurrency, or cache misses?`,
    `Backward Compatibility: Are serialization contracts, database schemas, or public APIs broken by this change?`,
    `Verification Strategy: What deterministic integration test or mock suite validates this behavior prior to deployment?`,
  ];
}
