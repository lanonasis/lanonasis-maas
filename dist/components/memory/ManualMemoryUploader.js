import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Manual Memory Uploader Component
 * Supports multiple formats and batch uploads for context management
 * Aligned with sd-ghost-protocol schema
 */
import { useState, useRef } from 'react';
export const ManualMemoryUploader = ({ onUpload, onMemoryCreate, className = '' }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadResults, setUploadResults] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    // File type parsers
    const parseTextFile = async (file) => {
        const content = await file.text();
        // Try to detect if it's a structured format
        if (content.includes('---') && content.includes('title:')) {
            // YAML frontmatter format
            return parseYamlFrontmatter(content);
        }
        else if (content.startsWith('[') || content.startsWith('{')) {
            // JSON format
            try {
                const data = JSON.parse(content);
                return parseJsonMemories(data);
            }
            catch {
                // Fallback to plain text
                return [{
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        content: content,
                        memory_type: 'context',
                        tags: []
                    }];
            }
        }
        else {
            // Plain text - split by double newlines for multiple memories
            const sections = content.split('\n\n\n').filter(section => section.trim());
            if (sections.length > 1) {
                return sections.map((section, index) => {
                    const lines = section.trim().split('\n');
                    const firstLine = lines[0] || '';
                    const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
                    const content = section.trim();
                    return {
                        title: title || `Memory ${index + 1} from ${file.name}`,
                        content,
                        memory_type: 'context',
                        tags: []
                    };
                });
            }
            else {
                return [{
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        content: content,
                        memory_type: 'context',
                        tags: []
                    }];
            }
        }
    };
    const parseYamlFrontmatter = (content) => {
        const sections = content.split('---').filter(section => section.trim());
        const memories = [];
        for (let i = 0; i < sections.length; i += 2) {
            if (i + 1 < sections.length) {
                const frontmatter = sections[i];
                const body = sections[i + 1];
                if (frontmatter && body) {
                    // Simple YAML parsing (for basic cases)
                    const yamlLines = frontmatter.split('\n');
                    const metadata = {};
                    yamlLines.forEach(line => {
                        const match = line.match(/^(\w+):\s*(.+)$/);
                        if (match && match[1] && match[2]) {
                            const [, key, value] = match;
                            metadata[key] = value.replace(/['"]/g, '');
                        }
                    });
                    memories.push({
                        title: metadata.title || `Memory ${memories.length + 1}`,
                        content: body.trim(),
                        memory_type: metadata.type || 'context',
                        tags: metadata.tags ? metadata.tags.split(',').map((t) => t.trim()) : [],
                        metadata
                    });
                }
            }
        }
        return memories;
    };
    const parseJsonMemories = (data) => {
        if (Array.isArray(data)) {
            return data.map((item, index) => ({
                title: item.title || `Memory ${index + 1}`,
                content: item.content || JSON.stringify(item),
                memory_type: item.memory_type || item.type || 'context',
                tags: Array.isArray(item.tags) ? item.tags : [],
                metadata: item.metadata || item
            }));
        }
        else if (data.title && data.content) {
            return [{
                    title: data.title,
                    content: data.content,
                    memory_type: data.memory_type || data.type || 'context',
                    tags: Array.isArray(data.tags) ? data.tags : [],
                    metadata: data.metadata || data
                }];
        }
        else {
            return [{
                    title: 'JSON Data',
                    content: JSON.stringify(data, null, 2),
                    memory_type: 'context',
                    tags: []
                }];
        }
    };
    const parseMarkdownFile = async (file) => {
        const content = await file.text();
        // Split by headers
        const sections = content.split(/^#{1,6}\s/m).filter(section => section.trim());
        if (sections.length > 1) {
            return sections.map((section, index) => {
                const lines = section.trim().split('\n');
                const title = lines[0] || `Section ${index + 1}`;
                const content = section.trim();
                return {
                    title,
                    content,
                    memory_type: 'knowledge',
                    tags: ['markdown', 'documentation']
                };
            });
        }
        else {
            return [{
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    content,
                    memory_type: 'knowledge',
                    tags: ['markdown']
                }];
        }
    };
    const parseCsvFile = async (file) => {
        const content = await file.text();
        const lines = content.split('\n').filter(line => line.trim());
        if (lines.length === 0)
            return [];
        const headers = lines[0]?.split(',').map(h => h.trim().replace(/['"]/g, '')) || [];
        const memories = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line)
                continue;
            const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
            const rowData = {};
            headers.forEach((header, index) => {
                rowData[header] = values[index] || '';
            });
            memories.push({
                title: rowData.title || rowData.name || `Row ${i}`,
                content: rowData.content || rowData.description || JSON.stringify(rowData),
                memory_type: rowData.type || 'context',
                tags: rowData.tags ? rowData.tags.split(';') : [],
                metadata: rowData
            });
        }
        return memories;
    };
    const parseFile = async (file) => {
        const extension = file.name.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'md':
            case 'markdown':
                return parseMarkdownFile(file);
            case 'json':
                return parseJsonMemories(JSON.parse(await file.text()));
            case 'csv':
                return parseCsvFile(file);
            case 'txt':
            case 'text':
            default:
                return parseTextFile(file);
        }
    };
    const handleFiles = async (files) => {
        if (!onMemoryCreate) {
            console.error('onMemoryCreate handler not provided');
            return;
        }
        setIsUploading(true);
        setUploadProgress(0);
        const results = {
            success: 0,
            failed: 0,
            errors: [],
            memories: []
        };
        const fileArray = Array.from(files);
        let processedFiles = 0;
        for (const file of fileArray) {
            try {
                const parsedMemories = await parseFile(file);
                for (const memory of parsedMemories) {
                    try {
                        const result = await onMemoryCreate({
                            title: memory.title,
                            content: memory.content,
                            memory_type: memory.memory_type || 'context',
                            tags: memory.tags || [],
                            metadata: memory.metadata
                        });
                        if (result.success) {
                            results.success++;
                            results.memories.push({ title: memory.title, status: 'success' });
                        }
                        else {
                            results.failed++;
                            results.errors.push(`Failed to create "${memory.title}": ${result.error}`);
                            results.memories.push({
                                title: memory.title,
                                status: 'error',
                                error: result.error || 'Unknown error'
                            });
                        }
                    }
                    catch (error) {
                        results.failed++;
                        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                        results.errors.push(`Error creating "${memory.title}": ${errorMsg}`);
                        results.memories.push({
                            title: memory.title,
                            status: 'error',
                            error: errorMsg
                        });
                    }
                }
            }
            catch (error) {
                results.failed++;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                results.errors.push(`Error parsing file "${file.name}": ${errorMsg}`);
                results.memories.push({
                    title: file.name,
                    status: 'error',
                    error: errorMsg
                });
            }
            processedFiles++;
            setUploadProgress((processedFiles / fileArray.length) * 100);
        }
        setUploadResults(results);
        setIsUploading(false);
        if (onUpload) {
            onUpload(results);
        }
    };
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        }
        else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };
    const handleFileInput = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };
    return (_jsxs("div", { className: `space-y-4 ${className}`, children: [_jsx("div", { className: `border-2 border-dashed rounded-lg p-8 text-center transition-all ${dragActive
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'} ${isUploading ? 'opacity-50 pointer-events-none' : ''}`, onDragEnter: handleDrag, onDragLeave: handleDrag, onDragOver: handleDrag, onDrop: handleDrop, children: _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "text-6xl", children: "\uD83D\uDCC4" }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: "Upload Memory Files" }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Drag and drop files here, or click to browse" })] }), _jsxs("div", { className: "text-sm text-gray-500", children: [_jsx("p", { children: "Supported formats:" }), _jsxs("div", { className: "flex flex-wrap justify-center gap-2 mt-2", children: [_jsx("span", { className: "bg-gray-100 px-2 py-1 rounded", children: ".txt" }), _jsx("span", { className: "bg-gray-100 px-2 py-1 rounded", children: ".md" }), _jsx("span", { className: "bg-gray-100 px-2 py-1 rounded", children: ".json" }), _jsx("span", { className: "bg-gray-100 px-2 py-1 rounded", children: ".csv" })] })] }), _jsx("button", { onClick: () => fileInputRef.current?.click(), className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors", disabled: isUploading, children: "Choose Files" })] }) }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: ".txt,.md,.markdown,.json,.csv", onChange: handleFileInput, className: "hidden" }), isUploading && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { children: "Uploading memories..." }), _jsxs("span", { children: [Math.round(uploadProgress), "%"] })] }), _jsx("div", { className: "w-full bg-gray-200 rounded-full h-2", children: _jsx("div", { className: "bg-blue-500 h-2 rounded-full transition-all", style: { width: `${uploadProgress}%` } }) })] })), uploadResults && (_jsxs("div", { className: "border rounded-lg p-4 space-y-3", children: [_jsx("h3", { className: "font-semibold", children: "Upload Results" }), _jsxs("div", { className: "flex gap-4 text-sm", children: [_jsxs("span", { className: "text-green-600", children: ["\u2705 Success: ", uploadResults.success] }), _jsxs("span", { className: "text-red-600", children: ["\u274C Failed: ", uploadResults.failed] })] }), uploadResults.errors.length > 0 && (_jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium text-red-600", children: "Errors:" }), _jsx("div", { className: "max-h-32 overflow-y-auto text-xs text-red-500 space-y-1", children: uploadResults.errors.map((error, index) => (_jsx("div", { children: error }, index))) })] })), _jsxs("div", { className: "space-y-1", children: [_jsx("p", { className: "text-sm font-medium", children: "Memory Results:" }), _jsx("div", { className: "max-h-40 overflow-y-auto text-xs space-y-1", children: uploadResults.memories.map((memory, index) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: memory.status === 'success' ? 'text-green-600' : 'text-red-600', children: memory.status === 'success' ? '✅' : '❌' }), _jsx("span", { className: "flex-1 truncate", children: memory.title }), memory.error && (_jsxs("span", { className: "text-red-500 text-xs", children: ["(", memory.error, ")"] }))] }, index))) })] })] })), _jsxs("div", { className: "text-xs text-gray-500 space-y-2", children: [_jsx("p", { className: "font-medium", children: "Supported file formats:" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "YAML Frontmatter (.txt, .md):" }), _jsx("pre", { className: "bg-gray-100 p-2 rounded text-xs overflow-x-auto", children: `---
title: My Memory
type: knowledge
tags: important, research
---
This is the memory content...` })] }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "JSON (.json):" }), _jsx("pre", { className: "bg-gray-100 p-2 rounded text-xs overflow-x-auto", children: `[{
  "title": "Memory Title",
  "content": "Memory content...",
  "memory_type": "project",
  "tags": ["tag1", "tag2"]
}]` })] })] })] })] }));
};
export default ManualMemoryUploader;
//# sourceMappingURL=ManualMemoryUploader.js.map