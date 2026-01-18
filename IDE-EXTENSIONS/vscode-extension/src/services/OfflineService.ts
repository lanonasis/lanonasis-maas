import * as vscode from 'vscode';

export interface OfflineStatus {
  online: boolean;
  lastChecked: number | null;
  lastError?: string;
}

interface OfflineServiceOptions {
  getHealthUrl: () => string;
  heartbeatIntervalMs?: number;
  heartbeatTimeoutMs?: number;
}

export class OfflineService implements vscode.Disposable {
  private status: OfflineStatus = { online: true, lastChecked: null };
  private readonly emitter = new vscode.EventEmitter<OfflineStatus>();
  private readonly heartbeatIntervalMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly statusBarItem: vscode.StatusBarItem;
  private intervalId?: NodeJS.Timeout;

  constructor(
    private readonly output: vscode.OutputChannel,
    private readonly options: OfflineServiceOptions
  ) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30000;
    this.heartbeatTimeoutMs = options.heartbeatTimeoutMs ?? 4000;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      98
    );
    this.updateStatusBar();
  }

  public readonly onDidChangeStatus = this.emitter.event;

  public start(): void {
    void this.checkNow();
    this.intervalId = setInterval(() => {
      void this.checkNow();
    }, this.heartbeatIntervalMs);
  }

  public isOnline(): boolean {
    return this.status.online;
  }

  public getStatus(): OfflineStatus {
    return { ...this.status };
  }

  public async checkNow(): Promise<void> {
    const healthUrl = this.options.getHealthUrl();
    if (!healthUrl) {
      this.updateStatus(true);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.heartbeatTimeoutMs);

    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Client-Type': 'vscode-extension'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        this.updateStatus(true);
      } else {
        this.updateStatus(false, `Health check ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus(false, message);
    }
  }

  private updateStatus(online: boolean, error?: string): void {
    const changed = this.status.online !== online;
    this.status = {
      online,
      lastChecked: Date.now(),
      lastError: online ? undefined : error
    };

    if (changed) {
      const detail = error ? ` (${error})` : '';
      this.output.appendLine(`[OfflineService] ${online ? 'Online' : 'Offline'}${detail}`);
      this.emitter.fire(this.getStatus());
    }

    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    if (this.status.online) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = '$(cloud-off) Offline';
    this.statusBarItem.tooltip = this.status.lastError
      ? `Lanonasis Memory: Offline (${this.status.lastError})`
      : 'Lanonasis Memory: Offline';
    this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    this.statusBarItem.show();
  }

  public dispose(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.statusBarItem.dispose();
    this.emitter.dispose();
  }
}
