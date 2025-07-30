import { AxiosRequestConfig } from 'axios';
export declare class APIClient {
    private client;
    private config;
    constructor();
    login(email: string, password: string): Promise<any>;
    register(email: string, password: string, organizationName?: string): Promise<any>;
    createMemory(data: any): Promise<any>;
    getMemories(params?: any): Promise<any>;
    getMemory(id: string): Promise<any>;
    updateMemory(id: string, data: any): Promise<any>;
    deleteMemory(id: string): Promise<void>;
    searchMemories(query: string, options?: any): Promise<any>;
    getMemoryStats(): Promise<any>;
    bulkDeleteMemories(memoryIds: string[]): Promise<any>;
    createTopic(data: any): Promise<any>;
    getTopics(): Promise<any>;
    getTopic(id: string): Promise<any>;
    updateTopic(id: string, data: any): Promise<any>;
    deleteTopic(id: string): Promise<void>;
    getHealth(): Promise<any>;
    request<T = any>(config: AxiosRequestConfig): Promise<T>;
}
export declare const apiClient: APIClient;
