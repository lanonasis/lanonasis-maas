/**
 * Enhanced Command Parser for Memory-Aware Orchestrator
 * Intelligently parses natural language commands and routes to appropriate tools
 */

export interface ParsedCommand {
  tool: string;
  action: string;
  args: Record<string, unknown>;
  confidence: number;
  originalInput: string;
}

export async function resolveCommand(input: string): Promise<ParsedCommand> {
  const lowerInput = input.toLowerCase().trim();
  const words = lowerInput.split(/\s+/);

  // Memory-related commands
  if (isMemoryCommand(lowerInput)) {
    return parseMemoryCommand(input, lowerInput, words);
  }

  // UI-related commands
  if (isUICommand(lowerInput)) {
    return parseUICommand(input, lowerInput, words);
  }

  // Stripe/Payment commands
  if (isStripeCommand(lowerInput)) {
    return parseStripeCommand(input, lowerInput, words);
  }

  // Fallback to generic search if query-like
  if (isSearchQuery(lowerInput)) {
    return {
      tool: "memory",
      action: "search",
      args: { 
        query: input.trim(),
        limit: 10 
      },
      confidence: 0.7,
      originalInput: input
    };
  }

  throw new Error(`Could not resolve command: "${input}". Try commands like "search for X", "create memory", "open dashboard", or "show my memories".`);
}

function isMemoryCommand(input: string): boolean {
  const memoryKeywords = [
    'memory', 'memories', 'remember', 'recall', 'search', 'find', 'look for',
    'create', 'add', 'store', 'save', 'note', 'notes', 'knowledge',
    'list', 'show', 'display', 'get', 'retrieve', 'delete', 'remove',
    'update', 'edit', 'modify', 'topic', 'topics', 'stats', 'statistics'
  ];
  
  return memoryKeywords.some(keyword => input.includes(keyword));
}

function isUICommand(input: string): boolean {
  const uiKeywords = [
    'open', 'show', 'display', 'launch', 'start', 'go to', 'navigate',
    'dashboard', 'visualizer', 'uploader', 'upload', 'interface',
    'settings', 'help', 'view', 'panel'
  ];
  
  return uiKeywords.some(keyword => input.includes(keyword)) &&
         (input.includes('dashboard') || input.includes('visualizer') || 
          input.includes('uploader') || input.includes('interface') ||
          input.includes('ui') || input.includes('open'));
}

function isStripeCommand(input: string): boolean {
  const stripeKeywords = ['stripe', 'payment', 'transaction', 'charge', 'billing'];
  return stripeKeywords.some(keyword => input.includes(keyword));
}

function isSearchQuery(input: string): boolean {
  // If it's not a clear command but has some content, treat as search
  return input.length > 3 && !input.includes('?') && 
         !input.startsWith('/') && !input.startsWith('help');
}

function parseMemoryCommand(original: string, lower: string, _words: string[]): ParsedCommand {
  const args: Record<string, unknown> = {};
  let action = 'search'; // default
  let confidence = 0.8;

  // Extract quoted content for titles/content
  const quotedMatches = original.match(/"([^"]+)"/g);
  const quotedContent = quotedMatches?.map(match => match.slice(1, -1)) || [];

  // Search commands
  if (/search|find|look\s+for|recall|retrieve/.test(lower)) {
    action = 'search';
    
    // Extract search query (remove command words)
    let query = original.trim();
    query = query.replace(/^(search|find|look\s+for|recall|retrieve)\s*/i, '');
    query = query.replace(/\s*(in|from)\s+(memory|memories|notes?|knowledge).*$/i, '');
    
    args.query = query || original;
    args.limit = extractNumber(lower, 'limit|results?|max') || 10;
    
    // Extract memory types
    const types = extractMemoryTypes(lower);
    if (types.length > 0) args.type = types;
    
    confidence = 0.9;
  }

  // Create commands
  else if (/create|add|store|save|new|make/.test(lower)) {
    action = 'create';
    
    if (quotedContent.length >= 2) {
      args.title = quotedContent[0];
      args.content = quotedContent[1];
    } else if (quotedContent.length === 1) {
      // Try to extract title and content from single quoted text
      const content = quotedContent[0];
      if (content) {
        const sentences = content.split(/[.!?]+/);
        if (sentences.length > 1 && sentences[0]) {
          args.title = sentences[0].trim();
          args.content = content;
        } else {
          args.title = content.substring(0, 50);
          args.content = content;
        }
      }
    } else {
      // Extract from remaining text after command
      let remaining = original.replace(/^(create|add|store|save|new|make)\s*(memory|note)?\s*/i, '');
      args.title = remaining.substring(0, 50) || 'New Memory';
      args.content = remaining || 'Memory created via orchestrator';
    }
    
    args.memory_type = extractMemoryType(lower) || 'context';
    args.tags = extractTags(lower);
    
    confidence = 0.95;
  }

  // List commands
  else if (/list|show|display|get\s+(all|my)/.test(lower)) {
    action = 'list';
    args.limit = extractNumber(lower, 'limit|max|first|last') || 20;
    
    const types = extractMemoryTypes(lower);
    if (types.length > 0) args.memory_types = types;
    
    const tags = extractTags(lower);
    if (tags.length > 0) args.tags = tags;
    
    confidence = 0.9;
  }

  // Topic commands
  else if (/topic|topics/.test(lower)) {
    if (/create|add|new/.test(lower)) {
      action = 'create-topic';
      args.name = quotedContent[0] || extractAfterWord(original, ['topic', 'named', 'called']);
    } else {
      action = 'list-topics';
    }
    confidence = 0.9;
  }

  // Stats commands
  else if (/stats|statistics|summary|overview/.test(lower)) {
    action = 'stats';
    confidence = 0.95;
  }

  // Delete commands
  else if (/delete|remove|trash/.test(lower)) {
    action = 'delete';
    const id = extractMemoryId(original);
    if (id) {
      args.id = id;
      confidence = 0.9;
    } else {
      confidence = 0.6;
      // Could ask for confirmation or ID
    }
  }

  return {
    tool: 'memory',
    action,
    args,
    confidence,
    originalInput: original
  };
}

function parseUICommand(original: string, lower: string, _words: string[]): ParsedCommand {
  const args: Record<string, unknown> = {};
  let action = 'open-dashboard'; // default
  let confidence = 0.8;

  if (/dashboard/.test(lower)) {
    action = 'open-dashboard';
    
    const memoryId = extractMemoryId(original);
    if (memoryId) args.memory_id = memoryId;
    
    confidence = 0.95;
  }
  
  else if (/visualizer?|visual|graph|network/.test(lower)) {
    action = 'open-visualizer';
    
    const memoryId = extractMemoryId(original);
    if (memoryId) args.memory_id = memoryId;
    
    confidence = 0.95;
  }
  
  else if (/upload|uploader|add\s+files?|import/.test(lower)) {
    action = 'open-uploader';
    
    if (/bulk|batch|multiple/.test(lower)) {
      args.type = 'bulk';
    } else {
      args.type = 'manual';
    }
    
    confidence = 0.9;
  }
  
  else if (/stats|statistics/.test(lower)) {
    action = 'show-stats';
    confidence = 0.9;
  }
  
  else if (/topics?/.test(lower)) {
    action = 'show-topics';
    confidence = 0.9;
  }
  
  else if (/settings?|config|configuration/.test(lower)) {
    action = 'open-settings';
    confidence = 0.9;
  }
  
  else if (/help|assistance|guide/.test(lower)) {
    action = 'show-help';
    const topic = extractAfterWord(original, ['help', 'with', 'about', 'for']);
    if (topic) args.topic = topic;
    confidence = 0.9;
  }

  return {
    tool: 'ui',
    action,
    args,
    confidence,
    originalInput: original
  };
}

function parseStripeCommand(original: string, lower: string, _words: string[]): ParsedCommand {
  const args: Record<string, unknown> = {};
  let action = 'list-transactions'; // default
  let confidence = 0.8;

  if (/transactions?|payments?|charges?/.test(lower)) {
    action = 'list-transactions';
    confidence = 0.9;
  }

  return {
    tool: 'stripe',
    action,
    args,
    confidence,
    originalInput: original
  };
}

// Helper functions
function extractMemoryTypes(input: string): string[] {
  const typeMap: Record<string, string> = {
    'conversation': 'conversation',
    'conversations': 'conversation',
    'chat': 'conversation',
    'chats': 'conversation',
    'knowledge': 'knowledge',
    'learning': 'knowledge',
    'education': 'knowledge',
    'project': 'project',
    'projects': 'project',
    'work': 'project',
    'context': 'context',
    'general': 'context',
    'reference': 'reference',
    'references': 'reference',
    'docs': 'reference',
    'documentation': 'reference'
  };

  const found: string[] = [];
  Object.entries(typeMap).forEach(([key, value]) => {
    if (input.includes(key) && !found.includes(value)) {
      found.push(value);
    }
  });

  return found;
}

function extractMemoryType(input: string): string | undefined {
  const types = extractMemoryTypes(input);
  return types[0]; // return first match
}

function extractTags(input: string): string[] {
  // Look for patterns like "tagged with X", "tags: X, Y", "#hashtag"
  const tagPatterns = [
    /tagged?\s+with\s+([^,.]+)/gi,
    /tags?:\s*([^,.]+)/gi,
    /#(\w+)/g
  ];

  const tags: string[] = [];
  
  tagPatterns.forEach(pattern => {
    const matches = Array.from(input.matchAll(pattern));
    matches.forEach(match => {
      const tagText = match[1];
      if (tagText) {
        // Split on common delimiters and clean up
        const splitTags = tagText.split(/[,;|&]/).map(t => t.trim().toLowerCase());
        tags.push(...splitTags);
      }
    });
  });

  return [...new Set(tags)]; // remove duplicates
}

function extractNumber(input: string, pattern: string): number | undefined {
  const regex = new RegExp(`(?:${pattern})\\s+(\\d+)`, 'i');
  const match = input.match(regex);
  return match && match[1] ? parseInt(match[1]) : undefined;
}

function extractMemoryId(input: string): string | undefined {
  // Look for patterns like "memory 123", "id:abc", "memory-id-xyz"
  const patterns = [
    /memory\s+([a-f0-9-]+)/i,
    /id:?\s*([a-f0-9-]+)/i,
    /([a-f0-9]{8,})/i // UUID-like patterns
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  return undefined;
}

function extractAfterWord(input: string, words: string[]): string | undefined {
  for (const word of words) {
    const regex = new RegExp(`${word}\\s+(.+?)(?:\\s|$)`, 'i');
    const match = input.match(regex);
    if (match && match[1]) return match[1].trim();
  }
  return undefined;
}