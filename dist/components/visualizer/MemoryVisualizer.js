import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Memory Visualizer Component
 * Interactive visualization for memory exploration and management
 * Aligned with sd-ghost-protocol schema
 */
import { useState, useMemo } from 'react';
export const MemoryVisualizer = ({ memories, topics, onMemorySelect, onTopicSelect, onSearch, className = '' }) => {
    const [selectedNode, setSelectedNode] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('graph');
    const [filterType, setFilterType] = useState('all');
    // Transform data into visualization nodes
    const nodes = useMemo(() => {
        const memoryNodes = memories
            .filter(memory => filterType === 'all' || memory.memory_type === filterType)
            .map((memory, index) => ({
            id: memory.id,
            type: 'memory',
            data: memory,
            x: (index % 5) * 200 + 100,
            y: Math.floor(index / 5) * 150 + 100,
            connections: memory.topic_id ? [memory.topic_id] : []
        }));
        const topicNodes = topics.map((topic, index) => ({
            id: topic.id,
            type: 'topic',
            data: topic,
            x: index * 300 + 150,
            y: 50,
            connections: topic.parent_topic_id ? [topic.parent_topic_id] : []
        }));
        return [...memoryNodes, ...topicNodes];
    }, [memories, topics, filterType]);
    // Filter nodes based on search
    const filteredNodes = useMemo(() => {
        if (!searchQuery)
            return nodes;
        return nodes.filter(node => {
            if (node.type === 'memory') {
                const memory = node.data;
                return memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            else {
                const topic = node.data;
                return topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()));
            }
        });
    }, [nodes, searchQuery]);
    const handleNodeClick = (node) => {
        setSelectedNode(node.id);
        if (node.type === 'memory' && onMemorySelect) {
            onMemorySelect(node.data);
        }
        else if (node.type === 'topic' && onTopicSelect) {
            onTopicSelect(node.data);
        }
    };
    const handleSearch = (query) => {
        setSearchQuery(query);
        if (onSearch) {
            onSearch(query);
        }
    };
    const getNodeColor = (node) => {
        if (node.type === 'topic') {
            const topic = node.data;
            return topic.color || '#3B82F6';
        }
        else {
            const memory = node.data;
            const colors = {
                conversation: '#10B981',
                knowledge: '#8B5CF6',
                project: '#F59E0B',
                context: '#6B7280',
                reference: '#EF4444'
            };
            return colors[memory.memory_type] || '#6B7280';
        }
    };
    const renderGraphView = () => (_jsxs("svg", { width: "100%", height: "600", className: "border border-gray-200 rounded-lg bg-gray-50", viewBox: "0 0 1000 600", children: [filteredNodes.map(node => node.connections.map(connectionId => {
                const targetNode = filteredNodes.find(n => n.id === connectionId);
                if (!targetNode)
                    return null;
                return (_jsx("line", { x1: node.x, y1: node.y, x2: targetNode.x, y2: targetNode.y, stroke: "#D1D5DB", strokeWidth: "2", strokeDasharray: node.type === 'topic' ? '5,5' : 'none' }, `${node.id}-${connectionId}`));
            })), filteredNodes.map(node => (_jsxs("g", { children: [_jsx("circle", { cx: node.x, cy: node.y, r: node.type === 'topic' ? 25 : 20, fill: getNodeColor(node), stroke: selectedNode === node.id ? '#1F2937' : 'transparent', strokeWidth: "3", className: "cursor-pointer hover:opacity-80", onClick: () => handleNodeClick(node) }), _jsx("text", { x: node.x, y: node.y + 35, textAnchor: "middle", className: "text-xs font-medium fill-gray-700 pointer-events-none", style: { maxWidth: '80px' }, children: node.type === 'topic'
                            ? node.data.name.substring(0, 12) + '...'
                            : node.data.title.substring(0, 12) + '...' }), node.type === 'topic' && (_jsx("text", { x: node.x, y: node.y + 5, textAnchor: "middle", className: "text-xs font-bold fill-white pointer-events-none", children: "\uD83D\uDCC1" }))] }, node.id)))] }));
    const renderGridView = () => (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4", children: filteredNodes.map(node => (_jsxs("div", { className: `p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedNode === node.id ? 'ring-2 ring-blue-500' : ''}`, style: { borderColor: getNodeColor(node) }, onClick: () => handleNodeClick(node), children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full", style: { backgroundColor: getNodeColor(node) } }), _jsx("span", { className: "text-xs uppercase font-medium text-gray-500", children: node.type })] }), node.type === 'memory' ? (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-sm mb-1", children: node.data.title }), _jsxs("p", { className: "text-xs text-gray-600 mb-2", children: [node.data.content.substring(0, 100), "..."] }), _jsx("div", { className: "flex flex-wrap gap-1", children: node.data.tags.slice(0, 3).map(tag => (_jsx("span", { className: "text-xs bg-gray-100 px-2 py-1 rounded", children: tag }, tag))) })] })) : (_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-sm mb-1", children: node.data.name }), _jsx("p", { className: "text-xs text-gray-600", children: node.data.description || 'No description' })] }))] }, node.id))) }));
    const renderTimelineView = () => {
        const sortedMemories = memories
            .filter(memory => filterType === 'all' || memory.memory_type === filterType)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return (_jsx("div", { className: "space-y-4", children: sortedMemories.map(memory => (_jsxs("div", { className: `flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${selectedNode === memory.id ? 'ring-2 ring-blue-500' : ''}`, onClick: () => handleNodeClick({ id: memory.id, type: 'memory', data: memory, x: 0, y: 0, connections: [] }), children: [_jsx("div", { className: "w-4 h-4 rounded-full mt-1 flex-shrink-0", style: { backgroundColor: getNodeColor({ id: memory.id, type: 'memory', data: memory, x: 0, y: 0, connections: [] }) } }), _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("h3", { className: "font-semibold text-sm", children: memory.title }), _jsx("span", { className: "text-xs text-gray-500", children: new Date(memory.created_at).toLocaleDateString() })] }), _jsxs("p", { className: "text-sm text-gray-600 mb-2", children: [memory.content.substring(0, 200), "..."] }), _jsxs("div", { className: "flex items-center gap-2 text-xs text-gray-500", children: [_jsx("span", { className: "bg-gray-100 px-2 py-1 rounded", children: memory.memory_type }), _jsxs("span", { children: ["Access count: ", memory.access_count] }), memory.tags.length > 0 && (_jsxs("span", { children: ["Tags: ", memory.tags.slice(0, 3).join(', ')] }))] })] })] }, memory.id))) }));
    };
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between", children: [_jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => setViewMode('graph'), className: `px-3 py-1 text-sm rounded ${viewMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`, children: "Graph" }), _jsx("button", { onClick: () => setViewMode('grid'), className: `px-3 py-1 text-sm rounded ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`, children: "Grid" }), _jsx("button", { onClick: () => setViewMode('timeline'), className: `px-3 py-1 text-sm rounded ${viewMode === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`, children: "Timeline" })] }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "text-sm border rounded px-2 py-1", children: [_jsx("option", { value: "all", children: "All Types" }), _jsx("option", { value: "conversation", children: "Conversation" }), _jsx("option", { value: "knowledge", children: "Knowledge" }), _jsx("option", { value: "project", children: "Project" }), _jsx("option", { value: "context", children: "Context" }), _jsx("option", { value: "reference", children: "Reference" })] }), _jsx("input", { type: "text", placeholder: "Search memories...", value: searchQuery, onChange: (e) => handleSearch(e.target.value), className: "text-sm border rounded px-2 py-1 w-64" })] })] }), _jsxs("div", { className: "flex gap-4 text-sm text-gray-600", children: [_jsxs("span", { children: ["Total Memories: ", memories.length] }), _jsxs("span", { children: ["Topics: ", topics.length] }), _jsxs("span", { children: ["Filtered: ", filteredNodes.length] })] }), viewMode === 'graph' && renderGraphView(), viewMode === 'grid' && renderGridView(), viewMode === 'timeline' && renderTimelineView()] }));
};
export default MemoryVisualizer;
//# sourceMappingURL=MemoryVisualizer.js.map