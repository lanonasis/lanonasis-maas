import type { LanonasisClient, LanUpdateParams } from "./client.js";
import type { LanonasisConfig } from "./config.js";
import {
  exitWithError,
  isNotFoundError,
  parseMemoryType,
  parseTags,
  printMemoryDetail,
  printMemorySummary,
  requireMemoryId,
  requireUpdateFields,
  resolveContentInput,
  normalizeTextInput,
} from "./cli-common.js";
import { detectMemoryType } from "./enrichment/type-detector.js";
import { extractTags } from "./enrichment/tag-extractor.js";

type WriteOptions = {
  title?: string;
  content?: string;
  contentFile?: string;
  type?: string;
  tags?: string;
};

type DeleteOptions = {
  force?: boolean;
};

function buildCliMetadata(cfg: LanonasisConfig): Record<string, unknown> {
  return {
    agent_id: cfg.agentId,
    source: "openclaw-cli",
    captured_at: new Date().toISOString(),
  };
}

async function runDelete(
  client: LanonasisClient,
  rawId: string,
  options: DeleteOptions,
  deprecated = false,
): Promise<void> {
  try {
    const id = requireMemoryId(rawId);
    if (deprecated) {
      console.error(
        "Warning: `forget` is deprecated and will be removed after two tagged releases. Use `delete` or `rm`.",
      );
    }
    if (!options.force) {
      throw new Error(
        "Deletion requires --force. Re-run as `openclaw lanonasis delete <id> --force`.",
      );
    }

    await client.deleteMemory(id);
    console.log(`Deleted memory: ${id}`);
  } catch (error) {
    if (isNotFoundError(error)) {
      exitWithError(`Memory not found: ${rawId}`);
    }
    exitWithError(error);
  }
}

export function registerMemoryCli(
  cmd: any,
  getRuntime: () => { client: LanonasisClient; cfg: LanonasisConfig },
) {
  cmd
    .command("create")
    .alias("add")
    .description("Create a memory")
    .requiredOption("--title <title>", "Memory title")
    .option("--content <content>", "Memory content")
    .option("--content-file <path>", "Read memory content from a file")
    .option("--type <type>", "Memory type")
    .option("--tags <tags>", "Comma-separated tags")
    .action(async (options: WriteOptions) => {
      try {
        const { client, cfg } = getRuntime();
        const title = normalizeTextInput("Title", options.title);
        if (!title) {
          throw new Error("`--title` is required.");
        }

        const content = await resolveContentInput({
          content: options.content,
          contentFile: options.contentFile,
          required: true,
        });
        if (!content) {
          throw new Error("Provide one of --content or --content-file.");
        }
        const type = parseMemoryType(options.type) ?? detectMemoryType(content);
        const tags = parseTags(options.tags) ?? extractTags(content);

        const memory = await client.createMemory({
          title,
          content,
          type,
          tags,
          metadata: buildCliMetadata(cfg),
        });

        printMemorySummary(memory, "Created memory");
      } catch (error) {
        exitWithError(error);
      }
    });

  cmd
    .command("get <id>")
    .alias("show")
    .description("Get a memory by ID")
    .action(async (rawId: string) => {
      try {
        const { client } = getRuntime();
        const id = requireMemoryId(rawId);
        const memory = await client.getMemory(id);
        printMemoryDetail(memory);
      } catch (error) {
        if (isNotFoundError(error)) {
          exitWithError(`Memory not found: ${rawId}`);
        }
        exitWithError(error);
      }
    });

  cmd
    .command("update <id>")
    .description("Update an existing memory")
    .option("--title <title>", "New memory title")
    .option("--content <content>", "New memory content")
    .option("--content-file <path>", "Read new memory content from a file")
    .option("--type <type>", "New memory type")
    .option("--tags <tags>", "Comma-separated tags")
    .action(async (rawId: string, options: WriteOptions) => {
      try {
        const { client } = getRuntime();
        const id = requireMemoryId(rawId);
        const updates: LanUpdateParams = {};

        if (options.title !== undefined) {
          updates.title = normalizeTextInput("Title", options.title);
        }

        if (
          options.content !== undefined ||
          options.contentFile !== undefined
        ) {
          updates.content = await resolveContentInput({
            content: options.content,
            contentFile: options.contentFile,
          });
        }

        if (options.type !== undefined) {
          updates.type = parseMemoryType(options.type);
        }

        if (options.tags !== undefined) {
          updates.tags = parseTags(options.tags);
        }

        requireUpdateFields(updates);

        const memory = await client.updateMemory(id, updates);
        printMemorySummary(memory, "Updated memory");
      } catch (error) {
        if (isNotFoundError(error)) {
          exitWithError(`Memory not found: ${rawId}`);
        }
        exitWithError(error);
      }
    });

  cmd
    .command("delete <id>")
    .alias("rm")
    .description("Delete a memory by ID")
    .option("--force", "Confirm deletion")
    .action((rawId: string, options: DeleteOptions) => {
      const { client } = getRuntime();
      return runDelete(client, rawId, options);
    });

  const forgetCommand = cmd
    .command("forget <id>")
    .description("Deprecated alias for delete")
    .option("--force", "Confirm deletion")
    .action((rawId: string, options: DeleteOptions) => {
      const { client } = getRuntime();
      return runDelete(client, rawId, options, true);
    });

  forgetCommand.hideHelp?.();
}
