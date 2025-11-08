export interface ReplConfig {
  apiUrl: string;
  useMCP: boolean;
  mcpServerPath?: string;
  authToken?: string;
  vendorKey?: string;
  historyFile: string;
  maxHistorySize: number;
}

export interface CommandContext {
  mode: 'remote' | 'local';
  lastResult?: any;
  aliases: Map<string, string>;
  config: ReplConfig;
}
