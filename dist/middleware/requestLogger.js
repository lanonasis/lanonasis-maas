import { logRequest } from '@/utils/logger';
export const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    // Capture the original res.end function
    const originalEnd = res.end;
    // Override res.end to log when response is finished
    res.end = function (...args) {
        const duration = Date.now() - startTime;
        // Log the request
        logRequest(req, res, duration);
        // Call the original end function
        originalEnd.apply(this, args);
    };
    next();
};
//# sourceMappingURL=requestLogger.js.map