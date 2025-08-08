/**
 * UI Connector for Orchestrator
 * Manages user interface actions and integrations
 */

export interface UIConnectorOptions {
  baseUrl?: string;
}

export interface OpenDashboardArgs {
  path?: string;
  memory_id?: string;
  topic_id?: string;
}

export interface ShowMemoryArgs {
  memory_id: string;
  mode?: 'view' | 'edit' | 'visualize';
}

export interface OpenUploaderArgs {
  type?: 'manual' | 'bulk';
  prefill?: {
    title?: string;
    content?: string;
    memory_type?: string;
  };
}

export class UIConnector {
  private baseUrl: string;

  constructor(options: UIConnectorOptions = {}) {
    this.baseUrl = options.baseUrl || process.env.UI_BASE_URL || 'http://localhost:3000';
  }

  private generateUrl(path: string, params?: Record<string, string>) {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }

  async openDashboard(args: OpenDashboardArgs = {}) {
    const params: Record<string, string> = {};
    
    if (args.memory_id) params.memory_id = args.memory_id;
    if (args.topic_id) params.topic_id = args.topic_id;

    const path = args.path || '/dashboard';
    const url = this.generateUrl(path, params);

    return {
      action: 'open_url',
      url,
      message: `Opening dashboard at ${url}`,
    };
  }

  async showMemory(args: ShowMemoryArgs) {
    const params: Record<string, string> = {};
    if (args.mode) params.mode = args.mode;

    const url = this.generateUrl(`/memory/${args.memory_id}`, params);
    
    return {
      action: 'open_url',
      url,
      message: `Opening memory ${args.memory_id} in ${args.mode || 'view'} mode`,
    };
  }

  async openVisualizer(args: { memory_id?: string; topic_id?: string } = {}) {
    const params: Record<string, string> = {};
    if (args.memory_id) params.memory_id = args.memory_id;
    if (args.topic_id) params.topic_id = args.topic_id;

    const url = this.generateUrl('/visualizer', params);
    
    return {
      action: 'open_url',
      url,
      message: 'Opening memory visualizer',
    };
  }

  async openUploader(args: OpenUploaderArgs = {}) {
    const params: Record<string, string> = {};
    if (args.type) params.type = args.type;
    if (args.prefill?.title) params.title = args.prefill.title;
    if (args.prefill?.content) params.content = args.prefill.content;
    if (args.prefill?.memory_type) params.memory_type = args.prefill.memory_type;

    const url = this.generateUrl('/upload', params);
    
    return {
      action: 'open_url',
      url,
      message: `Opening ${args.type || 'manual'} uploader`,
    };
  }

  async showStats() {
    const url = this.generateUrl('/stats');
    
    return {
      action: 'open_url',
      url,
      message: 'Opening memory statistics dashboard',
    };
  }

  async showTopics() {
    const url = this.generateUrl('/topics');
    
    return {
      action: 'open_url',
      url,
      message: 'Opening topic management interface',
    };
  }

  async openSettings() {
    const url = this.generateUrl('/settings');
    
    return {
      action: 'open_url',
      url,
      message: 'Opening settings panel',
    };
  }

  async showHelp(args: { topic?: string } = {}) {
    const params: Record<string, string> = {};
    if (args.topic) params.topic = args.topic;

    const url = this.generateUrl('/help', params);
    
    return {
      action: 'open_url',
      url,
      message: `Opening help ${args.topic ? `for ${args.topic}` : ''}`,
    };
  }
}

// Factory function for orchestrator integration
export function uiConnector(action: string, args: any = {}) {
  const connector = new UIConnector();

  switch (action) {
    case 'open-dashboard':
      return connector.openDashboard(args as OpenDashboardArgs);
    case 'show-memory':
      return connector.showMemory(args as ShowMemoryArgs);
    case 'open-visualizer':
      return connector.openVisualizer(args);
    case 'open-uploader':
      return connector.openUploader(args as OpenUploaderArgs);
    case 'show-stats':
      return connector.showStats();
    case 'show-topics':
      return connector.showTopics();
    case 'open-settings':
      return connector.openSettings();
    case 'show-help':
      return connector.showHelp(args);
    default:
      throw new Error(`Unknown UI action: ${action}`);
  }
}

export default uiConnector;