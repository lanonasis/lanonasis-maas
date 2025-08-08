/**
 * Orchestrator Interface Component
 * Provides a chat-like interface for natural language command execution
 */

import React, { useState, useRef, useEffect } from 'react';

// Declare window for browser environment
declare const window: {
  open: (url: string, target?: string) => void;
};

// Import orchestrator from local source
import { orchestrate, parseOnly, ContextualOrchestrator, OrchestratorResult, ParsedCommand } from '../../orchestrator';

interface Message {
  id: string;
  type: 'user' | 'system' | 'result' | 'error';
  content: string;
  timestamp: Date;
  command?: ParsedCommand;
  result?: OrchestratorResult;
}

interface OrchestratorInterfaceProps {
  className?: string;
  onCommandExecuted?: (result: OrchestratorResult) => void;
  onUIAction?: (action: string, args: Record<string, unknown>) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const OrchestratorInterface: React.FC<OrchestratorInterfaceProps> = ({
  className = '',
  onCommandExecuted,
  onUIAction,
  placeholder = 'Type a command... (e.g., "search for project notes", "create memory", "open dashboard")',
  disabled = false
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [commandPreview, setCommandPreview] = useState<ParsedCommand | null>(null);
  
  const messagesEndRef = useRef<unknown>(null);
  const inputRef = useRef<unknown>(null);
  const orchestrator = useRef(new ContextualOrchestrator());

  const scrollToBottom = () => {
    const element = messagesEndRef.current as { scrollIntoView?: (options: { behavior: string }) => void } | null;
    element?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      addMessage({
        type: 'system',
        content: `🧠 **Memory Orchestrator Ready**
        
Try natural language commands like:
• "search for API documentation"
• "create memory about today's meeting"
• "show my project memories"
• "open memory visualizer"
• "list my topics"

Type your command below and press Enter!`,
      });
    }
  }, []);

  const addMessage = (message: Omit<Message, 'id' | 'timestamp'>) => {
    const newMessage: Message = {
      ...message,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleInputChange = async (value: string) => {
    setInput(value);
    
    // Show command preview for non-empty input
    if (value.trim() && value.length > 3) {
      try {
        const preview = await parseOnly(value);
        setCommandPreview(preview);
        setShowPreview(true);
      } catch {
        setCommandPreview(null);
        setShowPreview(false);
      }
    } else {
      setShowPreview(false);
      setCommandPreview(null);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim() || isProcessing) return;

    setIsProcessing(true);
    setShowPreview(false);
    setInput('');

    // Add user message
    addMessage({
      type: 'user',
      content: command,
    });

    try {
      // Execute command with orchestrator
      const result = orchestrator.current ? 
        await orchestrator.current.orchestrate(command) : 
        await orchestrate(command);
      
      if (result.success) {
        // Add success result
        addMessage({
          type: 'result',
          content: formatSuccessResult(result),
          command: result.command,
          result,
        });

        // Handle UI actions
        if (result.command.tool === 'ui' && result.data?.action === 'open_url') {
          if (onUIAction) {
            onUIAction(result.command.action, result.data);
          } else {
            // Fallback: open in new window
            if (result.data && 'url' in result.data && typeof result.data.url === 'string') {
              window.open(result.data.url, '_blank');
            }
          }
        }

        // Callback for parent component
        if (onCommandExecuted) {
          onCommandExecuted(result);
        }
      } else {
        // Add error message
        addMessage({
          type: 'error',
          content: `❌ **Error**: ${result.error}`,
          command: result.command,
          result,
        });
      }
    } catch (error) {
      addMessage({
        type: 'error',
        content: `❌ **Unexpected Error**: ${error instanceof Error ? error.message : String(error)}`,
      });
    } finally {
      setIsProcessing(false);
      const input = inputRef.current as { focus?: () => void } | null;
      input?.focus?.();
    }
  };

  const formatSuccessResult = (result: OrchestratorResult): string => {
    const { command, data, executionTime } = result;
    
    let content = `✅ **${command.tool}.${command.action}** (${executionTime}ms)`;
    
    // Format based on command type
    switch (command.tool) {
      case 'memory':
        content += data ? formatMemoryResult(command.action, data) : '';
        break;
      case 'ui':
        content += data ? formatUIResult(command.action, data) : '';
        break;
      case 'stripe':
        content += data ? formatStripeResult(command.action, data) : '';
        break;
      default:
        if (data) {
          content += `\n\n${JSON.stringify(data, null, 2)}`;
        }
    }
    
    return content;
  };

  const formatMemoryResult = (action: string, data: Record<string, unknown>): string => {
    switch (action) {
      case 'search':
        if (Array.isArray(data.memories) && data.memories.length > 0) {
          return `\n\nFound **${data.memories.length}** memories:\n${data.memories.map((m: Record<string, unknown>) => 
            `• **${m.title}** (${m.memory_type}) - ${String(m.content).substring(0, 100)}...`
          ).join('\n')}`;
        }
        return '\n\nNo memories found matching your query.';
        
      case 'create':
        return `\n\n**Created**: "${data.title}" (ID: ${data.id})`;
        
      case 'list':
        if (Array.isArray(data.memories) && data.memories.length > 0) {
          return `\n\n**${data.memories.length} memories**:\n${data.memories.map((m: Record<string, unknown>) => 
            `• ${m.title} (${m.memory_type})`
          ).join('\n')}`;
        }
        return '\n\nNo memories found.';
        
      case 'stats':
        return `\n\n**Memory Statistics**:\n• Total: ${data.total_memories}\n• By Type: ${JSON.stringify(data.by_type, null, 2)}`;
        
      default:
        return data ? `\n\n${JSON.stringify(data, null, 2)}` : '';
    }
  };

  const formatUIResult = (action: string, data: Record<string, unknown>): string => {
    switch (action) {
      case 'open-dashboard':
      case 'open-visualizer':
      case 'open-uploader':
        return `\n\n${data.message}\n🔗 [${data.url}](${data.url})`;
      default:
        return data?.message ? `\n\n${data.message}` : '';
    }
  };

  const formatStripeResult = (action: string, data: Record<string, unknown>): string => {
    if (action === 'list-transactions' && data.transactions && Array.isArray(data.transactions)) {
      return `\n\nFound **${data.transactions.length}** transactions`;
    }
    return data ? `\n\n${JSON.stringify(data, null, 2)}` : '';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeCommand(input);
    }
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
    const input = inputRef.current as { focus?: () => void } | null;
    input?.focus?.();
  };

  const examples = [
    'search for API documentation',
    'create memory "Meeting Notes" "Discussed project timeline and deliverables"',
    'show my project memories',
    'open memory visualizer',
    'list topics',
    'show memory stats'
  ];

  return (
    <div className={`flex flex-col h-full bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <h3 className="font-semibold text-gray-900">Memory Orchestrator</h3>
        </div>
        <div className="text-xs text-gray-500">
          Natural Language Commands
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : message.type === 'error'
                  ? 'bg-red-50 text-red-900 border border-red-200'
                  : message.type === 'system'
                  ? 'bg-gray-50 text-gray-700 border'
                  : 'bg-green-50 text-green-900 border border-green-200'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
              {message.command && (
                <div className="mt-2 text-xs opacity-70">
                  Confidence: {Math.round((message.command.confidence || 0) * 100)}%
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef as React.RefObject<HTMLDivElement>} />
      </div>

      {/* Command Preview */}
      {showPreview && commandPreview && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="text-xs text-blue-700">
            <strong>Preview:</strong> {commandPreview.tool}.{commandPreview.action} 
            <span className="ml-2 text-blue-500">
              ({Math.round((commandPreview.confidence || 0) * 100)}% confidence)
            </span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => executeCommand(input)}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isProcessing ? '⏳' : '▶️'}
          </button>
        </div>

        {/* Examples */}
        {messages.length <= 1 && (
          <div className="mt-3">
            <div className="text-xs text-gray-500 mb-2">Try these examples:</div>
            <div className="flex flex-wrap gap-1">
              {examples.map((example, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleClick(example)}
                  className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrchestratorInterface;