import { Command } from "commander";
import { prescanAuditCommand, prescanSafeCommand } from "./audit.js";
import { prescanScanCommand } from "./scan.js";

export const prescanCommand = new Command("prescan")
  .name("prescan")
  .description(
    "Scan files/directories for secrets and PII before MIRA context extraction. " +
    "Reports are value-stripped (no raw secrets in output). " +
    "Outputs machine-parseable summaries for scripting/CI integration."
  )
  .addCommand(prescanScanCommand)
  .addCommand(prescanAuditCommand)
  .addCommand(prescanSafeCommand);

export { prescanScanCommand } from "./scan.js";
export { prescanAuditCommand, prescanSafeCommand } from "./audit.js";
