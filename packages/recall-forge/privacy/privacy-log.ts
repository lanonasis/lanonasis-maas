// Privacy Log Writer — daily markdown audit trail
// Writes to workspace/memory/privacy/YYYY-MM-DD.md when an intervention occurs.
// Only writes when action !== 'passthrough'. Silent on all errors.

import { promises as fs } from "fs";
import { join } from "path";
import type { PrivacyReport } from "./privacy-guard.js";

export class PrivacyLogWriter {
  constructor(private resolvePath: (p: string) => string) {}

  async write(report: PrivacyReport): Promise<void> {
    if (report.action === "passthrough") return;
    try {
      const today = report.timestamp.slice(0, 10);
      const filePath = this.resolvePath(join("memory", "privacy", `${today}.md`));
      const dir = filePath.substring(0, filePath.lastIndexOf("/"));
      await fs.mkdir(dir, { recursive: true });

      // Check if file exists to decide whether to write the header
      let needsHeader = false;
      try {
        await fs.access(filePath);
      } catch {
        needsHeader = true;
      }

      let entry = "";
      if (needsHeader) {
        entry += `# Privacy Shield Log — ${today}\n\n`;
        entry += `| Time | Action | Secrets | PII Types | Sensitivity | Regulations |\n`;
        entry += `|------|--------|---------|-----------|-------------|-------------|\n`;
      }

      const time = report.timestamp.slice(11, 19);
      const pii = report.piiTypes.join(", ") || "—";
      const regs = report.regulations.join(", ") || "—";
      const sensitivity = report.piiSensitivity !== "none" ? report.piiSensitivity : "—";
      entry += `| ${time} | ${report.action} | ${report.secretsFound} | ${pii} | ${sensitivity} | ${regs} |\n`;

      await fs.appendFile(filePath, entry, "utf-8");
    } catch {
      // Never throws — log failure must not affect memory write
    }
  }
}
