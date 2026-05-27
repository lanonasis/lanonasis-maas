import { Command } from "commander";
import { PrivacySDK } from "@lanonasis/privacy-sdk";
import {
  prescan,
  saveReport,
  printSummary,
  getFlaggedFiles,
  getQuarantinedFiles,
} from "@lanonasis/secret-prescan";
import type { ScanConfig } from "@lanonasis/secret-prescan";

export const prescanScanCommand = new Command("scan")
  .description("Scan a directory for secrets/PII before MIRA context extraction")
  .argument("<path>", "Root directory to scan")
  .option(
    "-o, --output <dir>",
    "Output directory for JSON report (default: ~/.hermes/private/context-scans/)"
  )
  .option(
    "-e, --exclude <patterns...>",
    "Glob patterns to exclude from scanning"
  )
  .option(
    "--extensions <extensions...>",
    "File extensions to scan (default: .ts,.tsx,.js,.jsx,.mjs,.json,.env,.md,.yml)"
  )
  .option(
    "--max-file-size <bytes>",
    "Maximum file size to scan in bytes (default: 10485760 = 10MB)"
  )
  .option(
    "--include-clean",
    "Include clean files in the JSON report"
  )
  .option(
    "--quarantine-threshold <count>",
    "Minimum critical detections to classify a file as quarantined (default: 1)"
  )
  .action(async (path: string, options: any) => {
    const fs = await import("fs");
    if (!fs.existsSync(path)) {
      console.error(`❌ Error: Path does not exist: ${path}`);
      process.exit(1);
    }
    const stat = fs.statSync(path);
    if (!stat.isDirectory()) {
      console.error(`❌ Error: Path is not a directory: ${path}`);
      process.exit(1);
    }

    const config: ScanConfig = {
      target_path: path,
      output_dir: options.output,
      exclude_patterns: options.exclude,
      include_extensions: options.extensions,
      max_file_size: options.maxFileSize ? parseInt(options.maxFileSize, 10) : undefined,
      include_clean: options.includeClean ?? false,
      quarantine_threshold: options.quarantineThreshold
        ? parseInt(options.quarantineThreshold, 10)
        : 1,
    };

    if (config.max_file_size !== undefined && isNaN(config.max_file_size)) {
      console.error(`❌ Error: --max-file-size must be a number`);
      process.exit(1);
    }
    if (config.quarantine_threshold !== undefined && isNaN(config.quarantine_threshold)) {
      console.error(`❌ Error: --quarantine-threshold must be a number`);
      process.exit(1);
    }

    console.error(`🔍 Starting prescan...`);
    console.error(`   Target: ${path}`);

    try {
      const sdk = new PrivacySDK();
      const report = prescan(sdk, config);

      printSummary(report);

      const reportPath = saveReport(report, config.output_dir);

      const flaggedFiles = getFlaggedFiles(report);
      const quarantinedFiles = getQuarantinedFiles(report);

      console.log("");
      console.log("---PRESCAN SUMMARY---");
      console.log(`total_files:${report.total_files}`);
      console.log(`safe:${report.summary.safe}`);
      console.log(`flagged:${report.summary.flagged}`);
      console.log(`quarantined:${report.summary.quarantined}`);
      console.log(`errors:${report.summary.errors}`);
      console.log(`total_detections:${report.summary.total_detections}`);
      console.log(`report_path:${reportPath}`);

      if (flaggedFiles.length > 0) {
        console.log("");
        console.log("---FLAGGED FILES---");
        flaggedFiles.forEach((f: string) => console.log(`FLAGGED:${f}`));
      }

      if (quarantinedFiles.length > 0) {
        console.log("");
        console.log("---QUARANTINED FILES---");
        quarantinedFiles.forEach((f: string) => console.log(`QUARANTINED:${f}`));
      }

      if (quarantinedFiles.length > 0) {
        console.error(`\n🔴 Quarantined files found. MIRA extraction should NOT proceed.`);
        process.exit(2);
      } else if (flaggedFiles.length > 0) {
        console.error(`\n⚠️  Flagged files found. Review required before MIRA extraction.`);
        process.exit(1);
      } else {
        console.error(`\n✅ No issues found. Safe for MIRA extraction.`);
        process.exit(0);
      }
    } catch (error: any) {
      console.error(`❌ Prescan failed: ${error.message}`);
      process.exit(1);
    }
  });
