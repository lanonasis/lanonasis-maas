export const VALID_KEY_CONSUMERS = ['claude', 'hermes', 'openclaw'] as const;
export type ApiKeyConsumer = typeof VALID_KEY_CONSUMERS[number];

type ConsumerKey = {
  consumer?: ApiKeyConsumer | null;
  name: string;
};

export function parseConsumer(consumer?: string): ApiKeyConsumer | undefined {
  if (!consumer) {
    return undefined;
  }

  const normalized = consumer.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if ((VALID_KEY_CONSUMERS as readonly string[]).includes(normalized)) {
    return normalized as ApiKeyConsumer;
  }

  throw new Error('Invalid consumer. Allowed: claude, hermes, openclaw');
}

export function displayConsumer(key: ConsumerKey): string {
  return key.consumer
    || /^\[(claude|hermes|openclaw)\]\s+/i.exec(key.name)?.[1]?.toLowerCase()
    || '—';
}
