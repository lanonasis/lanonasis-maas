export interface ReplConfig {
  apiUrl: string;
  useMCP: boolean;
  mcpServerPath?: string;
  authToken?: string;
  vendorKey?: string;
  openaiApiKey?: string;
  historyFile: string;
  maxHistorySize: number;
}

export interface CommandContext {
  mode: 'remote' | 'local';
  lastResult?: unknown;
  aliases: Map<string, string>;
  config: ReplConfig;
}
