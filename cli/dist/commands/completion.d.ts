export interface CompletionData {
    commands: Array<{
        name: string;
        description: string;
        aliases?: string[];
        subcommands?: Array<{
            name: string;
            description: string;
            options?: Array<{
                name: string;
                description: string;
                type: 'string' | 'boolean' | 'number' | 'choice';
                choices?: string[];
                required?: boolean;
            }>;
        }>;
    }>;
    globalOptions: Array<{
        name: string;
        description: string;
        type: 'string' | 'boolean' | 'number' | 'choice';
        choices?: string[];
    }>;
    contextualData: {
        memoryTypes: string[];
        outputFormats: string[];
        sortOptions: string[];
        authMethods: string[];
    };
}
export declare function generateCompletionData(): Promise<CompletionData>;
export declare function completionCommand(): Promise<void>;
export declare function installCompletionsCommand(): Promise<void>;
