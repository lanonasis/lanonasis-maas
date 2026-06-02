import { Command } from 'commander';
import chalk from 'chalk';
import { homedir } from 'os';
import { join, basename } from 'path';
import { existsSync, readFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { PrivacySDK } from '@lanonasis/privacy-sdk';
import {
  prescan,
  saveReport,
  printSummary,
  getFlaggedFiles,
  getQuarantinedFiles,
} from '@lanonasis/secret-prescan';
import type { ScanConfig, ScanReport } from '@lanonasis/secret-prescan';

// ─────────────────────────────────────────────
// Color scheme (matching api-keys.ts style)
// ─────────────────────────────────────────────

const colors = {
  primary: chalk.blue.bold,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.cyan,
  accent: chalk.magenta,
  muted: chalk.gray,
  highlight: chalk.white.bold,
};

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PRESCAN_REPORT_DIR = join(homedir(), '.lanonasis', 'security', 'prescan');

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function ensureReportDir(): void {
  if (!existsSync(PRESCAN_REPORT_DIR)) {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
  }
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString();
}

function loadLatestReport(): ScanReport | null {
  if (!existsSync(PRESCAN_REPORT_DIR)) return null;

  let latest: { mtime: Date; path: string } | null = null;
  for (const file of readdirSync(PRESCAN_REPORT_DIR)) {
    if (!file.endsWith('.json')) continue;
    const full = join(PRESCAN_REPORT_DIR, file);
    try {
      const { mtime } = statSync(full);
      if (!latest || mtime > latest.mtime) latest = { mtime, path: full };
    } catch {
      // skip unreadable
    }
  }

  if (!latest) return null;
  try {
    return JSON.parse(readFileSync(latest.path, 'utf8')) as ScanReport;
  } catch {
    return null;
  }
}

function countPatterns(): number {
  try {
    const { SECRET_PATTERNS } = require('@lanonasis/secret-prescan');
    return Array.isArray(SECRET_PATTERNS) ? SECRET_PATTERNS.length : 0;
  } catch {
    return 0;
  }
}

function validatePath(path: string): void {
  try {
    if (!statSync(path).isDirectory()) {
      console.error(colors.error(`✖ Path is not a directory: ${path}`));
      process.exit(1);
    }
  } catch (err: unknown) {
    const code = err instanceof Error ? err.message : String(err);
    console.error(colors.error(`✖ Path does not exist: ${path}`));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
// Prescan Command (parent)
// ─────────────────────────────────────────────

const prescanCommand = new Command('prescan')
  .name('prescan')
  .description(
    colors.info('🔍 Local filesystem prescan for secrets/PII before MIRA extraction.') +
      ' Reports are value-stripped — never exposes raw secrets.'
  );

// ─────────────────────────────────────────────
// Subcommand: prescan run <path>
// ─────────────────────────────────────────────

const runCommand = new Command('run')
  .description('Run prescan on a directory')
  .argument('<path>', 'Root directory to scan')
  .option(
    '--exclude <patterns...>',
    'Glob patterns to exclude (e.g. --exclude node_modules --exclude .git)'
  )
  .option('--json', 'Output machine-parseable JSON summary')
  .option('--save', 'Write report to ~/.lanonasis/security/prescan/')
  .option(
    '--fail-on <threshold>',
    'Exit non-zero if classification meets threshold: quarantined or flagged',
    'none'
  )
  .option(
    '--ci',
    'CI mode: equivalent to --fail-on quarantined --json'
  )
  .action(async (path: string, options: any) => {
    validatePath(path);

    const ciMode = options.ci ?? false;
    const failOn = ciMode ? 'quarantined' : (options.failOn ?? 'none');

    const config: ScanConfig = {
      target_path: path,
      exclude_patterns: options.exclude ?? [],
    };

    console.error(colors.info('🔍 Starting prescan...'));
    console.error(colors.muted(`   Target: ${path}`));
    if (options.exclude?.length) {
      console.error(colors.muted(`   Exclude: ${options.exclude.join(', ')}`));
    }

    let report: ScanReport;
    try {
      const sdk = new PrivacySDK();
      report = prescan(sdk, config);
    } catch (err: any) {
      console.error(colors.error(`✖ Prescan failed: ${err.message}`));
      process.exit(1);
    }

    // Print summary (always human-readable unless --json)
    printSummary(report);

    // --save: write to CLI-owned dir, no mutations/ quarantines
    let reportPath: string | undefined;
    if (options.save) {
      ensureReportDir();
      reportPath = saveReport(report, PRESCAN_REPORT_DIR);
      console.error(colors.success(`✅ Report saved to ${reportPath}`));
    }

    const flaggedFiles = getFlaggedFiles(report);
    const quarantinedFiles = getQuarantinedFiles(report);

    // JSON output for piping/CI
    if (options.json || ciMode) {
      const out = {
        total_files: report.total_files,
        safe: report.summary.safe,
        flagged: report.summary.flagged,
        quarantined: report.summary.quarantined,
        errors: report.summary.errors,
        total_detections: report.summary.total_detections,
        detection_types: report.summary.detection_types,
        flagged_files: flaggedFiles,
        quarantined_files: quarantinedFiles,
        scan_root: report.scan_root,
        scanned_at: report.scanned_at,
        ...(reportPath ? { report_path: reportPath } : {}),
      };
      console.log(JSON.stringify(out, null, 2));
    }

    // Exit codes for CI gating
    let exitCode = 0;
    if (failOn === 'quarantined' && quarantinedFiles.length > 0) {
      console.error(colors.error(`\n🔴 Quarantined files found — fail-on=quarantined`));
      exitCode = 1;
    } else if (failOn === 'flagged' && (flaggedFiles.length > 0 || quarantinedFiles.length > 0)) {
      console.error(colors.warning(`\n⚠️  Flagged or quarantined files found — fail-on=flagged`));
      exitCode = 1;
    }

    process.exit(exitCode);
  });

// ─────────────────────────────────────────────
// Subcommand: prescan status
// ─────────────────────────────────────────────

const statusCommand = new Command('status')
  .description('Show last prescan state and statistics')
  .action(async () => {
    console.log(colors.primary('🔍 Prescan Status'));
    console.log(colors.info('─'.repeat(45)));

    // Report directory
    console.log(`${colors.highlight('Report dir:')} ${colors.muted(PRESCAN_REPORT_DIR)}`);

    const dirExists = existsSync(PRESCAN_REPORT_DIR);
    if (!dirExists) {
      console.log(colors.warning('⚠️  No scans recorded yet — run `lanonasis prescan run <path>` first'));
      return;
    }

    // Pattern count
    const patternCount = countPatterns();
    console.log(`${colors.highlight('Patterns:')} ${colors.accent(patternCount)} registered`);

    // Latest report
    const report = loadLatestReport();
    if (!report) {
      console.log(colors.warning('⚠️  No reports found'));
      return;
    }

    console.log(`${colors.highlight('Last scan:')} ${colors.success(formatTimestamp(report.scanned_at))}`);
    console.log(`${colors.highlight('Last target:')} ${colors.muted(report.scan_root)}`);
    console.log('');
    console.log(colors.info('Results:'));
    const summary = report.summary;
    console.log(
      `  ${colors.success('✅ SAFE:')}        ${String(summary.safe).padStart(6)}`
    );
    console.log(
      `  ${colors.warning('⚠️  FLAGGED:')}      ${String(summary.flagged).padStart(6)}`
    );
    console.log(
      `  ${colors.error('🔴 QUARANTINED:')}  ${String(summary.quarantined).padStart(6)}`
    );
    console.log(
      `  ${colors.muted('❌ ERRORS:')}       ${String(summary.errors).padStart(6)}`
    );
    console.log('');
    console.log(`${colors.highlight('Total detections:')} ${colors.accent(summary.total_detections)}`);

    if (Object.keys(summary.detection_types).length > 0) {
      console.log('');
      console.log(colors.info('Detection types:'));
      for (const [type, count] of Object.entries(summary.detection_types).sort((a, b) => (b[1] as number) - (a[1] as number))) {
        console.log(`  ${colors.muted(type.padEnd(24))} ${colors.accent(String(count))}`);
      }
    }
  });

// Wire up
prescanCommand.addCommand(runCommand);
prescanCommand.addCommand(statusCommand);

export default prescanCommand;