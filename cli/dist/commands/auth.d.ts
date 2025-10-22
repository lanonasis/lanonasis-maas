interface LoginOptions {
    email?: string;
    password?: string;
    vendorKey?: string;
    useWebAuth?: boolean;
}
export declare function diagnoseCommand(): Promise<void>;
export declare function loginCommand(options: LoginOptions): Promise<void>;
export {};
