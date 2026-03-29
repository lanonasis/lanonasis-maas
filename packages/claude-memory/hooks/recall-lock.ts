import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

function getRecallLockDir(): string {
  return join(homedir(), ".lanonasis", ".recall-lock");
}

function toLockFileName(sessionId: string): string {
  return encodeURIComponent(sessionId || "unknown-session");
}

export function getRecallLockPath(sessionId: string): string {
  return join(getRecallLockDir(), toLockFileName(sessionId));
}

export function acquireRecallLock(sessionId: string): boolean {
  const lockDir = getRecallLockDir();
  const lockPath = getRecallLockPath(sessionId);
  mkdirSync(lockDir, { recursive: true });
  try {
    writeFileSync(lockPath, String(Date.now()), { flag: "wx" });
    return true;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    return true;
  }
}

export function clearRecallLock(sessionId: string): void {
  const lockPath = getRecallLockPath(sessionId);
  if (!existsSync(lockPath)) {
    return;
  }
  rmSync(lockPath, { force: true });
}
