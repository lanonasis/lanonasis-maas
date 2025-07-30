/**
 * Memory Visualizer Component
 * Interactive visualization for memory exploration and management
 * Aligned with sd-ghost-protocol schema
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MemoryEntry, MemoryTopic, MemorySearchResult } from '../../types/memory-aligned';

interface MemoryVisualizerProps {
  memories: MemoryEntry[];
  topics: MemoryTopic[];
  onMemorySelect?: (memory: MemoryEntry) => void;
  onTopicSelect?: (topic: MemoryTopic) => void;
  onSearch?: (query: string) => void;
  className?: string;
}

interface VisualizationNode {
  id: string;
  type: 'memory' | 'topic';
  data: MemoryEntry | MemoryTopic;
  x: number;
  y: number;
  connections: string[];
}

export const MemoryVisualizer: React.FC<MemoryVisualizerProps> = ({
  memories,
  topics,
  onMemorySelect,
  onTopicSelect,
  onSearch,
  className = ''
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'graph' | 'grid' | 'timeline'>('graph');
  const [filterType, setFilterType] = useState<string>('all');

  // Transform data into visualization nodes
  const nodes = useMemo(() => {
    const memoryNodes: VisualizationNode[] = memories
      .filter(memory => filterType === 'all' || memory.memory_type === filterType)
      .map((memory, index) => ({
        id: memory.id,
        type: 'memory' as const,
        data: memory,
        x: (index % 5) * 200 + 100,
        y: Math.floor(index / 5) * 150 + 100,
        connections: memory.topic_id ? [memory.topic_id] : []
      }));

    const topicNodes: VisualizationNode[] = topics.map((topic, index) => ({
      id: topic.id,
      type: 'topic' as const,
      data: topic,
      x: index * 300 + 150,
      y: 50,
      connections: topic.parent_topic_id ? [topic.parent_topic_id] : []
    }));

    return [...memoryNodes, ...topicNodes];
  }, [memories, topics, filterType]);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return nodes;
    
    return nodes.filter(node => {
      if (node.type === 'memory') {
        const memory = node.data as MemoryEntry;
        return memory.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
               memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
               memory.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      } else {
        const topic = node.data as MemoryTopic;
        return topic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase()));
      }
    });
  }, [nodes, searchQuery]);

  const handleNodeClick = (node: VisualizationNode) => {
    setSelectedNode(node.id);
    if (node.type === 'memory' && onMemorySelect) {
      onMemorySelect(node.data as MemoryEntry);
    } else if (node.type === 'topic' && onTopicSelect) {
      onTopicSelect(node.data as MemoryTopic);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (onSearch) {
      onSearch(query);
    }
  };

  const getNodeColor = (node: VisualizationNode) => {
    if (node.type === 'topic') {
      const topic = node.data as MemoryTopic;
      return topic.color || '#3B82F6';
    } else {
      const memory = node.data as MemoryEntry;
      const colors: Record<string, string> = {
        conversation: '#10B981',
        knowledge: '#8B5CF6',
        project: '#F59E0B',
        context: '#6B7280',
        reference: '#EF4444'
      };
      return colors[memory.memory_type] || '#6B7280';
    }
  };

  const renderGraphView = () => (
    <svg
      width="100%"
      height="600"
      className="border border-gray-200 rounded-lg bg-gray-50"
      viewBox="0 0 1000 600"
    >
      {/* Render connections */}
      {filteredNodes.map(node => 
        node.connections.map(connectionId => {
          const targetNode = filteredNodes.find(n => n.id === connectionId);
          if (!targetNode) return null;
          
          return (
            <line
              key={`${node.id}-${connectionId}`}
              x1={node.x}
              y1={node.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="#D1D5DB"
              strokeWidth="2"
              strokeDasharray={node.type === 'topic' ? '5,5' : 'none'}
            />
          );
        })
      )}

      {/* Render nodes */}
      {filteredNodes.map(node => (
        <g key={node.id}>
          <circle
            cx={node.x}
            cy={node.y}
            r={node.type === 'topic' ? 25 : 20}
            fill={getNodeColor(node)}
            stroke={selectedNode === node.id ? '#1F2937' : 'transparent'}
            strokeWidth="3"
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleNodeClick(node)}
          />
          <text
            x={node.x}
            y={node.y + 35}
            textAnchor="middle"
            className="text-xs font-medium fill-gray-700 pointer-events-none"
            style={{ maxWidth: '80px' }}
          >
            {node.type === 'topic' 
              ? (node.data as MemoryTopic).name.substring(0, 12) + '...'
              : (node.data as MemoryEntry).title.substring(0, 12) + '...'
            }
          </text>
          {node.type === 'topic' && (
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="text-xs font-bold fill-white pointer-events-none"
            >
              📁
            </text>
          )}
        </g>
      ))}
    </svg>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredNodes.map(node => (
        <div
          key={node.id}
          className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
            selectedNode === node.id ? 'ring-2 ring-blue-500' : ''
          }`}
          style={{ borderColor: getNodeColor(node) }}
          onClick={() => handleNodeClick(node)}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getNodeColor(node) }}
            />
            <span className="text-xs uppercase font-medium text-gray-500">
              {node.type}
            </span>
          </div>
          
          {node.type === 'memory' ? (
            <div>
              <h3 className="font-semibold text-sm mb-1">
                {(node.data as MemoryEntry).title}
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                {(node.data as MemoryEntry).content.substring(0, 100)}...
              </p>
              <div className="flex flex-wrap gap-1">
                {(node.data as MemoryEntry).tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-semibold text-sm mb-1">
                {(node.data as MemoryTopic).name}
              </h3>
              <p className="text-xs text-gray-600">
                {(node.data as MemoryTopic).description || 'No description'}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderTimelineView = () => {
    const sortedMemories = memories
      .filter(memory => filterType === 'all' || memory.memory_type === filterType)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
      <div className="space-y-4">
        {sortedMemories.map(memory => (
          <div
            key={memory.id}
            className={`flex items-start gap-4 p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
              selectedNode === memory.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleNodeClick({ id: memory.id, type: 'memory', data: memory, x: 0, y: 0, connections: [] })}
          >
            <div
              className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: getNodeColor({ id: memory.id, type: 'memory', data: memory, x: 0, y: 0, connections: [] }) }}
            />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm">{memory.title}</h3>
                <span className="text-xs text-gray-500">
                  {new Date(memory.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                {memory.content.substring(0, 200)}...
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="bg-gray-100 px-2 py-1 rounded">{memory.memory_type}</span>
                <span>Access count: {memory.access_count}</span>
                {memory.tags.length > 0 && (
                  <span>Tags: {memory.tags.slice(0, 3).join(', ')}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('graph')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'graph' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === 'timeline' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            Timeline
          </button>
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="all">All Types</option>
            <option value="conversation">Conversation</option>
            <option value="knowledge">Knowledge</option>
            <option value="project">Project</option>
            <option value="context">Context</option>
            <option value="reference">Reference</option>
          </select>

          <input
            type="text"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-sm border rounded px-2 py-1 w-64"
          />
        </div>
      </div>

      {/* Statistics */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>Total Memories: {memories.length}</span>
        <span>Topics: {topics.length}</span>
        <span>Filtered: {filteredNodes.length}</span>
      </div>

      {/* Visualization */}
      {viewMode === 'graph' && renderGraphView()}
      {viewMode === 'grid' && renderGridView()}
      {viewMode === 'timeline' && renderTimelineView()}
    </div>
  );
};

export default MemoryVisualizer;