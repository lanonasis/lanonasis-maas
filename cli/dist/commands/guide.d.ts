export declare class UserGuidanceSystem {
    private config;
    private steps;
    constructor();
    private initializeSteps;
    runGuidedSetup(): Promise<void>;
    private assessCurrentStatus;
    private markStepCompleted;
    private executeStep;
    private initializeConfig;
    private setupAuthentication;
    private verifyConnection;
    private createFirstMemory;
    private exploreFeatures;
    private setupProductivity;
    private showCompletionSummary;
}
export declare function guideCommand(): Promise<void>;
export declare function quickStartCommand(): Promise<void>;
