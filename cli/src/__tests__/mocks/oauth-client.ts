let storedKey: { apiKey: string } | undefined;

export class ApiKeyStorage {

  async initialize(): Promise<void> {
    // Keep stored data stable across initialize() calls in a test process.
    // Real secure stores don't wipe credentials when re-initialized.
  }

  async store(data: { apiKey: string }): Promise<void> {
    storedKey = { apiKey: data.apiKey };
  }

  async retrieve(): Promise<{ apiKey: string } | null> {
    return storedKey ?? null;
  }

  async clear(): Promise<void> {
    storedKey = undefined;
  }
}
