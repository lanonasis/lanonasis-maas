/**
 * Prescan UX Integration Tests
 *
 * Covers:
 * - completion.ts: generateCompletionData includes shipped prescan run/status subcommands
 *   and prescan contextual data (output formats, fail-on choices, classifications)
 * - guide.ts: quickStartCommand output includes all four prescan subcommands
 * - Additional behavioral edge cases for prescan run:
 *   - --fail-on none exits 0 even with flagged/quarantined files (explicit override)
 *   - --save --json combined flags produce both the file and JSON output
 *   - audit command exits 2/1/0 for QUARANTINED/FLAGGED/SAFE classifications
 *   - safe command exits 1/0 for not-safe/safe classifications
 * - No raw secrets in any stdout/stderr output
 *
 * @note Global setup (src/__tests__/setup.ts) mocks console.* and process.exit
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, writeFileSync, rmSync, mkdtempSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Mock chalk before importing modules ─────────────────────────────────────

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

// ─── Mock external dependencies (must include all exports used across modules) ─

jest.unstable_mockModule('@lanonasis/secret-prescan', () => ({
  prescan: jest.fn(),
  saveReport: jest.fn(),
  printSummary: jest.fn(),
  getFlaggedFiles: jest.fn(),
  getQuarantinedFiles: jest.fn(),
  prescanFile: jest.fn(),
  isSafeForExtraction: jest.fn(),
  registerSecretPatterns: jest.fn(),
  SECRET_PATTERNS: ['PATTERN_1', 'PATTERN_2'],
}));

jest.unstable_mockModule('@lanonasis/privacy-sdk', () => ({
  PrivacySDK: jest.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRESCAN_REPORT_DIR = join(homedir(), '.lanonasis', 'security', 'prescan');

// Build a minimal ScanReport with no real secrets
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
      detection_types: { 'FAKE_API_KEY': 2, 'FAKE_PRIVATE_KEY': 1, 'FAKE_AWS_SECRET': 1 },
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

// ─── Completions Test Suite ───────────────────────────────────────────────────

describe('prescan completions', () => {
  let consoleLogSpy: jest.Mock;

  beforeEach(async () => {
    consoleLogSpy = jest.fn<() => void>();
    consoleLogSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('generateCompletionData includes prescan run with all required options', async () => {
    const { generateCompletionData } = await import('../commands/completion.js');

    const data = await generateCompletionData();
    const prescanCmd = data.commands.find((c) => c.name === 'prescan');

    expect(prescanCmd).toBeDefined();
    expect(prescanCmd!.description).toContain('prescan');

    const runSub = prescanCmd!.subcommands?.find((s) => s.name === 'run');
    expect(runSub).toBeDefined();

    const optionNames = runSub!.options?.map((o) => o.name) ?? [];
    expect(optionNames).toContain('--json');
    expect(optionNames).toContain('--save');
    expect(optionNames).toContain('--fail-on');
    expect(optionNames).toContain('--ci');
    expect(optionNames).toContain('--exclude');
  });

  it('generateCompletionData does not advertise legacy prescan audit/safe subcommands', async () => {
    const { generateCompletionData } = await import('../commands/completion.js');

    const data = await generateCompletionData();
    const prescanCmd = data.commands.find((c) => c.name === 'prescan');
    const auditSub = prescanCmd?.subcommands?.find((s) => s.name === 'audit');
    const safeSub = prescanCmd?.subcommands?.find((s) => s.name === 'safe');

    expect(auditSub).toBeUndefined();
    expect(safeSub).toBeUndefined();
  });

  it('generateCompletionData includes prescan contextual data', async () => {
    const { generateCompletionData } = await import('../commands/completion.js');

    const data = await generateCompletionData();

    // --fail-on choices should be present
    const prescanCmd = data.commands.find((c) => c.name === 'prescan');
    const runSub = prescanCmd?.subcommands?.find((s) => s.name === 'run');
    const failOnOpt = runSub?.options?.find((o) => o.name === '--fail-on');

    expect(failOnOpt).toBeDefined();
    expect(failOnOpt!.type).toBe('choice');
    expect(failOnOpt!.choices).toEqual(['none', 'flagged', 'quarantined']);

    // contextualData should carry prescan-specific fields
    expect(data.contextualData.prescanOutputFormats).toEqual(['table', 'json']);
    expect(data.contextualData.prescanFailOnChoices).toEqual(['none', 'flagged', 'quarantined']);
    expect(data.contextualData.prescanClassifications).toEqual(['SAFE', 'FLAGGED', 'QUARANTINED', 'ERROR']);
  });
});

// ─── Guide quick-start output test ───────────────────────────────────────────

describe('prescan guide quick-start', () => {
  let consoleLogSpy: jest.Mock;
  let consoleErrorSpy: jest.Mock;

  beforeEach(async () => {
    consoleLogSpy = jest.fn<() => void>();
    consoleErrorSpy = jest.fn<() => void>();
    // Redirect console.log/error to our spies so we can capture output
    Object.defineProperty(console, 'log', { value: consoleLogSpy, configurable: true });
    Object.defineProperty(console, 'error', { value: consoleErrorSpy, configurable: true });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('quickStartCommand includes the shipped prescan subcommands', async () => {
    const { quickStartCommand } = await import('../commands/guide.js');

    await quickStartCommand();

    const capturedOutput = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join('\n');
    expect(capturedOutput).toContain('prescan run');
    expect(capturedOutput).toContain('prescan status');
    expect(capturedOutput).not.toContain('prescan audit');
    expect(capturedOutput).not.toContain('prescan safe');
    expect(capturedOutput).toContain('--ci');
  });
});

// ─── Additional prescan run behavioral tests ──────────────────────────────────
// These tests import prescan.js which transitively imports prescan/audit.ts.
// The module-scoped mocks at the top of this file cover all required exports.

describe('prescan run additional behaviors', () => {
  let consoleLogSpy: jest.Mock;
  let consoleErrorSpy: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: jest.Mock<any, any>;

  beforeEach(async () => {
    consoleLogSpy = jest.fn<() => void>();
    consoleErrorSpy = jest.fn<() => void>();
    Object.defineProperty(console, 'log', { value: consoleLogSpy, configurable: true });
    Object.defineProperty(console, 'error', { value: consoleErrorSpy, configurable: true });
    mockExit = process.exit as unknown as jest.Mock;
    mockExit.mockClear();

    // Re-import to get the current mocked bindings (hoisted above)
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.prescan.mockReset();
    mod.saveReport.mockReset();
    mod.getFlaggedFiles.mockReset();
    mod.getQuarantinedFiles.mockReset();

    mod.prescan.mockReturnValue(buildReport());
    mod.getFlaggedFiles.mockReturnValue([]);
    mod.getQuarantinedFiles.mockReturnValue([]);
    mod.saveReport.mockReturnValue('/fake/.lanonasis/security/prescan/report.json');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    if (existsSync(PRESCAN_REPORT_DIR)) {
      try { rmSync(PRESCAN_REPORT_DIR, { recursive: true }); } catch { /* skip */ }
    }
  });

  async function runScanCmd(args: string[]) {
    const { default: prescanCommand } = await import('../commands/prescan.js');
    const runCmd = (prescanCommand as any).commands.find((c: any) => c.name() === 'run');
    await runCmd.parseAsync(['node', 'test', ...args]);
  }

  // --fail-on none: explicit override, ignores findings
  it('--fail-on none exits 0 even when quarantined files exist', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.getQuarantinedFiles.mockReturnValue(['file-a.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'none']);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // --save and --json together
  it('--save --json both persists the report file and prints JSON', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    const report = buildReport({ total_files: 7 });
    mod.prescan.mockReturnValue(report);
    mod.getFlaggedFiles.mockReturnValue(['flagged-file.txt']);
    mod.getQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--save', '--json']);

      // JSON printed to stdout
      const jsonCall = (consoleLogSpy as jest.Mock).mock.calls.find(([line]: any) => {
        try { JSON.parse(String(line)); return true; } catch { return false; }
      });
      expect(jsonCall).toBeDefined();
      const parsed = JSON.parse(String(jsonCall![0]));
      expect(parsed.total_files).toBe(7);
      expect(parsed.report_path).toBeDefined();

      // saveReport called (file persisted)
      expect(mod.saveReport.mock.calls.length).toBeGreaterThan(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // --ci --fail-on none: explicit --fail-on overrides --ci default
  it('--ci can be overridden with --fail-on none', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.getQuarantinedFiles.mockReturnValue(['file-a.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--ci', '--fail-on', 'none']);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // No raw secrets in full output (stdout + stderr combined)
  it('emits no raw secret hex strings in any output', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    const report = buildReport({
      summary: {
        ...buildReport().summary,
        detection_types: { 'FAKE_API_KEY': 1, 'FAKE_PRIVATE_KEY': 1 },
      },
    });
    mod.prescan.mockReturnValue(report);
    mod.getFlaggedFiles.mockReturnValue(['file-a.txt', 'file-b.txt']);
    mod.getQuarantinedFiles.mockReturnValue(['file-c.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--json']);

      const allStdout = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      const allStderr = (consoleErrorSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      const combined = allStdout + ' ' + allStderr;

      // 40+ hex chars would indicate a raw secret
      const rawSecretPattern = /[a-f0-9]{40,}/i;
      expect(rawSecretPattern.test(combined)).toBe(false);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });
});

// ─── Audit command exit codes ────────────────────────────────────────────────

describe('prescan audit exit codes', () => {
  let consoleLogSpy: jest.Mock;
  let consoleErrorSpy: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: jest.Mock<any, any>;

  beforeEach(async () => {
    consoleLogSpy = jest.fn<() => void>();
    consoleErrorSpy = jest.fn<() => void>();
    Object.defineProperty(console, 'log', { value: consoleLogSpy, configurable: true });
    Object.defineProperty(console, 'error', { value: consoleErrorSpy, configurable: true });
    mockExit = process.exit as unknown as jest.Mock;
    mockExit.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  async function runAuditCmd(args: string[]) {
    // Import the audit command directly — avoids circular import through prescan.ts
    const { prescanAuditCommand } = await import('../commands/prescan/audit.js');
    const auditCmd = prescanAuditCommand as any;
    await auditCmd.parseAsync(['node', 'test', ...args]);
  }

  it('prints classification and exits 2 for QUARANTINED', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.prescanFile.mockReturnValue({
      classification: 'QUARANTINED',
      detection_count: 3,
      detections: [],
      detections_by_type: { FAKE_API_KEY: 3 },
    });

    // Use a real temp file path so fs.statSync succeeds before mock takes effect
    const tmpFile = join(__dirname, 'audit-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runAuditCmd([tmpFile]);
      expect(mockExit).toHaveBeenCalledWith(2);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      expect(output).toContain('QUARANTINED');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });

  it('prints classification and exits 1 for FLAGGED', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.prescanFile.mockReturnValue({
      classification: 'FLAGGED',
      detection_count: 1,
      detections: [],
      detections_by_type: { FAKE_PRIVATE_KEY: 1 },
    });

    const tmpFile = join(__dirname, 'audit-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runAuditCmd([tmpFile]);
      expect(mockExit).toHaveBeenCalledWith(1);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      expect(output).toContain('FLAGGED');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });

  it('prints classification and exits 0 for SAFE', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.prescanFile.mockReturnValue({
      classification: 'SAFE',
      detection_count: 0,
      detections: [],
      detections_by_type: {},
    });

    const tmpFile = join(__dirname, 'audit-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runAuditCmd([tmpFile]);
      expect(mockExit).toHaveBeenCalledWith(0);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      expect(output).toContain('SAFE');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });

  it('--verbose flag shows detection details', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.prescanFile.mockReturnValue({
      classification: 'FLAGGED',
      detection_count: 2,
      detections: [
        { type: 'FAKE_API_KEY', sensitivity: 'high', confidence: 0.95, masked_sample: 'API_KEY: [REDACTED]', regulations: ['GDPR'] },
        { type: 'FAKE_PRIVATE_KEY', sensitivity: 'critical', confidence: 0.99, masked_sample: 'PRIVATE_KEY: [REDACTED]', regulations: ['GDPR', 'PCI'] },
      ],
      detections_by_type: { FAKE_API_KEY: 1, FAKE_PRIVATE_KEY: 1 },
    });

    const tmpFile = join(__dirname, 'audit-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runAuditCmd([tmpFile, '--verbose']);
      expect(mockExit).toHaveBeenCalledWith(1);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      // --verbose should show the detection type names
      expect(output).toContain('FAKE_API_KEY');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });
});

// ─── Safe command exit codes ─────────────────────────────────────────────────

describe('prescan safe exit codes', () => {
  let consoleLogSpy: jest.Mock;
  let consoleErrorSpy: jest.Mock;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: jest.Mock<any, any>;

  beforeEach(async () => {
    consoleLogSpy = jest.fn<() => void>();
    consoleErrorSpy = jest.fn<() => void>();
    Object.defineProperty(console, 'log', { value: consoleLogSpy, configurable: true });
    Object.defineProperty(console, 'error', { value: consoleErrorSpy, configurable: true });
    mockExit = process.exit as unknown as jest.Mock;
    mockExit.mockClear();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  async function runSafeCmd(args: string[]) {
    const { prescanSafeCommand } = await import('../commands/prescan/audit.js');
    const safeCmd = prescanSafeCommand as any;
    await safeCmd.parseAsync(['node', 'test', ...args]);
  }

  it('exits 0 and prints "safe for extraction" when file is safe', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.isSafeForExtraction.mockReturnValue(true);

    const tmpFile = join(__dirname, 'safe-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runSafeCmd([tmpFile]);
      expect(mockExit).toHaveBeenCalledWith(0);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      expect(output).toContain('safe for extraction');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });

  it('exits 1 and prints "NOT safe for extraction" when file is not safe', async () => {
    const mod = await import('@lanonasis/secret-prescan') as any;
    mod.isSafeForExtraction.mockReturnValue(false);

    const tmpFile = join(__dirname, 'safe-test-file.txt');
    writeFileSync(tmpFile, 'test content');
    try {
      await runSafeCmd([tmpFile]);
      expect(mockExit).toHaveBeenCalledWith(1);
      const output = (consoleLogSpy as jest.Mock).mock.calls.flatMap((c: any) => c).join(' ');
      expect(output).toContain('NOT safe for extraction');
    } finally {
      rmSync(tmpFile, { force: true });
    }
  });
});
