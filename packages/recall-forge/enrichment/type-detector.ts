// Phase 3 - Type Detector
import type { LanMemoryType } from "../client.js";

interface PatternMatch {
  type: LanMemoryType;
  score: number;
}

export function detectMemoryType(
  content: string,
  filename?: string,
): LanMemoryType {
  // Filename shortcuts (evaluated first, skip scoring)
  if (filename) {
    if (/^\d{4}-\d{2}-\d{2}\.md$/.test(filename)) {
      return "context";
    }
    if (/^(MEMORY|SOUL|USER)\.md$/.test(filename)) {
      return "personal";
    }
  }

  // Pattern scoring (highest score wins, default "context")
  const matches: PatternMatch[] = [];
  const lowerContent = content.toLowerCase();

  // workflow (3pts): numbered lists, →/->, how-to/guide/procedure headings
  const workflowPatterns = [
    /^\s*\d+\.\s+/m, // numbered list
    /→|->/, // arrows
    /\b(how[- ]?to|guide|procedure|steps?|process)\b/i,
  ];
  let workflowScore = 0;
  workflowPatterns.forEach((pattern) => {
    if (pattern.test(content)) workflowScore += 1;
  });
  if (workflowScore > 0) matches.push({ type: "workflow", score: workflowScore * 3 });

  // reference (3pts): code fences, tables, api/config/schema headings
  const referencePatterns = [
    /```/, // code fences
    /\|.*\|/, // markdown tables
    /\b(api|config|schema|endpoint)\b/i,
  ];
  let referenceScore = 0;
  referencePatterns.forEach((pattern) => {
    if (pattern.test(content)) referenceScore += 1;
  });
  if (referenceScore > 0) matches.push({ type: "reference", score: referenceScore * 3 });

  // project (2pts): sprint/milestone/deadline/roadmap
  const projectPatterns = [
    /\b(sprint|milestone|deadline|roadmap|deliverable)\b/i,
  ];
  let projectScore = 0;
  projectPatterns.forEach((pattern) => {
    if (pattern.test(lowerContent)) projectScore += 1;
  });
  if (projectScore > 0) matches.push({ type: "project", score: projectScore * 2 });

  // personal (2pts): prefer/I always/I never/my X is (check before knowledge for priority)
  const personalPatterns = [
    /\bprefer\b/i,
    /\bI always\b/i,
    /\bI never\b/i,
    /\bmy \w+ is\b/i,
    /\bI like\b/i,
    /\bI dislike\b/i,
  ];
  let personalScore = 0;
  personalPatterns.forEach((pattern) => {
    if (pattern.test(content)) personalScore += 1;
  });
  if (personalScore > 0) matches.push({ type: "personal", score: personalScore * 2 });

  // knowledge (2pts): learned/discovered/insight/pattern
  const knowledgePatterns = [
    /\b(learned|discovered|insight|principle|pattern)\b/i,
  ];
  let knowledgeScore = 0;
  knowledgePatterns.forEach((pattern) => {
    if (pattern.test(lowerContent)) knowledgeScore += 1;
  });
  if (knowledgeScore > 0) matches.push({ type: "knowledge", score: knowledgeScore * 2 });

  // context (1pt): ISO dates, today/yesterday/decided/agreed
  const contextPatterns = [
    /\d{4}-\d{2}-\d{2}/, // ISO date
    /\b(today|yesterday|decided|discussed|agreed)\b/i,
  ];
  let contextScore = 0;
  contextPatterns.forEach((pattern) => {
    if (pattern.test(content)) contextScore += 1;
  });
  if (contextScore > 0) matches.push({ type: "context", score: contextScore * 1 });

  // Return highest score, default to "context"
  if (matches.length === 0) return "context";
  matches.sort((a, b) => b.score - a.score);
  return matches[0].type;
}
