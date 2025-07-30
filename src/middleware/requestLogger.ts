import { Request, Response, NextFunction } from 'express';
import { logRequest } from '@/utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Capture the original res.end function
  const originalEnd = res.end;

  // Override res.end to log when response is finished
  res.end = function(_chunk?: unknown, _encoding?: unknown, _callback?: unknown) {
    const duration = Date.now() - startTime;
    
    // Log the request
    logRequest(req, res, duration);
    
    // Call the original end function
    return originalEnd.apply(this, arguments as never);
  };

  next();
};