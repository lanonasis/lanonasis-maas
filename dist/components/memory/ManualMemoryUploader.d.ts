/**
 * Manual Memory Uploader Component
 * Supports multiple formats and batch uploads for context management
 * Aligned with sd-ghost-protocol schema
 */
import React from 'react';
import { CreateMemoryRequest } from '../../types/memory-aligned';
interface UploadResult {
    success: number;
    failed: number;
    errors: string[];
    memories: Array<{
        title: string;
        status: 'success' | 'error';
        error?: string;
    }>;
}
interface ManualMemoryUploaderProps {
    onUpload?: (results: UploadResult) => void;
    onMemoryCreate?: (memory: CreateMemoryRequest) => Promise<{
        success: boolean;
        error?: string;
    }>;
    className?: string;
}
export declare const ManualMemoryUploader: React.FC<ManualMemoryUploaderProps>;
export default ManualMemoryUploader;
//# sourceMappingURL=ManualMemoryUploader.d.ts.map