import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

interface MetricValue {
  type: 'gauge';
  value: number;
  timestamp: number;
}

// In-memory metrics storage (in production, use Redis or proper metrics system)
class MetricsCollector {
  private metrics: Map<string, MetricValue> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  // Counter metrics
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.createKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  // Histogram metrics for duration tracking
  recordDuration(name: string, duration: number, labels: Record<string, string> = {}): void {
    const key = this.createKey(name, labels);
    const values = this.histograms.get(key) || [];
    values.push(duration);
    
    // Keep only last 1000 values to prevent memory issues
    if (values.length > 1000) {
      values.shift();
    }
    
    this.histograms.set(key, values);
  }

  // Gauge metrics for current values
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.createKey(name, labels);
    this.metrics.set(key, {
      type: 'gauge',
      value,
      timestamp: Date.now()
    });
  }

  // Get all metrics in Prometheus format
  getPrometheusMetrics(): string {
    let output = '';

    // Counters
    const counterGroups = this.groupByMetricName(this.counters);
    for (const [metricName, entries] of counterGroups) {
      output += `# TYPE ${metricName} counter\n`;
      for (const [labelStr, value] of entries) {
        output += `${metricName}${labelStr} ${value}\n`;
      }
    }

    // Histograms (simplified - just avg and count)
    const histogramGroups = this.groupByMetricName(this.histograms);
    for (const [metricName, entries] of histogramGroups) {
      output += `# TYPE ${metricName}_duration_seconds histogram\n`;
      for (const [labelStr, values] of entries) {
        const avg = (values as number[]).reduce((a: number, b: number) => a + b, 0) / (values as number[]).length;
        const count = (values as number[]).length;
        output += `${metricName}_duration_seconds_sum${labelStr} ${(avg * count) / 1000}\n`;
        output += `${metricName}_duration_seconds_count${labelStr} ${count}\n`;
      }
    }

    // Gauges
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        const { metricName, labelStr } = this.parseKey(key);
        output += `# TYPE ${metricName} gauge\n`;
        output += `${metricName}${labelStr} ${metric.value}\n`;
      }
    }

    return output;
  }

  // Get metrics as JSON
  getJsonMetrics(): Record<string, unknown> {
    const result: {
      counters: Record<string, Array<{ labels: Record<string, string>; value: number }>>;
      histograms: Record<string, Array<{ labels: Record<string, string>; count: number; avg_ms: number; min_ms: number; max_ms: number }>>;
      gauges: Record<string, Array<{ labels: Record<string, string>; value: number; timestamp: number }>>;
    } = {
      counters: {},
      histograms: {},
      gauges: {}
    };

    // Process counters
    for (const [key, value] of this.counters) {
      const { metricName, labels } = this.parseKey(key);
      if (!result.counters[metricName]) {
        result.counters[metricName] = [];
      }
      result.counters[metricName].push({ labels, value });
    }

    // Process histograms
    for (const [key, values] of this.histograms) {
      const { metricName, labels } = this.parseKey(key);
      if (!result.histograms[metricName]) {
        result.histograms[metricName] = [];
      }
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      result.histograms[metricName].push({
        labels,
        count: values.length,
        avg_ms: Math.round(avg * 100) / 100,
        min_ms: min,
        max_ms: max
      });
    }

    // Process gauges
    for (const [key, metric] of this.metrics) {
      if (metric.type === 'gauge') {
        const { metricName, labels } = this.parseKey(key);
        if (!result.gauges[metricName]) {
          result.gauges[metricName] = [];
        }
        result.gauges[metricName].push({
          labels,
          value: metric.value,
          timestamp: metric.timestamp
        });
      }
    }

    return result;
  }

  private createKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  private parseKey(key: string): { metricName: string; labelStr: string; labels: Record<string, string> } {
    const parts = key.split('{');
    const metricName = parts[0] || 'unknown';
    const labelStr = parts[1] ? `{${parts[1]}` : '';
    
    const labels: Record<string, string> = {};
    if (parts[1]) {
      const labelPart = parts[1].replace('}', '');
      labelPart.split(',').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) {
          labels[k] = v.replace(/"/g, '');
        }
      });
    }

    return { metricName, labelStr, labels };
  }

  private groupByMetricName(map: Map<string, unknown>): Map<string, [string, unknown][]> {
    const groups = new Map<string, [string, unknown][]>();
    
    for (const [key, value] of map) {
      const { metricName, labelStr } = this.parseKey(key);
      if (!groups.has(metricName)) {
        groups.set(metricName, []);
      }
      const group = groups.get(metricName);
      if (group) {
        group.push([labelStr, value]);
      }
    }
    
    return groups;
  }

  // Clear old metrics to prevent memory leaks
  cleanup(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [key, metric] of this.metrics) {
      if (metric.timestamp && metric.timestamp < cutoff) {
        this.metrics.delete(key);
      }
    }
  }
}

export const metrics = new MetricsCollector();

// Middleware to collect HTTP metrics
export const metricsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Increment request counter
  metrics.incrementCounter('http_requests_total', {
    method: req.method,
    route: req.route?.path || req.path,
    status: 'pending'
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(_chunk?: unknown, _encoding?: unknown, _callback?: unknown) {
    const duration = Date.now() - startTime;
    
    // Record request duration
    metrics.recordDuration('http_request_duration', duration, {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode.toString()
    });

    // Update counter with final status
    metrics.incrementCounter('http_requests_total', {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode.toString()
    });

    // Track memory operations specifically
    if (req.path.includes('/memory')) {
      const operation = req.method === 'GET' ? 'read' : 
                      req.method === 'POST' ? 'create' :
                      req.method === 'PUT' ? 'update' :
                      req.method === 'DELETE' ? 'delete' : 'unknown';
      
      metrics.recordDuration('memory_operation_duration', duration, {
        operation,
        status: res.statusCode.toString()
      });

      metrics.incrementCounter('memory_operations_total', {
        operation,
        status: res.statusCode.toString()
      });
    }

    return originalEnd.apply(this, arguments as never);
  };

  next();
};

// Function to update system metrics
export const updateSystemMetrics = (): void => {
  const memoryUsage = process.memoryUsage();
  
  metrics.setGauge('nodejs_memory_heap_used_bytes', memoryUsage.heapUsed);
  metrics.setGauge('nodejs_memory_heap_total_bytes', memoryUsage.heapTotal);
  metrics.setGauge('nodejs_memory_external_bytes', memoryUsage.external);
  metrics.setGauge('nodejs_memory_rss_bytes', memoryUsage.rss);
  
  const cpuUsage = process.cpuUsage();
  metrics.setGauge('nodejs_cpu_user_microseconds', cpuUsage.user);
  metrics.setGauge('nodejs_cpu_system_microseconds', cpuUsage.system);
  
  metrics.setGauge('nodejs_uptime_seconds', process.uptime());
};

// Cleanup function to run periodically
export const cleanupMetrics = (): void => {
  metrics.cleanup();
  logger.debug('Metrics cleanup completed');
};

// Start collecting system metrics
let systemMetricsInterval: NodeJS.Timeout | null = null;
let cleanupInterval: NodeJS.Timeout | null = null;

export const startMetricsCollection = (): void => {
  // Update system metrics every 30 seconds
  systemMetricsInterval = setInterval(updateSystemMetrics, 30000);
  
  // Cleanup old metrics every hour
  cleanupInterval = setInterval(cleanupMetrics, 60 * 60 * 1000);
  
  logger.info('Metrics collection started');
};

export const stopMetricsCollection = (): void => {
  if (systemMetricsInterval) {
    clearInterval(systemMetricsInterval);
    systemMetricsInterval = null;
  }
  
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  logger.info('Metrics collection stopped');
};