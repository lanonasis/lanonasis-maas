interface LoginOptions {
    email?: string;
    password?: string;
}
export declare function loginCommand(options: LoginOptions): Promise<void>;
export {};
