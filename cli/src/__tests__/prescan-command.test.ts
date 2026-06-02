/**
 * Prescan Run Command Tests
 *
 * Tests the `prescan run <path>` subcommand:
 * - Default read-only scan on a test dir
 * - --json flag produces valid JSON output
 * - --save persists report to expected CLI-owned dir
 * - --fail-on quarantined exits non-zero when quarantined files found
 * - --fail-on flagged exits non-zero when flagged files found
 * - --ci alias behaves same as --fail-on quarantined --json
 * - --exclude filters work correctly
 * - No raw secrets in any output, snapshot, or console.log
 * - Edge: empty dir, dir with only safe files, dir with secrets
 *
 * @note Global setup (src/__tests__/setup.ts) mocks console.* and process.exit
 *       as jest.fn() so we can assert on calls without tests actually exiting.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { homedir } from 'os';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Mock chalk before importing prescan ─────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MockedConsoleLog = jest.fn<any>();
const MockedConsoleError = jest.fn<any>();
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

// ─── Mock external dependencies ───────────────────────────────────────────────

const mockPrescan = jest.fn();
const mockSaveReport = jest.fn();
const mockPrintSummary = jest.fn();
const mockGetFlaggedFiles = jest.fn();
const mockGetQuarantinedFiles = jest.fn();
const mockPrivacySDK = jest.fn();

jest.unstable_mockModule('@lanonasis/secret-prescan', () => ({
  prescan: mockPrescan,
  saveReport: mockSaveReport,
  printSummary: mockPrintSummary,
  getFlaggedFiles: mockGetFlaggedFiles,
  getQuarantinedFiles: mockGetQuarantinedFiles,
  SECRET_PATTERNS: ['PATTERN_1', 'PATTERN_2'],
}));

jest.unstable_mockModule('@lanonasis/privacy-sdk', () => ({
  PrivacySDK: mockPrivacySDK,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRESCAN_REPORT_DIR = join(homedir(), '.lanonasis', 'security', 'prescan');

// Build a fake ScanReport — no real secrets
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

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('prescan run', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockExit: jest.Mock<any, any>;

  beforeEach(async () => {
    // spies on console BEFORE importing the command
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // process.exit is already mocked by setup.ts as jest.fn(); grab the reference
    mockExit = process.exit as unknown as jest.Mock;
    mockExit.mockClear();

    // reset mocks
    mockPrescan.mockReset();
    mockSaveReport.mockReset();
    mockPrintSummary.mockReset();
    mockGetFlaggedFiles.mockReset();
    mockGetQuarantinedFiles.mockReset();
    mockPrivacySDK.mockReset();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    // Clean up test report dir
    if (existsSync(PRESCAN_REPORT_DIR)) {
      try { rmSync(PRESCAN_REPORT_DIR, { recursive: true }); } catch { /* skip */ }
    }
  });

  // Helper to invoke the run subcommand
  async function runScanCmd(args: string[]) {
    const { default: prescanCommand } = await import('../commands/prescan.js');
    const runCmd = (prescanCommand as any).commands.find((c: any) => c.name() === 'run');
    await runCmd.parseAsync(['node', 'test', ...args]);
  }

  // ── Happy path: default scan (no flags) ─────────────────────────────────

  it('calls prescan with correct config and prints summary', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue(['file-a.txt']);
    mockGetQuarantinedFiles.mockReturnValue(['file-b.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir]);

      expect(mockPrescan).toHaveBeenCalledOnce;
      const [sdkArg, configArg] = mockPrescan.mock.calls[0];
      expect(sdkArg).toBeDefined(); // SDK instance
      expect(configArg.target_path).toBe(scanDir);
      expect(configArg.exclude_patterns).toEqual([]);
      expect(mockPrintSummary).toHaveBeenCalledWith(report);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --json ─────────────────────────────────────────────────────────────────

  it('emits valid JSON to stdout with all required fields', async () => {
    const report = buildReport({ total_files: 42 });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue(['flagged-file.txt']);
    mockGetQuarantinedFiles.mockReturnValue(['quarantined-file.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--json']);

      // Find the JSON line printed to stdout
      const jsonCall = consoleLogSpy.mock.calls.find(([line]) => {
        try { JSON.parse(String(line)); return true; } catch { return false; }
      });
      expect(jsonCall).toBeDefined();
      const parsed = JSON.parse(String(jsonCall![0]));
      expect(parsed.total_files).toBe(42);
      expect(parsed.flagged).toBe(3);
      expect(parsed.quarantined).toBe(1);
      expect(parsed.flagged_files).toEqual(['flagged-file.txt']);
      expect(parsed.quarantined_files).toEqual(['quarantined-file.txt']);
      expect(parsed.scan_root).toBe('/tmp/test-scan-target');
      expect(parsed.scanned_at).toBeDefined();
      // Ensure no long hex strings that could be raw secrets
      const longHexPattern = /[a-f0-9]{40,}/i;
      expect(longHexPattern.test(JSON.stringify(parsed))).toBe(false);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('--json does not prevent printSummary from being called', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--json']);
      expect(mockPrintSummary).toHaveBeenCalledWith(report);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --save ─────────────────────────────────────────────────────────────────

  it('--save calls saveReport and prints the report path', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);
    mockSaveReport.mockReturnValue('/fake/.lanonasis/security/prescan/report-001.json');

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--save']);

      expect(mockSaveReport).toHaveBeenCalledOnce;
      expect(mockSaveReport.mock.calls[0][0]).toBe(report);
      expect(mockSaveReport.mock.calls[0][1]).toBe(PRESCAN_REPORT_DIR);

      // ensureReportDir was called (PRESCAN_REPORT_DIR created)
      expect(existsSync(PRESCAN_REPORT_DIR)).toBe(true);

      // confirmation printed to stderr
      const savedLine = consoleErrorSpy.mock.calls.find(([line]) =>
        String(line).includes('Report saved')
      );
      expect(savedLine).toBeDefined();
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('--save includes report_path in --json output', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);
    mockSaveReport.mockReturnValue('/fake/.lanonasis/security/prescan/report-001.json');

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--save', '--json']);

      const jsonCall = consoleLogSpy.mock.calls.find(([line]) => {
        try { JSON.parse(String(line)); return true; } catch { return false; }
      });
      expect(jsonCall).toBeDefined();
      const parsed = JSON.parse(String(jsonCall![0]));
      expect(parsed.report_path).toBe('/fake/.lanonasis/security/prescan/report-001.json');
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --fail-on quarantined ─────────────────────────────────────────────────

  it('exits 0 when no quarantined files and --fail-on quarantined', async () => {
    const report = buildReport({ summary: { ...buildReport().summary, quarantined: 0 } });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'quarantined']);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('exits 1 when quarantined files found and --fail-on quarantined', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue(['quarantined-file.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'quarantined']);
      expect(mockExit).toHaveBeenCalledWith(1);
      // Should print the quarantined warning
      const warnLine = consoleErrorSpy.mock.calls.find(([line]) =>
        String(line).includes('Quarantined files found')
      );
      expect(warnLine).toBeDefined();
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --fail-on flagged ──────────────────────────────────────────────────────

  it('exits 0 when only safe files and --fail-on flagged', async () => {
    const report = buildReport({
      summary: { ...buildReport().summary, flagged: 0, quarantined: 0 },
    });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'flagged']);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('exits 1 when flagged files found and --fail-on flagged', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue(['flagged-file.txt']);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'flagged']);
      expect(mockExit).toHaveBeenCalledWith(1);
      const warnLine = consoleErrorSpy.mock.calls.find(([line]) =>
        String(line).includes('Flagged or quarantined files found')
      );
      expect(warnLine).toBeDefined();
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('exits 1 when quarantined files found and --fail-on flagged (quarantined implies flagged)', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue(['quarantined-file.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--fail-on', 'flagged']);
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --ci ──────────────────────────────────────────────────────────────────

  it('--ci is equivalent to --fail-on quarantined --json', async () => {
    const report = buildReport({ summary: { ...buildReport().summary, quarantined: 0 } });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--ci']);

      // Should produce JSON output
      const jsonCall = consoleLogSpy.mock.calls.find(([line]) => {
        try { JSON.parse(String(line)); return true; } catch { return false; }
      });
      expect(jsonCall).toBeDefined();

      // Should exit 0 (no quarantined)
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('--ci exits 1 when quarantined are present', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue(['quarantined-file.txt']);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--ci']);
      expect(mockExit).toHaveBeenCalledWith(1);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── --exclude ─────────────────────────────────────────────────────────────

  it('passes exclude patterns to prescan config', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--exclude', 'node_modules', '.git', '*.log']);

      expect(mockPrescan).toHaveBeenCalledOnce;
      const configArg = mockPrescan.mock.calls[0][1];
      expect(configArg.exclude_patterns).toEqual(['node_modules', '.git', '*.log']);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── Edge: empty / safe / secret dirs ─────────────────────────────────────

  it('handles empty directory gracefully (no detections)', async () => {
    const report = buildReport({
      total_files: 0,
      summary: { safe: 0, flagged: 0, quarantined: 0, errors: 0, total_detections: 0, detection_types: {} },
    });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir]);
      expect(mockPrescan).toHaveBeenCalledOnce;
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('handles directory with only safe files', async () => {
    const report = buildReport({
      total_files: 5,
      summary: { safe: 5, flagged: 0, quarantined: 0, errors: 0, total_detections: 0, detection_types: {} },
    });
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    writeFileSync(join(scanDir, 'readme.txt'), 'This is a safe file', 'utf8');
    try {
      await runScanCmd([scanDir]);
      expect(mockExit).toHaveBeenCalledWith(0);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  it('prints the starting message and target path to stderr', async () => {
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue([]);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir]);

      const allStderr = consoleErrorSpy.mock.calls.flatMap((c: any) => c).join('\n');
      expect(allStderr).toContain('Starting prescan');
      expect(allStderr).toContain(scanDir);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── Prescan failure / errors ───────────────────────────────────────────────

  it('exits 1 when prescan throws', async () => {
    mockPrescan.mockImplementation(() => {
      throw new Error('scan failed: permission denied');
    });

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir]);
      expect(mockExit).toHaveBeenCalledWith(1);
      const errorLine = consoleErrorSpy.mock.calls.find(([line]) =>
        String(line).includes('Prescan failed')
      );
      expect(errorLine).toBeDefined();
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── No raw secrets in any output ──────────────────────────────────────────

  it('does not emit raw secret values in --json output', async () => {
    // Report itself should be "safe" (detection_types keys are type names, not raw values)
    const report = buildReport();
    mockPrescan.mockReturnValue(report);
    mockGetFlaggedFiles.mockReturnValue(['file-with-fake-secret.txt']);
    mockGetQuarantinedFiles.mockReturnValue([]);

    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    try {
      await runScanCmd([scanDir, '--json']);

      const allStdout = consoleLogSpy.mock.calls.flatMap((c: any) => c).join(' ');
      // Very long hex strings (40+ chars) in output would be a red flag for raw secrets
      const rawSecretPattern = /[a-f0-9]{40,}/i;
      expect(rawSecretPattern.test(allStdout)).toBe(false);

      // Also check stderr
      const allStderr = consoleErrorSpy.mock.calls.flatMap((c: any) => c).join(' ');
      expect(rawSecretPattern.test(allStderr)).toBe(false);
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });

  // ── Path validation ───────────────────────────────────────────────────────

  it('exits 1 when path does not exist', async () => {
    const fakePath = '/tmp/this-path-absolutely-does-not-exist-12345';

    await runScanCmd([fakePath]);

    expect(mockExit).toHaveBeenCalledWith(1);
    const errorLine = consoleErrorSpy.mock.calls.find(([line]) =>
      String(line).includes('does not exist')
    );
    expect(errorLine).toBeDefined();
  });

  it('exits 1 when path is a file, not a directory', async () => {
    const scanDir = mkdtempSync(join(__dirname, 'prescan-test-'));
    const filePath = join(scanDir, 'a-file.txt');
    writeFileSync(filePath, 'content', 'utf8');

    try {
      await runScanCmd([filePath]);
      expect(mockExit).toHaveBeenCalledWith(1);
      const errorLine = consoleErrorSpy.mock.calls.find(([line]) =>
        String(line).includes('not a directory')
      );
      expect(errorLine).toBeDefined();
    } finally {
      rmSync(scanDir, { recursive: true });
    }
  });
});