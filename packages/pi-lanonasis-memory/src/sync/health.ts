/**
 * health.ts — periodic MaaS reachability probe.
 *
 * The SyncWorker pauses while the API is unreachable. Rather than
 * every worker tick re-checking the API, a single HealthMonitor keeps
 * a boolean `online` flag refreshed on an interval. The worker reads
 * `isOnline()` synchronously between ticks.
 *
 * Contract (PR5):
 *   - probes only when `getDepth() > 0`
 *   - intervalMs defaults to 60_000 (1 minute)
 *   - thrown errors from `client.health()` are swallowed
 *   - timers are unref()'d so the monitor never blocks process exit
 *   - start() is idempotent; stop() is safe to call when not started
 *
 * The monitor does NOT log anything. Logging the result would be a
 * information leak in environments where stdout is captured.
 */

import type { MaasClient } from "./maas-client.js";

export interface HealthMonitorOptions {
  client: MaasClient;
  intervalMs?: number;
  getDepth: () => number;
}

export class HealthMonitor {
  private readonly client: MaasClient;
  private readonly intervalMs: number;
  private readonly getDepth: () => number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private online = false;

  constructor(options: HealthMonitorOptions) {
    this.client = options.client;
    this.intervalMs = options.intervalMs ?? 60_000;
    this.getDepth = options.getDepth;
  }

  /** Begin probing. Idempotent. */
  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    // Don't keep the event loop alive just for the health probe.
    if (typeof (this.timer as { unref?: () => void }).unref === "function") {
      (this.timer as { unref: () => void }).unref();
    }
  }

  /** Stop probing. Safe to call when not started. */
  stop(): void {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  /** Latest known reachability. False until the first successful probe. */
  isOnline(): boolean {
    return this.online;
  }

  /** One probe cycle. Exposed for tests; production uses start(). */
  async tick(): Promise<void> {
    if (this.getDepth() === 0) {
      // Don't waste network round-trips when there's nothing to push.
      // Stay in whatever the last known state was.
      return;
    }
    try {
      const ok = await this.client.health();
      this.online = !!ok;
    } catch {
      this.online = false;
    }
  }
}
