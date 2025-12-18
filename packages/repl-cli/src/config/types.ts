export interface ReplConfig {
  apiUrl: string;
  useMCP: boolean;
  mcpServerPath?: string;
  authToken?: string;
  vendorKey?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  historyFile: string;
  maxHistorySize: number;
  userContext?: {
    name?: string;
    projects?: string[];
    preferences?: Record<string, any>;
  };
}

export interface CommandContext {
  mode: 'remote' | 'local';
  lastResult?: unknown;
  aliases: Map<string, string>;
  config: ReplConfig;
}
