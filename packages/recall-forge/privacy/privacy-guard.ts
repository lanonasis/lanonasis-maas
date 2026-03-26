// Privacy Guard — two-stage protection pipeline
// Stage 1: secret-redactor (credentials — always on)
// Stage 2: privacy-sdk (PII — controlled by privacyMode)
//
// This is the module that fixes the gap: before this, redactSecrets() was only
// wired into the `extract` CLI path. Every memory write path (memory_store tool,
// capture hooks, local fallback) ran unredacted content through to storage.

import { PrivacySDK } from "@lanonasis/privacy-sdk";
import type { DetectionResult } from "@lanonasis/privacy-sdk";
import { redactSecrets } from "../extraction/secret-redactor.js";
import type { LanonasisConfig } from "../config.js";

export type PrivacyMode = "off" | "detect" | "mask";

export interface PrivacyReport {
  secretsFound: number;
  secretTypes: string[];
  piiFound: boolean;
  piiTypes: string[];
  piiSensitivity: "none" | "low" | "medium" | "high" | "critical";
  regulations: string[];
  action: "passthrough" | "redacted" | "masked" | "detected" | "redacted+masked";
  timestamp: string;
}

export interface GuardResult {
  content: string;
  report: PrivacyReport;
}

function topSensitivity(detected: DetectionResult[]): PrivacyReport["piiSensitivity"] {
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  if (detected.length === 0) return "none";
  return detected.reduce((top, r) =>
    (order[r.sensitivity] ?? 0) > (order[top.sensitivity] ?? 0) ? r : top
  ).sensitivity as PrivacyReport["piiSensitivity"];
}

export class PrivacyGuard {
  private sdk: PrivacySDK;
  private mode: PrivacyMode;
  private locale: string;
  private notifyUrl: string;
  private logger?: { warn(msg: string): void };

  constructor(cfg: LanonasisConfig, logger?: { warn(msg: string): void }) {
    this.mode = (cfg.privacyMode as PrivacyMode) ?? "mask";
    this.locale = cfg.privacyLocale ?? "US";
    this.notifyUrl = cfg.privacyNotifyUrl ?? "";
    this.logger = logger;
    this.sdk = new PrivacySDK({
      enableMasking: true,
      enableAutoDetect: true,
      confidenceThreshold: 0.85,
      detectFieldNames: true,
      gdprMode: true,
      auditLog: false,
    });
  }

  process(content: string): GuardResult {
    // Stage 1: credential stripping — always-on, mode does not disable this
    const { text: stage1, secretsFound, types: secretTypes } = redactSecrets(content);

    if (this.mode === "off") {
      const action: PrivacyReport["action"] = secretsFound > 0 ? "redacted" : "passthrough";
      const report: PrivacyReport = {
        secretsFound, secretTypes, piiFound: false,
        piiTypes: [], piiSensitivity: "none", regulations: [],
        action, timestamp: new Date().toISOString(),
      };
      if (action !== "passthrough") this.notify(report);
      return { content: stage1, report };
    }

    // Stage 2: PII detection via privacy-sdk
    const locale = this.locale as Parameters<typeof this.sdk.detect>[1] extends { locale?: infer L } ? L : never;
    const detected = this.sdk.detect(stage1, { locale })
      .filter((r) => r.confidence >= 0.85);

    const piiFound = detected.length > 0;
    const finalContent = this.mode === "mask" && piiFound
      ? this.sdk.detectAndMask(stage1, { locale })
      : stage1;

    let action: PrivacyReport["action"] = "passthrough";
    if (secretsFound > 0 && piiFound) action = "redacted+masked";
    else if (secretsFound > 0) action = "redacted";
    else if (piiFound) action = this.mode === "mask" ? "masked" : "detected";

    const report: PrivacyReport = {
      secretsFound,
      secretTypes,
      piiFound,
      piiTypes: [...new Set(detected.map((r) => r.type))],
      piiSensitivity: topSensitivity(detected),
      regulations: [...new Set(detected.flatMap((r) => r.regulations))],
      action,
      timestamp: new Date().toISOString(),
    };

    if (action !== "passthrough") this.notify(report);
    return { content: finalContent, report };
  }

  /** Tags to merge into memory tags based on what was found */
  tagsFrom(report: PrivacyReport): string[] {
    const tags: string[] = [];
    if (report.secretsFound > 0) tags.push("privacy:redacted");
    for (const type of report.piiTypes) tags.push(`pii:${type}`);
    for (const reg of report.regulations) tags.push(`compliant:${reg.toLowerCase()}`);
    return tags;
  }

  /** Metadata to merge into memory.metadata — omitted entirely if passthrough */
  metaFrom(report: PrivacyReport): Record<string, unknown> | undefined {
    if (report.action === "passthrough") return undefined;
    return {
      privacy: {
        action: report.action,
        ...(report.secretsFound > 0 && { secretsFound: report.secretsFound }),
        ...(report.secretTypes.length > 0 && { secretTypes: report.secretTypes }),
        ...(report.piiFound && { piiTypes: report.piiTypes }),
        ...(report.piiSensitivity !== "none" && { piiSensitivity: report.piiSensitivity }),
        ...(report.regulations.length > 0 && { regulations: report.regulations }),
        timestamp: report.timestamp,
      },
    };
  }

  /** Fire-and-forget webhook — never blocks the write path, never throws */
  private notify(report: PrivacyReport): void {
    if (!this.notifyUrl) return;
    fetch(this.notifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "privacy.intervention",
        plugin: "recall-forge",
        action: report.action,
        secretsFound: report.secretsFound,
        piiTypes: report.piiTypes,
        piiSensitivity: report.piiSensitivity,
        regulations: report.regulations,
        timestamp: report.timestamp,
      }),
    }).catch((err) => {
      if (this.logger) {
        const msg = err instanceof Error ? err.message : "unknown";
        this.logger.warn(`[recall-forge] privacy webhook failed: ${msg}`);
      }
    });
  }
}
