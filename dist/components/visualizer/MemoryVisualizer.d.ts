/**
 * Memory Visualizer Component
 * Interactive visualization for memory exploration and management
 * Aligned with sd-ghost-protocol schema
 */
import React from 'react';
import { MemoryEntry, MemoryTopic } from '../../types/memory-aligned';
interface MemoryVisualizerProps {
    memories: MemoryEntry[];
    topics: MemoryTopic[];
    onMemorySelect?: (memory: MemoryEntry) => void;
    onTopicSelect?: (topic: MemoryTopic) => void;
    onSearch?: (query: string) => void;
    className?: string;
}
export declare const MemoryVisualizer: React.FC<MemoryVisualizerProps>;
export default MemoryVisualizer;
//# sourceMappingURL=MemoryVisualizer.d.ts.map