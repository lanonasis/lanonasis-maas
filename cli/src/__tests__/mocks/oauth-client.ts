let storedKey: { apiKey: string } | undefined;
let constructorCount = 0;

export class ApiKeyStorage {
  constructor() {
    constructorCount += 1;
  }

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

export function __resetMockApiKeyStorage(): void {
  storedKey = undefined;
  constructorCount = 0;
}

export function __getMockApiKeyStorageConstructorCount(): number {
  return constructorCount;
}
