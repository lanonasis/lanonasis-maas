import {
  type MemoryClient,
  type MemoryEntry,
  type MemorySearchResult,
  type UpdateMemoryRequest,
  type InferredConclusion,
  createMemoryClient
} from '@lanonasis/memory-client';
import chalk from 'chalk';
import ora from 'ora';
import { CommandContext } from '../config/types.js';
import { withSpinner } from '../utils/spinner-utils.js';
import {
  eventTag,
  eventTypeFromTag,
  isEventType,
  EVENT_TYPES,
  TAG_BACKFILLED,
  type EventType,
} from '../events/index.js';

const VALID_MEMORY_TYPES = [
  'context',
  'project',
  'knowledge',
  'reference',
  'personal',
  'workflow'
] as const;

// Helper to pause/resume readline around spinner operations
function pauseReadline() {
  const rl = (global as any).rlInterface;
  if (rl) rl.pause();
}

function resumeReadline() {
  const rl = (global as any).rlInterface;
  if (rl) rl.resume();
}

const VALID_MEMORY_STATUSES = [
  'active',
  'archived',
  'draft',
  'deleted'
] as const;

type MemoryType = (typeof VALID_MEMORY_TYPES)[number];
type MemoryStatus = (typeof VALID_MEMORY_STATUSES)[number];

interface ConvergedEvent {
  memory: MemoryEntry;
  types: EventType[];
}

export class MemoryCommands {
  private client: MemoryClient | null = null;
  
  private getClient(context: CommandContext): MemoryClient {
    if (!this.client) {
      this.client = createMemoryClient({
        apiUrl: context.config.apiUrl,
        authToken: context.config.authToken,
        timeout: 30000
      });
    }
    return this.client;
  }
  
  async create(args: string[], context: CommandContext) {
    if (args.length < 2) {
      console.log(chalk.yellow('Usage: create <title> <content> [--type=<type>] [--tags=tag1,tag2] [--event=<event-type>]'));
      return;
    }

    // Parse arguments for type, tags, and event
    let memory_type: MemoryType = 'context';
    let tags: string[] = [];
    let eventTypeFlag: EventType | undefined;
    const filteredArgs: string[] = [];

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          memory_type = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Using default "context".\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
      } else if (arg.startsWith('--tags=')) {
        tags = arg.substring(7).split(',').map(t => t.trim()).filter(Boolean);
      } else if (arg.startsWith('--event=')) {
        const candidate = arg.substring(8);
        if (isEventType(candidate)) {
          eventTypeFlag = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid event type "${candidate}". Ignoring.\n` +
              `Valid event types: ${EVENT_TYPES.join(', ')}`
            )
          );
        }
      } else {
        filteredArgs.push(arg);
      }
    }

    // Prepend event tag if --event was provided (dedup against existing tags)
    if (eventTypeFlag) {
      const tag = eventTag(eventTypeFlag);
      if (!tags.includes(tag)) tags = [tag, ...tags];
    }

    if (filteredArgs.length < 2) {
      console.log(chalk.yellow('Error: Title and content are required'));
      return;
    }

    const [title, ...contentParts] = filteredArgs;
    const content = contentParts.join(' ');

    // Validate title and content are not empty/whitespace
    if (!title.trim()) {
      console.log(chalk.yellow('Error: Title cannot be empty'));
      return;
    }
    if (!content.trim()) {
      console.log(chalk.yellow('Error: Content cannot be empty'));
      return;
    }
    
    pauseReadline();
    const spinner = ora('Creating memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.createMemory({ 
        title, 
        content,
        memory_type,
        tags
      });
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      if (result.data) {
        spinner.succeed(chalk.green(`Memory created: ${result.data.id}`));
        context.lastResult = result.data;
      }
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async update(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: update <id> [--title=...] [--content=...] [--type=<type>] [--status=<status>] [--tags=tag1,tag2]'));
      return;
    }

    const updates: UpdateMemoryRequest = {};
    const positionalContent: string[] = [];

    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg.startsWith('--title=')) {
        updates.title = arg.substring(8).trim();
      } else if (arg.startsWith('--content=')) {
        updates.content = arg.substring(10).trim();
      } else if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          updates.memory_type = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Ignoring.\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
      } else if (arg.startsWith('--status=')) {
        const candidate = arg.substring(9) as MemoryStatus;
        if ((VALID_MEMORY_STATUSES as readonly string[]).includes(candidate)) {
          updates.status = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid status "${candidate}". Ignoring.\n` +
              `Valid statuses: ${VALID_MEMORY_STATUSES.join(', ')}`
            )
          );
        }
      } else if (arg.startsWith('--tags=')) {
        updates.tags = arg.substring(7).split(',').map(t => t.trim()).filter(Boolean);
      } else {
        positionalContent.push(arg);
      }
    }

    // Convenience path: treat trailing non-flag args as content.
    if (!updates.content && positionalContent.length > 0) {
      updates.content = positionalContent.join(' ');
    }

    if (Object.keys(updates).length === 0) {
      console.log(chalk.yellow('Nothing to update. Provide at least one update field.'));
      console.log(chalk.gray('Example: update <id> --content=New notes --type=project'));
      return;
    }

    pauseReadline();
    const spinner = ora('Updating memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.updateMemory(id, updates);
      if (result.error) {
        spinner.fail(chalk.red(`Update failed: ${result.error}`));
        return;
      }
      if (result.data) {
        spinner.succeed(chalk.green(`Memory updated: ${result.data.id}`));
        context.lastResult = result.data;
      }
    } catch (error) {
      spinner.fail(chalk.red(`Update failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }
  
  async search(args: string[], context: CommandContext) {
    let memoryTypeFilter: MemoryType | undefined;
    const queryParts: string[] = [];

    for (const arg of args) {
      if (arg.startsWith('--type=')) {
        const candidate = arg.substring(7) as MemoryType;
        if ((VALID_MEMORY_TYPES as readonly string[]).includes(candidate)) {
          memoryTypeFilter = candidate;
        } else {
          console.log(
            chalk.yellow(
              `Warning: Invalid memory type "${candidate}". Ignoring type filter.\n` +
              `Valid types: ${VALID_MEMORY_TYPES.join(', ')}`
            )
          );
        }
      } else {
        queryParts.push(arg);
      }
    }

    const query = queryParts.join(' ');
    if (!query) {
      console.log(chalk.yellow('Usage: search <query> [--type=<type>]'));
      return;
    }
    
    pauseReadline();
    const spinner = ora('Searching...').start();
    try {
      const client = this.getClient(context);
      const result = await client.searchMemories({
        query,
        memory_types: memoryTypeFilter ? [memoryTypeFilter] : undefined,
        status: 'active',
        limit: 20,
        threshold: 0.7
      });

      if (result.error) {
        spinner.fail(chalk.red(`Search failed: ${result.error}`));
        return;
      }

      const results = (result.data?.results || []) as MemorySearchResult[];
      if (results.length === 0) {
        spinner.succeed(chalk.gray('No results found'));
      } else {
        spinner.succeed(chalk.green(`Found ${results.length} result(s)`));
        results.forEach((r: MemorySearchResult, i: number) => {
          console.log(chalk.cyan(`[${i + 1}] ${r.title}`));
          console.log(chalk.gray(`    ${r.content.substring(0, 80)}...`));
        });
      }
      context.lastResult = results;
    } catch (error) {
      spinner.fail(chalk.red(`Search failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }
  
  async list(args: string[], context: CommandContext) {
    const limit = parseInt(args[0] || '10', 10);
    
    pauseReadline();
    const spinner = ora('Fetching memories...').start();
    try {
      const client = this.getClient(context);
      const result = await client.listMemories({ limit });

      if (result.error) {
        spinner.fail(chalk.red(`List failed: ${result.error}`));
        return;
      }

      const items = (result.data?.data || []) as MemoryEntry[];
      if (items.length > 0) {
        spinner.succeed(chalk.green(`Showing ${items.length} memories`));
        items.forEach((r: MemoryEntry, i: number) => {
          console.log(chalk.cyan(`[${i + 1}] ${r.title} (${r.id})`));
        });
        context.lastResult = items;
      } else {
        spinner.succeed(chalk.gray('No memories found'));
      }
    } catch (error) {
      spinner.fail(chalk.red(`List failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }
  
  async get(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: get <id>'));
      return;
    }
    
    pauseReadline();
    const spinner = ora('Fetching memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.getMemory(id);

      if (result.error) {
        spinner.fail(chalk.red(`Get failed: ${result.error}`));
        return;
      }

      if (result.data) {
        spinner.succeed(chalk.green(`Memory found`));
        console.log(chalk.cyan(`Title: ${result.data.title}`));
        console.log(chalk.gray(`ID: ${result.data.id}`));
        console.log(chalk.white(`\n${result.data.content}`));
        context.lastResult = result.data;
      } else {
        spinner.fail(chalk.yellow(`Memory not found: ${id}`));
      }
    } catch (error) {
      spinner.fail(chalk.red(`Get failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }
  
  async delete(args: string[], context: CommandContext) {
    const id = args[0];
    if (!id) {
      console.log(chalk.yellow('Usage: delete <id>'));
      return;
    }
    
    pauseReadline();
    const spinner = ora('Deleting memory...').start();
    try {
      const client = this.getClient(context);
      const result = await client.deleteMemory(id);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green('Memory deleted'));
      context.lastResult = { deleted: id };
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  // ============================================================
  // Phase 1: Intelligence / Reasoning commands
  // ============================================================

  async listConclusions(args: string[], context: CommandContext) {
    let subjectId: string | undefined;
    let limit = 20;
    let includeSuperseded = false;

    for (const arg of args) {
      if (arg.startsWith('--subject=')) {
        subjectId = arg.substring(10);
      } else if (arg.startsWith('--limit=')) {
        limit = parseInt(arg.substring(8)) || 20;
      } else if (arg === '--include-superseded') {
        includeSuperseded = true;
      }
    }

    if (!subjectId) {
      console.log(chalk.yellow('Usage: conclusions list --subject=<uuid> [--limit=20] [--include-superseded]'));
      return;
    }

    pauseReadline();
    const spinner = ora('Fetching conclusions...').start();
    try {
      const client = this.getClient(context);
      const result = await client.listInferredConclusions({ subject_id: subjectId, limit, include_superseded: includeSuperseded });
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      const conclusions = result.data?.conclusions ?? [];
      spinner.succeed(chalk.green(`${conclusions.length} conclusion(s)`));
      for (const c of conclusions) {
        const type = c.conclusion_type ?? 'unknown';
        const conf = (c.confidence ?? 0) * 100;
        console.log(chalk.cyan(`  [${type}] ${conf.toFixed(0)}% — ${c.content?.substring(0, 80)}...`));
      }
      context.lastResult = { conclusions };
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async getJobStatus(args: string[], context: CommandContext) {
    const jobId = args[0];
    if (!jobId) {
      console.log(chalk.yellow('Usage: conclusions job <job-id>'));
      return;
    }

    pauseReadline();
    const spinner = ora('Fetching job status...').start();
    try {
      const client = this.getClient(context);
      const result = await client.getReasoningJobStatus(jobId);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      const job = result.data;
      if (!job) {
        spinner.fail(chalk.yellow(`Job not found: ${jobId}`));
        return;
      }
      spinner.succeed(chalk.green(`Job ${jobId}`));
      console.log(chalk.cyan(`Status: ${job.status}`));
      console.log(chalk.gray(`Subject: ${job.subject_id}`));
      console.log(chalk.gray(`Created: ${job.created_at}`));
      if (job.started_at) console.log(chalk.gray(`Started: ${job.started_at}`));
      if (job.completed_at) console.log(chalk.gray(`Completed: ${job.completed_at}`));
      if (job.error) console.log(chalk.red(`Error: ${job.error}`));
      context.lastResult = { job };
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async flushQueue(args: string[], context: CommandContext) {
    const subjectId = args[0];
    if (!subjectId) {
      console.log(chalk.yellow('Usage: intelligence flush <subject-id>'));
      return;
    }

    pauseReadline();
    const spinner = ora(`Flushing reasoning queue for ${subjectId}...`).start();
    try {
      const client = this.getClient(context);
      const result = await client.flushReasoningQueue(subjectId);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green('Flush triggered'));
      console.log(chalk.cyan(`Flushed: ${result.data?.flushed}`));
      console.log(chalk.gray(`Job IDs: ${(result.data?.job_ids ?? []).join(', ')}`));
      console.log(chalk.gray(`Conclusions: ${result.data?.conclusion_count ?? 0}`));
      context.lastResult = result.data;
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async contextConverge(args: string[], context: CommandContext): Promise<void> {
    let subjectId: string | undefined;
    let limit = 200;
    let includeBackfilled = false;

    for (const arg of args) {
      if (arg.startsWith('--subject=')) {
        subjectId = arg.substring(10).trim();
      } else if (arg.startsWith('--limit=')) {
        const parsed = parseInt(arg.substring(8), 10);
        if (Number.isFinite(parsed) && parsed > 0) {
          limit = Math.min(parsed, 200);
        }
      } else if (arg === '--include-backfilled') {
        includeBackfilled = true;
      }
    }

    if (!subjectId) {
      console.log(chalk.yellow('Usage: context converge --subject=<uuid> [--limit=200] [--include-backfilled]'));
      return;
    }

    pauseReadline();
    const spinner = ora('Gathering event-tagged memories...').start();
    try {
      const client = this.getClient(context);
      const byId = new Map<string, MemoryEntry>();

      for (const type of EVENT_TYPES) {
        const result = await client.listMemories({
          status: 'active',
          tags: [eventTag(type)],
          limit,
          sort: 'created_at',
          order: 'desc',
        });

        if (result.error) {
          spinner.fail(chalk.red(`Converge failed while reading event:${type}: ${result.error}`));
          return;
        }

        for (const memory of result.data?.data ?? []) {
          if (!includeBackfilled && memory.tags?.includes(TAG_BACKFILLED)) continue;
          byId.set(memory.id, memory);
        }
      }

      const events = Array.from(byId.values())
        .map((memory): ConvergedEvent => ({
          memory,
          types: this.eventTypesFor(memory),
        }))
        .filter(event => event.types.length > 0)
        .sort((a, b) => Date.parse(b.memory.created_at) - Date.parse(a.memory.created_at))
        .slice(0, limit);

      if (events.length === 0) {
        spinner.succeed(chalk.gray('No event-tagged memories found for convergence.'));
        context.lastResult = { events: [], distribution: {} };
        return;
      }

      const distribution = this.eventDistribution(events);
      const conclusionsResult = await client.listInferredConclusions({
        subject_id: subjectId,
        limit: 12,
      });
      const conclusions = conclusionsResult.data?.conclusions ?? [];
      const conclusionDigest = conclusions
        .map((c, i) => `${i + 1}. [${c.conclusion_type ?? 'unknown'} ${(c.confidence ?? 0).toFixed(2)}] ${c.content}`)
        .join('\n');

      spinner.text = 'Synthesizing convergence...';
      const question = this.buildConvergenceQuestion({
        subjectId,
        events,
        distribution,
        conclusionDigest,
      });
      const answerResult = await client.askProfile(subjectId, question);

      if (answerResult.error) {
        spinner.fail(chalk.red(`Converge synthesis failed: ${answerResult.error}`));
        return;
      }

      spinner.succeed(chalk.green(`Converged ${events.length} event-tagged memor${events.length === 1 ? 'y' : 'ies'}`));
      this.printConvergence(
        distribution,
        answerResult.data?.answer ?? '',
        this.formatApiError(conclusionsResult.error),
      );

      context.lastResult = {
        subject_id: subjectId,
        event_count: events.length,
        distribution,
        answer: answerResult.data?.answer,
        confidence: answerResult.data?.confidence,
        conclusions,
        event_ids: events.map(event => event.memory.id),
      };
    } catch (error) {
      spinner.fail(chalk.red(`Converge failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  private eventTypesFor(memory: MemoryEntry): EventType[] {
    const types = new Set<EventType>();
    for (const tag of memory.tags ?? []) {
      const type = eventTypeFromTag(tag);
      if (type) types.add(type);
    }
    return Array.from(types);
  }

  private eventDistribution(events: ConvergedEvent[]): Record<EventType, number> {
    const distribution = Object.fromEntries(EVENT_TYPES.map(type => [type, 0])) as Record<EventType, number>;
    for (const event of events) {
      for (const type of event.types) {
        distribution[type] += 1;
      }
    }
    return distribution;
  }

  private formatEventDigest(events: ConvergedEvent[]): string {
    return events.map((event, index) => {
      const createdAt = event.memory.created_at ? event.memory.created_at.slice(0, 10) : 'unknown-date';
      const content = event.memory.content.replace(/\s+/g, ' ').slice(0, 360);
      return [
        `${index + 1}. id=${event.memory.id}`,
        `   date=${createdAt}`,
        `   types=${event.types.map(type => eventTag(type)).join(', ')}`,
        `   title=${event.memory.title}`,
        `   content=${content}`,
      ].join('\n');
    }).join('\n\n');
  }

  private buildConvergenceQuestion(input: {
    subjectId: string;
    events: ConvergedEvent[];
    distribution: Record<EventType, number>;
    conclusionDigest: string;
  }): string {
    const distributionLines = EVENT_TYPES
      .map(type => `- ${type}: ${input.distribution[type]}`)
      .join('\n');
    const topRevisits = input.events
      .filter(event => event.types.includes('revisit'))
      .slice(0, 5)
      .map(event => event.memory.id)
      .join(', ') || 'none';

    return `You are synthesizing across ${input.events.length} captured events for subject ${input.subjectId}.

Event distribution:
${distributionLines}
- top revisit event IDs: ${topRevisits}

Pre-reasoned conclusions:
${input.conclusionDigest || '(none available)'}

Captured events with provenance:
${this.formatEventDigest(input.events)}

Produce exactly three blocks:

MIND: Structural patterns across decisions and insights. What is this user systematically building toward? Where are decisions diverging from stated commitments?

HEART: Emotional and motivational patterns across frustrations, abandons, and revisits. What keeps pulling them back? What keeps draining them?

CONCIERGE: 1-3 concrete next actions. Each action must cite at least one event ID as provenance and answer what the user's past self would thank their present self for doing now.`;
  }

  private printConvergence(
    distribution: Record<EventType, number>,
    answer: string,
    conclusionsError?: string,
  ): void {
    console.log(chalk.cyan('\nEvent distribution:'));
    for (const type of EVENT_TYPES) {
      console.log(chalk.gray(`  ${type.padEnd(12)} ${distribution[type]}`));
    }
    if (conclusionsError) {
      console.log(chalk.yellow(`\nConclusions unavailable: ${conclusionsError}`));
    }
    console.log(chalk.cyan('\nConvergence:\n'));
    console.log(answer.trim() || chalk.gray('(empty answer)'));
    console.log('');
  }

  private formatApiError(error: unknown): string | undefined {
    if (!error) return undefined;
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (typeof error === 'object') {
      const maybe = error as { message?: unknown; error?: unknown };
      if (typeof maybe.message === 'string') return maybe.message;
      if (typeof maybe.error === 'string') return maybe.error;
    }
    return String(error);
  }

  // Phase 2: Living Memory Profile commands

  async profileShow(subjectId: string, context: CommandContext): Promise<void> {
    pauseReadline();
    const spinner = ora('Fetching profile...').start();
    try {
      const client = this.getClient(context);
      const result = await client.getProfile(subjectId);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green('Profile loaded'));
      const p = result.data?.profile;
      if (!p) { console.log(chalk.yellow('No profile data')); return; }
      console.log(chalk.cyan('\nProfile Summary:'), p.profile_summary ?? chalk.gray('(none)'));
      console.log(chalk.cyan('\nStructured Fields:'));
      for (const [field, items] of Object.entries(p.structured_fields ?? {})) {
        if (items.length > 0) {
          console.log(chalk.bold(`  ${field}:`));
          for (const item of items) {
            console.log(chalk.gray(`    • ${item}`));
          }
        }
      }
      console.log(chalk.cyan('\nConfidence by Field:'));
      for (const [field, score] of Object.entries(p.confidence_by_field ?? {})) {
        console.log(chalk.gray(`  ${field}: ${score.toFixed(2)}`));
      }
      console.log(chalk.dim(`\nFreshness: ${p.freshness} | Updated: ${p.updated_at}`));
      context.lastResult = p;
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async profileHistory(subjectId: string, limit: number, context: CommandContext): Promise<void> {
    pauseReadline();
    const spinner = ora('Fetching profile history...').start();
    try {
      const client = this.getClient(context);
      const result = await client.getProfileHistory(subjectId, limit);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green(`${result.data?.versions?.length ?? 0} version(s)`));
      for (const v of result.data?.versions ?? []) {
        console.log(chalk.cyan(`\n[${v.created_at}]`) + chalk.gray(` id: ${v.id}`));
        const keys = Object.keys(v.diff ?? {});
        if (keys.length > 0) {
          console.log(chalk.gray(`  Changed: ${keys.join(', ')}`));
        }
      }
      context.lastResult = result.data;
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }

  async profileAsk(subjectId: string, question: string, context: CommandContext): Promise<void> {
    pauseReadline();
    const spinner = ora('Asking profile...').start();
    try {
      const client = this.getClient(context);
      const result = await client.askProfile(subjectId, question);
      if (result.error) {
        spinner.fail(chalk.red(`Failed: ${result.error}`));
        return;
      }
      spinner.succeed(chalk.green('Answer received'));
      console.log(chalk.cyan('\nAnswer:'), result.data?.answer ?? chalk.gray('(empty)'));
      console.log(chalk.dim(`Confidence: ${((result.data?.confidence ?? 0) * 100).toFixed(1)}%`));
      context.lastResult = result.data;
    } catch (error) {
      spinner.fail(chalk.red(`Failed: ${error instanceof Error && error.message ? error.message : String(error)}`));
    } finally {
      resumeReadline();
    }
  }
}
