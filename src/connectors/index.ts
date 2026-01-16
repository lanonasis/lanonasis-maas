import { stripeConnector } from './stripe';
import { memoryConnector } from './memory';
import { uiConnector } from './ui';

type ToolConnector = (action: string, args: unknown) => unknown | Promise<unknown>;

export const toolRegistry: Record<string, ToolConnector> = {
  stripe: stripeConnector,
  memory: memoryConnector,
  ui: uiConnector,
};

export { stripeConnector, memoryConnector, uiConnector };