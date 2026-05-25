import chalk from 'chalk';
import ora from 'ora';
import {
  type MemoryClient,
  createMemoryClient,
} from '@lanonasis/memory-client';
import { CommandContext } from '../config/types.js';
import {
  detectEvents,
  eventTag,
  isEventType,
  EVENT_TYPES,
  TAG_HUMAN_CORRECTED,
  mergeEventTags,
  stripAllEventTags,
  stripEventTypeTag,
  type EventType,
} from '../events/index.js';
import { pauseReadline, resumeReadline } from '../utils/spinner-utils.js';

/**
 * /event <subcommand> — capture-event ontology operations.
 *
 *   /event detect <text>            — dry-run the rules detector on text
 *   /event tag <memory-id> <type>   — add event:<type> to an existing memory
 *   /event untag <memory-id> [type] — remove event tag(s); all if no type
 *   /event types                    — list the 7 canonical event types
 *
 * In v0 there is NO automatic per-turn capture. Detection runs on demand
 * via `/event detect` and on explicit `create --event=<type>` / `/event tag`.
 * Per-turn auto-capture and the AI Router classifier ship in v0.1.
 */
export class EventCommands {
  private client: MemoryClient | null = null;

  private getClient(context: CommandContext): MemoryClient {
    if (!this.client) {
      this.client = createMemoryClient({
        apiUrl: context.config.apiUrl,
        authToken: context.config.authToken,
        timeout: 30000,
      });
    }
    return this.client;
  }

  async run(args: string[], context: CommandContext): Promise<void> {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'help') {
      this.showHelp();
      return;
    }
    if (sub === 'types' || sub === 'list-types') {
      this.showTypes();
      return;
    }
    if (sub === 'detect') {
      const text = args.slice(1).join(' ');
      this.detect(text);
      return;
    }
    if (sub === 'tag') {
      await this.tag(args[1], args[2], context);
      return;
    }
    if (sub === 'untag') {
      await this.untag(args[1], args[2], context);
      return;
    }

    console.log(chalk.yellow(`Unknown event subcommand: ${sub}`));
    this.showHelp();
  }

  private showHelp(): void {
    console.log(chalk.cyan('\nUsage: event <subcommand>\n'));
    console.log(chalk.gray('  event detect <text>              Dry-run detector; no write'));
    console.log(chalk.gray('  event tag <memory-id> <type>     Add event:<type> tag'));
    console.log(chalk.gray('  event untag <memory-id> [type]   Remove event tag(s)'));
    console.log(chalk.gray('  event types                      List the 7 canonical types'));
    console.log('');
  }

  private showTypes(): void {
    console.log(chalk.cyan('\nCanonical event types:\n'));
    for (const t of EVENT_TYPES) {
      console.log(`  ${chalk.bold(t.padEnd(12))} ${chalk.gray(this.typeDescription(t))}`);
    }
    console.log('');
  }

  private typeDescription(t: EventType): string {
    switch (t) {
      case 'decision':    return 'explicit choice between alternatives, with rationale (Mind fuel)';
      case 'commitment':  return 'stated intent to do X, optionally by a date';
      case 'frustration': return 'friction signal: blocker, repeated failure, vent (Heart fuel)';
      case 'surprise':    return 'outside-in: an assumption breaking moment';
      case 'insight':     return 'inside-out: connection-making moment';
      case 'revisit':     return 'auto: semantic hit on a >7-day-old prior memory';
      case 'abandon':     return 'NOT auto-tagged in v0; user-applied if a commitment lapses';
    }
  }

  private detect(text: string): void {
    if (!text.trim()) {
      console.log(chalk.yellow('Usage: event detect <text>'));
      return;
    }
    const events = detectEvents(text);
    if (events.length === 0) {
      console.log(chalk.gray('  No events detected.'));
      return;
    }
    console.log(chalk.cyan(`\nDetected ${events.length} event(s):\n`));
    for (const ev of events) {
      const conf = (ev.confidence * 100).toFixed(0);
      console.log(`  ${chalk.bold.green(eventTag(ev.type))} ${chalk.gray(`(${conf}%)`)}`);
      console.log(`    ${chalk.gray('evidence:')} "${ev.evidence}"`);
      if (ev.payload) {
        for (const [k, v] of Object.entries(ev.payload)) {
          console.log(`    ${chalk.gray('payload:')}  ${k}=${v}`);
        }
      }
    }
    console.log('');
  }

  private async tag(memoryId: string | undefined, type: string | undefined, context: CommandContext): Promise<void> {
    if (!memoryId || !type) {
      console.log(chalk.yellow('Usage: event tag <memory-id> <type>'));
      return;
    }
    if (!isEventType(type)) {
      console.log(chalk.red(`Unknown event type: ${type}`));
      console.log(chalk.gray(`Valid: ${EVENT_TYPES.join(', ')}`));
      return;
    }

    pauseReadline(context.readline ?? null);
    const spinner = ora('Reading memory...').start();
    try {
      const client = this.getClient(context);
      const got = await client.getMemory(memoryId);
      if (got.error || !got.data) {
        spinner.fail(chalk.red(`Memory not found: ${memoryId}`));
        return;
      }
      const existing = got.data.tags ?? [];
      const next = mergeEventTags(
        existing,
        [{ type: type as EventType, confidence: 1, evidence: '<manual>' }],
      );
      // Always mark manual tags as human-corrected so the classifier
      // can use them as exemplars in v0.1.
      if (!next.includes(TAG_HUMAN_CORRECTED)) next.push(TAG_HUMAN_CORRECTED);

      spinner.text = 'Updating tags...';
      const updated = await client.updateMemory(memoryId, { tags: next });
      if (updated.error) {
        spinner.fail(chalk.red(`Update failed: ${updated.error}`));
        return;
      }
      spinner.succeed(chalk.green(`Tagged ${memoryId} with event:${type}`));
      context.lastResult = updated.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail(chalk.red(`Tag failed: ${msg}`));
    } finally {
      resumeReadline(context.readline ?? null);
    }
  }

  private async untag(memoryId: string | undefined, type: string | undefined, context: CommandContext): Promise<void> {
    if (!memoryId) {
      console.log(chalk.yellow('Usage: event untag <memory-id> [type]'));
      return;
    }
    if (type && !isEventType(type)) {
      console.log(chalk.red(`Unknown event type: ${type}`));
      console.log(chalk.gray(`Valid: ${EVENT_TYPES.join(', ')}`));
      return;
    }

    pauseReadline(context.readline ?? null);
    const spinner = ora('Reading memory...').start();
    try {
      const client = this.getClient(context);
      const got = await client.getMemory(memoryId);
      if (got.error || !got.data) {
        spinner.fail(chalk.red(`Memory not found: ${memoryId}`));
        return;
      }
      const existing = got.data.tags ?? [];
      const next = type
        ? stripEventTypeTag(existing, type as EventType)
        : stripAllEventTags(existing);

      if (next.length === existing.length) {
        spinner.warn(chalk.yellow(type ? `No event:${type} tag found` : 'No event tags found'));
        return;
      }

      // Mark this as a human correction so future classifier passes know.
      if (!next.includes(TAG_HUMAN_CORRECTED)) next.push(TAG_HUMAN_CORRECTED);

      spinner.text = 'Updating tags...';
      const updated = await client.updateMemory(memoryId, { tags: next });
      if (updated.error) {
        spinner.fail(chalk.red(`Update failed: ${updated.error}`));
        return;
      }
      spinner.succeed(chalk.green(
        type
          ? `Removed event:${type} from ${memoryId}`
          : `Removed all event tags from ${memoryId}`
      ));
      context.lastResult = updated.data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      spinner.fail(chalk.red(`Untag failed: ${msg}`));
    } finally {
      resumeReadline(context.readline ?? null);
    }
  }
}
