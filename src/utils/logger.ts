import winston from 'winston';
import { Request, Response } from 'express';
import { config } from '@/config/environment';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  config.LOG_FORMAT === 'json' 
    ? winston.format.json()
    : winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level.toUpperCase()}]: ${message} ${stack || ''} ${metaStr}`;
      })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { 
    service: 'memory-service',
    version: '1.0.0'
  },
  transports: [
    // Console transport
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true
    })
  ]
});

// Add file transport for production
if (config.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));

  logger.add(new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
}

// Helper functions for structured logging
export const logRequest = (req: Request, res: Response, duration: number) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    userId: req.user?.userId
  });
};

export const logError = (error: Error, context?: Record<string, unknown>) => {
  logger.error('Application Error', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

export const logMemoryOperation = (
  operation: string,
  userId: string,
  organizationId: string,
  metadata?: Record<string, unknown>
) => {
  logger.info('Memory Operation', {
    operation,
    userId,
    organizationId,
    ...metadata
  });
};

export const logPerformance = (
  operation: string,
  duration: number,
  metadata?: Record<string, unknown>
) => {
  logger.info('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
};