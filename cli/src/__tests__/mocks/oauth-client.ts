let storedKey: { apiKey: string } | undefined;

export class ApiKeyStorage {

  async initialize(): Promise<void> {
    return;
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
