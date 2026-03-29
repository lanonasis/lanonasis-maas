import { promises as fs } from "fs";
import { join } from "path";

export type SpoolMemory = {
  title: string;
  content: string;
  type: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
};

export type SpoolEntry = {
  sessionId: string;
  memories: SpoolMemory[];
  spooledAt: string;
  agentType: string;
};

export class SpoolQueue {
  constructor(
    private dir: string,
    private agentType: string = "claude-code",
  ) {}

  async write(sessionId: string, memories: SpoolMemory[]): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const entry: SpoolEntry = {
      sessionId,
      memories,
      spooledAt: new Date().toISOString(),
      agentType: this.agentType,
    };
    const filename = `${sessionId}.json`;
    await fs.writeFile(join(this.dir, filename), JSON.stringify(entry, null, 2), "utf-8");
  }

  async list(): Promise<SpoolEntry[]> {
    try {
      const files = await fs.readdir(this.dir);
      const entries: SpoolEntry[] = [];
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await fs.readFile(join(this.dir, file), "utf-8");
        entries.push(JSON.parse(raw));
      }
      return entries;
    } catch {
      return [];
    }
  }

  async drain(processor: (entry: SpoolEntry) => Promise<void>): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    try {
      const files = await fs.readdir(this.dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const filePath = join(this.dir, file);
        try {
          const raw = await fs.readFile(filePath, "utf-8");
          const entry: SpoolEntry = JSON.parse(raw);
          await processor(entry);
          await fs.unlink(filePath);
          processed++;
        } catch {
          failed++;
        }
      }
    } catch {
      // dir doesn't exist yet
    }
    return { processed, failed };
  }

  async count(): Promise<number> {
    try {
      const files = await fs.readdir(this.dir);
      return files.filter((f) => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  }
}
