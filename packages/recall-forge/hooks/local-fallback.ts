// Phase 4 - Local Fallback
import { promises as fs } from "fs";
import { join } from "path";

export class LocalFallbackWriter {
  constructor(private resolvePath: (p: string) => string) {}

  async writeMemory(title: string, content: string): Promise<void> {
    try {
      // Target: <workspace>/memory/YYYY-MM-DD.md
      const today = new Date().toISOString().slice(0, 10);
      const filePath = this.resolvePath(join("memory", `${today}.md`));

      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      await fs.mkdir(dir, { recursive: true });

      // Format: "## {title}\n\n{content.slice(0, 1000)}\n\n---\n"
      const formatted = `## ${title}\n\n${content.slice(0, 1000)}\n\n---\n`;

      // Append mode
      await fs.appendFile(filePath, formatted, "utf-8");
    } catch (_err) {
      // Silently catch all errors - never throws
    }
  }
}
