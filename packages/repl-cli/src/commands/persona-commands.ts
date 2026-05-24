import chalk from 'chalk';
import { CommandContext } from '../config/types.js';
import { getPersonaRegistry } from '../personas/registry.js';
import { saveConfig } from '../config/loader.js';
import type { NaturalLanguageOrchestrator } from '../core/orchestrator.js';

/**
 * /persona                       → show current active persona
 * /persona list                  → list all available personas
 * /persona switch <name>         → switch for this session only
 * /persona switch <name> --save  → switch AND persist as defaultPersona in config
 */
export class PersonaCommands {
  constructor(private orchestrator: NaturalLanguageOrchestrator) {}

  async run(args: string[], _context: CommandContext): Promise<void> {
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === 'current') {
      this.showCurrent();
      return;
    }

    if (sub === 'list') {
      this.showList();
      return;
    }

    if (sub === 'switch' || sub === 'use' || sub === 'set') {
      const rest = args.slice(1);
      const save = rest.includes('--save');
      const target = rest.find(a => !a.startsWith('--'));
      if (!target) {
        console.log(chalk.yellow('Usage: persona switch <name> [--save]'));
        console.log(chalk.gray('Run "persona list" to see available personas.'));
        return;
      }
      this.switchTo(target, save);
      return;
    }

    // Allow `persona <name>` as a shortcut for `persona switch <name>`
    const direct = getPersonaRegistry().get(sub);
    if (direct) {
      const save = args.slice(1).includes('--save');
      this.switchTo(sub, save);
      return;
    }

    console.log(chalk.yellow(`Unknown persona subcommand: ${sub}`));
    console.log(chalk.gray('Usage: persona [list | current | switch <name> [--save]]'));
  }

  private showCurrent(): void {
    const active = getPersonaRegistry().active();
    console.log(chalk.cyan(`\nActive persona: ${chalk.bold(active.label)}`));
    console.log(chalk.gray(`  ${active.description}`));
    console.log(chalk.gray(`  model: ${active.model}`));
    console.log('');
  }

  private showList(): void {
    const registry = getPersonaRegistry();
    const active = registry.active();
    const all = registry.list();

    console.log(chalk.cyan('\nAvailable personas:\n'));
    for (const p of all) {
      const marker = p.name === active.name ? chalk.green('●') : chalk.gray('○');
      const label = p.name === active.name ? chalk.bold.cyan(p.label) : chalk.white(p.label);
      console.log(`  ${marker} ${label} ${chalk.gray(`(${p.name})`)}`);
      console.log(`     ${chalk.gray(p.description)}`);
    }
    console.log(chalk.gray(`\n  Switch with: persona switch <name>\n`));
  }

  private switchTo(name: string, save: boolean): void {
    const registry = getPersonaRegistry();
    const previous = registry.active();
    const next = registry.switch(name);

    if (!next) {
      console.log(chalk.red(`Unknown persona: ${name}`));
      console.log(chalk.gray('Run "persona list" to see available personas.'));
      return;
    }

    if (next.name === previous.name && !save) {
      console.log(chalk.yellow(`Already on persona: ${next.label}`));
      return;
    }

    // Apply the swap to the live orchestrator.
    this.orchestrator.setPersona(next);

    console.log(chalk.cyan(`\nSwitched: ${chalk.gray(previous.label)} → ${chalk.bold.green(next.label)}`));
    console.log(chalk.gray(`  ${next.description}`));
    console.log(chalk.gray(`  Conversation history preserved; system prompt and model updated.`));

    if (save) {
      try {
        saveConfig({ defaultPersona: next.name });
        console.log(chalk.green(`  ✓ Saved as defaultPersona in config.`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(chalk.red(`  ✗ Failed to save config: ${msg}`));
      }
    }
    console.log('');
  }
}
