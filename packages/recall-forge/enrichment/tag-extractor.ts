// Phase 3 - Tag Extractor

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractTags(content: string, filename?: string): string[] {
  const tags = new Set<string>();

  // 1. H1/H2/H3 headers → slugify
  const headerMatches = content.match(/^(#{1,3})\s+(.+)$/gm);
  if (headerMatches) {
    headerMatches.forEach((header) => {
      const text = header.replace(/^#{1,3}\s+/, "").trim();
      if (text) {
        tags.add(slugify(text));
      }
    });
  }

  // 2. Filename stem → tag (skip date-format names)
  if (filename) {
    const stem = filename.replace(/\.md$/, "");
    // Skip date patterns like 2026-02-21
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stem)) {
      tags.add(slugify(stem));
    }
  }

  // 3. Keyword labels: TODO, FIXME, DECISION, IMPORTANT, NOTE
  const keywordPatterns: [RegExp, string][] = [
    [/\bTODO\b/gi, "todo"],
    [/\bFIXME\b/gi, "fixme"],
    [/\bDECISION\b/gi, "decision"],
    [/\bIMPORTANT\b/gi, "important"],
    [/\bNOTE\b/gi, "note"],
  ];
  keywordPatterns.forEach(([pattern, tag]) => {
    if (pattern.test(content)) tags.add(tag);
  });

  // 4. Always append "openclaw" as source tag
  tags.add("openclaw");

  // 5. Deduplicate (Set handles this), convert to array, max 10 tags
  const result = Array.from(tags);
  return result.slice(0, 10);
}
