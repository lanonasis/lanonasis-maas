/**
 * Prescan Status Command Tests
 *
 * Tests the `prescan status` subcommand output behavior:
 * - Shows correct report dir, pattern count, timestamp, target path after a scan
 * - Shows safe/flagged/quarantined counts matching the last scan
 * - Graceful when no prior scan exists (shows 'no scan yet' state)
 * - Output format matches sdk-status style (primary header, ─ rule, highlight rows)
 * - No raw secrets in output
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';

// ─── Mock chalk before importing prescan ─────────────────────────────────────
jest.unstable_mockModule('chalk', () => ({
  default: {
    blue: { bold: (str: string) => str },
    cyan: (str: string) => str,
    gray: (str: string) => str,
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    magenta: (str: string) => str,
    white: { bold: (str: string) => str },
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRESCAN_REPORT_DIR = join(homedir(), '.lanonasis', 'security', 'prescan');

function buildReport(overrides: Partial<ScanReportShape> = {}): ScanReportShape {
  const now = new Date().toISOString();
  return {
    total_files: 10,
    scan_root: '/tmp/test-scan-target',
    scanned_at: now,
    summary: {
      safe: 6,
      flagged: 3,
      quarantined: 1,
      errors: 0,
      total_detections: 4,
      detection_types: { 'API_KEY': 2, 'PRIVATE_KEY': 1, 'AWS_SECRET': 1 },
    },
    ...overrides,
  };
}

interface ScanReportShape {
  total_files: number;
  scan_root: string;
  scanned_at: string;
  summary: {
    safe: number;
    flagged: number;
    quarantined: number;
    errors: number;
    total_detections: number;
    detection_types: Record<string, number>;
  };
}

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('prescan status', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    // Clean up any test report dir
    if (existsSync(PRESCAN_REPORT_DIR)) {
      try {
        rmSync(PRESCAN_REPORT_DIR, { recursive: true });
      } catch {}
    }
  });

  // Helper to invoke the status subcommand directly
  async function runStatusCmd() {
    const { default: prescanCommand } = await import('../commands/prescan.js');
    const statusCmd = (prescanCommand as any).commands.find((c: any) => c.name() === 'status');
    await statusCmd.parseAsync(['node', 'test']);
  }

  // ── No-scan-yet state ──────────────────────────────────────────────────

  it('shows the no-scans-yet state when the report directory does not exist', async () => {
    // Remove the directory if it exists to simulate "never scanned" state
    if (existsSync(PRESCAN_REPORT_DIR)) {
      rmSync(PRESCAN_REPORT_DIR, { recursive: true });
    }

    await runStatusCmd();

    // Should show the "no scans yet" warning (yellow)
    const warningLine = consoleLogSpy.mock.calls.find(([line]: any) =>
      String(line).includes('No scans recorded yet')
    );
    expect(warningLine).toBeDefined();
  });

  // ── With report present ─────────────────────────────────────────────────

  it('shows the report dir as the highlight row', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(
      join(PRESCAN_REPORT_DIR, 'report-001.json'),
      JSON.stringify(buildReport()),
      'utf8'
    );

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('Report dir:');
    expect(output).toContain(PRESCAN_REPORT_DIR);
  });

  it('shows pattern count from SECRET_PATTERNS', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(
      join(PRESCAN_REPORT_DIR, 'report-001.json'),
      JSON.stringify(buildReport()),
      'utf8'
    );

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('Patterns:');
    expect(output).toMatch(/Patterns:\s+\d+\s+registered/);
  });

  it('shows last scan timestamp and target path', async () => {
    const report = buildReport({ scan_root: '/tmp/my-target', scanned_at: '2026-05-29T12:00:00.000Z' });
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(report), 'utf8');

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('Last scan:');
    expect(output).toContain('Last target:');
    expect(output).toContain('/tmp/my-target');
  });

  it('shows SAFE / FLAGGED / QUARANTINED counts in highlight rows', async () => {
    const report = buildReport({
      summary: { safe: 6, flagged: 3, quarantined: 1, errors: 0, total_detections: 4, detection_types: {} },
    });
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(report), 'utf8');

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('SAFE:');
    expect(output).toContain('6');
    expect(output).toContain('FLAGGED:');
    expect(output).toContain('3');
    expect(output).toContain('QUARANTINED:');
    expect(output).toContain('1');
    expect(output).toContain('ERRORS:');
    expect(output).toContain('0');
  });

  it('shows total detections count', async () => {
    const report = buildReport({
      summary: { ...buildReport().summary, total_detections: 99 },
    });
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(report), 'utf8');

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('Total detections:');
    expect(output).toContain('99');
  });

  it('shows detection types sorted by count descending', async () => {
    const report = buildReport({
      summary: {
        safe: 6, flagged: 3, quarantined: 1, errors: 0, total_detections: 4,
        detection_types: { 'API_KEY': 2, 'PRIVATE_KEY': 1, 'AWS_SECRET': 1 },
      },
    });
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(report), 'utf8');

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('Detection types:');
    expect(output).toContain('API_KEY');
    expect(output).toContain('PRIVATE_KEY');
    expect(output).toContain('AWS_SECRET');
  });

  it('loads the most recent report by mtime when multiple reports exist', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });

    // Write an old report first
    const oldReport = buildReport({ summary: { ...buildReport().summary, safe: 1, flagged: 1, quarantined: 1, errors: 0, total_detections: 1, detection_types: {} } });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'old.json'), JSON.stringify(oldReport), 'utf8');

    // Wait a tick then write a newer report
    await new Promise((r) => setTimeout(r, 10));
    const newReport = buildReport({ summary: { ...buildReport().summary, safe: 99, flagged: 99, quarantined: 99, errors: 0, total_detections: 99, detection_types: {} } });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'new.json'), JSON.stringify(newReport), 'utf8');

    await runStatusCmd();

    const output = consoleLogSpy.mock.calls.map((c: any) => c.join(' ')).join('\n');
    expect(output).toContain('99'); // Should show values from the newer report
  });

  // ── Output format ───────────────────────────────────────────────────────

  it('uses a primary header line', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(buildReport()), 'utf8');

    await runStatusCmd();

    const firstLine = consoleLogSpy.mock.calls[0]?.join(' ') ?? '';
    expect(firstLine).toMatch(/Prescan Status/);
  });

  it('uses a rule line (─ repeated) under the header', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(buildReport()), 'utf8');

    await runStatusCmd();

    const ruleLine = consoleLogSpy.mock.calls.find((c: any) =>
      c.some((r: any) => typeof r === 'string' && /^─+$/.test(r.trim()))
    );
    expect(ruleLine).toBeDefined();
  });

  it('does not emit raw secret values in output', async () => {
    // A report could theoretically embed secret values if it wasn't sanitized;
    // confirm the output contains no long hex-like strings that look like keys
    const report = buildReport();
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    writeFileSync(join(PRESCAN_REPORT_DIR, 'report-001.json'), JSON.stringify(report), 'utf8');

    await runStatusCmd();

    const allOutput = consoleLogSpy.mock.calls.flat().join(' ');
    // Very long hex strings (40+ chars) in output would be a red flag for raw secrets
    const rawSecretPattern = /[a-f0-9]{40,}/i;
    expect(rawSecretPattern.test(allOutput)).toBe(false);
  });

  it('shows graceful "no reports found" when the dir exists but is empty', async () => {
    mkdirSync(PRESCAN_REPORT_DIR, { recursive: true, mode: 0o700 });
    // Leave the dir empty (no .json files)

    await runStatusCmd();

    const warningLine = consoleLogSpy.mock.calls.find(([line]: any) =>
      String(line).includes('No reports found')
    );
    expect(warningLine).toBeDefined();
  });
});
