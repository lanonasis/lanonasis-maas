// Simple stub for OpenClaw plugin SDK
// This allows the plugin to compile and load

/**
 * The session object passed to contextEngine.buildContext().
 * OpenClaw populates this with the current agent session state.
 */
export type OpenClawSession = {
  /** The user's current input or prompt being assembled */
  currentInput?: string;
  /** Alias for currentInput — some OpenClaw versions use this field */
  query?: string;
  /** Prior turns in the current session */
  history?: unknown[];
  /** Arbitrary session metadata provided by OpenClaw */
  metadata?: Record<string, unknown>;
};

/**
 * A context engine provider — registered via api.registerContextEngine().
 * OpenClaw calls buildContext() on demand to inject context into the prompt window.
 * This is a separate slot from memory (plugins.slots.contextEngine).
 */
export type ContextEngineProvider = {
  id: string;
  /** Higher priority runs first when multiple contextEngines are registered */
  priority?: number;
  /** Return a formatted string to prepend to the agent context window */
  buildContext: (session: OpenClawSession) => Promise<string>;
};

export type OpenClawPluginApi = {
  pluginConfig: unknown;
  resolvePath: (path: string) => string;
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  on: (event: string, handler: Function) => void;
  registerTool: (tool: any, opts?: any) => void;
  registerCli: (handler: Function, opts: any) => void;
  registerService: (service: any) => void;
  /**
   * Register a context engine provider.
   * Fills the plugins.slots.contextEngine slot in OpenClaw.
   * OpenClaw calls buildContext() whenever it needs to assemble agent context.
   */
  registerContextEngine: (engine: ContextEngineProvider) => void;
};

export type OpenClawPlugin = {
  id: string;
  kind: string;
  name?: string;
  description?: string;
  configSchema?: any;
  register: (api: OpenClawPluginApi) => void;
};
