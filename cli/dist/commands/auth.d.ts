interface LoginOptions {
    email?: string;
    password?: string;
    method?: 'password' | 'oauth' | 'auto';
}
export declare function loginCommand(options: LoginOptions): Promise<void>;
export {};
