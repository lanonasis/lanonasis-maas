import { stripeConnector } from './stripe';
import { memoryConnector } from './memory';
import { uiConnector } from './ui';

export const toolRegistry: Record<string, any> = {
  stripe: stripeConnector,
  memory: memoryConnector,
  ui: uiConnector,
};

export { stripeConnector, memoryConnector, uiConnector };