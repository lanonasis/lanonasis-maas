import { Request, Response, NextFunction } from 'express';
declare class MetricsCollector {
    private metrics;
    private counters;
    private histograms;
    incrementCounter(name: string, labels?: Record<string, string>, value?: number): void;
    recordDuration(name: string, duration: number, labels?: Record<string, string>): void;
    setGauge(name: string, value: number, labels?: Record<string, string>): void;
    getPrometheusMetrics(): string;
    getJsonMetrics(): any;
    private createKey;
    private parseKey;
    private groupByMetricName;
    cleanup(): void;
}
export declare const metrics: MetricsCollector;
export declare const metricsMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export declare const updateSystemMetrics: () => void;
export declare const cleanupMetrics: () => void;
export declare const startMetricsCollection: () => void;
export declare const stopMetricsCollection: () => void;
export {};
//# sourceMappingURL=metrics.d.ts.map