import { Command } from "commander";
import { PrivacySDK } from "@lanonasis/privacy-sdk";
import {
  prescanFile,
  isSafeForExtraction,
  registerSecretPatterns,
} from "@lanonasis/secret-prescan";

export const prescanAuditCommand = new Command("audit")
  .description("Audit a single file for secrets/PII (CI-friendly)")
  .argument("<file>", "File to audit")
  .option(
    "-t, --threshold <count>",
    "Minimum critical detections to classify as quarantined (default: 1)"
  )
  .option("-v, --verbose", "Show all detections in detail")
  .action(async (file: string, options: any) => {
    const fs = await import("fs");
    if (!fs.existsSync(file)) {
      console.error(`❌ Error: File does not exist: ${file}`);
      process.exit(1);
    }
    const stat = fs.statSync(file);
    if (!stat.isFile()) {
      console.error(`❌ Error: Path is not a file: ${file}`);
      process.exit(1);
    }

    const threshold = options.threshold ? parseInt(options.threshold, 10) : 1;
    if (isNaN(threshold)) {
      console.error(`❌ Error: --threshold must be a number`);
      process.exit(1);
    }

    try {
      const sdk = new PrivacySDK();
      registerSecretPatterns(sdk);

      const result = prescanFile(sdk, file, threshold);

      const classification = result.classification;
      const emoji =
        classification === "SAFE"
          ? "✅"
          : classification === "FLAGGED"
          ? "⚠️"
          : classification === "QUARANTINED"
          ? "🔴"
          : "❌";

      console.log(`${emoji} ${file}: ${classification}`);
      console.log(`   Detections: ${result.detection_count}`);

      if (options.verbose && result.detections.length > 0) {
        console.log("");
        console.log("   Detection details:");
        for (const det of result.detections) {
          console.log(
            `     - ${det.type} (${det.sensitivity}) [${det.confidence.toFixed(2)}]`
          );
          console.log(`       masked: ${det.masked_sample}`);
          if (det.line_hint !== undefined) {
            console.log(`       line: ${det.line_hint}`);
          }
          console.log(`       regulations: ${det.regulations.join(", ")}`);
        }
      }

      if (Object.keys(result.detections_by_type).length > 0) {
        console.log("");
        console.log("   Detection types:");
        for (const [type, count] of Object.entries(result.detections_by_type)) {
          console.log(`     ${type}: ${count}`);
        }
      }

      if (classification === "QUARANTINED") {
        process.exit(2);
      } else if (classification === "FLAGGED") {
        process.exit(1);
      } else if (classification === "ERROR") {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (error: any) {
      console.error(`❌ Audit failed: ${error.message}`);
      process.exit(1);
    }
  });

export const prescanSafeCommand = new Command("safe")
  .description("Check if a file is safe for MIRA extraction")
  .argument("<file>", "File to check")
  .action(async (file: string) => {
    const fs = await import("fs");
    if (!fs.existsSync(file)) {
      console.error(`❌ Error: File does not exist: ${file}`);
      process.exit(1);
    }

    try {
      const sdk = new PrivacySDK();
      registerSecretPatterns(sdk);

      const safe = isSafeForExtraction(sdk, file);

      if (safe) {
        console.log(`✅ ${file}: safe for extraction`);
        process.exit(0);
      } else {
        console.log(`🔴 ${file}: NOT safe for extraction`);
        process.exit(1);
      }
    } catch (error: any) {
      console.error(`❌ Check failed: ${error.message}`);
      process.exit(1);
    }
  });
