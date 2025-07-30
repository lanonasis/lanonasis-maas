import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Orchestrator Interface Component
 * Provides a chat-like interface for natural language command execution
 */
import { useState, useRef, useEffect } from 'react';
export const OrchestratorInterface = ({ className = '', onCommandExecuted, onUIAction, placeholder = 'Type a command... (e.g., "search for project notes", "create memory", "open dashboard")', disabled = false }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [commandPreview, setCommandPreview] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    // Temporarily disabled orchestrator
    // const orchestrator = useRef(null);
    const scrollToBottom = () => {
        const element = messagesEndRef.current;
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
    const addMessage = (message) => {
        const newMessage = {
            ...message,
            id: Math.random().toString(36).substring(2, 11),
            timestamp: new Date(),
        };
        setMessages(prev => [...prev, newMessage]);
    };
    const handleInputChange = async (value) => {
        setInput(value);
        // Show command preview for non-empty input
        if (value.trim() && value.length > 3) {
            try {
                // Temporarily disabled orchestrator
                const preview = {
                    action: 'placeholder',
                    target: value,
                    parameters: {}
                };
                setCommandPreview(preview);
                setShowPreview(true);
            }
            catch {
                setCommandPreview(null);
                setShowPreview(false);
            }
        }
        else {
            setShowPreview(false);
            setCommandPreview(null);
        }
    };
    const executeCommand = async (command) => {
        if (!command.trim() || isProcessing)
            return;
        setIsProcessing(true);
        setShowPreview(false);
        setInput('');
        // Add user message
        addMessage({
            type: 'user',
            content: command,
        });
        try {
            // Temporarily disabled orchestrator - return placeholder result
            const result = {
                success: false,
                error: 'Orchestrator temporarily disabled - missing dependencies',
                executionTime: 0,
                command: {
                    action: 'placeholder',
                    target: command,
                    parameters: {}
                }
            };
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
                    }
                    else {
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
            }
            else {
                // Add error message
                addMessage({
                    type: 'error',
                    content: `❌ **Error**: ${result.error}`,
                    command: result.command,
                    result,
                });
            }
        }
        catch (error) {
            addMessage({
                type: 'error',
                content: `❌ **Unexpected Error**: ${error instanceof Error ? error.message : String(error)}`,
            });
        }
        finally {
            setIsProcessing(false);
            const input = inputRef.current;
            input?.focus?.();
        }
    };
    const formatSuccessResult = (result) => {
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
    const formatMemoryResult = (action, data) => {
        switch (action) {
            case 'search':
                if (Array.isArray(data.memories) && data.memories.length > 0) {
                    return `\n\nFound **${data.memories.length}** memories:\n${data.memories.map((m) => `• **${m.title}** (${m.memory_type}) - ${String(m.content).substring(0, 100)}...`).join('\n')}`;
                }
                return '\n\nNo memories found matching your query.';
            case 'create':
                return `\n\n**Created**: "${data.title}" (ID: ${data.id})`;
            case 'list':
                if (Array.isArray(data.memories) && data.memories.length > 0) {
                    return `\n\n**${data.memories.length} memories**:\n${data.memories.map((m) => `• ${m.title} (${m.memory_type})`).join('\n')}`;
                }
                return '\n\nNo memories found.';
            case 'stats':
                return `\n\n**Memory Statistics**:\n• Total: ${data.total_memories}\n• By Type: ${JSON.stringify(data.by_type, null, 2)}`;
            default:
                return data ? `\n\n${JSON.stringify(data, null, 2)}` : '';
        }
    };
    const formatUIResult = (action, data) => {
        switch (action) {
            case 'open-dashboard':
            case 'open-visualizer':
            case 'open-uploader':
                return `\n\n${data.message}\n🔗 [${data.url}](${data.url})`;
            default:
                return data?.message ? `\n\n${data.message}` : '';
        }
    };
    const formatStripeResult = (action, data) => {
        if (action === 'list-transactions' && data.transactions && Array.isArray(data.transactions)) {
            return `\n\nFound **${data.transactions.length}** transactions`;
        }
        return data ? `\n\n${JSON.stringify(data, null, 2)}` : '';
    };
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeCommand(input);
        }
    };
    const handleExampleClick = (example) => {
        setInput(example);
        const input = inputRef.current;
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
    return (_jsxs("div", { className: `flex flex-col h-full bg-white border rounded-lg shadow-sm ${className}`, children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b bg-gray-50", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-2 h-2 bg-green-500 rounded-full" }), _jsx("h3", { className: "font-semibold text-gray-900", children: "Memory Orchestrator" })] }), _jsx("div", { className: "text-xs text-gray-500", children: "Natural Language Commands" })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4 space-y-4", children: [messages.map((message) => (_jsx("div", { className: `flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`, children: _jsxs("div", { className: `max-w-[80%] rounded-lg px-4 py-2 ${message.type === 'user'
                                ? 'bg-blue-500 text-white'
                                : message.type === 'error'
                                    ? 'bg-red-50 text-red-900 border border-red-200'
                                    : message.type === 'system'
                                        ? 'bg-gray-50 text-gray-700 border'
                                        : 'bg-green-50 text-green-900 border border-green-200'}`, children: [_jsx("div", { className: "whitespace-pre-wrap text-sm", children: message.content }), message.command && (_jsxs("div", { className: "mt-2 text-xs opacity-70", children: ["Confidence: ", Math.round((message.command.confidence || 0) * 100), "%"] }))] }) }, message.id))), _jsx("div", { ref: messagesEndRef })] }), showPreview && commandPreview && (_jsx("div", { className: "px-4 py-2 bg-blue-50 border-t border-blue-200", children: _jsxs("div", { className: "text-xs text-blue-700", children: [_jsx("strong", { children: "Preview:" }), " ", commandPreview.tool, ".", commandPreview.action, _jsxs("span", { className: "ml-2 text-blue-500", children: ["(", Math.round((commandPreview.confidence || 0) * 100), "% confidence)"] })] }) })), _jsxs("div", { className: "p-4 border-t", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("input", { ref: inputRef, type: "text", value: input, onChange: (e) => handleInputChange(e.target.value), onKeyPress: handleKeyPress, placeholder: placeholder, disabled: disabled || isProcessing, className: "flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed" }), _jsx("button", { onClick: () => executeCommand(input), disabled: !input.trim() || isProcessing, className: "px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed", children: isProcessing ? '⏳' : '▶️' })] }), messages.length <= 1 && (_jsxs("div", { className: "mt-3", children: [_jsx("div", { className: "text-xs text-gray-500 mb-2", children: "Try these examples:" }), _jsx("div", { className: "flex flex-wrap gap-1", children: examples.map((example, index) => (_jsx("button", { onClick: () => handleExampleClick(example), className: "text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 transition-colors", children: example }, index))) })] }))] })] }));
};
export default OrchestratorInterface;
//# sourceMappingURL=OrchestratorInterface.js.map