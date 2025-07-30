/**
 * Manual Memory Uploader Component
 * Supports multiple formats and batch uploads for context management
 * Aligned with sd-ghost-protocol schema
 */

import React, { useState, useRef } from 'react';
import { CreateMemoryRequest, MemoryType } from '../../types/memory-aligned';

interface UploadResult {
  success: number;
  failed: number;
  errors: string[];
  memories: Array<{ title: string; status: 'success' | 'error'; error?: string }>;
}

interface ManualMemoryUploaderProps {
  onUpload?: (results: UploadResult) => void;
  onMemoryCreate?: (memory: CreateMemoryRequest) => Promise<{ success: boolean; error?: string }>;
  className?: string;
}

interface ParsedMemory {
  title: string;
  content: string;
  memory_type?: MemoryType;
  tags: string[];
  metadata?: Record<string, any>;
}

export const ManualMemoryUploader: React.FC<ManualMemoryUploaderProps> = ({
  onUpload,
  onMemoryCreate,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type parsers
  const parseTextFile = async (file: File): Promise<ParsedMemory[]> => {
    const content = await file.text();
    
    // Try to detect if it's a structured format
    if (content.includes('---') && content.includes('title:')) {
      // YAML frontmatter format
      return parseYamlFrontmatter(content);
    } else if (content.startsWith('[') || content.startsWith('{')) {
      // JSON format
      try {
        const data = JSON.parse(content);
        return parseJsonMemories(data);
      } catch {
        // Fallback to plain text
        return [{
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: content,
          memory_type: 'context',
          tags: []
        }];
      }
    } else {
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
            memory_type: 'context' as MemoryType,
            tags: []
          };
        });
      } else {
        return [{
          title: file.name.replace(/\.[^/.]+$/, ''),
          content: content,
          memory_type: 'context' as MemoryType,
          tags: []
        }];
      }
    }
  };

  const parseYamlFrontmatter = (content: string): ParsedMemory[] => {
    const sections = content.split('---').filter(section => section.trim());
    const memories: ParsedMemory[] = [];
    
    for (let i = 0; i < sections.length; i += 2) {
      if (i + 1 < sections.length) {
        const frontmatter = sections[i];
        const body = sections[i + 1];
        
        if (frontmatter && body) {
          // Simple YAML parsing (for basic cases)
          const yamlLines = frontmatter.split('\n');
          const metadata: Record<string, any> = {};
          
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
            memory_type: (metadata.type as MemoryType) || 'context',
            tags: metadata.tags ? metadata.tags.split(',').map((t: string) => t.trim()) : [],
            metadata
          });
        }
      }
    }
    
    return memories;
  };

  const parseJsonMemories = (data: any): ParsedMemory[] => {
    if (Array.isArray(data)) {
      return data.map((item, index) => ({
        title: item.title || `Memory ${index + 1}`,
        content: item.content || JSON.stringify(item),
        memory_type: item.memory_type || item.type || 'context',
        tags: Array.isArray(item.tags) ? item.tags : [],
        metadata: item.metadata || item
      }));
    } else if (data.title && data.content) {
      return [{
        title: data.title,
        content: data.content,
        memory_type: data.memory_type || data.type || 'context',
        tags: Array.isArray(data.tags) ? data.tags : [],
        metadata: data.metadata || data
      }];
    } else {
      return [{
        title: 'JSON Data',
        content: JSON.stringify(data, null, 2),
        memory_type: 'context',
        tags: []
      }];
    }
  };

  const parseMarkdownFile = async (file: File): Promise<ParsedMemory[]> => {
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
          memory_type: 'knowledge' as MemoryType,
          tags: ['markdown', 'documentation']
        };
      });
    } else {
      return [{
        title: file.name.replace(/\.[^/.]+$/, ''),
        content,
        memory_type: 'knowledge' as MemoryType,
        tags: ['markdown']
      }];
    }
  };

  const parseCsvFile = async (file: File): Promise<ParsedMemory[]> => {
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) return [];
    
    const headers = lines[0]?.split(',').map(h => h.trim().replace(/['"]/g, '')) || [];
    const memories: ParsedMemory[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const values = line.split(',').map(v => v.trim().replace(/['"]/g, ''));
      const rowData: Record<string, string> = {};
      
      headers.forEach((header, index) => {
        rowData[header] = values[index] || '';
      });
      
      memories.push({
        title: rowData.title || rowData.name || `Row ${i}`,
        content: rowData.content || rowData.description || JSON.stringify(rowData),
        memory_type: (rowData.type as MemoryType) || 'context',
        tags: rowData.tags ? rowData.tags.split(';') : [],
        metadata: rowData
      });
    }
    
    return memories;
  };

  const parseFile = async (file: File): Promise<ParsedMemory[]> => {
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

  const handleFiles = async (files: FileList | File[]) => {
    if (!onMemoryCreate) {
      console.error('onMemoryCreate handler not provided');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    const results: UploadResult = {
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
            } else {
              results.failed++;
              results.errors.push(`Failed to create "${memory.title}": ${result.error}`);
              results.memories.push({ 
                title: memory.title, 
                status: 'error', 
                error: result.error || 'Unknown error'
              });
            }
          } catch (error) {
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
      } catch (error) {
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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl">📄</div>
          <div>
            <p className="text-lg font-semibold">Upload Memory Files</p>
            <p className="text-sm text-gray-600 mt-1">
              Drag and drop files here, or click to browse
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Supported formats:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <span className="bg-gray-100 px-2 py-1 rounded">.txt</span>
              <span className="bg-gray-100 px-2 py-1 rounded">.md</span>
              <span className="bg-gray-100 px-2 py-1 rounded">.json</span>
              <span className="bg-gray-100 px-2 py-1 rounded">.csv</span>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={isUploading}
          >
            Choose Files
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".txt,.md,.markdown,.json,.csv"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading memories...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {uploadResults && (
        <div className="border rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Upload Results</h3>
          
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">
              ✅ Success: {uploadResults.success}
            </span>
            <span className="text-red-600">
              ❌ Failed: {uploadResults.failed}
            </span>
          </div>

          {uploadResults.errors.length > 0 && (
            <div className="space-y-1">
              <p className="text-sm font-medium text-red-600">Errors:</p>
              <div className="max-h-32 overflow-y-auto text-xs text-red-500 space-y-1">
                {uploadResults.errors.map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">Memory Results:</p>
            <div className="max-h-40 overflow-y-auto text-xs space-y-1">
              {uploadResults.memories.map((memory, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className={memory.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                    {memory.status === 'success' ? '✅' : '❌'}
                  </span>
                  <span className="flex-1 truncate">{memory.title}</span>
                  {memory.error && (
                    <span className="text-red-500 text-xs">({memory.error})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Format Examples */}
      <div className="text-xs text-gray-500 space-y-2">
        <p className="font-medium">Supported file formats:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="font-medium">YAML Frontmatter (.txt, .md):</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`---
title: My Memory
type: knowledge
tags: important, research
---
This is the memory content...`}
            </pre>
          </div>
          <div>
            <p className="font-medium">JSON (.json):</p>
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`[{
  "title": "Memory Title",
  "content": "Memory content...",
  "memory_type": "project",
  "tags": ["tag1", "tag2"]
}]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualMemoryUploader;