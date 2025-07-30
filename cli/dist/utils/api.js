import axios from 'axios';
import chalk from 'chalk';
import { CLIConfig } from './config.js';
export class APIClient {
    client;
    config;
    constructor() {
        this.config = new CLIConfig();
        this.client = axios.create();
        // Setup request interceptor to add auth token
        this.client.interceptors.request.use(async (config) => {
            await this.config.init();
            const token = this.config.getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            config.baseURL = this.config.getApiUrl();
            if (process.env.CLI_VERBOSE === 'true') {
                console.log(chalk.dim(`→ ${config.method?.toUpperCase()} ${config.url}`));
            }
            return config;
        });
        // Setup response interceptor for error handling
        this.client.interceptors.response.use((response) => {
            if (process.env.CLI_VERBOSE === 'true') {
                console.log(chalk.dim(`← ${response.status} ${response.statusText}`));
            }
            return response;
        }, (error) => {
            if (error.response) {
                const { status, data } = error.response;
                if (status === 401) {
                    console.error(chalk.red('✖ Authentication failed'));
                    console.log(chalk.yellow('Please run:'), chalk.white('memory login'));
                    process.exit(1);
                }
                if (status === 403) {
                    console.error(chalk.red('✖ Permission denied'));
                    if (data.message) {
                        console.error(chalk.gray(data.message));
                    }
                    process.exit(1);
                }
                if (status === 429) {
                    console.error(chalk.red('✖ Rate limit exceeded'));
                    console.error(chalk.gray('Please wait a moment before trying again'));
                    process.exit(1);
                }
                if (process.env.CLI_VERBOSE === 'true') {
                    console.error(chalk.dim(`← ${status} ${error.response.statusText}`));
                    console.error(chalk.dim(JSON.stringify(data, null, 2)));
                }
            }
            return Promise.reject(error);
        });
    }
    // Authentication - aligned with Supabase auth
    async login(email, password) {
        const response = await this.client.post('/api/v1/auth/login', {
            email,
            password
        });
        return response.data;
    }
    async register(email, password, organizationName) {
        const response = await this.client.post('/api/v1/auth/register', {
            email,
            password,
            organization_name: organizationName
        });
        return response.data;
    }
    // Memory operations - aligned with existing schema
    async createMemory(data) {
        const response = await this.client.post('/api/v1/memory', data);
        return response.data;
    }
    async getMemories(params = {}) {
        const response = await this.client.get('/api/v1/memory', { params });
        return response.data;
    }
    async getMemory(id) {
        const response = await this.client.get(`/api/v1/memory/${id}`);
        return response.data;
    }
    async updateMemory(id, data) {
        const response = await this.client.put(`/api/v1/memory/${id}`, data);
        return response.data;
    }
    async deleteMemory(id) {
        await this.client.delete(`/api/v1/memory/${id}`);
    }
    async searchMemories(query, options = {}) {
        const response = await this.client.post('/api/v1/memory/search', {
            query,
            ...options
        });
        return response.data;
    }
    async getMemoryStats() {
        const response = await this.client.get('/api/v1/memory/stats');
        return response.data;
    }
    async bulkDeleteMemories(memoryIds) {
        const response = await this.client.post('/api/v1/memory/bulk/delete', {
            memory_ids: memoryIds
        });
        return response.data;
    }
    // Topic operations - working with existing memory_topics table
    async createTopic(data) {
        const response = await this.client.post('/api/v1/topics', data);
        return response.data;
    }
    async getTopics() {
        const response = await this.client.get('/api/v1/topics');
        return response.data;
    }
    async getTopic(id) {
        const response = await this.client.get(`/api/v1/topics/${id}`);
        return response.data;
    }
    async updateTopic(id, data) {
        const response = await this.client.put(`/api/v1/topics/${id}`, data);
        return response.data;
    }
    async deleteTopic(id) {
        await this.client.delete(`/api/v1/topics/${id}`);
    }
    // Health check
    async getHealth() {
        const response = await this.client.get('/api/v1/health');
        return response.data;
    }
    // Generic request method
    async request(config) {
        const response = await this.client.request(config);
        return response.data;
    }
}
export const apiClient = new APIClient();
